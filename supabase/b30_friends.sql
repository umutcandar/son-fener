-- Batch 30 (additive): friends + daily resource gifts (delivered through events/claim_events, so the save allowance is server-side).
create table if not exists public.friends(a uuid references public.profiles on delete cascade, b uuid references public.profiles on delete cascade, ok boolean not null default false, created_at timestamptz not null default now(), primary key(a,b), check(a<>b));
create index if not exists friends_b on public.friends(b);
create table if not exists public.friend_gifts(fr uuid references public.profiles on delete cascade, too uuid references public.profiles on delete cascade, day text not null, primary key(fr,too,day));
create index if not exists friend_gifts_to on public.friend_gifts(too,day);
alter table public.friends enable row level security; alter table public.friend_gifts enable row level security;
revoke all on public.friends, public.friend_gifts from anon, authenticated;
create or replace function public.sf_fday() returns text language sql stable set search_path='' as $$ select to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD') $$;
create or replace function public.friend_req(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare u uuid:=auth.uid(); begin if u is null then raise exception 'giriş gerekli'; end if;
 if p_id is null or p_id=u or not exists(select 1 from public.profiles where id=p_id) then raise exception 'Geçersiz oyuncu'; end if;
 if exists(select 1 from public.friends where a=p_id and b=u) then update public.friends set ok=true where a=p_id and b=u; return jsonb_build_object('ok',true,'st','friends'); end if;
 if (select count(*) from public.friends where a=u or b=u)>=50 then raise exception 'Arkadaş listesi dolu (50)'; end if;
 insert into public.friends(a,b) values(u,p_id) on conflict do nothing; return jsonb_build_object('ok',true,'st',case when exists(select 1 from public.friends where a=u and b=p_id and ok) then 'friends' else 'sent' end); end $fn$;
create or replace function public.friend_accept(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if; update public.friends set ok=true where a=p_id and b=auth.uid(); return jsonb_build_object('ok',found); end $fn$;
create or replace function public.friend_remove(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if; delete from public.friends where (a=auth.uid() and b=p_id) or (a=p_id and b=auth.uid()); return jsonb_build_object('ok',true); end $fn$;
create or replace function public.friend_list() returns table(id uuid,nick text,avatar text,power int,stage int,st text,sent boolean,last_seen timestamptz) language sql stable security definer set search_path='' as $$
 select p.id,p.nick,p.avatar,p.power::int,p.stage,case when f.ok then 'ok' when f.a=auth.uid() then 'out' else 'in' end,
  exists(select 1 from public.friend_gifts g where g.fr=auth.uid() and g.too=p.id and g.day=public.sf_fday()),
  (select s.updated_at from public.saves s where s.user_id=p.id)
 from public.friends f join public.profiles p on p.id=case when f.a=auth.uid() then f.b else f.a end where f.a=auth.uid() or f.b=auth.uid()
 order by (f.ok) desc, p.power desc limit 50 $$;
create or replace function public.friend_gift(p_id uuid) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare u uuid:=auth.uid(); d text:=public.sf_fday(); rw jsonb:='{"fish":150,"wood":150,"crys":30}'; nk text; begin if u is null then raise exception 'giriş gerekli'; end if;
 if not exists(select 1 from public.friends where ok and ((a=u and b=p_id) or (a=p_id and b=u))) then return jsonb_build_object('ok',false,'err','not_friend'); end if;
 if (select count(*) from public.friend_gifts where too=p_id and day=d)>=10 then return jsonb_build_object('ok',false,'err','full'); end if;
 insert into public.friend_gifts values(u,p_id,d) on conflict do nothing; if not found then return jsonb_build_object('ok',false,'err','sent'); end if;
 select nick into nk from public.profiles where id=u;
 insert into public.events(user_id,kind,delta) values(p_id,'gift',jsonb_build_object('res',rw,'from',nk)); return jsonb_build_object('ok',true); end $fn$;
revoke execute on function public.friend_req(uuid),public.friend_accept(uuid),public.friend_remove(uuid),public.friend_list(),public.friend_gift(uuid),public.sf_fday() from public, anon;
grant execute on function public.friend_req(uuid),public.friend_accept(uuid),public.friend_remove(uuid),public.friend_list(),public.friend_gift(uuid) to authenticated;
