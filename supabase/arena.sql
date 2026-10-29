alter table public.battles add column kind text not null default 'raid', add column revenged boolean not null default false;
create table public.arena(user_id uuid primary key references public.profiles on delete cascade, rating int not null default 1000, season text not null default '',
 lineup jsonb not null default '[]', tickets int not null default 5, ticket_day text not null default '', wins int not null default 0, losses int not null default 0, best int not null default 1000);
alter table public.arena enable row level security; create policy a_read on public.arena for select to authenticated using(true);
revoke insert,update,delete on public.arena from authenticated; revoke all on public.arena from anon;
-- kaptan gücü: dizilimdeki (en fazla 3) kaptan; sahip olunmayan atlanır
create or replace function public.sf_caps(d jsonb, lineup jsonb, out atk numeric, out hp numeric, out power int, out heroes jsonb) language plpgsql stable set search_path='' as $$
declare r record; sa numeric:=0; sh numeric:=0; hb numeric:=0; ids text[]; begin heroes:='[]';
 select array_agg(x) into ids from (select distinct jsonb_array_elements_text(case when jsonb_typeof(lineup)='array' then lineup else '[]' end) x limit 3) t;
 for r in select h.*, round(h.p*(1+.5*(public.sf_n(d,array['heroes',h.id,'star'],6)-1))*(1+.1*(greatest(public.sf_n(d,array['heroes',h.id,'lv'],60),1)-1))) hp_, public.sf_n(d,array['heroes',h.id,'star'],6) st
  from public.hero_def h where d->'heroes' ? h.id and public.sf_n(d,array['heroes',h.id,'star'],6)>=1 and (ids is null or h.id=any(ids)) order by 5 desc limit 3 loop
  hb:=hb+r.hp_; heroes:=heroes||jsonb_build_object('id',r.id,'p',r.hp_);
  if r.sk_t='atk' then sa:=sa+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='hp' then sh:=sh+r.sk_v*(1+.25*(r.st-1)); end if; end loop;
 atk:=hb*1.2*(1+public.sf_n(d,'{gear,cannon}',10)*.06)*(1+sa); hp:=hb*4*(1+public.sf_n(d,'{gear,plate}',10)*.06)*(1+sh); power:=round(hb*2); end $$;
create or replace function public.sf_duel(a jsonb, b jsonb, out win boolean, out rounds jsonb, out amax numeric, out bmax numeric) language plpgsql volatile set search_path='' as $$
declare ah numeric:=(a->>'hp')::numeric; bh numeric:=(b->>'hp')::numeric; d1 numeric; d2 numeric; begin amax:=ah; bmax:=bh; rounds:='[]';
 for i in 1..12 loop exit when ah<=0 or bh<=0; d1:=round((a->>'atk')::numeric*(.85+random()*.3)); bh:=greatest(0,bh-d1); d2:=0;
  if bh>0 then d2:=round((b->>'atk')::numeric*(.85+random()*.3)); ah:=greatest(0,ah-d2); end if; rounds:=rounds||jsonb_build_object('d1',d1,'d2',d2,'hp',ah,'eHp',bh); end loop;
 win:= bh<=0 or (ah>0 and ah/amax > bh/bmax); end $$;
create or replace function public.sf_tier(r int) returns text language sql immutable set search_path='' as $$
 select case when r>=1800 then 'Efsane' when r>=1500 then 'Elmas' when r>=1300 then 'Altın' when r>=1100 then 'Gümüş' else 'Bronz' end $$;
-- arena kaydı + sezon (aylık) geçişi + günlük bilet
create or replace function public.arena_me() returns public.arena language plpgsql security definer set search_path='' as $$
declare a public.arena; s text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM'); d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); g int;
begin perform public.ensure_profile(); insert into public.arena(user_id,season,ticket_day) values(auth.uid(),s,d) on conflict do nothing;
 select * into a from public.arena where user_id=auth.uid() for update;
 if a.season<>s then g:=case public.sf_tier(a.rating) when 'Efsane' then 500 when 'Elmas' then 300 when 'Altın' then 180 when 'Gümüş' then 100 else 50 end;
  if a.wins+a.losses>0 then insert into public.events(user_id,kind,delta) values(auth.uid(),'season',jsonb_build_object('res',jsonb_build_object('gems',g),'tier',public.sf_tier(a.rating),'season',a.season)); end if;
  update public.arena set season=s, rating=(rating+1000)/2, wins=0, losses=0 where user_id=auth.uid(); end if;
 if a.ticket_day<>d then update public.arena set tickets=5, ticket_day=d where user_id=auth.uid(); end if;
 select * into a from public.arena where user_id=auth.uid(); return a; end $$;
create or replace function public.arena_set_lineup(p jsonb) returns void language plpgsql security definer set search_path='' as $$
begin perform public.arena_me(); if jsonb_typeof(p)<>'array' or jsonb_array_length(p)>3 or exists(select 1 from jsonb_array_elements_text(p) x where x not in(select id from public.hero_def)) then raise exception 'Geçersiz dizilim'; end if;
 update public.arena set lineup=p where user_id=auth.uid(); end $$;
