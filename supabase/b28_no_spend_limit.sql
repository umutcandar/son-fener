-- Batch 28: the spending limit feature is removed (user request). Additive-safe: no tables or columns dropped;
-- monet.spend_* columns stay (data kept) but are no longer enforced. DEMO purchases only; no real payment.
create or replace function public.monet_purchase(p_price numeric, p_item text default '', p_offline boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.monet; begin perform public.monet_me();
 if not public.sf_price_ok(p_price) then raise exception 'Geçersiz fiyat'; end if;
 if p_item not in('','route','starter','monthly','g1','g2','g3','noads','pass','offer') then raise exception 'Geçersiz ürün'; end if;
 select * into m from public.monet where user_id=auth.uid() for update;
 if p_offline and (select count(*) from public.monet_log where user_id=auth.uid() and offline and created_at>now()-interval '1 day')>=10 then raise exception 'Çok fazla çevrimdışı kayıt'; end if;
 if p_item='route' and m.route then raise exception 'Zaten sahipsin'; end if;
 update public.monet set spend_sum=spend_sum+p_price, route=route or p_item='route', updated_at=now() where user_id=auth.uid();
 insert into public.monet_log(user_id,price,item,offline) values(auth.uid(),p_price,p_item,p_offline);
 return public.monet_me(); end $$;
-- kept for old cached clients: now a no-op
create or replace function public.monet_set_limit(p_lim numeric, p_on boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.monet_me(); end $$;
revoke all on function public.monet_purchase(numeric,text,boolean), public.monet_set_limit(numeric,boolean) from public, anon;
grant execute on function public.monet_purchase(numeric,text,boolean), public.monet_set_limit(numeric,boolean) to authenticated;
