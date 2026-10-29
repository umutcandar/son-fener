-- Fener Savaşı tam döngü: eşleştirme, aktivite puanı, Cum-Cmt çatışma, Vali, pg_cron ile faz/ödül (Europe/Istanbul)
create extension if not exists pg_cron;
alter table public.fw_week add column if not exists npc_target bigint, add column if not exists dmg_a bigint not null default 0, add column if not exists dmg_b bigint not null default 0,
 add column if not exists winner int, add column if not exists vali uuid references public.profiles on delete set null, add column if not exists settled boolean not null default false;
alter table public.fw_points drop constraint if exists fw_points_src_check;
alter table public.fw_points add constraint fw_points_src_check check(src in('build','train','help','kraken','raid','clash'));
alter table public.regions add column if not exists vali uuid references public.profiles on delete set null, add column if not exists vali_week text;
create table if not exists public.fw_day(user_id uuid not null references public.profiles on delete cascade, day text not null, src text not null, pts int not null default 0, n int not null default 0, primary key(user_id,day,src));
alter table public.fw_day enable row level security; revoke all on public.fw_day from anon, authenticated;
drop policy if exists fd_r on public.fw_day; create policy fd_r on public.fw_day for select to authenticated using(user_id=auth.uid()); grant select on public.fw_day to authenticated;

create or replace function public.fw_now() returns timestamp language sql stable as $$ select now() at time zone 'Europe/Istanbul' $$;
create or replace function public.fw_phase(t timestamp default public.fw_now()) returns text language sql stable as $$
 select case when extract(isodow from t)<=4 then 'prep' when extract(isodow from t)<=6 then 'clash' else 'reward' end $$;
create or replace function public.fw_wk(t timestamp default public.fw_now()) returns text language sql stable as $$ select to_char(t,'IYYY-"W"IW') $$;

-- haftalık eşleştirme: güce göre sırala, komşuları eşle; tek kalan bölge Sis Filosu (NPC) ile eşleşir
create or replace function public.fw_ensure() returns void language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); wk text:=public.fw_wk(t); mon timestamp:=date_trunc('week',t); r record; prev int; pw bigint; begin
 if exists(select 1 from public.fw_week where week=wk) then return; end if;
 perform pg_advisory_xact_lock(hashtext('fw_ensure'));
 if exists(select 1 from public.fw_week where week=wk) then return; end if;
 prev:=null;
 for r in select p.region_id id,sum(p.power) pw from public.profiles p where p.region_id is not null group by 1 order by 2 desc loop
  if prev is null then prev:=r.id; pw:=r.pw;
  else insert into public.fw_week(week,region_a,region_b,starts_at,ends_at) values(wk,prev,r.id,(mon) at time zone 'Europe/Istanbul',(mon+interval '7 days') at time zone 'Europe/Istanbul'); prev:=null; end if; end loop;
 if prev is not null then
  insert into public.fw_week(week,region_a,region_b,starts_at,ends_at,npc_target) values(wk,prev,null,(mon) at time zone 'Europe/Istanbul',(mon+interval '7 days') at time zone 'Europe/Istanbul',
   greatest(3000,coalesce((select (w.score_a*(0.85+random()*0.3))::bigint from public.fw_week w where w.region_a=prev and w.week<wk order by w.week desc limit 1),1500)));
 end if; end $$;

create or replace function public.fw_npc(w public.fw_week) returns bigint language sql stable as $$
 select case when w.region_b is not null then w.score_b else (w.npc_target*least(1,greatest(0,extract(epoch from now()-w.starts_at)/extract(epoch from (w.ends_at-interval '1 day')-w.starts_at))))::bigint end $$;

-- puan ekle (günlük tavanlı), yalnızca hazırlık + çatışma fazında
create or replace function public.fw_add(p_uid uuid, p_src text, p_pts int) returns int language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); d text:=to_char(t,'YYYY-MM-DD'); rid int; w public.fw_week; cap int; got int; add int; begin
 if p_pts<=0 or public.fw_phase(t)='reward' then return 0; end if;
 select region_id into rid from public.profiles where id=p_uid; if rid is null then return 0; end if;
 perform public.fw_ensure();
 select * into w from public.fw_week where week=public.fw_wk(t) and (region_a=rid or region_b=rid); if not found then return 0; end if;
 cap:=case p_src when 'build' then 200 when 'train' then 150 when 'help' then 100 when 'kraken' then 200 when 'raid' then 200 else 100000 end;
 insert into public.fw_day(user_id,day,src) values(p_uid,d,p_src) on conflict do nothing;
 select pts into got from public.fw_day where user_id=p_uid and day=d and src=p_src for update;
 add:=least(p_pts,cap-got); if add<=0 then return 0; end if;
 update public.fw_day set pts=pts+add where user_id=p_uid and day=d and src=p_src;
 insert into public.fw_points(week_id,user_id,region_id,src,pts) values(w.id,p_uid,rid,p_src,add) on conflict(week_id,user_id,src) do update set pts=public.fw_points.pts+excluded.pts;
 if w.region_a=rid then update public.fw_week set score_a=score_a+add where id=w.id; else update public.fw_week set score_b=score_b+add where id=w.id; end if;
 return add; end $$;
