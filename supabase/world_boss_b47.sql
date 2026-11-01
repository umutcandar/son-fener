-- b47: Boss toplu seferi (klan rally) — bir klan üyesi canlı bir bossa 1/5 dk toplanma ile toplu sefer açar,
-- klan arkadaşları katılır (en çok 10). Süre dolunca liderin kasabasından TEK ordu yürür; güç = üyelerin güç toplamı,
-- toplu sefer bonusu +%5/ek üye (en çok +%30, sf_wb_rp) + klan çağrısı bonusu (sf_wb_cb). Hasar üyelere güç payına göre
-- bölünür, ganimet postayla. Her üye 1 günlük boss hakkı kullanır; boss yoldayken düşerse hak gitmez (b45 kuralı).
-- Asker kaybı yok. Tüm hesap sunucuda.
create table if not exists public.world_boss_rally(id bigserial primary key, slot int not null, boss smallint not null, clan_id uuid not null,
 leader uuid not null references public.profiles(id) on delete cascade, gather_until timestamptz not null, launched boolean not null default false,
 march_id bigint, done boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.world_boss_rally_m(rally_id bigint not null references public.world_boss_rally(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, at timestamptz not null default now(), primary key(rally_id,user_id));
create index if not exists world_boss_rally_open on public.world_boss_rally(clan_id) where not done;
create index if not exists world_boss_rally_m_user on public.world_boss_rally_m(user_id);
alter table public.world_boss_rally enable row level security;
alter table public.world_boss_rally_m enable row level security;

create or replace function public.sf_wb_rp(n int) returns int language sql immutable set search_path='' as $$ select least(30,5*greatest(0,coalesce(n,1)-1))::int $$;
-- açık (bitmemiş) toplu sefer üyeliği
create or replace function public.sf_wb_inrally(u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.world_boss_rally_m rm join public.world_boss_rally r on r.id=rm.rally_id where rm.user_id=u and not r.done) $$;
-- günlük hak: vuruşlar + henüz yürümemiş toplu sefer üyelikleri
create or replace function public.sf_wb_used(u uuid) returns bigint language sql stable set search_path='' as $$
 select (select count(*) from public.world_boss_hit h where h.user_id=u and h.at>=public.sf_ist_day0() and (h.dmg>0 or exists(select 1 from public.world_march m where m.id=h.march_id and not m.done)))
  + (select count(*) from public.world_boss_rally_m rm join public.world_boss_rally r on r.id=rm.rally_id where rm.user_id=u and not r.launched and not r.done) $$;
-- çağrı bonusu: toplu seferin kendi üyeleri sayılmaz (çifte bonus yok) — yalnız kendi ordusunu yürüten / vurmuş klan arkadaşları
create or replace function public.sf_wb_cb(u uuid, s int, b int) returns int language sql stable security definer set search_path='' as $$
 select case when c.clan_id is null or not exists(select 1 from public.world_boss_call w where w.slot=s and w.boss=b and w.clan_id=c.clan_id) then 0
  else least(50,10+10*(select count(distinct h.user_id) from public.world_boss_hit h join public.clan_members cm on cm.user_id=h.user_id and cm.clan_id=c.clan_id
   where h.slot=s and h.boss=b and h.user_id<>u and (h.dmg>0 or exists(select 1 from public.world_march m where m.id=h.march_id and not m.done and m.user_id=h.user_id))))::int end
 from (select (select clan_id from public.clan_members where user_id=u) clan_id) c $$;

create or replace function public.world_boss_rally_start(p_id int, p_wait int default 60) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; s int:=public.sf_world_slot(); d jsonb; cur bigint; rid bigint; w timestamptz; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if p_wait not in (60,300) then raise exception 'Geçersiz'; end if;
 if p_id is null or p_id<1 or p_id>9 then raise exception 'Hedef yok'; end if;
 perform pg_advisory_xact_lock(hashtext('wbr:'||c));
 select b.hp into cur from public.world_boss b where b.slot=s and b.id=p_id; if cur is not null and cur<=0 then raise exception 'Boss zaten yenildi'; end if;
 if public.sf_wb_used(u)>=12 then raise exception 'Günlük boss hakkın bitti'; end if;
 if public.sf_wb_inrally(u) or exists(select 1 from public.world_march where user_id=u and not done and kind='boss') or (select count(*) from public.world_march where user_id=u and not done)>=2 then raise exception 'Sefer kuyruğu dolu'; end if;
 if exists(select 1 from public.world_boss_rally where clan_id=c and not launched and not done) then raise exception 'Klanın zaten bir toplu saldırı hazırlıyor'; end if;
 perform public.sf_world_assign(u); d:=public.sf_wb_def(s,p_id); w:=now()+make_interval(secs=>p_wait);
 insert into public.world_boss_rally(slot,boss,clan_id,leader,gather_until) values(s,p_id,c,u,w) returning id into rid;
 insert into public.world_boss_rally_m(rally_id,user_id) values(rid,u);
 insert into public.messages(channel,user_id,nick,avatar,body,lang) select 'clan:'||c,u,nick,avatar,'🚩 BOSS T'||(d->>'t')||' → 📍 '||(d->>'x')||','||(d->>'y')||' · ⏱️ '||p_wait||'s · 👥 1/10','xx' from public.profiles where id=u;
 perform public.sf_act(u,'rally');
 return jsonb_build_object('ok',true,'rally',rid,'until',(extract(epoch from w)*1000)::bigint); end $$;

create or replace function public.world_boss_rally_join(p_rally bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.world_boss_rally; cur bigint; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select * into r from public.world_boss_rally where id=p_rally for update;
 if not found or r.launched or r.done or r.gather_until<=now() then raise exception 'Toplu saldırı kapandı'; end if;
 if r.clan_id is distinct from (select clan_id from public.clan_members where user_id=u) then raise exception 'Geçersiz'; end if;
 if exists(select 1 from public.world_boss_rally_m where rally_id=r.id and user_id=u) then raise exception 'Zaten katıldın'; end if;
 if (select count(*) from public.world_boss_rally_m where rally_id=r.id)>=10 then raise exception 'Toplu saldırı dolu'; end if;
 select b.hp into cur from public.world_boss b where b.slot=r.slot and b.id=r.boss; if (cur is not null and cur<=0) or r.slot<>public.sf_world_slot() then raise exception 'Boss zaten yenildi'; end if;
 if public.sf_wb_used(u)>=12 then raise exception 'Günlük boss hakkın bitti'; end if;
 if public.sf_wb_inrally(u) or exists(select 1 from public.world_march where user_id=u and not done and kind='boss') then raise exception 'Sefer kuyruğu dolu'; end if;
 insert into public.world_boss_rally_m(rally_id,user_id) values(r.id,u); perform public.sf_act(u,'rally');
 return jsonb_build_object('ok',true,'n',(select count(*) from public.world_boss_rally_m where rally_id=r.id)); end $$;

-- toplanma süresi dolan boss toplu seferlerini yürüt (world_resolve çağırır)
create or replace function public.sf_wb_rally_launch() returns void language plpgsql security definer set search_path='' as $$
declare r public.world_boss_rally; p public.world_pos; d jsonb; t int; mid bigint; cur bigint; begin
 for r in select * from public.world_boss_rally where not launched and not done and gather_until<=now() order by id limit 10 for update skip locked loop
  select b.hp into cur from public.world_boss b where b.slot=r.slot and b.id=r.boss;
  if r.slot<>public.sf_world_slot() or (cur is not null and cur<=0) then update public.world_boss_rally set done=true where id=r.id; continue; end if;
  p:=public.sf_world_assign(r.leader); d:=public.sf_wb_def(r.slot,r.boss); t:=public.sf_march_t(p.x,p.y,(d->>'x')::int,(d->>'y')::int);
  insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,army) values(r.leader,p.x,p.y,(d->>'x')::int,(d->>'y')::int,'boss',r.slot,(d->>'t')::int,now()+make_interval(secs=>t),jsonb_build_object('boss',r.boss,'rally',r.id)) returning id into mid;
  insert into public.world_boss_hit(slot,boss,user_id,march_id) select r.slot,r.boss,rm.user_id,mid from public.world_boss_rally_m rm where rm.rally_id=r.id;
  update public.world_boss_rally set launched=true, march_id=mid where id=r.id; end loop; end $$;

create or replace function public.sf_wb_hit(m public.world_march) returns jsonb language plpgsql security definer set search_path='' as $$
declare bid int:=coalesce((m.army->>'boss')::int,0); rid bigint:=(m.army->>'rally')::bigint; d jsonb; pw numeric; bp numeric; myhp numeric; dmg numeric:=0; r int; ev jsonb:='[]'; d1 numeric; d2 numeric; sd int:=abs(hashtext('wbh'||m.id)); cur bigint; mx bigint; kill boolean; loot jsonb; t int:=greatest(1,m.lvl); got bigint; cb int:=0; rp int:=0; n int:=1; pw0 numeric; mem jsonb:='[]'; q record; g bigint; lt jsonb; tot bigint; my bigint:=0; begin
 d:=public.sf_wb_def(m.slot,bid); mx:=(d->>'max')::bigint; bp:=(d->>'pw')::numeric;
 if rid is not null then
  select count(*), coalesce(sum(greatest(coalesce(p.power,0),50)),50) into n, pw from public.world_boss_rally_m rm join public.profiles p on p.id=rm.user_id where rm.rally_id=rid;
  n:=greatest(n,1); rp:=public.sf_wb_rp(n); update public.world_boss_rally set done=true where id=rid;
 else select greatest(coalesce(power,0),50) into pw from public.profiles where id=m.user_id; end if;
 insert into public.world_boss(slot,id,hp) values(m.slot,bid,mx) on conflict do nothing;
 select least(b.hp,mx) into cur from public.world_boss b where b.slot=m.slot and b.id=bid for update;
 if bid<1 or m.slot<>public.sf_world_slot() or cur<=0 then
  update public.world_boss_hit set dmg=0 where march_id=m.id;
  return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',false,'gone',true,'dmg',0,'pw',pw,'ep',bp,'n',n,'rally',rid is not null,'log','[]'::jsonb); end if;
 myhp:=pw*4; pw0:=pw; cb:=public.sf_wb_cb(m.user_id,m.slot,bid); pw:=round(pw*(100+cb+rp)/100.0);
 for r in 1..8 loop exit when myhp<=0;
  d1:=round(pw*(0.85+((sd>>r)%30)/100.0));
  if r%3=0 then d1:=round(d1*1.5); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','skill','v',d1)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','hit','v',d1)); end if;
  dmg:=dmg+d1; exit when dmg>=cur;
  d2:=round(bp*(0.85+((sd>>(r+8))%30)/100.0));
  if r%4=0 then d2:=round(d2*1.6); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','skill','v',d2)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','hit','v',d2)); end if;
  myhp:=myhp-d2; end loop;
 got:=least(dmg,cur)::bigint; kill:=got>=cur;
 update public.world_boss b set hp=least(b.hp,mx)-got, killer=case when kill then m.user_id else b.killer end, killed_at=case when kill then now() else b.killed_at end where b.slot=m.slot and b.id=bid;
 loot:=jsonb_build_object('fish',least(round(got/8.0),1500*t)::int,'wood',least(round(got/10.0),1200*t)::int,'crys',least(round(got/60.0),250*t)::int);
 if rid is null then
  update public.world_boss_hit set dmg=got where march_id=m.id;
 else
  tot:=got;
  -- toplu sefer: hasar güç payına göre bölünür; her üye kendi payının ganimetini alır (lider dahil)
  for q in select rm.user_id, p.nick, greatest(coalesce(p.power,0),50) w from public.world_boss_rally_m rm join public.profiles p on p.id=rm.user_id where rm.rally_id=rid order by 3 desc loop
   g:=floor(tot*q.w/pw0)::bigint; update public.world_boss_hit set dmg=g where march_id=m.id and user_id=q.user_id;
   mem:=mem||jsonb_build_array(jsonb_build_object('nick',q.nick,'dmg',g));
   if q.user_id<>m.user_id and g>0 then
    lt:=jsonb_build_object('fish',least(round(g/8.0),1500*t)::int,'wood',least(round(g/10.0),1200*t)::int,'crys',least(round(g/60.0),250*t)::int);
    insert into public.mail(user_id,kind,tk,args,att) values(q.user_id,'system','mail.wb_hit',jsonb_build_array(t,g),lt); end if;
   if q.user_id=m.user_id then my:=g; end if;
  end loop;
  got:=my;
  loot:=jsonb_build_object('fish',least(round(got/8.0),1500*t)::int,'wood',least(round(got/10.0),1200*t)::int,'crys',least(round(got/60.0),250*t)::int);
 end if;
 if kill then
  loot:=jsonb_build_object('fish',(loot->>'fish')::int,'wood',(loot->>'wood')::int,'crys',(loot->>'crys')::int+40*t,'gems',25*t);
  insert into public.mail(user_id,kind,tk,args,att)
   select q2.user_id,'system','mail.wb_kill',jsonb_build_array(t,(select nick from public.profiles where id=m.user_id)),jsonb_build_object('crys',40*t,'gems',5*t)
   from (select distinct h.user_id from public.world_boss_hit h where h.slot=m.slot and h.boss=bid and h.dmg>0 and h.user_id<>m.user_id) q2;
 end if;
 if got>0 or kill then insert into public.mail(user_id,kind,tk,args,att) values(m.user_id,'system',case when kill then 'mail.wb_last' else 'mail.wb_hit' end,jsonb_build_array(t,got),loot); end if;
 return jsonb_build_object('id',m.id,'kind','boss','boss',bid,'t',t,'lvl',t,'win',kill,'dmg',least(dmg,cur)::bigint,'my',got,'hp',cur-least(dmg,cur)::bigint,'max',mx,'loot',loot,'pw',pw0,'cb',cb,'rp',rp,'n',n,'rally',rid is not null,'mem',mem,'ep',bp,'log',ev); end $$;

