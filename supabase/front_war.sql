-- Sis Cephesi: bölge içi klan savaşı (hazırlık 30 dk -> savaş 24 sa -> sonuç). Puan = her rakip üyeye karşı en iyi yıldız (0-3) toplamı; eşitlikte toplam hasar.
alter table public.front_wars add column if not exists created_at timestamptz not null default now(), add column if not exists settled boolean not null default false,
 add column if not exists winner uuid, add column if not exists dmg_a numeric not null default 0, add column if not exists dmg_b numeric not null default 0;
create index if not exists fw_a on public.front_wars(clan_a); create index if not exists fw_b on public.front_wars(clan_b);
create table if not exists public.front_queue(clan_id uuid primary key references public.clans on delete cascade, region_id int not null, power bigint not null default 0, queued_at timestamptz not null default now());
create table if not exists public.front_hits(id bigint generated always as identity primary key, war bigint not null references public.front_wars on delete cascade,
 attacker uuid not null references public.profiles on delete cascade, target uuid not null references public.profiles on delete cascade, side char(1) not null, stars int not null, dmg numeric not null, created_at timestamptz not null default now());
create index if not exists fh_war on public.front_hits(war);
alter table public.front_queue enable row level security; alter table public.front_hits enable row level security;
create policy fq_read on public.front_queue for select to authenticated using(true); create policy fh_read on public.front_hits for select to authenticated using(true);
revoke all on public.front_queue, public.front_hits from anon; revoke insert,update,delete on public.front_queue, public.front_hits from authenticated;

create or replace function public.sf_clan_power(c uuid) returns bigint language sql stable set search_path='' as $$ select coalesce(sum(p.power),0)::bigint from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c $$;
create or replace function public.sf_front_cur(c uuid) returns public.front_wars language sql stable set search_path='' as $$
 select * from public.front_wars where (clan_a=c or clan_b=c) and (not settled or ends_at>now()-interval '1 day') order by id desc limit 1 $$;

create or replace function public.front_join() returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); r text; rg int; q public.front_queue; w public.front_wars; begin
 if c is null then raise exception 'Önce bir klana katıl'; end if;
 select role into r from public.clan_members where user_id=auth.uid(); if r not in('lider','yardımcı') then raise exception 'Sadece lider/yardımcı savaşa kaydolabilir'; end if;
 w:=public.sf_front_cur(c); if w.id is not null and not w.settled then raise exception 'Klanın zaten bir savaşta'; end if;
 select region_id into rg from public.clans where id=c;
 perform pg_advisory_xact_lock(7700+rg);
 if exists(select 1 from public.front_queue where clan_id=c) then return public.front_status(); end if;
 select * into q from public.front_queue where region_id=rg and clan_id<>c order by abs(power-public.sf_clan_power(c)), queued_at limit 1 for update skip locked;
 if q.clan_id is null then insert into public.front_queue(clan_id,region_id,power) values(c,rg,public.sf_clan_power(c));
 else delete from public.front_queue where clan_id=q.clan_id;
  insert into public.front_wars(region_id,clan_a,clan_b,starts_at,ends_at) values(rg,q.clan_id,c,now()+interval '30 minutes',now()+interval '30 minutes'+interval '24 hours'); end if;
 return public.front_status(); end $$;
create or replace function public.front_leave_queue() returns void language sql security definer set search_path='' as $$
 delete from public.front_queue where clan_id=public.my_clan() and (select role from public.clan_members where user_id=auth.uid()) in('lider','yardımcı') $$;

create or replace function public.sf_front_settle(w public.front_wars) returns void language plpgsql security definer set search_path='' as $$
declare win uuid; m record; d jsonb; begin
 if w.settled or w.ends_at>now() then return; end if;
 win:=case when w.score_a>w.score_b or (w.score_a=w.score_b and w.dmg_a>w.dmg_b) then w.clan_a when w.score_b>w.score_a or (w.score_a=w.score_b and w.dmg_b>w.dmg_a) then w.clan_b end;
 update public.front_wars set settled=true, winner=win where id=w.id and not settled; if not found then return; end if;
 for m in select user_id, clan_id from public.clan_members where clan_id in(w.clan_a,w.clan_b) and joined_at<w.starts_at loop
  d:=case when win is null then '{"gems":80,"wood":1500,"crys":150}' when m.clan_id=win then '{"gems":150,"wood":2500,"crys":300}' else '{"gems":40,"wood":800,"crys":60}' end;
  -- yalnız en az 1 saldırı yapan üyeler ödül alır (pasif üyeler değil)
  if exists(select 1 from public.front_hits h where h.war=w.id and h.attacker=m.user_id) then
   insert into public.events(user_id,kind,delta) values(m.user_id,'front',jsonb_build_object('res',d,'win',m.clan_id=win,'tie',win is null)); end if; end loop; end $$;