revoke all on function public.fw_add(uuid,text,int) from public, anon, authenticated;

-- tetikleyiciler: güç artışı (inşa/eğitim), Kraken hasarı, baskın/arena, yardım
create or replace function public.fw_trg_prof() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.power>old.power then perform public.fw_add(new.id,'build',least(200,((new.power-old.power)/20)::int)); end if;
 if new.kraken_dmg>(case when new.kraken_wk=old.kraken_wk then old.kraken_dmg else 0 end) then perform public.fw_add(new.id,'kraken',least(200,((new.kraken_dmg-(case when new.kraken_wk=old.kraken_wk then old.kraken_dmg else 0 end))/500)::int+5)); end if;
 return new; end $$;
drop trigger if exists fw_prof on public.profiles; create trigger fw_prof after update of power,kraken_dmg on public.profiles for each row execute function public.fw_trg_prof();
create or replace function public.fw_trg_battle() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.kind in('raid','arena','front') then perform public.fw_add(new.attacker,'raid',case when new.win then 30 else 10 end); end if; return new; end $$;
drop trigger if exists fw_battle on public.battles; create trigger fw_battle after insert on public.battles for each row execute function public.fw_trg_battle();
create or replace function public.fw_trg_help() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.fw_add(new.helper,'help',15); return new; end $$;
drop trigger if exists fw_help on public.help_given; create trigger fw_help after insert on public.help_given for each row execute function public.fw_trg_help();

-- çatışma saldırısı: Cum-Cmt, günde 3 hak; rakip bölgeden rastgele kaptan ya da Sis Filosu
create or replace function public.fw_attack() returns jsonb language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); d text:=to_char(t,'YYYY-MM-DD'); me public.profiles; w public.fw_week; opp int; did uuid; dnick text; dav text; dpw bigint; mp bigint; ep bigint; hp bigint; eh bigint; rs jsonb:='[]'; i int:=0; d1 bigint; d2 bigint; win boolean; dmg bigint; pts int; nn int; begin
 if public.fw_phase(t)<>'clash' then raise exception 'Çatışma yalnızca Cuma-Cumartesi'; end if;
 select * into me from public.profiles where id=auth.uid(); if me.region_id is null then raise exception 'Bölge yok'; end if;
 perform public.fw_ensure();
 select * into w from public.fw_week where week=public.fw_wk(t) and (region_a=me.region_id or region_b=me.region_id); if not found then raise exception 'Eşleşme yok'; end if;
 insert into public.fw_day(user_id,day,src) values(me.id,d,'clash') on conflict do nothing;
 select fd.n into nn from public.fw_day fd where fd.user_id=me.id and fd.day=d and fd.src='clash' for update; if nn>=3 then raise exception 'Bugünkü saldırı hakların bitti (3/3)'; end if;
 update public.fw_day fd set n=fd.n+1 where fd.user_id=me.id and day=d and src='clash';
 opp:=case when w.region_a=me.region_id then w.region_b else w.region_a end;
 if opp is not null then select id,nick,avatar,power into did,dnick,dav,dpw from public.profiles where region_id=opp and id<>me.id order by random() limit 1; end if;
 if did is null then dnick:='Sis Filosu'; dav:='🌫️'; dpw:=greatest(500,(me.power*(0.8+random()*0.45))::bigint); end if;
 mp:=greatest(me.power,100); ep:=greatest(dpw,100); hp:=mp*4; eh:=ep*4;
 while hp>0 and eh>0 and i<6 loop i:=i+1; d1:=(mp*(0.8+random()*0.5))::bigint; d2:=(ep*(0.8+random()*0.5))::bigint; eh:=greatest(0,eh-d1); hp:=greatest(0,hp-d2);
  rs:=rs||jsonb_build_object('d1',d1,'d2',d2,'eHp',eh,'hp',hp); end loop;
 win:=eh=0 or (hp>0 and eh::numeric/(ep*4)<hp::numeric/(mp*4)); dmg:=ep*4-eh; pts:=case when win then 120 else 40 end + least(80,(dmg/greatest(1,ep*4/80))::int);
 if w.region_a=me.region_id then update public.fw_week set dmg_b=dmg_b+dmg where id=w.id; else update public.fw_week set dmg_a=dmg_a+dmg where id=w.id; end if;
 pts:=public.fw_add(me.id,'clash',pts);
 return jsonb_build_object('kind','fw','win',win,'rounds',rs,'eMax',ep*4,'myMax',mp*4,'att_power',mp,'def_power',ep,'def_nick',dnick,'def_avatar',dav,'pts',pts,'left',2-nn); end $$;
