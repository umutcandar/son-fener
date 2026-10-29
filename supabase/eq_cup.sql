-- Batch 17: Eşit Arena Haftalık Kupası — 8 oyunculu eleme, herkes eşitlenmiş (sf_equalize), tamamen sunucuda simüle, haftada bir, ödül allow ile
create table if not exists public.eq_cups(id bigserial primary key, user_id uuid not null references public.profiles(id), week text not null, bracket jsonb not null, place int not null, reward jsonb not null, created_at timestamptz not null default now(), unique(user_id,week));
alter table public.eq_cups enable row level security;
drop policy if exists eq_cups_own on public.eq_cups; create policy eq_cups_own on public.eq_cups for select to authenticated using (user_id=auth.uid());
create or replace function public.sf_cup_week() returns text language sql stable set search_path='' as $$ select to_char(now() at time zone 'Europe/Istanbul','IYYY-"W"IW') $$;
create or replace function public.eq_cup_get() returns jsonb language sql security definer stable set search_path='' as $$
 select jsonb_build_object('week',public.sf_cup_week(),'cup',(select to_jsonb(c) from public.eq_cups c where c.user_id=auth.uid() and c.week=public.sf_cup_week())) $$;
create or replace function public.eq_cup_run() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare wk text:=public.sf_cup_week(); d jsonb; A record; ps jsonb:='[]'; cur jsonb; nxt jsonb; rounds jsonb:='[]'; ms jsonb; R record; i int; rn int; x jsonb; y jsonb; w jsonb; place int:=1; out_r int:=0; rw jsonb; me jsonb; o record; cid bigint;
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if exists(select 1 from public.eq_cups where user_id=auth.uid() and week=wk) then raise exception 'Bu haftanın kupası zaten oynandı'; end if;
 select data into d from public.saves where user_id=auth.uid() for update; if d is null then raise exception 'Kayıt yok'; end if;
 select * into A from public.sf_caps(public.sf_equalize(d),'[]'); if A.power<=0 then raise exception 'Kaptanın yok'; end if;
 me:=jsonb_build_object('id',auth.uid(),'nick',(select nick from public.profiles where id=auth.uid()),'avatar',(select avatar from public.profiles where id=auth.uid()),'atk',A.atk,'hp',A.hp,'pw',A.power);
 for o in select p.id,p.nick,p.avatar,(public.sf_caps(public.sf_equalize(s.data),'[]')).* from public.profiles p join public.saves s on s.user_id=p.id
   where p.id<>auth.uid() and not exists(select 1 from public.mutes m where (m.user_id=auth.uid() and m.muted=p.id) or (m.user_id=p.id and m.muted=auth.uid())) order by random() limit 40 loop
  if o.power>0 and jsonb_array_length(ps)<7 then ps:=ps||jsonb_build_array(jsonb_build_object('id',o.id,'nick',o.nick,'avatar',o.avatar,'atk',o.atk,'hp',o.hp,'pw',o.power)); end if; end loop;
 -- az oyuncu varsa: Sis Gölgeleri (aynı eşit güçte, ±%8)
 while jsonb_array_length(ps)<7 loop i:=jsonb_array_length(ps);
  ps:=ps||jsonb_build_array(jsonb_build_object('id',null,'nick','','avatar','🌫️','atk',round(A.atk*(0.92+random()*0.16)),'hp',round(A.hp*(0.92+random()*0.16)),'pw',A.power)); end loop;
 cur:=jsonb_build_array(me)||(select jsonb_agg(v order by random()) from jsonb_array_elements(ps) v);
 for rn in 1..3 loop ms:='[]'; nxt:='[]'; i:=0;
  while i<jsonb_array_length(cur) loop x:=cur->i; y:=cur->(i+1);
   select * into R from public.sf_duel(jsonb_build_object('atk',(x->>'atk')::numeric,'hp',(x->>'hp')::numeric),jsonb_build_object('atk',(y->>'atk')::numeric,'hp',(y->>'hp')::numeric));
   w:=case when R.win then x else y end; nxt:=nxt||jsonb_build_array(w);
   ms:=ms||jsonb_build_array(jsonb_build_object('a',x-'atk'-'hp','b',y-'atk'-'hp','w',case when R.win then 0 else 1 end,'r',R.rounds,'am',R.amax,'bm',R.bmax));
   if out_r=0 and ((x->>'id')=auth.uid()::text or (y->>'id')=auth.uid()::text) and (w->>'id') is distinct from auth.uid()::text then out_r:=rn; end if;
   i:=i+2; end loop;
  rounds:=rounds||jsonb_build_array(ms); cur:=nxt; end loop;
 place:=case out_r when 0 then 1 when 3 then 2 when 2 then 3 else 5 end;
 rw:=case place when 1 then '{"gems":80,"crys":400,"ush":15}' when 2 then '{"gems":50,"crys":250,"ush":8}' when 3 then '{"gems":30,"crys":150}' else '{"gems":15,"crys":80}' end::jsonb;
 update public.saves s set allow=(select jsonb_object_agg(k2, coalesce((s.allow->>k2)::numeric,0)+coalesce((rw->>k2)::numeric,0)) from (select jsonb_object_keys(coalesce(s.allow,'{}')||rw) k2) q) where user_id=auth.uid();
 insert into public.eq_cups(user_id,week,bracket,place,reward) values(auth.uid(),wk,rounds,place,rw) returning id into cid;
 return jsonb_build_object('week',wk,'cup',(select to_jsonb(c) from public.eq_cups c where c.id=cid)); end; $fn$;
revoke execute on function public.eq_cup_run(), public.eq_cup_get() from public, anon; grant execute on function public.eq_cup_run(), public.eq_cup_get() to authenticated;