create or replace function public.world_bosses() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); s int:=public.sf_world_slot(); c uuid; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select clan_id into c from public.clan_members where user_id=u;
 return jsonb_build_object('slot',s,'next',((s+1)::bigint*7200000),'cap',12,'clan',c is not null,
  'calls',(select count(*) from public.world_boss_call w where w.slot=s and w.clan_id=c),
  'used',public.sf_wb_used(u),
  'busy',exists(select 1 from public.world_march where user_id=u and not done and kind='boss') or public.sf_wb_inrally(u),
  'inr',public.sf_wb_inrally(u),
  'rgo',exists(select 1 from public.world_boss_rally where clan_id=c and not launched and not done),
  'list',(select jsonb_agg(dd.d||jsonb_build_object(
     'hp',greatest(0,least((dd.d->>'max')::bigint,coalesce(b.hp,(dd.d->>'max')::bigint))),
     'dead',coalesce(b.hp,1)<=0,
     'killer',(select nick from public.profiles where id=b.killer),
     'mine',(select coalesce(sum(h.dmg),0) from public.world_boss_hit h where h.slot=s and h.boss=i and h.user_id=u),
     'n',(select count(distinct h.user_id) from public.world_boss_hit h where h.slot=s and h.boss=i),
     'call',(select p.nick from public.world_boss_call w join public.profiles p on p.id=w.by where w.slot=s and w.boss=i and w.clan_id=c),
     'cn',(select count(distinct h.user_id) from public.world_boss_hit h join public.clan_members cm on cm.user_id=h.user_id and cm.clan_id=c where h.slot=s and h.boss=i),
     'cb',public.sf_wb_cb(u,s,i),
     'rally',(select jsonb_build_object('id',r.id,'leader',lp.nick,'until',(extract(epoch from r.gather_until)*1000)::bigint,'launched',r.launched,
        'arrive',(select (extract(epoch from wm.arrive_at)*1000)::bigint from public.world_march wm where wm.id=r.march_id),
        'n',(select count(*) from public.world_boss_rally_m rm where rm.rally_id=r.id),
        'pw',(select coalesce(sum(greatest(coalesce(p.power,0),50)),0) from public.world_boss_rally_m rm join public.profiles p on p.id=rm.user_id where rm.rally_id=r.id),
        'joined',exists(select 1 from public.world_boss_rally_m rm where rm.rally_id=r.id and rm.user_id=u))
       from public.world_boss_rally r join public.profiles lp on lp.id=r.leader where c is not null and r.clan_id=c and r.slot=s and r.boss=i and not r.done order by r.id desc limit 1),
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
 if public.sf_wb_inrally(u) or exists(select 1 from public.world_march where user_id=u and not done and kind='boss') or (select count(*) from public.world_march where user_id=u and not done)>=2 then raise exception 'Sefer kuyruğu dolu'; end if;
 t:=public.sf_march_t(p.x,p.y,(d->>'x')::int,(d->>'y')::int);
 insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,army) values(u,p.x,p.y,(d->>'x')::int,(d->>'y')::int,'boss',s,(d->>'t')::int,now()+make_interval(secs=>t),jsonb_build_object('boss',p_id)) returning * into m;
 insert into public.world_boss_hit(slot,boss,user_id,march_id) values(s,p_id,u,m.id);
 return jsonb_build_object('id',m.id,'arrive',(extract(epoch from m.arrive_at)*1000)::bigint,'secs',t); end $$;

create or replace function public.world_resolve() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); m public.world_march; w public.war_rally; pw numeric; ep numeric; hp numeric; ehp numeric; r int; ev jsonb; d1 numeric; d2 numeric; win boolean; loot jsonb; out jsonb:='[]'; sd int; p public.world_pos; t int; rep jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 for w in select * from public.war_rally where not launched and gather_until<=now() order by id limit 10 for update skip locked loop
  p:=public.sf_world_assign(w.leader); t:=public.sf_march_t(p.x,p.y,w.tx,w.ty);
  insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,target,rally_id,tclan,relic) values(w.leader,p.x,p.y,w.tx,w.ty,'rally',0,0,now()+make_interval(secs=>t),w.target,w.id,w.tclan,w.relic);
  update public.war_rally set launched=true where id=w.id; end loop;
 perform public.sf_wb_rally_launch();
 for m in select * from public.world_march where not done and arrive_at<=now() order by id limit 20 for update skip locked loop
  if m.kind in ('pvp','rally') then
   rep:=public.sf_war_hit(m); update public.world_march set done=true, result=coalesce(rep,'{}')-'grp'-'aeff'-'deff' where id=m.id;
   if m.rally_id is not null then update public.war_rally set done=true where id=m.rally_id; end if;
   if rep is not null and (m.user_id=u or m.target=u or exists(select 1 from public.war_rally_m where rally_id=m.rally_id and user_id=u)) then out:=out||jsonb_build_array(rep||jsonb_build_object('kind',m.kind,'pw',rep->'a0','ep',rep->'d0','lvl',0)); end if;
   continue; end if;
  if m.kind='boss' then
   rep:=public.sf_wb_hit(m); update public.world_march set done=true, result=rep where id=m.id;
   if m.user_id=u then out:=out||jsonb_build_array(rep);
   elsif (m.army->>'rally') is not null and exists(select 1 from public.world_boss_hit h where h.march_id=m.id and h.user_id=u) then
    out:=out||jsonb_build_array(rep||jsonb_build_object('my',(select dmg from public.world_boss_hit h where h.march_id=m.id and h.user_id=u limit 1),'loot',null)); end if;
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
 return out; end $$;

revoke all on function public.sf_wb_rp(int), public.sf_wb_inrally(uuid), public.sf_wb_used(uuid), public.sf_wb_cb(uuid,int,int), public.sf_wb_rally_launch(), public.sf_wb_hit(public.world_march) from public, anon, authenticated;
revoke all on function public.world_boss_rally_start(int,int), public.world_boss_rally_join(bigint), public.world_bosses(), public.world_attack_boss(int), public.world_resolve() from public, anon;
grant execute on function public.world_boss_rally_start(int,int), public.world_boss_rally_join(bigint), public.world_bosses(), public.world_attack_boss(int), public.world_resolve() to authenticated;