create or replace function public.front_status() returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); w public.front_wars; v_side text; oc uuid; ph text; begin
 if c is null then return jsonb_build_object('phase','none'); end if;
 w:=public.sf_front_cur(c);
 if w.id is not null and not w.settled and w.ends_at<=now() then perform public.sf_front_settle(w); w:=public.sf_front_cur(c); end if;
 if w.id is null or (w.settled and exists(select 1 from public.front_queue where clan_id=c)) then
  return jsonb_build_object('phase',case when exists(select 1 from public.front_queue where clan_id=c) then 'queue' else 'none' end,'region',(select region_id from public.clans where id=c)); end if;
 v_side:=case when w.clan_a=c then 'a' else 'b' end; oc:=case when v_side='a' then w.clan_b else w.clan_a end;
 ph:=case when now()<w.starts_at then 'prep' when now()<w.ends_at then 'battle' else 'result' end;
 return jsonb_build_object('phase',ph,'id',w.id,'starts_at',w.starts_at,'ends_at',w.ends_at,'side',v_side,'now',now(),
  'my',case when v_side='a' then w.score_a else w.score_b end,'op',case when v_side='a' then w.score_b else w.score_a end,
  'my_dmg',case when v_side='a' then w.dmg_a else w.dmg_b end,'op_dmg',case when v_side='a' then w.dmg_b else w.dmg_a end,
  'won',case when w.settled then w.winner=c end,'tie',w.settled and w.winner is null,
  'op_clan',(select jsonb_build_object('name',name,'tag',tag,'icon',icon) from public.clans where id=oc),
  'mine',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'power',p.power,'n',(select count(*) from public.front_hits h where h.war=w.id and h.attacker=p.id),'ok',m.joined_at<w.starts_at) order by p.power desc),'[]')
    from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c),
  'foes',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'power',p.power,'stars',(select coalesce(max(stars),0) from public.front_hits h where h.war=w.id and h.target=p.id)) order by p.power desc),'[]')
    from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=oc and m.joined_at<w.starts_at)); end $$;

create or replace function public.front_attack(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); w public.front_wars; v_side text; oc uuid; ad jsonb; dd jsonb; A record; Ac record; D record; Dc record; R record; st int; dm numeric; bid bigint; mp public.profiles; tp public.profiles; begin
 if c is null then raise exception 'Klanın yok'; end if;
 select * into w from public.front_wars where id=(public.sf_front_cur(c)).id for update;
 if w.id is null or now()<w.starts_at then raise exception 'Savaş henüz başlamadı'; end if; if now()>=w.ends_at then raise exception 'Savaş bitti'; end if;
 v_side:=case when w.clan_a=c then 'a' else 'b' end; oc:=case when v_side='a' then w.clan_b else w.clan_a end;
 if (select joined_at from public.clan_members where user_id=auth.uid())>=w.starts_at then raise exception 'Savaş başladıktan sonra katıldın'; end if;
 if not exists(select 1 from public.clan_members where user_id=p_target and clan_id=oc and joined_at<w.starts_at) then raise exception 'Hedef rakip klanda değil'; end if;
 if (select count(*) from public.front_hits where war=w.id and attacker=auth.uid())>=3 then raise exception '3 saldırı hakkın bitti'; end if;
 if exists(select 1 from public.front_hits where attacker=auth.uid() and created_at>now()-interval '10 seconds') then raise exception 'Biraz bekle'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target; if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into A from public.sf_army(ad); select * into Ac from public.sf_caps(ad,'[]'); select * into D from public.sf_army(dd);
 select * into Dc from public.sf_caps(dd,coalesce((select lineup from public.arena where user_id=p_target),'[]'));
 if A.power+Ac.power<=0 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 -- sis kalesi: savunan +%10 (kayıp/ganimet yok, sadece puan)
 select * into R from public.sf_duel(jsonb_build_object('atk',A.atk+Ac.atk,'hp',A.hp+Ac.hp+1),jsonb_build_object('atk',(D.atk+Dc.atk)*1.1+30,'hp',(D.hp+Dc.hp)*1.1+150));
 dm:=round(100*(1-(R.rounds->-1->>'eHp')::numeric/R.bmax)); st:=case when R.win and (R.rounds->-1->>'hp')::numeric/R.amax>=.5 then 3 when R.win then 2 when dm>=50 then 1 else 0 end;
 insert into public.front_hits(war,attacker,target,side,stars,dmg) values(w.id,auth.uid(),p_target,v_side,st,dm);
 update public.front_wars set
  score_a=(select coalesce(sum(s),0) from (select max(stars) s from public.front_hits where war=w.id and side='a' group by target) x),
  score_b=(select coalesce(sum(s),0) from (select max(stars) s from public.front_hits where war=w.id and side='b' group by target) x),
  dmg_a=(select coalesce(sum(dmg),0) from public.front_hits where war=w.id and side='a'), dmg_b=(select coalesce(sum(dmg),0) from public.front_hits where war=w.id and side='b') where id=w.id;
 select * into mp from public.profiles where id=auth.uid(); select * into tp from public.profiles where id=p_target;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power,kind)
  values(auth.uid(),p_target,R.win,jsonb_build_object('stars',st,'dmg',dm,'war',w.id),'{}','{}',R.rounds,mp.nick,tp.nick,A.power+Ac.power,D.power+Dc.power,'front') returning id into bid;
 return jsonb_build_object('id',bid,'kind','front','win',R.win,'stars',st,'dmg',dm,'rounds',R.rounds,'myMax',R.amax,'eMax',R.bmax,'def_nick',tp.nick,'def_avatar',tp.avatar,'att_power',A.power+Ac.power,'def_power',D.power+Dc.power,'status',public.front_status()); end $$;
revoke execute on function public.sf_front_settle(public.front_wars), public.sf_clan_power(uuid), public.sf_front_cur(uuid) from public, anon, authenticated;
grant execute on function public.front_join(), public.front_leave_queue(), public.front_status(), public.front_attack(uuid) to authenticated;
revoke execute on function public.front_join(), public.front_leave_queue(), public.front_status(), public.front_attack(uuid) from anon;
