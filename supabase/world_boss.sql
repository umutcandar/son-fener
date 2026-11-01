-- b44: Dünya Bossları — her 2 saatlik dilimde 9 bölgede birer dev boss.
-- Ortak can havuzu, hasar tamamen sunucuda hesaplanır, ödül posta ile gelir.
-- Günlük 12 vuruş hakkı (İstanbul günü), aynı anda en çok 1 boss seferi.
create table if not exists public.world_boss(slot int not null, id smallint not null, hp bigint not null, killer uuid, killed_at timestamptz, primary key(slot,id));
create table if not exists public.world_boss_hit(id bigserial primary key, slot int not null, boss smallint not null, user_id uuid not null references public.profiles(id) on delete cascade, march_id bigint, dmg bigint not null default 0, at timestamptz not null default now());
create index if not exists world_boss_hit_u on public.world_boss_hit(user_id, at);
create index if not exists world_boss_hit_b on public.world_boss_hit(slot, boss);
create index if not exists world_boss_hit_m on public.world_boss_hit(march_id);
alter table public.world_boss enable row level security;
alter table public.world_boss_hit enable row level security;
revoke all on public.world_boss, public.world_boss_hit from anon, authenticated;

create or replace function public.sf_wb_max(t int) returns bigint language sql immutable set search_path='' as $$ select (60000*power(t,1.8))::bigint $$;
create or replace function public.sf_wb_pw(t int) returns bigint language sql immutable set search_path='' as $$ select (1500*power(t,1.6))::bigint $$;
create or replace function public.sf_ist_day0() returns timestamptz language sql stable set search_path='' as $$ select (date_trunc('day', now() at time zone 'Europe/Istanbul')) at time zone 'Europe/Istanbul' $$;
-- Konum: 3x3 bölge (40x40), bölge içinde dilime göre değişen nokta; orta bölge bir kademe sert.
create or replace function public.sf_wb_def(p_slot int, p_id int) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_id,'x',z.x+case when exists(select 1 from public.world_pos w where w.x=z.x and w.y=z.y) then 1 else 0 end,'y',z.y,'t',z.t,'max',public.sf_wb_max(z.t),'pw',public.sf_wb_pw(z.t))
 from (select ((p_id-1)%3)*40+8+h%24 x, ((p_id-1)/3)*40+8+(h/24)%24 y, least(5,1+(h/576)%4+case when p_id=5 then 1 else 0 end)::int t
       from (select abs(hashtext('wb:'||p_id||':'||p_slot)) h) q) z $$;

create or replace function public.world_bosses() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s int:=public.sf_world_slot(); begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 return jsonb_build_object('slot',s,'next',((s+1)::bigint*7200000),'cap',12,
  'used',(select count(*) from public.world_boss_hit where user_id=u and at>=public.sf_ist_day0()),
  'busy',exists(select 1 from public.world_march where user_id=u and not done and kind='boss'),
  'list',(select jsonb_agg(dd.d||jsonb_build_object(
     'hp',greatest(0,coalesce(b.hp,(dd.d->>'max')::bigint)),
     'dead',coalesce(b.hp,1)<=0,
     'killer',(select nick from public.profiles where id=b.killer),
     'mine',(select coalesce(sum(h.dmg),0) from public.world_boss_hit h where h.slot=s and h.boss=i and h.user_id=u),
     'n',(select count(distinct h.user_id) from public.world_boss_hit h where h.slot=s and h.boss=i),
     'top',(select jsonb_build_object('nick',p.nick,'dmg',q.dm) from (select h.user_id, sum(h.dmg) dm from public.world_boss_hit h where h.slot=s and h.boss=i group by 1 order by 2 desc limit 1) q join public.profiles p on p.id=q.user_id where q.dm>0)
   ) order by i) from generate_series(1,9) i cross join lateral (select public.sf_wb_def(s,i) d) dd left join public.world_boss b on b.slot=s and b.id=i)); end $$;

