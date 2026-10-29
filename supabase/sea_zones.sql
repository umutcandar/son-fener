-- B25: Sea Zones & Governor (additive). Each server sea (public.regions) has 7 zones.
create table if not exists public.sea_zone(id serial primary key, region_id int not null references public.regions(id), code text not null, ic text not null default '🌊', gov_clan uuid references public.clans(id) on delete set null, gov_wk text, unique(region_id,code));
create table if not exists public.clan_zone(clan_id uuid primary key references public.clans(id) on delete cascade, zone_id int not null references public.sea_zone(id), since timestamptz not null default now());
create table if not exists public.zone_influence(zone_id int references public.sea_zone(id), clan_id uuid references public.clans(id) on delete cascade, wk text not null, pts bigint not null default 0, primary key(zone_id,clan_id,wk));
create table if not exists public.zone_vote(zone_id int references public.sea_zone(id), wk text not null, voter uuid references auth.users on delete cascade, voter_clan uuid not null, cand_clan uuid not null, weight numeric not null, at timestamptz not null default now(), primary key(zone_id,wk,voter));
create table if not exists public.zone_gov_log(zone_id int references public.sea_zone(id), wk text not null, clan_id uuid, score numeric, at timestamptz default now(), primary key(zone_id,wk));
alter table public.sea_zone enable row level security; alter table public.clan_zone enable row level security; alter table public.zone_influence enable row level security; alter table public.zone_vote enable row level security; alter table public.zone_gov_log enable row level security;
drop policy if exists sz_r on public.sea_zone; create policy sz_r on public.sea_zone for select to authenticated using (true);
drop policy if exists cz_r on public.clan_zone; create policy cz_r on public.clan_zone for select to authenticated using (true);
drop policy if exists zi_r on public.zone_influence; create policy zi_r on public.zone_influence for select to authenticated using (true);
drop policy if exists zg_r on public.zone_gov_log; create policy zg_r on public.zone_gov_log for select to authenticated using (true);
drop policy if exists zv_r on public.zone_vote; create policy zv_r on public.zone_vote for select to authenticated using (voter=auth.uid());
-- seed 7 zones for every existing sea
insert into public.sea_zone(region_id,code,ic) select r.id,z.c,z.i from public.regions r, (values('kuzey','🧭'),('mercan','🪸'),('sis','🌫️'),('firtina','⛈️'),('inci','🦪'),('buzul','🧊'),('volkan','🌋')) z(c,i) on conflict do nothing;

-- influence: craid damage this week /100 + 20 per member (computed server-side)
create or replace function public.zone_influence_tick() returns void language sql security definer set search_path='' as $$
 insert into public.zone_influence(zone_id,clan_id,wk,pts)
 select cz.zone_id,cz.clan_id,public.sf_craid_wk(),
  coalesce((select sum(dmg) from public.clan_raid_log l where l.clan_id=cz.clan_id and l.wk=public.sf_craid_wk()),0)/100
  +20*(select count(*) from public.clan_members m where m.clan_id=cz.clan_id)
 from public.clan_zone cz on conflict (zone_id,clan_id,wk) do update set pts=excluded.pts $$;

-- leader picks the clan's home zone (once per week)
create or replace function public.zone_join(p_zone int) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); r text; z public.sea_zone; cur public.clan_zone;
begin if c is null then raise exception 'Klan yok'; end if;
 select role into r from public.clan_members where user_id=auth.uid() and clan_id=c; if r is distinct from 'lider' then raise exception 'Sadece lider'; end if;
 select * into z from public.sea_zone where id=p_zone; if not found or z.region_id is distinct from (select region_id from public.clans where id=c) then raise exception 'Geçersiz bölge'; end if;
 select * into cur from public.clan_zone where clan_id=c;
 if found and cur.zone_id<>p_zone and cur.since>now()-interval '7 days' then raise exception 'Bölge haftada bir değişir'; end if;
 if exists(select 1 from public.sea_zone where gov_clan=c and id<>p_zone) then raise exception 'Vali klan bölge değiştiremez'; end if;
 insert into public.clan_zone values(c,p_zone,now()) on conflict (clan_id) do update set zone_id=excluded.zone_id, since=case when public.clan_zone.zone_id=excluded.zone_id then public.clan_zone.since else now() end;
 perform public.zone_influence_tick(); return jsonb_build_object('ok',true,'zone',p_zone); end $$;