revoke all on function public.fw_attack() from public, anon; grant execute on function public.fw_attack() to authenticated;

-- Pazar: kazananı belirle, Vali seç, ödülleri dağıt (bir kez)
create or replace function public.fw_settle(p_id bigint) returns void language plpgsql security definer set search_path='' as $$
declare w public.fw_week; sb bigint; win int; v uuid; r record; begin
 select * into w from public.fw_week where id=p_id for update; if w.settled then return; end if;
 sb:=public.fw_npc(w); win:=case when w.score_a>=sb then w.region_a else w.region_b end;
 if win is not null then select user_id into v from public.fw_points where week_id=w.id and region_id=win group by user_id order by sum(pts) desc limit 1;
  update public.regions set vali=v, vali_week=w.week where id=win; end if;
 for r in select user_id,region_id,sum(pts) s from public.fw_points where week_id=w.id group by 1,2 having sum(pts)>0 loop
  insert into public.events(user_id,kind,delta) values(r.user_id,'fw',jsonb_build_object('res',jsonb_build_object('gems',case when coalesce(r.region_id=win,false) then 200 else 60 end + case when r.user_id=v then 300 else 0 end,'wood',case when coalesce(r.region_id=win,false) then 2000 else 600 end),'win',coalesce(r.region_id=win,false),'vali',r.user_id=v,'week',w.week)); end loop;
 update public.fw_week set winner=win, vali=v, settled=true, score_b=case when region_b is null then sb else score_b end, phase='done' where id=w.id; end $$;
revoke all on function public.fw_settle(bigint) from public, anon, authenticated;

create or replace function public.fw_tick() returns void language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); ph text:=public.fw_phase(t); r record; begin
 perform public.fw_ensure();
 update public.fw_week set phase=ph where week=public.fw_wk(t) and not settled and phase<>ph;
 for r in select id from public.fw_week where not settled and (week<public.fw_wk(t) or (week=public.fw_wk(t) and ph='reward')) loop perform public.fw_settle(r.id); end loop; end $$;
revoke all on function public.fw_tick() from public, anon, authenticated;

create or replace function public.fener_war_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); mon timestamp:=date_trunc('week',t); wk text:=public.fw_wk(t); rid int; w public.fw_week; mine jsonb; us bigint; them bigint; usdmg bigint; thdmg bigint; opp int; tl int:=3; last jsonb; begin
 perform public.fw_tick();
 select region_id into rid from public.profiles where id=auth.uid();
 select * into w from public.fw_week where week=wk and (region_a=rid or region_b=rid);
 if w.id is not null then
  opp:=case when w.region_a=rid then w.region_b else w.region_a end;
  us:=case when w.region_a=rid then w.score_a else w.score_b end; them:=case when w.region_a=rid then public.fw_npc(w) else w.score_a end;
  thdmg:=case when w.region_a=rid then w.dmg_b else w.dmg_a end; usdmg:=case when w.region_a=rid then w.dmg_a else w.dmg_b end;
  select coalesce(jsonb_object_agg(src,pts),'{}') into mine from public.fw_points where week_id=w.id and user_id=auth.uid();
  select 3-coalesce((select n from public.fw_day where user_id=auth.uid() and day=to_char(t,'YYYY-MM-DD') and src='clash'),0) into tl; end if;
 select jsonb_build_object('week',x.week,'win',coalesce(x.winner=rid,false),'us',case when x.region_a=rid then x.score_a else x.score_b end,'them',case when x.region_a=rid then x.score_b else x.score_a end,
  'vali',(select nick from public.profiles where id=x.vali),'vali_me',x.vali=auth.uid()) into last from public.fw_week x where x.settled and (x.region_a=rid or x.region_b=rid) order by x.week desc limit 1;
 return jsonb_build_object('week',wk,'region',rid,'matched',w.id is not null,'opp',opp,'npc',w.id is not null and opp is null,'us',us,'them',them,'us_dmg',usdmg,'them_dmg',thdmg,'mine',coalesce(mine,'{}'),'left',tl,
  'top',(select coalesce(jsonb_agg(z),'[]') from (select p.nick,p.avatar,sum(f.pts) s from public.fw_points f join public.profiles p on p.id=f.user_id where f.week_id=w.id and f.region_id=rid group by 1,2 order by 3 desc limit 5) z),
  'vali',(select jsonb_build_object('nick',p.nick,'avatar',p.avatar,'me',p.id=auth.uid(),'week',g.vali_week) from public.regions g join public.profiles p on p.id=g.vali where g.id=rid),
  'last',last,'phase',public.fw_phase(t),'settled',coalesce(w.settled,false),
  'clash_at',(extract(epoch from (mon+interval '4 days') at time zone 'Europe/Istanbul')*1000)::bigint,
  'reward_at',(extract(epoch from (mon+interval '6 days') at time zone 'Europe/Istanbul')*1000)::bigint,
  'end_at',(extract(epoch from (mon+interval '7 days') at time zone 'Europe/Istanbul')*1000)::bigint); end $$;
