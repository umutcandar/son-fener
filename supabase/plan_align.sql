-- Tasarım planı uyumu: Deniz Bölgeleri, yeni oyuncu koruması (7 gün), %20 kayıp sınırı, Sis Cephesi iskeleti, Eşit Arena
create table public.regions(id int primary key, name text not null, opened_at timestamptz not null default now(), cap int not null default 1000);
alter table public.regions enable row level security; create policy r_read on public.regions for select to authenticated using(true); revoke all on public.regions from anon; revoke insert,update,delete on public.regions from authenticated;
insert into public.regions(id,name) values(1,'Deniz 1 · Fener Körfezi');
alter table public.profiles add column region_id int not null default 1 references public.regions, add column has_attacked boolean not null default false;
alter table public.clans add column region_id int not null default 1 references public.regions;
-- yeni oyuncu en yeni, dolu olmayan bölgeye
create or replace function public.ensure_profile() returns public.profiles language plpgsql security definer set search_path='' as $$
declare p public.profiles; rg int; begin
 if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if not exists(select 1 from public.profiles where id=auth.uid()) then
  select r.id into rg from public.regions r where (select count(*) from public.profiles x where x.region_id=r.id)<r.cap order by r.opened_at desc limit 1;
  if rg is null then insert into public.regions(id,name) select coalesce(max(id),0)+1,'Deniz '||(coalesce(max(id),0)+1) from public.regions returning id into rg; end if;
  insert into public.profiles(id,nick,region_id) values(auth.uid(),'Kaptan'||lpad((floor(random()*9999))::int::text,4,'0'),rg) on conflict(id) do nothing; end if;
 select * into p from public.profiles where id=auth.uid(); return p; end $$;
create or replace function public.sf_protected(p public.profiles) returns boolean language sql stable set search_path='' as $$ select p.created_at>now()-interval '7 days' and not p.has_attacked $$;
create or replace function public.find_targets() returns table(id uuid,nick text,avatar text,power int,stage int,tag text) language sql stable security definer set search_path='' as $$
 select p.id,p.nick,p.avatar,p.power,p.stage,c.tag from public.profiles p left join public.clan_members m on m.user_id=p.id left join public.clans c on c.id=m.clan_id
 where p.id<>auth.uid() and p.shield_until<now() and not public.sf_protected(p) and p.region_id=(select region_id from public.profiles where id=auth.uid())
  and exists(select 1 from public.saves s where s.user_id=p.id) and (m.clan_id is null or m.clan_id is distinct from public.my_clan())
 order by abs(p.power-(select power from public.profiles where id=auth.uid())), random() limit 6 $$;
create table public.front_wars(id bigint generated always as identity primary key, region_id int not null references public.regions, clan_a uuid not null references public.clans on delete cascade, clan_b uuid not null references public.clans on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz not null, score_a bigint not null default 0, score_b bigint not null default 0);
create table public.front_attacks(war bigint references public.front_wars on delete cascade, user_id uuid references public.profiles on delete cascade, n int not null default 0 check(n<=3), primary key(war,user_id));
alter table public.front_wars enable row level security; alter table public.front_attacks enable row level security;
create policy fw_read on public.front_wars for select to authenticated using(true); create policy fa_read on public.front_attacks for select to authenticated using(true);
revoke all on public.front_wars, public.front_attacks from anon; revoke insert,update,delete on public.front_wars, public.front_attacks from authenticated;
alter table public.arena add column league text generated always as (case when rating>=1800 then 'Efsane' when rating>=1500 then 'Elmas' when rating>=1300 then 'Altın' when rating>=1100 then 'Gümüş' else 'Bronz' end) stored;
alter table public.arena add column eq_rating int not null default 1000;

create or replace function public.raid(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.profiles; tg public.profiles; A record; D record; ad jsonb; dd jsonb; hp numeric; ehp numeric; mx numeric; emx numeric; rounds jsonb:='[]'; i int; d1 numeric; d2 numeric;
 win boolean; lf numeric; loot jsonb:='{}'; al jsonb:='{}'; dl jsonb:='{}'; k text; v numeric; capv numeric; dday text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); bid bigint;