create or replace function public.world_attack_boss(p_id int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.world_pos; s int:=public.sf_world_slot(); d jsonb; t int; m public.world_march; cur bigint; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if p_id is null or p_id<1 or p_id>9 then raise exception 'Hedef yok'; end if;
 p:=public.sf_world_assign(u); d:=public.sf_wb_def(s,p_id);
 select b.hp into cur from public.world_boss b where b.slot=s and b.id=p_id;
 if cur is not null and cur<=0 then raise exception 'Boss zaten yenildi'; end if;
 if (select count(*) from public.world_boss_hit where user_id=u and at>=public.sf_ist_day0())>=12 then raise exception 'Günlük boss hakkın bitti'; end if;
 if exists(select 1 from public.world_march where user_id=u and not done and kind='boss') or (select count(*) from public.world_march where user_id=u and not done)>=2 then raise exception 'Sefer kuyruğu dolu'; end if;
 t:=public.sf_march_t(p.x,p.y,(d->>'x')::int,(d->>'y')::int);
 insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,army) values(u,p.x,p.y,(d->>'x')::int,(d->>'y')::int,'boss',s,(d->>'t')::int,now()+make_interval(secs=>t),jsonb_build_object('boss',p_id)) returning * into m;
 insert into public.world_boss_hit(slot,boss,user_id,march_id) values(s,p_id,u,m.id);
 return jsonb_build_object('id',m.id,'arrive',(extract(epoch from m.arrive_at)*1000)::bigint,'secs',t); end $$;

-- Tek boss vuruşu (world_resolve içinden): 8 tur, deterministik; asker kaybı yok.
create or replace function public.sf_wb_hit(m public.world_march) returns jsonb language plpgsql security definer set search_path='' as $$
declare bid int:=coalesce((m.army->>'boss')::int,0); d jsonb; pw numeric; bp numeric; myhp numeric; dmg numeric:=0; r int; ev jsonb:='[]'; d1 numeric; d2 numeric; sd int:=abs(hashtext('wbh'||m.id)); cur bigint; mx bigint; kill boolean; loot jsonb; t int:=greatest(1,m.lvl); got bigint; begin
 d:=public.sf_wb_def(m.slot,bid); mx:=(d->>'max')::bigint; bp:=(d->>'pw')::numeric;
 select greatest(coalesce(power,0),50) into pw from public.profiles where id=m.user_id;
 insert into public.world_boss(slot,id,hp) values(m.slot,bid,mx) on conflict do nothing;
 select b.hp into cur from public.world_boss b where b.slot=m.slot and b.id=bid for update;
 if bid<1 or m.slot<>public.sf_world_slot() or cur<=0 then
  update public.world_boss_hit set dmg=0 where march_id=m.id;
  return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',false,'gone',true,'dmg',0,'pw',pw,'ep',bp,'log','[]'::jsonb); end if;
 myhp:=pw*3;
 for r in 1..8 loop exit when myhp<=0;
  d1:=round(pw*(0.85+((sd>>r)%30)/100.0));
  if r%3=0 then d1:=round(d1*1.5); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','skill','v',d1)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','hit','v',d1)); end if;
  dmg:=dmg+d1; exit when dmg>=cur;
  d2:=round(bp*(0.85+((sd>>(r+8))%30)/100.0));
  if r%4=0 then d2:=round(d2*1.6); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','skill','v',d2)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','hit','v',d2)); end if;
  myhp:=myhp-d2; end loop;
 got:=least(dmg,cur)::bigint; kill:=got>=cur;
 update public.world_boss b set hp=b.hp-got, killer=case when kill then m.user_id else b.killer end, killed_at=case when kill then now() else b.killed_at end where b.slot=m.slot and b.id=bid;
 update public.world_boss_hit set dmg=got where march_id=m.id;
 loot:=jsonb_build_object('fish',least(round(got/8.0),1500*t)::int,'wood',least(round(got/10.0),1200*t)::int,'crys',least(round(got/60.0),250*t)::int);
 if kill then
  loot:=loot||jsonb_build_object('gems',20*t);
  insert into public.mail(user_id,kind,tk,args,att)
   select q.user_id,'system','mail.wb_kill',jsonb_build_array(t,(select nick from public.profiles where id=m.user_id)),jsonb_build_object('crys',40*t,'gems',5*t)
   from (select distinct h.user_id from public.world_boss_hit h where h.slot=m.slot and h.boss=bid and h.dmg>0 and h.user_id<>m.user_id) q;
 end if;
 if got>0 then insert into public.mail(user_id,kind,tk,args,att) values(m.user_id,'system',case when kill then 'mail.wb_last' else 'mail.wb_hit' end,jsonb_build_array(t,got),loot); end if;
 return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',kill,'dmg',got,'hp',cur-got,'max',mx,'loot',loot,'pw',pw,'ep',bp,'log',ev); end $$;

