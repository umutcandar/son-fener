-- b46: Klan boss çağrısı (rally) — klan üyesi bir bossu "klan hedefi" ilan eder, klan sohbetine düşer.
-- Çağrılmış bossa vuran klan üyeleri: +%10 taban, aynı bossa bu dilimde vuran/yürüyen her klan arkadaşı için +%10 (en çok +%50). Sunucu hesaplar.
create table if not exists public.world_boss_call(slot int not null, boss smallint not null, clan_id uuid not null, by uuid not null references public.profiles(id) on delete cascade, at timestamptz not null default now(), primary key(slot,boss,clan_id));
alter table public.world_boss_call enable row level security;
create or replace function public.sf_wb_cb(u uuid, s int, b int) returns int language sql stable security definer set search_path='' as $$
 select case when c.clan_id is null or not exists(select 1 from public.world_boss_call w where w.slot=s and w.boss=b and w.clan_id=c.clan_id) then 0
  else least(50,10+10*(select count(distinct h.user_id) from public.world_boss_hit h join public.clan_members cm on cm.user_id=h.user_id and cm.clan_id=c.clan_id
   where h.slot=s and h.boss=b and h.user_id<>u and (h.dmg>0 or exists(select 1 from public.world_march m where m.id=h.march_id and not m.done))))::int end
 from (select (select clan_id from public.clan_members where user_id=u) clan_id) c $$;
