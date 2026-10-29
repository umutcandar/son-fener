-- B25: hero ownership ledger + save_game guard (additive; no data deletion)
create table if not exists public.hero_own(user_id uuid references auth.users on delete cascade, hero_id text not null, src text not null, at timestamptz default now(), primary key(user_id,hero_id));
alter table public.hero_own enable row level security;
drop policy if exists ho_own on public.hero_own; create policy ho_own on public.hero_own for select using (user_id=auth.uid());
-- one-time baseline: every hero currently in a cloud save is legit
insert into public.hero_own(user_id,hero_id,src)
 select s.user_id,k,'baseline' from public.saves s, jsonb_object_keys(case when jsonb_typeof(s.data->'heroes')='object' then s.data->'heroes' else '{}'::jsonb end) k on conflict do nothing;
create or replace function public.sf_hero_guard(u uuid, d jsonb, out d2 jsonb, out n int) language plpgsql security definer set search_path='' as $$
declare k text; v jsonb; h jsonb:='{}'; ss public.summon_state; ok boolean;
begin n:=0; d2:=d;
 if jsonb_typeof(d->'heroes')='object' then
  for k,v in select * from jsonb_each(d->'heroes') loop
   ok:= k='ali' or exists(select 1 from public.hero_own where user_id=u and hero_id=k);
   if not ok and k='sisnur' and exists(select 1 from public.monet where user_id=u and marks>=45) then
    insert into public.hero_own values(u,k,'season') on conflict do nothing; ok:=true; end if;
   if ok then h:=h||jsonb_build_object(k,v); else n:=n+1; end if; end loop;
  if n>0 then d2:=jsonb_set(d2,'{heroes}',h); end if; end if;
 select * into ss from public.summon_state where user_id=u;
 if found then
  if public.sf_n(d2,'{pity}',1e6) is distinct from ss.pity::numeric or public.sf_n(d2,'{pity2}',1e6) is distinct from ss.pity2::numeric or public.sf_n(d2,'{selTok}',1e6) is distinct from ss.sel::numeric then n:=n+1; end if;
  d2:=jsonb_set(jsonb_set(jsonb_set(d2,'{pity}',to_jsonb(ss.pity)),'{pity2}',to_jsonb(ss.pity2)),'{selTok}',to_jsonb(ss.sel)); end if;
end $$;
revoke all on function public.sf_hero_guard(uuid,jsonb) from public, anon, authenticated;
create or replace function public.summon(p_n int, p_pay text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sv public.saves; d jsonb; s public.summon_state; today text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 cost int:=0; i int; r numeric; rar int; pool text[]; id text; nw boolean; outj jsonb:='[]'; g numeric; tk numeric; ush numeric:=0; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if p_n not in (1,10) or p_pay not in ('free','ticket','gems') or (p_pay<>'gems' and p_n<>1) then raise exception 'Geçersiz çağrı'; end if;
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if;
 d:=sv.data; s:=public.sf_summon_state(u,d);
 g:=public.sf_n(d,'{gems}',1e9); tk:=public.sf_n(d,'{tickets}',1e6);
 if p_pay='free' then if coalesce(s.free_day,'')=today then raise exception 'Bugünkü ücretsiz çağrı kullanıldı'; end if; s.free_day:=today;
 elsif p_pay='ticket' then if tk<1 then raise exception 'Bilet yok'; end if; d:=jsonb_set(d,'{tickets}',to_jsonb(tk-1));
 else cost:=case when p_n=1 then 30 else 270 end; if g<cost then raise exception 'Elmas yetersiz'; end if; d:=jsonb_set(d,'{gems}',to_jsonb(g-cost)); end if;
 for i in 1..p_n loop
  s.pity:=s.pity+1; s.pity2:=s.pity2+1; if s.pity2>=80 then s.pity2:=0; s.sel:=s.sel+1; end if;
  r:=random()*100; rar:=case when r<5 then 3 when r<30 then 2 else 1 end; if s.pity>=40 then rar:=3; end if; if rar=3 then s.pity:=0; end if;
  pool:=public.sf_summon_pool(rar); id:=pool[1+floor(random()*array_length(pool,1))::int];
  select x.d2,x.isnew into d,nw from public.sf_summon_apply(d,id) x; if not nw then ush:=ush+2; end if;
  outj:=outj||jsonb_build_array(jsonb_build_object('id',id,'r',rar,'new',nw)); end loop;
 d:=jsonb_set(d,'{ush}',to_jsonb(public.sf_n(d,'{ush}',1e6)+ush)); d:=jsonb_set(d,'{pity}',to_jsonb(s.pity)); d:=jsonb_set(d,'{pity2}',to_jsonb(s.pity2)); d:=jsonb_set(d,'{selTok}',to_jsonb(s.sel));
 update public.summon_state set pity=s.pity,pity2=s.pity2,sel=s.sel,total=s.total+p_n,free_day=s.free_day where user_id=u;
 insert into public.hero_own(user_id,hero_id,src) select u,k,'summon' from jsonb_object_keys(coalesce(d->'heroes','{}'::jsonb)) k on conflict do nothing;
 update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 insert into public.summon_log(user_id,n,pay,cost,out) values(u,p_n,p_pay,cost,outj);
 return jsonb_build_object('rev',sv.rev,'out',outj,'gems',d->'gems','tickets',d->'tickets','ush',d->'ush','heroes',d->'heroes','pity',s.pity,'pity2',s.pity2,'sel',s.sel); end $$;

create or replace function public.summon_pick(p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sv public.saves; d jsonb; s public.summon_state; nw boolean; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if not p_id=any(public.sf_summon_pool(3)) then raise exception 'Geçersiz kaptan'; end if;
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if;
 d:=sv.data; s:=public.sf_summon_state(u,d); if s.sel<1 then raise exception 'Seçim hakkın yok'; end if;
 select x.d2,x.isnew into d,nw from public.sf_summon_apply(d,p_id) x; d:=jsonb_set(d,'{selTok}',to_jsonb(s.sel-1));
 insert into public.hero_own(user_id,hero_id,src) select u,k,'summon' from jsonb_object_keys(coalesce(d->'heroes','{}'::jsonb)) k on conflict do nothing;
 update public.summon_state set sel=sel-1 where user_id=u; update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 insert into public.summon_log(user_id,n,pay,cost,out) values(u,1,'pick',0,jsonb_build_array(jsonb_build_object('id',p_id,'r',3,'new',nw)));
 return jsonb_build_object('rev',sv.rev,'out',jsonb_build_array(jsonb_build_object('id',p_id,'r',3,'new',nw)),'heroes',d->'heroes','sel',s.sel-1); end $$;
CREATE OR REPLACE FUNCTION public.save_game(p_data jsonb, p_rev integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cl uuid:=public.my_clan(); bp numeric:=0.02*coalesce(public.clan_tech_lv(public.my_clan(),'prod'),0); bs numeric:=0.05*coalesce(public.clan_tech_lv(public.my_clan(),'store'),0); s public.saves; dt numeric; k text; capv numeric; ov numeric; nv numeric; fl int:=0; a record; d jsonb:=p_data; al jsonb;
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