revoke all on function public.sf_wb_def(int,int), public.sf_wb_hit(public.world_march), public.sf_ist_day0(), public.sf_wb_max(int), public.sf_wb_pw(int) from public, anon, authenticated;
revoke all on function public.world_bosses(), public.world_attack_boss(int) from public, anon;
grant execute on function public.world_bosses(), public.world_attack_boss(int) to authenticated;

create or replace function public.world_resolve() returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid:=auth.uid(); m public.world_march; w public.war_rally; pw numeric; ep numeric; hp numeric; ehp numeric; r int; ev jsonb; d1 numeric; d2 numeric; win boolean; loot jsonb; out jsonb:='[]'; sd int; p public.world_pos; t int; rep jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 for w in select * from public.war_rally where not launched and gather_until<=now() order by id limit 10 for update skip locked loop
  p:=public.sf_world_assign(w.leader); t:=public.sf_march_t(p.x,p.y,w.tx,w.ty);
  insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,target,rally_id,tclan,relic) values(w.leader,p.x,p.y,w.tx,w.ty,'rally',0,0,now()+make_interval(secs=>t),w.target,w.id,w.tclan,w.relic);
  update public.war_rally set launched=true where id=w.id; end loop;
 for m in select * from public.world_march where not done and arrive_at<=now() order by id limit 20 for update skip locked loop
  if m.kind in ('pvp','rally') then
   rep:=public.sf_war_hit(m); update public.world_march set done=true, result=coalesce(rep,'{}')-'grp'-'aeff'-'deff' where id=m.id;
   if m.rally_id is not null then update public.war_rally set done=true where id=m.rally_id; end if;
   if rep is not null and (m.user_id=u or m.target=u or exists(select 1 from public.war_rally_m where rally_id=m.rally_id and user_id=u)) then out:=out||jsonb_build_array(rep||jsonb_build_object('kind',m.kind,'pw',rep->'a0','ep',rep->'d0','lvl',0)); end if;
   continue; end if;
  if m.kind='boss' then
   rep:=public.sf_wb_hit(m); update public.world_march set done=true, result=rep where id=m.id;
   if m.user_id=u then out:=out||jsonb_build_array(rep); end if;
   continue; end if;
  select greatest(coalesce(power,0),50) into pw from public.profiles where id=m.user_id;
  ep:=public.sf_world_camp_pw(m.lvl); hp:=pw*3; ehp:=ep*3; ev:='[]'; sd:=abs(hashtext(m.id::text));
  for r in 1..8 loop exit when hp<=0 or ehp<=0;
   d1:=round(pw*(0.85+((sd>>r)%30)/100.0)); if r%3=0 then d1:=round(d1*1.5); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','skill','v',d1)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','hit','v',d1)); end if; ehp:=ehp-d1;
   exit when ehp<=0; d2:=round(ep*(0.85+((sd>>(r+8))%30)/100.0)); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','hit','v',d2)); hp:=hp-d2; end loop;
  win:=ehp<=0 or (hp>0 and hp/(pw*3)>=ehp/(ep*3));
  loot:=case when win then case when m.kind='pirate' then jsonb_build_object('wood',60*m.lvl,'fish',80*m.lvl) else jsonb_build_object('crys',25*m.lvl,'fish',40*m.lvl) end else null end;
  update public.world_march set done=true, result=jsonb_build_object('win',win,'loot',loot,'pw',pw,'ep',ep,'log',ev) where id=m.id;
  if win then insert into public.mail(user_id,kind,tk,args,att) values(m.user_id,'system','mail.camp',jsonb_build_array(m.lvl),loot); end if;
  if m.user_id=u then out:=out||jsonb_build_array(jsonb_build_object('id',m.id,'kind',m.kind,'lvl',m.lvl,'win',win,'loot',loot,'pw',pw,'ep',ep,'log',ev)); end if; end loop;
 return out; end $function$
;