create or replace function public.world_boss_call(p_id int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; s int:=public.sf_world_slot(); d jsonb; cur bigint; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if p_id is null or p_id<1 or p_id>9 then raise exception 'Hedef yok'; end if;
 select b.hp into cur from public.world_boss b where b.slot=s and b.id=p_id; if cur is not null and cur<=0 then raise exception 'Boss zaten yenildi'; end if;
 if exists(select 1 from public.world_boss_call where slot=s and boss=p_id and clan_id=c) then raise exception 'Zaten çağrıldı'; end if;
 if (select count(*) from public.world_boss_call where slot=s and clan_id=c)>=3 then raise exception 'Çağrı hakkı doldu'; end if;
 d:=public.sf_wb_def(s,p_id);
 insert into public.world_boss_call(slot,boss,clan_id,by) values(s,p_id,c,u);
 insert into public.messages(channel,user_id,nick,avatar,body,lang) select 'clan:'||c,u,nick,avatar,'📯 BOSS T'||(d->>'t')||' → 📍 '||(d->>'x')||','||(d->>'y')||' · ⚔️ +10%','xx' from public.profiles where id=u;
 return jsonb_build_object('ok',true,'cb',public.sf_wb_cb(u,s,p_id)); end $$;
create or replace function public.world_bosses() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s int:=public.sf_world_slot(); c uuid; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select clan_id into c from public.clan_members where user_id=u;
 return jsonb_build_object('slot',s,'next',((s+1)::bigint*7200000),'cap',12,'clan',c is not null,
  'calls',(select count(*) from public.world_boss_call w where w.slot=s and w.clan_id=c),
  'used',public.sf_wb_used(u),
  'busy',exists(select 1 from public.world_march where user_id=u and not done and kind='boss'),
  'list',(select jsonb_agg(dd.d||jsonb_build_object(
     'hp',greatest(0,least((dd.d->>'max')::bigint,coalesce(b.hp,(dd.d->>'max')::bigint))),
     'dead',coalesce(b.hp,1)<=0,
     'killer',(select nick from public.profiles where id=b.killer),
     'mine',(select coalesce(sum(h.dmg),0) from public.world_boss_hit h where h.slot=s and h.boss=i and h.user_id=u),
     'n',(select count(distinct h.user_id) from public.world_boss_hit h where h.slot=s and h.boss=i),
     'call',(select p.nick from public.world_boss_call w join public.profiles p on p.id=w.by where w.slot=s and w.boss=i and w.clan_id=c),
     'cn',(select count(distinct h.user_id) from public.world_boss_hit h join public.clan_members cm on cm.user_id=h.user_id and cm.clan_id=c where h.slot=s and h.boss=i),
     'cb',public.sf_wb_cb(u,s,i),
     'top',(select jsonb_build_object('nick',p.nick,'dmg',q.dm) from (select h.user_id, sum(h.dmg) dm from public.world_boss_hit h where h.slot=s and h.boss=i group by 1 order by 2 desc limit 1) q join public.profiles p on p.id=q.user_id where q.dm>0)
   ) order by i) from generate_series(1,9) i cross join lateral (select public.sf_wb_def(s,i) d) dd left join public.world_boss b on b.slot=s and b.id=i)); end $$;
create or replace function public.sf_wb_hit(m public.world_march) returns jsonb language plpgsql security definer set search_path='' as $$
declare bid int:=coalesce((m.army->>'boss')::int,0); d jsonb; pw numeric; bp numeric; myhp numeric; dmg numeric:=0; r int; ev jsonb:='[]'; d1 numeric; d2 numeric; sd int:=abs(hashtext('wbh'||m.id)); cur bigint; mx bigint; kill boolean; loot jsonb; t int:=greatest(1,m.lvl); got bigint; cb int:=0; pw0 numeric; begin
 d:=public.sf_wb_def(m.slot,bid); mx:=(d->>'max')::bigint; bp:=(d->>'pw')::numeric;
 select greatest(coalesce(power,0),50) into pw from public.profiles where id=m.user_id;
 insert into public.world_boss(slot,id,hp) values(m.slot,bid,mx) on conflict do nothing;
 select least(b.hp,mx) into cur from public.world_boss b where b.slot=m.slot and b.id=bid for update;
 if bid<1 or m.slot<>public.sf_world_slot() or cur<=0 then
  update public.world_boss_hit set dmg=0 where march_id=m.id;
  return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',false,'gone',true,'dmg',0,'pw',pw,'ep',bp,'log','[]'::jsonb); end if;
 myhp:=pw*4; pw0:=pw; cb:=public.sf_wb_cb(m.user_id,m.slot,bid); pw:=round(pw*(100+cb)/100.0);
 for r in 1..8 loop exit when myhp<=0;
  d1:=round(pw*(0.85+((sd>>r)%30)/100.0));
  if r%3=0 then d1:=round(d1*1.5); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','skill','v',d1)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','hit','v',d1)); end if;
  dmg:=dmg+d1; exit when dmg>=cur;
  d2:=round(bp*(0.85+((sd>>(r+8))%30)/100.0));
  if r%4=0 then d2:=round(d2*1.6); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','skill','v',d2)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','hit','v',d2)); end if;
  myhp:=myhp-d2; end loop;
 got:=least(dmg,cur)::bigint; kill:=got>=cur;
 update public.world_boss b set hp=least(b.hp,mx)-got, killer=case when kill then m.user_id else b.killer end, killed_at=case when kill then now() else b.killed_at end where b.slot=m.slot and b.id=bid;
 update public.world_boss_hit set dmg=got where march_id=m.id;
 loot:=jsonb_build_object('fish',least(round(got/8.0),1500*t)::int,'wood',least(round(got/10.0),1200*t)::int,'crys',least(round(got/60.0),250*t)::int);
 if kill then
  loot:=jsonb_build_object('fish',(loot->>'fish')::int,'wood',(loot->>'wood')::int,'crys',(loot->>'crys')::int+40*t,'gems',25*t);
  insert into public.mail(user_id,kind,tk,args,att)
   select q.user_id,'system','mail.wb_kill',jsonb_build_array(t,(select nick from public.profiles where id=m.user_id)),jsonb_build_object('crys',40*t,'gems',5*t)
   from (select distinct h.user_id from public.world_boss_hit h where h.slot=m.slot and h.boss=bid and h.dmg>0 and h.user_id<>m.user_id) q;
 end if;
 if got>0 then insert into public.mail(user_id,kind,tk,args,att) values(m.user_id,'system',case when kill then 'mail.wb_last' else 'mail.wb_hit' end,jsonb_build_array(t,got),loot); end if;
 return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',kill,'dmg',got,'hp',cur-got,'max',mx,'loot',loot,'pw',pw0,'cb',cb,'ep',bp,'log',ev); end $$;
revoke all on function public.sf_wb_cb(uuid,int,int), public.sf_wb_hit(public.world_march) from public, anon, authenticated;
revoke all on function public.world_boss_call(int), public.world_bosses() from public, anon;
grant execute on function public.world_boss_call(int), public.world_bosses() to authenticated;
