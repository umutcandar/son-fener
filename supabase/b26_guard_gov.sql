-- B26: never lose captains + governor perks (additive; no data deletion)
create table if not exists public.hero_pending(user_id uuid references auth.users on delete cascade, hero_id text not null, data jsonb, why text, at timestamptz default now(), primary key(user_id,hero_id));
alter table public.hero_pending enable row level security;
drop policy if exists hp_own on public.hero_pending; create policy hp_own on public.hero_pending for select using (user_id=auth.uid());
-- Rule (docs/KAPTAN_GUVENCE.md): unknown heroes in a save are never silently lost.
--  * sisnur: kept when monet.marks>=45; else parked in hero_pending and restored automatically once marks>=45.
--  * other valid pool heroes (legacy offline summons): auto-granted (src 'offline') up to 3 per account, max 1 legendary.
--  * anything beyond that (implausible) is parked in hero_pending (kept for review), not deleted.
create or replace function public.sf_hero_guard(u uuid, d jsonb, out d2 jsonb, out n int) language plpgsql security definer set search_path='' as $$
declare k text; v jsonb; h jsonb:='{}'; ss public.summon_state; ok boolean; mk boolean; off int; offl int; p record;
begin n:=0; d2:=d;
 mk:=exists(select 1 from public.monet where user_id=u and marks>=45);
 select count(*), count(*) filter (where hero_id=any(public.sf_summon_pool(3))) into off, offl from public.hero_own where user_id=u and src='offline';
 if jsonb_typeof(d->'heroes')='object' then
  for k,v in select * from jsonb_each(d->'heroes') loop
   ok:= k='ali' or exists(select 1 from public.hero_own where user_id=u and hero_id=k);
   if not ok and k='sisnur' and mk then insert into public.hero_own values(u,k,'season') on conflict do nothing; ok:=true; end if;
   if not ok and k<>'sisnur' and off<3 and (k=any(public.sf_summon_pool(1)) or k=any(public.sf_summon_pool(2)) or (k=any(public.sf_summon_pool(3)) and offl<1)) then
    insert into public.hero_own values(u,k,'offline') on conflict do nothing; ok:=true; off:=off+1; if k=any(public.sf_summon_pool(3)) then offl:=offl+1; end if; end if;
   if ok then h:=h||jsonb_build_object(k,v); else n:=n+1;
    insert into public.hero_pending(user_id,hero_id,data,why) values(u,k,v,case when k='sisnur' then 'season' else 'offline' end) on conflict (user_id,hero_id) do update set data=excluded.data, at=now(); end if; end loop;
  -- restore parked season captain once it is earned
  if mk and not h ? 'sisnur' then select * into p from public.hero_pending where user_id=u and hero_id='sisnur';
   if found then h:=h||jsonb_build_object('sisnur',coalesce(p.data,'{"lv":1,"star":1}')); insert into public.hero_own values(u,'sisnur','season') on conflict do nothing; n:=n+1; end if; end if;
  if n>0 then d2:=jsonb_set(d2,'{heroes}',h); end if; end if;
 select * into ss from public.summon_state where user_id=u;
 if found then
  if public.sf_n(d2,'{pity}',1e6) is distinct from ss.pity::numeric or public.sf_n(d2,'{pity2}',1e6) is distinct from ss.pity2::numeric or public.sf_n(d2,'{selTok}',1e6) is distinct from ss.sel::numeric then n:=n+1; end if;
  d2:=jsonb_set(jsonb_set(jsonb_set(d2,'{pity}',to_jsonb(ss.pity)),'{pity2}',to_jsonb(ss.pity2)),'{selTok}',to_jsonb(ss.sel)); end if;
end $$;
revoke all on function public.sf_hero_guard(uuid,jsonb) from public, anon, authenticated;
-- season captain via mark claim is recorded server-side immediately
create or replace function public.sf_trg_monet_sisnur() returns trigger language plpgsql security definer set search_path='' as $$
begin if new.marks>=45 then insert into public.hero_own values(new.user_id,'sisnur','season') on conflict do nothing; end if; return new; end $$;
drop trigger if exists monet_sisnur on public.monet; create trigger monet_sisnur after insert or update of marks on public.monet for each row execute function public.sf_trg_monet_sisnur();

-- governor helpers
create or replace function public.sf_is_gov(c uuid) returns boolean language sql stable security definer set search_path='' as $$
 select c is not null and exists(select 1 from public.sea_zone where gov_clan=c) $$;
create or replace function public.gov_list() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('clans',coalesce((select jsonb_agg(jsonb_build_object('id',gov_clan,'z',code)) from public.sea_zone where gov_clan is not null),'[]'),
  'users',coalesce((select jsonb_agg(distinct m.user_id) from public.clan_members m join public.sea_zone z on z.gov_clan=m.clan_id),'[]')) $$;
revoke all on function public.gov_list() from public, anon; grant execute on function public.gov_list() to authenticated;

