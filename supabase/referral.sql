-- Batch 18: Davet bağlantısı — sunucu takipli, davetli Aşama 3'e ulaşınca iki tarafa küçük ödül (davet eden en fazla 10 ödül)
create table if not exists public.ref_codes(user_id uuid primary key references public.profiles(id), code text not null unique, created_at timestamptz not null default now());
create table if not exists public.referrals(invitee uuid primary key references public.profiles(id), inviter uuid not null references public.profiles(id), created_at timestamptz not null default now(), invitee_paid boolean not null default false, inviter_paid boolean not null default false, check(invitee<>inviter));
alter table public.ref_codes enable row level security; alter table public.referrals enable row level security;
drop policy if exists ref_codes_own on public.ref_codes; create policy ref_codes_own on public.ref_codes for select to authenticated using (user_id=auth.uid());
drop policy if exists referrals_own on public.referrals; create policy referrals_own on public.referrals for select to authenticated using (invitee=auth.uid() or inviter=auth.uid());
create or replace function public.sf_allow_add(u uuid, rw jsonb) returns void language sql security definer set search_path='' as $$
 update public.saves s set allow=(select jsonb_object_agg(k2, coalesce((s.allow->>k2)::numeric,0)+coalesce((rw->>k2)::numeric,0)) from (select jsonb_object_keys(coalesce(s.allow,'{}')||rw) k2) q) where user_id=u $$;
revoke execute on function public.sf_allow_add(uuid,jsonb) from public, anon, authenticated;
create or replace function public.ref_info() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare c text; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 select code into c from public.ref_codes where user_id=auth.uid();
 if c is null then loop c:=upper(substr(md5(random()::text||auth.uid()::text),1,6)); begin insert into public.ref_codes(user_id,code) values(auth.uid(),c); exit; exception when unique_violation then end; end loop; end if;
 return jsonb_build_object('code',c,'invited',(select count(*) from public.referrals where inviter=auth.uid()),'done',(select count(*) from public.referrals r join public.profiles p on p.id=r.invitee where r.inviter=auth.uid() and p.stage>=3),
  'paid',(select count(*) from public.referrals where inviter=auth.uid() and inviter_paid),'by',(select p.nick from public.referrals r join public.profiles p on p.id=r.inviter where r.invitee=auth.uid())); end; $fn$;
create or replace function public.ref_claim(p_code text) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare inv uuid; me public.profiles; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 select * into me from public.profiles where id=auth.uid(); if me.id is null then raise exception 'Kayıt yok'; end if;
 select user_id into inv from public.ref_codes where code=upper(trim(p_code)); if inv is null then raise exception 'Davet kodu geçersiz'; end if;
 if inv=auth.uid() then raise exception 'Kendi davet kodunu kullanamazsın'; end if;
 if exists(select 1 from public.referrals where invitee=auth.uid()) then raise exception 'Zaten bir davet kodu kullandın'; end if;
 if me.created_at<now()-interval '3 days' or me.stage>=3 then raise exception 'Davet kodu yalnızca yeni oyuncular içindir'; end if;
 insert into public.referrals(invitee,inviter) values(auth.uid(),inv); return jsonb_build_object('ok',true); end; $fn$;
create or replace function public.ref_collect() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare g int:=0; n int; rw jsonb; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 update public.referrals r set invitee_paid=true from public.profiles p where r.invitee=auth.uid() and not r.invitee_paid and p.id=r.invitee and p.stage>=3; get diagnostics n=row_count; g:=g+n*50;
 with q as (select r.invitee from public.referrals r join public.profiles p on p.id=r.invitee where r.inviter=auth.uid() and not r.inviter_paid and p.stage>=3 order by r.created_at
   limit greatest(0,10-(select count(*) from public.referrals where inviter=auth.uid() and inviter_paid)))
 update public.referrals r set inviter_paid=true from q where r.invitee=q.invitee; get diagnostics n=row_count; g:=g+n*50;
 if g=0 then return jsonb_build_object('gems',0); end if;
 rw:=jsonb_build_object('gems',g); perform public.sf_allow_add(auth.uid(),rw); return rw; end; $fn$;
revoke execute on function public.ref_info(), public.ref_claim(text), public.ref_collect() from public, anon; grant execute on function public.ref_info(), public.ref_claim(text), public.ref_collect() to authenticated;
