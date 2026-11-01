-- b45: Dünya bossu dengesi — gerçek oyuncu gücüne göre (medyan ~80, üst %10 ~550): can 5x düşük (T1 12k … T5 216k), boss vuruşu ~9x düşük, oyuncu canı pw*4.
-- Son vuruşu yapan da katılım ödülünü alır; boss başkası tarafından yenildiği için boşa giden sefer günlük hakkı yemez; can çubuğu max ile sınırlı.
create or replace function public.sf_wb_max(t int) returns bigint language sql immutable set search_path='' as $$ select (12000*power(t,1.8))::bigint $$;
create or replace function public.sf_wb_pw(t int) returns bigint language sql immutable set search_path='' as $$ select (150*power(t,1.6))::bigint $$;
create or replace function public.sf_wb_used(u uuid) returns bigint language sql stable set search_path='' as $$ select count(*) from public.world_boss_hit h where h.user_id=u and h.at>=public.sf_ist_day0() and (h.dmg>0 or exists(select 1 from public.world_march m where m.id=h.march_id and not m.done)) $$;
create or replace function public.world_bosses() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s int:=public.sf_world_slot(); begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 return jsonb_build_object('slot',s,'next',((s+1)::bigint*7200000),'cap',12,
  'used',public.sf_wb_used(u),
  'busy',exists(select 1 from public.world_march where user_id=u and not done and kind='boss'),
  'list',(select jsonb_agg(dd.d||jsonb_build_object(
     'hp',greatest(0,least((dd.d->>'max')::bigint,coalesce(b.hp,(dd.d->>'max')::bigint))),
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
 if public.sf_wb_used(u)>=12 then raise exception 'Günlük boss hakkın bitti'; end if;
 if exists(select 1 from public.world_march where user_id=u and not done and kind='boss') or (select count(*) from public.world_march where user_id=u and not done)>=2 then raise exception 'Sefer kuyruğu dolu'; end if;
 t:=public.sf_march_t(p.x,p.y,(d->>'x')::int,(d->>'y')::int);
 insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,army) values(u,p.x,p.y,(d->>'x')::int,(d->>'y')::int,'boss',s,(d->>'t')::int,now()+make_interval(secs=>t),jsonb_build_object('boss',p_id)) returning * into m;
 insert into public.world_boss_hit(slot,boss,user_id,march_id) values(s,p_id,u,m.id);
 return jsonb_build_object('id',m.id,'arrive',(extract(epoch from m.arrive_at)*1000)::bigint,'secs',t); end $$;
create or replace function public.sf_wb_hit(m public.world_march) returns jsonb language plpgsql security definer set search_path='' as $$
declare bid int:=coalesce((m.army->>'boss')::int,0); d jsonb; pw numeric; bp numeric; myhp numeric; dmg numeric:=0; r int; ev jsonb:='[]'; d1 numeric; d2 numeric; sd int:=abs(hashtext('wbh'||m.id)); cur bigint; mx bigint; kill boolean; loot jsonb; t int:=greatest(1,m.lvl); got bigint; begin
 d:=public.sf_wb_def(m.slot,bid); mx:=(d->>'max')::bigint; bp:=(d->>'pw')::numeric;
 select greatest(coalesce(power,0),50) into pw from public.profiles where id=m.user_id;
 insert into public.world_boss(slot,id,hp) values(m.slot,bid,mx) on conflict do nothing;
 select least(b.hp,mx) into cur from public.world_boss b where b.slot=m.slot and b.id=bid for update;
 if bid<1 or m.slot<>public.sf_world_slot() or cur<=0 then
  update public.world_boss_hit set dmg=0 where march_id=m.id;
  return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',false,'gone',true,'dmg',0,'pw',pw,'ep',bp,'log','[]'::jsonb); end if;
 myhp:=pw*4;
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
 return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',kill,'dmg',got,'hp',cur-got,'max',mx,'loot',loot,'pw',pw,'ep',bp,'log',ev); end $$;
revoke all on function public.sf_wb_used(uuid), public.sf_wb_max(int), public.sf_wb_pw(int), public.sf_wb_hit(public.world_march) from public, anon, authenticated;
revoke all on function public.world_bosses(), public.world_attack_boss(int) from public, anon;
grant execute on function public.world_bosses(), public.world_attack_boss(int) to authenticated;