begin select * into me from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p_target=auth.uid() then raise exception 'Kendine saldıramazsın'; end if;
 if me.last_raid>now()-interval '20 seconds' then raise exception 'Filo hâlâ dönüyor, biraz bekle'; end if;
 if me.raid_day=dday and me.raid_n>=15 then raise exception 'Bugünkü baskın hakkın bitti'; end if;
 select * into tg from public.profiles where id=p_target for update; if not found then raise exception 'Hedef yok'; end if;
 if tg.shield_until>now() then raise exception 'Hedef kalkan altında'; end if;
 if public.sf_protected(tg) then raise exception 'Yeni kaptan koruması (7 gün)'; end if;
 if tg.region_id<>me.region_id then raise exception 'Başka bölgede'; end if;
 if public.my_clan() is not null and public.my_clan()=(select clan_id from public.clan_members where user_id=p_target) then raise exception 'Klan arkadaşına saldıramazsın'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target;
 if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into A from public.sf_army(ad); select * into D from public.sf_army(dd);
 if A.power<=0 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 -- savunan: fener bonusu +%10 ve ada başına sabit muhafız
 hp:=A.hp; mx:=hp; ehp:=D.hp*1.1+200; emx:=ehp;
 for i in 1..10 loop exit when hp<=0 or ehp<=0;
  d1:=round(A.atk*(.85+random()*.3)); ehp:=greatest(0,ehp-d1); d2:=0;
  if ehp>0 then d2:=round((D.atk*1.1+40)*(.85+random()*.3)); hp:=greatest(0,hp-d2); end if;
  rounds:=rounds||jsonb_build_object('d1',d1,'d2',d2,'hp',hp,'eHp',ehp); end loop;
 win:=ehp<=0; lf:=case when mx>0 then least(1,(mx-hp)/mx)*.5 else 0 end;
 for k in select unnest(array['tayfa','zipkin','topcu']) loop
  al:=al||jsonb_build_object(k,-floor(public.sf_n(ad,array['troops',k],1e6)*lf));
  dl:=dl||jsonb_build_object(k,-floor(public.sf_n(dd,array['troops',k],1e6)*(case when win then .2 else .1 end)*least(1,(emx-ehp)/emx))); end loop;
 if win then for k in select unnest(array['fish','wood','crys']) loop
   v:=public.sf_n(dd,array['res',k],1e12); capv:=(case when k='crys' then 0.3 else 1 end)*(400+A.power*1.5);
   loot:=loot||jsonb_build_object(k,floor(least(v*.15,capv)*least(A.lootm,2))); end loop; end if;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power)
  values(auth.uid(),p_target,win,loot,al,dl,rounds,me.nick,tg.nick,A.power,D.power) returning id into bid;
 insert into public.events(user_id,kind,delta) values(auth.uid(),'raid',jsonb_build_object('res',loot,'troops',al,'battle',bid));
 insert into public.events(user_id,kind,delta) values(p_target,'raided',jsonb_build_object('res',(select coalesce(jsonb_object_agg(key,-(value::numeric)),'{}') from jsonb_each_text(loot)),'troops',dl,'battle',bid));
 update public.profiles set last_raid=now(), raid_n=case when raid_day=dday then raid_n+1 else 1 end, raid_day=dday, shield_until=least(shield_until,now()), has_attacked=true where id=auth.uid();
 update public.profiles set shield_until=now()+case when win then interval '4 hours' else interval '30 minutes' end where id=p_target;
 return jsonb_build_object('id',bid,'win',win,'loot',loot,'att_lost',al,'def_lost',dl,'rounds',rounds,'myMax',mx,'eMax',emx,'def_nick',tg.nick,'def_avatar',tg.avatar,'def_power',D.power,'att_power',A.power); end $$;


drop function public.arena_fight(uuid); drop function public.sf_cap_fight(uuid,text);
create or replace function public.sf_equalize(d jsonb) returns jsonb language sql immutable set search_path='' as $$
 -- Eşit Arena: herkesin kaptanları 1★ Sv10, teçhizat 0 — saf dizilim stratejisi
 select jsonb_build_object('heroes',coalesce((select jsonb_object_agg(k,'{"star":1,"lv":10}'::jsonb) from jsonb_object_keys(coalesce(d->'heroes','{}')) k),'{}'),'gear','{}'::jsonb) $$;