-- election close + result mail to members of the winning clan (+30 gems)
create or replace function public.zone_close(p_wk text default null) returns int language plpgsql security definer set search_path='' as $$
declare vwk text:=coalesce(p_wk,to_char((now() at time zone 'Europe/Istanbul')-interval '1 day','IYYY-IW')); z record; best record; n int:=0; m record;
begin for z in select * from public.sea_zone loop
  if exists(select 1 from public.zone_gov_log where zone_id=z.id and zone_gov_log.wk=vwk) then continue; end if;
  select cand_clan, sum(weight) sc into best from public.zone_vote v where v.zone_id=z.id and v.wk=vwk and exists(select 1 from public.clans where id=v.cand_clan) group by cand_clan order by 2 desc, min(at) limit 1;
  insert into public.zone_gov_log values(z.id,vwk,best.cand_clan,best.sc,now());
  update public.sea_zone set gov_clan=best.cand_clan, gov_wk=vwk where id=z.id; n:=n+1;
  if best.cand_clan is not null then
   for m in select user_id from public.clan_members where clan_id=best.cand_clan loop
    perform public.sf_mail(m.user_id,'system','mail.gov_win',jsonb_build_array('z:'||z.code,vwk),'{"gems":30}'::jsonb); end loop;
   for m in select cm.user_id from public.clan_members cm join public.clan_zone cz on cz.clan_id=cm.clan_id where cz.zone_id=z.id and cm.clan_id<>best.cand_clan loop
    perform public.sf_mail(m.user_id,'system','mail.gov_lost',jsonb_build_array('z:'||z.code,(select tag from public.clans where id=best.cand_clan)),null); end loop;
  end if; end loop; return n; end $$;
revoke all on function public.zone_close(text) from public, anon, authenticated;

-- save_game: governing clan gets +5% production headroom (single, capped)
CREATE OR REPLACE FUNCTION public.save_game(p_data jsonb, p_rev integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cl uuid:=public.my_clan(); bp numeric:=0.02*coalesce(public.clan_tech_lv(public.my_clan(),'prod'),0)+case when public.sf_is_gov(public.my_clan()) then 0.05 else 0 end; bs numeric:=0.05*coalesce(public.clan_tech_lv(public.my_clan(),'store'),0); s public.saves; dt numeric; k text; capv numeric; ov numeric; nv numeric; fl int:=0; a record; d jsonb:=p_data; al jsonb;
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if octet_length(p_data::text)>200000 then raise exception 'kayıt çok büyük'; end if;
 perform public.ensure_profile();
 select * into s from public.saves where user_id=auth.uid() for update;
 if found then
  if p_rev is distinct from s.rev then return jsonb_build_object('conflict',true,'rev',s.rev,'data',s.data,'updated_at',s.updated_at); end if;
  dt:=least(greatest(extract(epoch from now()-s.updated_at),1),28800); al:=s.allow;
  for k in select unnest(array['fish','wood','crys']) loop
   ov:=public.sf_n(s.data,array['res',k],1e12); nv:=public.sf_n(d,array['res',k],1e12);
   capv:=ov+4000*(1+bs)+dt*(25+ov*0.0004)*(1+bp)+coalesce((al->>k)::numeric,0);
   if nv>capv then d:=jsonb_set(d,array['res',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  ov:=public.sf_n(s.data,'{gems}',1e9); nv:=public.sf_n(d,'{gems}',1e9); capv:=ov+3000+dt*0.1+coalesce((al->>'gems')::numeric,0);
  if nv>capv then d:=jsonb_set(d,'{gems}',to_jsonb(floor(capv))); fl:=fl+1; end if;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop
   ov:=public.sf_n(s.data,array['troops',k],1e6); nv:=public.sf_n(d,array['troops',k],1e6); capv:=ov+300+dt*1.5;
   if nv>capv then d:=jsonb_set(d,array['troops',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  ov:=public.sf_n(s.data,'{ush}',1e6); nv:=public.sf_n(d,'{ush}',1e6); capv:=ov+60+dt*0.003+coalesce((al->>'ush')::numeric,0);
  if nv>capv then d:=jsonb_set(d,'{ush}',to_jsonb(floor(capv))); fl:=fl+1; end if;
  select g.d2,g.n into d,ov from public.sf_hero_guard(auth.uid(),d) g; fl:=fl+ov::int;
 update public.saves set data=d, rev=rev+1, allow='{}', flags=flags+fl, updated_at=now() where user_id=auth.uid() returning * into s;
 else
  for k in select unnest(array['fish','wood','crys']) loop if public.sf_n(d,array['res',k],1e12)>50000 then d:=jsonb_set(d,array['res',k],'50000'); fl:=fl+1; end if; end loop;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop if public.sf_n(d,array['troops',k],1e6)>2000 then d:=jsonb_set(d,array['troops',k],'2000'); fl:=fl+1; end if; end loop;
  if public.sf_n(d,'{ush}',1e6)>200 then d:=jsonb_set(d,'{ush}','200'); fl:=fl+1; end if;
 select g.d2,g.n into d,ov from public.sf_hero_guard(auth.uid(),d) g; fl:=fl+ov::int;
  insert into public.saves(user_id,data,flags) values(auth.uid(),d,fl) returning * into s;
 end if;
 select * into a from public.sf_army(d);
 update public.profiles set power=a.power, stage=least(public.sf_n(d,'{stage}',1000),1000)::int where id=auth.uid();
 return jsonb_build_object('ok',true,'rev',s.rev,'clamped',fl,'data',case when fl>0 then d end,'power',a.power); end $function$
;
