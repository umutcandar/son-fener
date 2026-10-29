-- Batch 33: Klan Mağazası (TASARIM_PLANI §8) — personal clan points from donations, weekly-limited items
create table if not exists public.clan_shop(user_id uuid primary key references auth.users(id) on delete cascade, earned bigint not null default 0, spent bigint not null default 0, wk text not null default '', buys jsonb not null default '{}');
alter table public.clan_shop enable row level security;
revoke all on public.clan_shop from anon, authenticated;
insert into public.clan_shop(user_id,earned) select user_id,sum(pts) from public.clan_donations group by user_id on conflict (user_id) do nothing;
create or replace function public.sf_cshop_trg() returns trigger language plpgsql security definer set search_path to '' as $$
begin insert into public.clan_shop(user_id,earned) values(new.user_id,greatest(0,new.pts-coalesce(case when tg_op='UPDATE' then old.pts end,0)))
 on conflict(user_id) do update set earned=public.clan_shop.earned+excluded.earned; return new; end $$;
drop trigger if exists cshop_earn on public.clan_donations;
create trigger cshop_earn after insert or update of pts on public.clan_donations for each row execute function public.sf_cshop_trg();
create or replace function public.sf_cshop_items() returns jsonb language sql immutable set search_path to '' as $$
 select '[{"id":"crys","c":600,"lim":5,"rw":{"crys":300}},{"id":"wood","c":500,"lim":5,"rw":{"wood":1200}},{"id":"tk","c":1500,"lim":2,"rw":{"ticket":1}},{"id":"ush","c":1200,"lim":2,"rw":{"ush":10}},{"id":"gems","c":2500,"lim":1,"rw":{"gems":40}}]'::jsonb $$;
create or replace function public.sf_cshop_wk() returns text language sql stable set search_path to '' as $$ select to_char(now() at time zone 'Europe/Istanbul','IYYY-IW') $$;
create or replace function public.clan_shop_me() returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.clan_shop; w text:=public.sf_cshop_wk(); begin if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
 select * into r from public.clan_shop where user_id=auth.uid();
 return jsonb_build_object('bal',coalesce(r.earned-r.spent,0),'buys',case when r.wk=w then r.buys else '{}'::jsonb end,'items',public.sf_cshop_items(),
  'reset',extract(epoch from (date_trunc('week',now() at time zone 'Europe/Istanbul')+interval '7 days') - (now() at time zone 'Europe/Istanbul'))::int); end $$;
create or replace function public.clan_shop_buy(p_item text) returns jsonb language plpgsql security definer set search_path to '' as $$
declare r public.clan_shop; w text:=public.sf_cshop_wk(); it jsonb; b jsonb; n int; begin
 if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
 if public.my_clan() is null then return jsonb_build_object('err','noclan'); end if;
 select x into it from jsonb_array_elements(public.sf_cshop_items()) x where x->>'id'=p_item; if it is null then raise exception 'Geçersiz ürün'; end if;
 insert into public.clan_shop(user_id) values(auth.uid()) on conflict do nothing;
 select * into r from public.clan_shop where user_id=auth.uid() for update;
 b:=case when r.wk=w then r.buys else '{}'::jsonb end; n:=coalesce((b->>p_item)::int,0);
 if n>=(it->>'lim')::int then return jsonb_build_object('err','lim'); end if;
 if r.earned-r.spent<(it->>'c')::int then return jsonb_build_object('err','pts'); end if;
 b:=jsonb_set(b,array[p_item],to_jsonb(n+1));
 update public.clan_shop set spent=spent+(it->>'c')::int, wk=w, buys=b where user_id=auth.uid() returning * into r;
 perform public.sf_allow_add(auth.uid(),it->'rw');
 return jsonb_build_object('ok',true,'rw',it->'rw','bal',r.earned-r.spent,'buys',b); end $$;
revoke all on function public.clan_shop_me(), public.clan_shop_buy(text), public.sf_cshop_trg() from public, anon;
grant execute on function public.clan_shop_me(), public.clan_shop_buy(text) to authenticated;