create or replace function public.sf_cap_fight(p_target uuid, p_kind text, p_equal boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare ad jsonb; dd jsonb; A record; D record; R record; me public.arena; tg public.arena; ch int:=0; bid bigint; mp public.profiles; tp public.profiles; begin
 if p_target=auth.uid() then raise exception 'Kendinle savaşamazsın'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target; if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into mp from public.profiles where id=auth.uid(); select * into tp from public.profiles where id=p_target;
 if p_kind='arena' then me:=public.arena_me(); if me.tickets<=0 then raise exception 'Bugünkü arena biletin bitti'; end if;
  select * into tg from public.arena where user_id=p_target; if not found then raise exception 'Rakip arenada değil'; end if; else
  if exists(select 1 from public.battles where attacker=auth.uid() and kind='duel' and created_at>now()-interval '15 seconds') then raise exception 'Biraz bekle'; end if;
  select * into tg from public.arena where user_id=p_target; end if;
 if p_equal then ad:=public.sf_equalize(ad); dd:=public.sf_equalize(dd); end if;
 select * into A from public.sf_caps(ad,'[]'); select * into D from public.sf_caps(dd,coalesce(tg.lineup,'[]'));
 if A.power<=0 then raise exception 'Kaptanın yok'; end if;
 select * into R from public.sf_duel(jsonb_build_object('atk',A.atk,'hp',A.hp),jsonb_build_object('atk',D.atk*1.05,'hp',D.hp*1.05));
 if p_kind='arena' and p_equal then ch:=round(32*((case when R.win then 1 else 0 end)-1/(1+power(10,(tg.eq_rating-me.eq_rating)/400.0))));
  update public.arena set eq_rating=greatest(0,eq_rating+ch), tickets=tickets-1 where user_id=auth.uid(); update public.arena set eq_rating=greatest(0,eq_rating-ch/2) where user_id=p_target;
 elsif p_kind='arena' then ch:=round(32*((case when R.win then 1 else 0 end)-1/(1+power(10,(tg.rating-me.rating)/400.0))));
  update public.arena set rating=greatest(0,rating+ch), tickets=tickets-1, wins=wins+(R.win)::int, losses=losses+(not R.win)::int, best=greatest(best,rating+ch) where user_id=auth.uid();
  update public.arena set rating=greatest(0,rating-ch/2) where user_id=p_target; end if;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power,kind)
  values(auth.uid(),p_target,R.win,jsonb_build_object('equal',p_equal,'rating',ch,'a',A.heroes,'d',D.heroes),'{}','{}',R.rounds,mp.nick,tp.nick,A.power,D.power,p_kind) returning id into bid;
 return jsonb_build_object('id',bid,'kind',p_kind,'win',R.win,'rounds',R.rounds,'myMax',R.amax,'eMax',R.bmax,'rating_change',ch,'a',A.heroes,'d',D.heroes,'def_nick',tp.nick,'def_avatar',tp.avatar,'att_power',A.power,'def_power',D.power,
  'arena',(select to_jsonb(x) from public.arena x where user_id=auth.uid())); end $$;
create or replace function public.arena_fight(p_target uuid, p_equal boolean default false) returns jsonb language sql security definer set search_path='' as $$ select public.sf_cap_fight(p_target,'arena',p_equal) $$;
create or replace function public.duel(p_target uuid) returns jsonb language sql security definer set search_path='' as $$ select public.sf_cap_fight(p_target,'duel',false) $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.sf_army(jsonb), public.sf_n(jsonb,text[],numeric), public.sf_caps(jsonb,jsonb), public.sf_duel(jsonb,jsonb), public.sf_cap_fight(uuid,text,boolean), public.sf_equalize(jsonb), public.sf_protected(public.profiles) from authenticated;

create or replace function public.drop_protection() returns void language sql security definer set search_path='' as $$ update public.profiles set has_attacked=true where id=auth.uid() $$;
revoke execute on function public.drop_protection() from public, anon; grant execute on function public.drop_protection() to authenticated;
