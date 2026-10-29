-- Batch 29 (additive): island milestone chests 10-20 (server-validated) + arena league badges (season peak history).
create table if not exists public.mile_claims(user_id uuid references public.profiles on delete cascade, n int not null, at timestamptz not null default now(), primary key(user_id,n));
alter table public.mile_claims enable row level security;
drop policy if exists mc_read on public.mile_claims; create policy mc_read on public.mile_claims for select to authenticated using (user_id=auth.uid());
revoke insert,update,delete on public.mile_claims from authenticated; revoke all on public.mile_claims from anon;
-- reward formula mirrors logic.js mileReward(n)
create or replace function public.sf_mile_rw(n int) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('wood',150*n,'fish',100*n,'crys',40*n,'gems',10+n) $$;
create or replace function public.mile_claim(p_n int) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare rw jsonb; begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if p_n not in (11,13,14,16,17,18,19) then raise exception 'Geçersiz hedef'; end if;
 if public.sf_vstage(auth.uid())<p_n then return jsonb_build_object('ok',false,'err','Doğrulanmış ilerleme yetersiz'); end if;
 insert into public.mile_claims(user_id,n) values(auth.uid(),p_n) on conflict do nothing; if not found then return jsonb_build_object('ok',false,'err','Zaten alındı'); end if;
 rw:=public.sf_mile_rw(p_n); perform public.sf_allow_add(auth.uid(),rw); return jsonb_build_object('ok',true,'r',rw); end $fn$;
create or replace function public.mile_me() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('got',coalesce((select jsonb_agg(n order by n) from public.mile_claims where user_id=auth.uid()),'[]'::jsonb),'v',public.sf_vstage(auth.uid())) $$;
revoke execute on function public.mile_claim(int), public.mile_me(), public.sf_mile_rw(int) from public, anon;
grant execute on function public.mile_claim(int), public.mile_me() to authenticated;

create table if not exists public.arena_peak(user_id uuid references public.profiles on delete cascade, season text not null, peak int not null, primary key(user_id,season));
alter table public.arena_peak enable row level security;
drop policy if exists ap_read on public.arena_peak; create policy ap_read on public.arena_peak for select to authenticated using (true);
revoke insert,update,delete on public.arena_peak from authenticated; revoke all on public.arena_peak from anon;
create or replace function public.sf_trg_apeak() returns trigger language plpgsql security definer set search_path='' as $f$ begin
 if new.season<>'' and (new.wins+new.losses>0) then insert into public.arena_peak(user_id,season,peak) values(new.user_id,new.season,new.rating)
  on conflict(user_id,season) do update set peak=greatest(public.arena_peak.peak,excluded.peak); end if; return new; end $f$;
revoke execute on function public.sf_trg_apeak() from public, anon, authenticated;
drop trigger if exists sf_arena_peak on public.arena; create trigger sf_arena_peak after insert or update of rating,wins,losses on public.arena for each row execute function public.sf_trg_apeak();
insert into public.arena_peak(user_id,season,peak) select user_id,season,rating from public.arena where season<>'' and wins+losses>0 on conflict do nothing;
create or replace function public.arena_badges(p_ids uuid[]) returns table(id uuid,best int,cur int,seasons int) language sql stable security definer set search_path='' as $$
 select p.user_id, max(p.peak)::int, max(p.peak) filter (where p.season=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM'))::int, count(*)::int
 from public.arena_peak p where p.user_id=any(p_ids[1:60]) group by p.user_id $$;
revoke execute on function public.arena_badges(uuid[]) from public, anon; grant execute on function public.arena_badges(uuid[]) to authenticated;