create or replace function public.arena_opponents() returns table(id uuid,nick text,avatar text,rating int,tier text,power int) language sql security definer set search_path='' as $$
 with me as (select rating from public.arena_me())
 select a.user_id,p.nick,p.avatar,a.rating,public.sf_tier(a.rating),(public.sf_caps(s.data,a.lineup)).power from public.arena a join public.profiles p on p.id=a.user_id join public.saves s on s.user_id=a.user_id, me
 where a.user_id<>auth.uid() order by abs(a.rating-me.rating), random() limit 5 $$;
create or replace function public.sf_cap_fight(p_target uuid, p_kind text) returns jsonb language plpgsql security definer set search_path='' as $$
declare ad jsonb; dd jsonb; A record; D record; R record; me public.arena; tg public.arena; ch int:=0; bid bigint; mp public.profiles; tp public.profiles; begin
 if p_target=auth.uid() then raise exception 'Kendinle savaşamazsın'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target; if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into mp from public.profiles where id=auth.uid(); select * into tp from public.profiles where id=p_target;
 if p_kind='arena' then me:=public.arena_me(); if me.tickets<=0 then raise exception 'Bugünkü arena biletin bitti'; end if;
  select * into tg from public.arena where user_id=p_target; if not found then raise exception 'Rakip arenada değil'; end if; else
  if exists(select 1 from public.battles where attacker=auth.uid() and kind='duel' and created_at>now()-interval '15 seconds') then raise exception 'Biraz bekle'; end if;
  select * into tg from public.arena where user_id=p_target; end if;
 select * into A from public.sf_caps(ad,'[]'); select * into D from public.sf_caps(dd,coalesce(tg.lineup,'[]'));
 if A.power<=0 then raise exception 'Kaptanın yok'; end if;
 select * into R from public.sf_duel(jsonb_build_object('atk',A.atk,'hp',A.hp),jsonb_build_object('atk',D.atk*1.05,'hp',D.hp*1.05));
 if p_kind='arena' then ch:=round(32*((case when R.win then 1 else 0 end)-1/(1+power(10,(tg.rating-me.rating)/400.0))));
  update public.arena set rating=greatest(0,rating+ch), tickets=tickets-1, wins=wins+(R.win)::int, losses=losses+(not R.win)::int, best=greatest(best,rating+ch) where user_id=auth.uid();
  update public.arena set rating=greatest(0,rating-ch/2) where user_id=p_target; end if;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power,kind)
  values(auth.uid(),p_target,R.win,jsonb_build_object('rating',ch,'a',A.heroes,'d',D.heroes),'{}','{}',R.rounds,mp.nick,tp.nick,A.power,D.power,p_kind) returning id into bid;
 return jsonb_build_object('id',bid,'kind',p_kind,'win',R.win,'rounds',R.rounds,'myMax',R.amax,'eMax',R.bmax,'rating_change',ch,'a',A.heroes,'d',D.heroes,'def_nick',tp.nick,'def_avatar',tp.avatar,'att_power',A.power,'def_power',D.power,
  'arena',(select to_jsonb(x) from public.arena x where user_id=auth.uid())); end $$;
create or replace function public.arena_fight(p_target uuid) returns jsonb language sql security definer set search_path='' as $$ select public.sf_cap_fight(p_target,'arena') $$;
create or replace function public.duel(p_target uuid) returns jsonb language sql security definer set search_path='' as $$ select public.sf_cap_fight(p_target,'duel') $$;
create or replace function public.arena_board() returns table(id uuid,nick text,avatar text,rating int,tier text) language sql stable security definer set search_path='' as $$
 select a.user_id,p.nick,p.avatar,a.rating,public.sf_tier(a.rating) from public.arena a join public.profiles p on p.id=a.user_id where a.wins+a.losses>0 or a.rating<>1000 order by a.rating desc limit 50 $$;
-- intikam: son 24 saatte bana saldırana kalkan yok sayılarak bir kez saldır
create or replace function public.revenge(p_battle bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare b public.battles; sh timestamptz; r jsonb; begin select * into b from public.battles where id=p_battle and defender=auth.uid() and kind='raid' for update;
 if not found or b.revenged or b.created_at<now()-interval '24 hours' then raise exception 'İntikam alınamaz'; end if;
 update public.battles set revenged=true where id=p_battle; select shield_until into sh from public.profiles where id=b.attacker;
 update public.profiles set shield_until=now()-interval '1 second' where id=b.attacker;
 r:=public.raid(b.attacker); update public.profiles set shield_until=greatest(sh,shield_until) where id=b.attacker; return r||'{"revenge":true}'; end $$;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.sf_army(jsonb), public.sf_n(jsonb,text[],numeric), public.sf_caps(jsonb,jsonb), public.sf_duel(jsonb,jsonb), public.sf_cap_fight(uuid,text) from authenticated;
