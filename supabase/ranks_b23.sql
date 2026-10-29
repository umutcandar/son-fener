-- Batch 23: Sıralama merkezi (sunucu doğrulamalı tablolar + kendi sıran) ve klan baskını akışı
create or replace function public.rank_board(p_kind text, p_wk text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid(); rows jsonb; me jsonb; mv bigint; s text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM'); w text:=public.sf_craid_wk(); mc uuid;
begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if p_kind='craid' then
  select clan_id into mc from public.clan_members where user_id=u;
  with t as (select c.id,c.name,c.tag,c.icon,r.lvl,(r.killed_at is not null) k,coalesce((select sum(h.dmg) from public.clan_raid_hits h where h.clan_id=c.id and h.wk=w),0)::bigint dmg
   from public.clan_raid r join public.clans c on c.id=r.clan_id where r.wk=w),
   o as (select t.*,row_number() over (order by k desc,lvl desc,dmg desc) rk from t)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'tag',tag,'icon',icon,'lvl',lvl,'killed',k,'val',dmg) order by rk) filter (where rk<=50),'[]'),
   (select jsonb_build_object('rank',rk,'val',dmg) from o where id=mc) into rows,me from o;
  return jsonb_build_object('rows',rows,'me',me);
 end if;
 with t as (
  select p.id,p.nick,p.avatar,c.tag,
   case p_kind when 'stage' then coalesce(v.vstage,0) when 'pass' then coalesce(case when ps.season=s then ps.xp end,0) when 'kraken' then case when p.kraken_wk=p_wk then p.kraken_dmg else 0 end else p.power end::bigint val
  from public.profiles p left join public.clan_members m on m.user_id=p.id left join public.clans c on c.id=m.clan_id
  left join public.pve_state v on v.user_id=p.id left join public.pass_state ps on ps.user_id=p.id),
 o as (select t.*,rank() over (order by val desc) rk,row_number() over (order by val desc,id) rn from t where val>0)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'nick',nick,'avatar',avatar,'tag',tag,'val',val,'rk',rk) order by rn) filter (where rn<=50),'[]'),
  (select jsonb_build_object('rank',rk,'val',val) from o where id=u) into rows,me from o;
 return jsonb_build_object('rows',rows,'me',me);
end $$;
revoke execute on function public.rank_board(text,text) from public, anon;
grant execute on function public.rank_board(text,text) to authenticated;

-- Baskın vuruş akışı: her vuruş deltası kaydedilir (sadece sunucu yazar)
create table if not exists public.clan_raid_log(id bigserial primary key, clan_id uuid not null, wk text not null, user_id uuid not null, dmg bigint not null, at timestamptz not null default now());
create index if not exists clan_raid_log_cw on public.clan_raid_log(clan_id,wk,id desc);
alter table public.clan_raid_log enable row level security;
create or replace function public.sf_craid_log() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.dmg>coalesce(case when tg_op='UPDATE' then old.dmg end,0) then
  insert into public.clan_raid_log(clan_id,wk,user_id,dmg) values(new.clan_id,new.wk,new.user_id,new.dmg-coalesce(case when tg_op='UPDATE' then old.dmg end,0)); end if;
 return new; end $$;
drop trigger if exists craid_log on public.clan_raid_hits;
create trigger craid_log after insert or update on public.clan_raid_hits for each row execute function public.sf_craid_log();
revoke execute on function public.sf_craid_log() from public, anon, authenticated;

create or replace function public.craid_feed() returns jsonb language sql stable security definer set search_path='' as $$
 with m as (select clan_id from public.clan_members where user_id=auth.uid())
 select jsonb_build_object(
  'log',coalesce((select jsonb_agg(x order by x->>'at' desc) from (select jsonb_build_object('nick',p.nick,'dmg',l.dmg,'at',l.at) x from public.clan_raid_log l join m on m.clan_id=l.clan_id join public.profiles p on p.id=l.user_id where l.wk=public.sf_craid_wk() order by l.id desc limit 12) q),'[]'),
  'prev',(select jsonb_build_object('wk',r.wk,'lvl',r.lvl,'killed',r.killed_at is not null,'pct',round(100-100.0*r.hp/greatest(1,r.hp_max))) from public.clan_raid r join m on m.clan_id=r.clan_id where r.wk<public.sf_craid_wk() order by r.wk desc limit 1))
$$;
revoke execute on function public.craid_feed() from public, anon;
grant execute on function public.craid_feed() to authenticated;
