-- DEMO para sistemi sunucu tarafı: harcama sınırı (varsayılan açık, yükseltme/kapatma 24 saat gecikmeli), sezon Sis İzi, Rota Bileti. Gerçek ödeme YOK.
create table if not exists public.monet(user_id uuid primary key references public.profiles on delete cascade,
 spend_on boolean not null default true, spend_lim numeric(10,2) not null default 500, spend_month text not null default '', spend_sum numeric(10,2) not null default 0,
 pend_lim numeric(10,2), pend_on boolean, pend_at timestamptz,
 season_id int not null default 1, marks int not null default 0, last_mark text not null default '', route boolean not null default false, updated_at timestamptz not null default now());
alter table public.monet enable row level security;
drop policy if exists m_own on public.monet; create policy m_own on public.monet for select to authenticated using(user_id=auth.uid());
revoke all on public.monet from anon; revoke insert,update,delete on public.monet from authenticated;
create table if not exists public.monet_log(id bigserial primary key, user_id uuid not null references public.profiles on delete cascade, price numeric(10,2) not null, item text not null default '', offline boolean not null default false, created_at timestamptz not null default now());
alter table public.monet_log enable row level security;
drop policy if exists ml_own on public.monet_log; create policy ml_own on public.monet_log for select to authenticated using(user_id=auth.uid());
revoke all on public.monet_log from anon; revoke insert,update,delete on public.monet_log from authenticated;
-- izinli DEMO fiyatlar (istemci rastgele tutar yazamaz)
create or replace function public.sf_price_ok(p numeric) returns boolean language sql immutable set search_path='' as $$ select p = any(array[29.99,39.99,49.99,59.99,79.99,89.99,119.99,149.99,299.99]::numeric[]) $$;
create or replace function public.sf_season() returns jsonb language sql immutable set search_path='' as $$ select jsonb_build_object('id',1,'start','2026-10-26T00:00:00Z','days',60,'need',45,'route_daily',2) $$;
create or replace function public.monet_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.monet; mo text:=to_char(now() at time zone 'UTC','YYYY-MM'); z jsonb:=public.sf_season(); begin
 perform public.ensure_profile(); insert into public.monet(user_id,spend_month) values(auth.uid(),mo) on conflict do nothing;
 select * into m from public.monet where user_id=auth.uid() for update;
 if m.spend_month<>mo then update public.monet set spend_month=mo, spend_sum=0 where user_id=auth.uid(); end if;
 if m.pend_at is not null and now()>=m.pend_at then update public.monet set spend_lim=coalesce(pend_lim,spend_lim), spend_on=coalesce(pend_on,spend_on), pend_lim=null, pend_on=null, pend_at=null where user_id=auth.uid(); end if;
 if m.season_id<>(z->>'id')::int then update public.monet set season_id=(z->>'id')::int, marks=0, last_mark='', route=false where user_id=auth.uid(); end if;
 select * into m from public.monet where user_id=auth.uid();
 return jsonb_build_object('spend',jsonb_build_object('on',m.spend_on::int,'lim',m.spend_lim,'m',m.spend_month,'sum',m.spend_sum)||case when m.pend_at is null then '{}'::jsonb else jsonb_build_object('pend',jsonb_build_object('lim',m.pend_lim,'on',m.pend_on::int,'at',(extract(epoch from m.pend_at)*1000)::bigint)) end,
  'season',jsonb_build_object('id',m.season_id,'marks',m.marks,'last',m.last_mark,'route',m.route::int),'cfg',z,'now',(extract(epoch from now())*1000)::bigint); end $$;
-- DEMO satın alma: sınırı sunucuda doğrular, harcamayı yazar. p_offline: çevrimdışıyken yapılmış alımı sonradan kaydeder (sınır yine sayılır ama reddedilmez)
create or replace function public.monet_purchase(p_price numeric, p_item text default '', p_offline boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.monet; begin perform public.monet_me();
 if not public.sf_price_ok(p_price) then raise exception 'Geçersiz fiyat'; end if;
 if p_item not in('','route','starter','monthly','g1','g2','g3','noads','pass','offer') then raise exception 'Geçersiz ürün'; end if;
 select * into m from public.monet where user_id=auth.uid() for update;
 if not p_offline and m.spend_on and m.spend_sum+p_price>m.spend_lim then raise exception 'Harcama sınırı aşıldı'; end if;
 if p_offline and (select count(*) from public.monet_log where user_id=auth.uid() and offline and created_at>now()-interval '1 day')>=10 then raise exception 'Çok fazla çevrimdışı kayıt'; end if;
 if p_item='route' and m.route then raise exception 'Zaten sahipsin'; end if;
 update public.monet set spend_sum=spend_sum+p_price, route=route or p_item='route', updated_at=now() where user_id=auth.uid();
 insert into public.monet_log(user_id,price,item,offline) values(auth.uid(),p_price,p_item,p_offline);
 return public.monet_me(); end $$;
-- sınır: düşürmek/açmak hemen; yükseltmek/kapatmak 24 saat sonra
create or replace function public.monet_set_limit(p_lim numeric, p_on boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.monet; begin perform public.monet_me(); select * into m from public.monet where user_id=auth.uid() for update;
 if p_lim not in(100,250,500,1000,2500) then raise exception 'Geçersiz sınır'; end if;
 if not p_on then update public.monet set pend_lim=spend_lim, pend_on=false, pend_at=now()+interval '24 hours' where user_id=auth.uid();
 elsif m.spend_on and p_lim>m.spend_lim then update public.monet set pend_lim=p_lim, pend_on=true, pend_at=now()+interval '24 hours' where user_id=auth.uid();
 else update public.monet set spend_lim=p_lim, spend_on=true, pend_lim=null, pend_on=null, pend_at=null where user_id=auth.uid(); end if;
 return public.monet_me(); end $$;
-- günlük Sis İzi (UTC günü), sezon penceresi sunucuda
create or replace function public.monet_claim_mark() returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.monet; z jsonb:=public.sf_season(); d text:=to_char(now() at time zone 'UTC','YYYY-MM-DD'); st timestamptz:=(z->>'start')::timestamptz; begin
 perform public.monet_me(); select * into m from public.monet where user_id=auth.uid() for update;
 if now()<st or now()>st+((z->>'days')::int*interval '1 day') then raise exception 'Sezon açık değil'; end if;
 if m.last_mark=d then raise exception 'Bugünkü Sis İzi alındı'; end if;
 update public.monet set marks=marks+1+case when route then (z->>'route_daily')::int else 0 end, last_mark=d, updated_at=now() where user_id=auth.uid();
 return public.monet_me(); end $$;
revoke all on function public.monet_me(), public.monet_purchase(numeric,text,boolean), public.monet_set_limit(numeric,boolean), public.monet_claim_mark() from public, anon;
grant execute on function public.monet_me(), public.monet_purchase(numeric,text,boolean), public.monet_set_limit(numeric,boolean), public.monet_claim_mark() to authenticated;