revoke all on function public.fener_war_me() from public, anon; grant execute on function public.fener_war_me() to authenticated;

select cron.unschedule('fw_tick') where exists(select 1 from cron.job where jobname='fw_tick');
select cron.schedule('fw_tick','2 * * * *','select public.fw_tick()');

-- v2 (Batch 6): hafta ortasında açılan / ilk oyuncusu gelen bölge de eşleşsin (Sis Filosu, kalan süreye oranlı hedef);
-- test için zaman kaydırma yalnızca DB oturumu GUC'u ile (istemci SET yapamaz)
create or replace function public.fw_now() returns timestamp language sql stable as $$
 select coalesce(nullif(current_setting('sf.fw_now',true),'')::timestamp, now() at time zone 'Europe/Istanbul') $$;
create or replace function public.fw_ensure() returns void language plpgsql security definer set search_path='' as $$
declare t timestamp:=public.fw_now(); wk text:=public.fw_wk(t); mon timestamp:=date_trunc('week',t); r record; prev int; pw bigint; frac numeric; begin
 if exists(select 1 from public.fw_week where week=wk) and not exists(select 1 from public.profiles p where p.region_id is not null
   and not exists(select 1 from public.fw_week w where w.week=wk and (w.region_a=p.region_id or w.region_b=p.region_id))) then return; end if;
 perform pg_advisory_xact_lock(hashtext('fw_ensure'));
 if not exists(select 1 from public.fw_week where week=wk) then
  prev:=null;
  for r in select p.region_id id,sum(p.power) pw from public.profiles p where p.region_id is not null group by 1 order by 2 desc loop
   if prev is null then prev:=r.id; pw:=r.pw;
   else insert into public.fw_week(week,region_a,region_b,starts_at,ends_at) values(wk,prev,r.id,(mon) at time zone 'Europe/Istanbul',(mon+interval '7 days') at time zone 'Europe/Istanbul'); prev:=null; end if; end loop;
  if prev is not null then
   insert into public.fw_week(week,region_a,region_b,starts_at,ends_at,npc_target) values(wk,prev,null,(mon) at time zone 'Europe/Istanbul',(mon+interval '7 days') at time zone 'Europe/Istanbul',
    greatest(1200,coalesce((select (w.score_a*(0.85+random()*0.3))::bigint from public.fw_week w where w.region_a=prev and w.week<wk order by w.week desc limit 1),1200)));
  end if; return; end if;
 if public.fw_phase(t)='reward' then return; end if;
 frac:=greatest(0.15,1-extract(epoch from t-mon)/(6*86400));
 for r in select distinct p.region_id id from public.profiles p where p.region_id is not null
   and not exists(select 1 from public.fw_week w where w.week=wk and (w.region_a=p.region_id or w.region_b=p.region_id)) loop
  insert into public.fw_week(week,region_a,region_b,starts_at,ends_at,npc_target) values(wk,r.id,null,(t) at time zone 'Europe/Istanbul',(mon+interval '7 days') at time zone 'Europe/Istanbul',greatest(400,(1200*frac)::bigint))
   on conflict do nothing; end loop; end $$;
revoke all on function public.fw_ensure() from public, anon, authenticated;

-- Sis Filosu ilerlemesi de fw_now() saatini kullansın
create or replace function public.fw_npc(w public.fw_week) returns bigint language sql stable as $$
 select case when w.region_b is not null then w.score_b else (w.npc_target*least(1,greatest(0,extract(epoch from (public.fw_now() at time zone 'Europe/Istanbul')-w.starts_at)/extract(epoch from (w.ends_at-interval '1 day')-w.starts_at))))::bigint end $$;
