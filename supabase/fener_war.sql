-- Fener Savaşı (haftalık bölge-bölge) — TASARIM / önizleme. Puanlama ve saldırı RPC'leri sonraki adımda.
-- Hafta (Europe/Istanbul): Pzt-Prş hazırlık (bölge puanı: inşa/eğitim/Kraken/baskın), Cum-Cmt çatışma (rakip bölgeye fener saldırısı), Pazar ödül.
create table if not exists public.fw_week(id bigserial primary key, week text not null, region_a int not null references public.regions, region_b int references public.regions,
 score_a bigint not null default 0, score_b bigint not null default 0, phase text not null default 'prep' check(phase in('prep','clash','reward','done')),
 starts_at timestamptz not null, ends_at timestamptz not null, unique(week,region_a));
create table if not exists public.fw_points(week_id bigint not null references public.fw_week on delete cascade, user_id uuid not null references public.profiles on delete cascade,
 region_id int not null references public.regions, src text not null check(src in('build','train','kraken','raid','clash')), pts int not null default 0, primary key(week_id,user_id,src));
alter table public.fw_week enable row level security; alter table public.fw_points enable row level security;
drop policy if exists fw_r on public.fw_week; create policy fw_r on public.fw_week for select to authenticated using(true);
drop policy if exists fp_r on public.fw_points; create policy fp_r on public.fw_points for select to authenticated using(true);
revoke all on public.fw_week, public.fw_points from anon; revoke insert,update,delete on public.fw_week, public.fw_points from authenticated;
-- önizleme: bu haftanın takvimi + (varsa) eşleşme + benim puanım
create or replace function public.fener_war_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare t timestamp:=now() at time zone 'Europe/Istanbul'; mon timestamp:=date_trunc('week',t); wk text:=to_char(t,'IYYY-"W"IW'); rid int; w public.fw_week; mine int:=0; begin
 select region_id into rid from public.profiles where id=auth.uid();
 select * into w from public.fw_week where week=wk and (region_a=rid or region_b=rid);
 if found then select coalesce(sum(pts),0) into mine from public.fw_points where week_id=w.id and user_id=auth.uid(); end if;
 return jsonb_build_object('week',wk,'region',rid,'matched',w.id is not null,'opp',case when w.region_a=rid then w.region_b else w.region_a end,
  'score',case when w.id is null then null else jsonb_build_array(w.score_a,w.score_b) end,'mine',mine,
  'phase',case when extract(isodow from t)<=4 then 'prep' when extract(isodow from t)<=6 then 'clash' else 'reward' end,
  'clash_at',(extract(epoch from (mon+interval '4 days') at time zone 'Europe/Istanbul')*1000)::bigint,
  'reward_at',(extract(epoch from (mon+interval '6 days') at time zone 'Europe/Istanbul')*1000)::bigint,
  'end_at',(extract(epoch from (mon+interval '7 days') at time zone 'Europe/Istanbul')*1000)::bigint); end $$;
revoke all on function public.fener_war_me() from public, anon; grant execute on function public.fener_war_me() to authenticated;
