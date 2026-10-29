-- Kayıtlı her kaptan arenada (varsayılan 1000) görünür; rakipler aynı Deniz Bölgesinden
create or replace function public.arena_opponents() returns table(id uuid,nick text,avatar text,rating int,tier text,power int) language sql security definer set search_path='' as $$
 with me as (select rating from public.arena_me()), mp as (select region_id from public.profiles where id=auth.uid())
 select p.id,p.nick,p.avatar,coalesce(a.rating,1000),public.sf_tier(coalesce(a.rating,1000)),(public.sf_caps(s.data,coalesce(a.lineup,'[]'))).power
 from public.profiles p join public.saves s on s.user_id=p.id left join public.arena a on a.user_id=p.id, me, mp
 where p.id<>auth.uid() and p.region_id=mp.region_id order by abs(coalesce(a.rating,1000)-me.rating), random() limit 5 $$;
create or replace function public.sf_enroll(p uuid) returns void language sql security definer set search_path='' as $$
 insert into public.arena(user_id,season) select p,to_char(now(),'YYYY-MM') where exists(select 1 from public.saves where user_id=p) on conflict do nothing $$;
create or replace function public.sf_enroll_trg() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.sf_enroll(new.user_id); return new; end $$;
create trigger saves_enroll after insert on public.saves for each row execute function public.sf_enroll_trg();
insert into public.arena(user_id,season) select user_id,to_char(now(),'YYYY-MM') from public.saves on conflict do nothing;
revoke execute on function public.sf_enroll(uuid), public.sf_enroll_trg() from public, anon, authenticated;
grant execute on function public.arena_opponents() to authenticated;