-- leaders/officers vote; weight = sqrt(own clan influence in that zone)
create or replace function public.zone_vote_cast(p_cand uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); r text; zid int; w numeric; vwk text:=public.sf_craid_wk();
begin if c is null then raise exception 'Klan yok'; end if;
 select role into r from public.clan_members where user_id=auth.uid() and clan_id=c; if r is null or r='üye' then raise exception 'Sadece lider/subay'; end if;
 select zone_id into zid from public.clan_zone where clan_id=c; if zid is null then raise exception 'Önce bölge seç'; end if;
 if not exists(select 1 from public.clan_zone where clan_id=p_cand and zone_id=zid) then raise exception 'Aday bu bölgede değil'; end if;
 if (select count(*) from public.zone_gov_log g where g.zone_id=zid and g.clan_id=p_cand and g.wk in (select to_char((now() at time zone 'Europe/Istanbul')-make_interval(days=>7*i),'IYYY-IW') from generate_series(1,2) i))>=2 then raise exception 'Aday üst üste 3. hafta olamaz'; end if;
 perform public.zone_influence_tick();
 select sqrt(greatest(pts,0)) into w from public.zone_influence where zone_id=zid and clan_id=c and zone_influence.wk=vwk; w:=coalesce(w,0);
 insert into public.zone_vote values(zid,vwk,auth.uid(),c,p_cand,w,now()) on conflict (zone_id,wk,voter) do update set cand_clan=excluded.cand_clan, weight=excluded.weight, at=now();
 return jsonb_build_object('ok',true,'weight',round(w,1)); end $$;

-- close previous week's elections (cron Mondays 00:05 Istanbul = Sun 21:05 UTC); idempotent
create or replace function public.zone_close(p_wk text default null) returns int language plpgsql security definer set search_path='' as $$
declare vwk text:=coalesce(p_wk,to_char((now() at time zone 'Europe/Istanbul')-interval '1 day','IYYY-IW')); z record; best record; n int:=0;
begin for z in select * from public.sea_zone loop
  if exists(select 1 from public.zone_gov_log where zone_id=z.id and zone_gov_log.wk=vwk) then continue; end if;
  select cand_clan, sum(weight) sc into best from public.zone_vote v where v.zone_id=z.id and v.wk=vwk and exists(select 1 from public.clans where id=v.cand_clan) group by cand_clan order by 2 desc, min(at) limit 1;
  insert into public.zone_gov_log values(z.id,vwk,best.cand_clan,best.sc,now());
  update public.sea_zone set gov_clan=best.cand_clan, gov_wk=vwk where id=z.id; n:=n+1; end loop; return n; end $$;

-- read model for the UI
create or replace function public.zones_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); rg int; mz int; vwk text:=public.sf_craid_wk();
begin select region_id into rg from public.profiles where id=auth.uid(); select zone_id into mz from public.clan_zone where clan_id=c;
 return jsonb_build_object('wk',vwk,'clan',c,'role',(select role from public.clan_members where user_id=auth.uid()),'my_zone',mz,
  'my_vote',(select cand_clan from public.zone_vote where voter=auth.uid() and zone_vote.wk=vwk),
  'zones',(select coalesce(jsonb_agg(jsonb_build_object('id',z.id,'code',z.code,'ic',z.ic,'gov',(select jsonb_build_object('id',k.id,'tag',k.tag,'name',k.name) from public.clans k where k.id=z.gov_clan),
     'clans',(select coalesce(jsonb_agg(jsonb_build_object('id',k.id,'tag',k.tag,'name',k.name,'icon',k.icon,'inf',coalesce(i.pts,0),'votes',coalesce((select round(sum(weight),1) from public.zone_vote v where v.zone_id=z.id and v.wk=vwk and v.cand_clan=k.id),0)) order by coalesce(i.pts,0) desc),'[]') from public.clan_zone cz join public.clans k on k.id=cz.clan_id left join public.zone_influence i on i.zone_id=z.id and i.clan_id=k.id and i.wk=vwk where cz.zone_id=z.id)) order by z.id),'[]') from public.sea_zone z where z.region_id=rg)); end $$;

revoke all on function public.zone_influence_tick() from public, anon, authenticated;
revoke all on function public.zone_close(text) from public, anon, authenticated;
revoke all on function public.zone_join(int), public.zone_vote_cast(uuid), public.zones_me() from public, anon;
grant execute on function public.zone_join(int), public.zone_vote_cast(uuid), public.zones_me() to authenticated;
select cron.schedule('zone_tick','17 * * * *','select public.zone_influence_tick()');
select cron.schedule('zone_close','5 21 * * 0','select public.zone_close()');
