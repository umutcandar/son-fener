-- Batch 22: Klan Baskın Canavarı (Derin Yılan) — haftalık, klan başına ortak HP, sunucu hasarı, günlük 3 hak, katkı sıralaması, posta ile kademeli ödül
create table if not exists public.clan_raid(clan_id uuid not null references public.clans on delete cascade, wk text not null, lvl int not null default 1, hp_max bigint not null, hp bigint not null,
 killed_at timestamptz, settled boolean not null default false, created_at timestamptz not null default now(), primary key(clan_id,wk));
create table if not exists public.clan_raid_hits(clan_id uuid not null references public.clans on delete cascade, wk text not null, user_id uuid not null references public.profiles on delete cascade,
 dmg bigint not null default 0, hits int not null default 0, day text not null default '', day_n int not null default 0, primary key(clan_id,wk,user_id));
alter table public.clan_raid enable row level security; alter table public.clan_raid_hits enable row level security;
create or replace function public.sf_craid_wk() returns text language sql stable set search_path='' as $$ select to_char(now() at time zone 'Europe/Istanbul','IYYY-IW') $$;
create or replace function public.sf_pass_cap(src text) returns int language sql immutable set search_path='' as $$
 select case src when 'pve' then 300 when 'raid' then 100 when 'arena' then 75 when 'front' then 100 when 'help' then 50 when 'boss' then 100 when 'login' then 50 when 'task' then 150 when 'craid' then 75 else 0 end $$;
-- iç: ödülleri postala (kill=true: canavar öldü; false: hafta bitti)
create or replace function public.sf_craid_settle(c uuid, w text) returns void language plpgsql security definer set search_path='' as $$
declare r public.clan_raid; h record; tot bigint; rk int:=0; sh numeric; at jsonb; begin
 select * into r from public.clan_raid where clan_id=c and wk=w for update; if not found or r.settled then return; end if;
 update public.clan_raid set settled=true where clan_id=c and wk=w;
 select coalesce(sum(dmg),0) into tot from public.clan_raid_hits where clan_id=c and wk=w; if tot=0 then return; end if;
 for h in select user_id,dmg from public.clan_raid_hits where clan_id=c and wk=w and dmg>0 order by dmg desc loop
  rk:=rk+1; sh:=h.dmg::numeric/tot;
  if r.killed_at is not null then
   at:=jsonb_build_object('gems',case when rk=1 then 150 when rk<=3 then 100 else 60 end+r.lvl*10,'crys',(200+floor(sh*400))::int+r.lvl*50);
   if sh>=0.2 then at:=at||'{"ticket":1}'; end if;
   perform public.sf_mail(h.user_id,'craid','mail.craid_win',jsonb_build_array(r.lvl,rk,round(sh*100)),at);
  else
   at:=jsonb_build_object('gems',15+floor(sh*30)::int,'crys',(60+floor(sh*200))::int);
   perform public.sf_mail(h.user_id,'craid','mail.craid_end',jsonb_build_array(r.lvl,rk,round(sh*100),round(100-r.hp*100.0/r.hp_max)),at);
  end if; end loop; end $$;
revoke execute on function public.sf_craid_settle(uuid,text) from public, anon, authenticated;
-- iç: bu haftanın canavarını getir/oluştur, geçmiş haftaları kapat
create or replace function public.sf_craid_get(c uuid) returns public.clan_raid language plpgsql security definer set search_path='' as $$
declare w text:=public.sf_craid_wk(); r public.clan_raid; o record; lv int:=1; pw bigint; begin
 for o in select wk from public.clan_raid where clan_id=c and wk<>w and not settled loop perform public.sf_craid_settle(c,o.wk); end loop;
 select * into r from public.clan_raid where clan_id=c and wk=w; if found then return r; end if;
 select case when killed_at is not null then lvl+1 else greatest(1,lvl-1) end into lv from public.clan_raid where clan_id=c and wk<w order by wk desc limit 1; lv:=coalesce(lv,1);
 select coalesce(sum(p.power),0) into pw from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c;
 insert into public.clan_raid(clan_id,wk,lvl,hp_max,hp) values(c,w,lv,greatest(5000,pw*60)*power(1.3,lv-1),greatest(5000,pw*60)*power(1.3,lv-1)) on conflict do nothing;
 select * into r from public.clan_raid where clan_id=c and wk=w; return r; end $$;
revoke execute on function public.sf_craid_get(uuid) from public, anon, authenticated;
create or replace function public.craid_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); r public.clan_raid; d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); me public.clan_raid_hits; begin
 if c is null then return null; end if; r:=public.sf_craid_get(c);
 select * into me from public.clan_raid_hits where clan_id=c and wk=r.wk and user_id=auth.uid();
 return jsonb_build_object('wk',r.wk,'lvl',r.lvl,'hp',r.hp,'hp_max',r.hp_max,'killed',r.killed_at is not null,'left',3-case when me.day=d then me.day_n else 0 end,'my',coalesce(me.dmg,0),
  'end',(extract(epoch from (date_trunc('week',now() at time zone 'Europe/Istanbul')+interval '7 days') at time zone 'Europe/Istanbul')*1000)::bigint,
  'board',coalesce((select jsonb_agg(jsonb_build_object('id',h.user_id,'nick',p.nick,'avatar',p.avatar,'dmg',h.dmg,'hits',h.hits) order by h.dmg desc) from public.clan_raid_hits h join public.profiles p on p.id=h.user_id where h.clan_id=c and h.wk=r.wk),'[]')); end $$;
create or replace function public.craid_hit() returns jsonb language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); r public.clan_raid; d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); me public.clan_raid_hits; pw int; dm bigint; crit boolean; begin
 if c is null then raise exception 'Klanın yok'; end if;
 perform 1 from public.clan_raid_hits where user_id=auth.uid() and wk=public.sf_craid_wk() and clan_id<>c and dmg>0; if found then raise exception 'Bu hafta başka klanda saldırdın'; end if;
 r:=public.sf_craid_get(c); select * into r from public.clan_raid where clan_id=c and wk=r.wk for update;
 if r.killed_at is not null then raise exception 'Canavar bu hafta yenildi'; end if;
 insert into public.clan_raid_hits(clan_id,wk,user_id) values(c,r.wk,auth.uid()) on conflict do nothing;
 select * into me from public.clan_raid_hits where clan_id=c and wk=r.wk and user_id=auth.uid() for update;
 if me.day=d and me.day_n>=3 then raise exception 'Bugünkü saldırı hakkın bitti'; end if;
 select power into pw from public.sf_army((select data from public.saves where user_id=auth.uid())); pw:=greatest(coalesce(pw,0),10);
 crit:=random()<0.15; dm:=least(r.hp,floor(pw*(8+random()*4)*case when crit then 1.8 else 1 end)::bigint);
 update public.clan_raid_hits set dmg=me.dmg+dm, hits=me.hits+1, day=d, day_n=case when me.day=d then me.day_n+1 else 1 end where clan_id=c and wk=r.wk and user_id=auth.uid();
 update public.clan_raid set hp=r.hp-dm, killed_at=case when r.hp-dm<=0 then now() end where clan_id=c and wk=r.wk;
 perform public.sf_pass_xp(auth.uid(),'craid',25);
 if r.hp-dm<=0 then perform public.sf_craid_settle(c,r.wk); end if;
 return jsonb_build_object('dmg',dm,'crit',crit,'killed',r.hp-dm<=0)||public.craid_me(); end $$;
revoke all on function public.craid_me(), public.craid_hit() from public, anon; grant execute on function public.craid_me(), public.craid_hit() to authenticated;
