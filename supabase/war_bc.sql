-- SAVAŞ B+C: ordu (kademe, revir, karşı-tip), PvP seferi, keşif, toplu saldırı (rally), Klan Kalesi, kadim fenerler
alter table public.world_march add column if not exists target uuid, add column if not exists army jsonb, add column if not exists rally_id bigint, add column if not exists tclan uuid, add column if not exists relic int;

create table if not exists public.war_army(user_id uuid primary key references auth.users on delete cascade, tier jsonb not null default '{"tayfa":1,"zipkin":1,"topcu":1}', revir jsonb not null default '{}', updated_at timestamptz default now());
create table if not exists public.war_report(id bigserial primary key, uids uuid[] not null, kind text not null, win boolean, data jsonb, created_at timestamptz default now());
create index if not exists war_report_uids on public.war_report using gin(uids);
create table if not exists public.clan_fort(clan_id uuid primary key references public.clans on delete cascade, x int not null, y int not null, lvl int not null default 1, xp bigint not null default 0, dur int not null, burn_until timestamptz, placed_at timestamptz default now(), unique(x,y));
create table if not exists public.fort_garrison(clan_id uuid references public.clan_fort on delete cascade, user_id uuid references auth.users on delete cascade, troops jsonb not null, primary key(clan_id,user_id));
create table if not exists public.fort_log(id bigserial primary key, clan_id uuid not null, kind text not null, data jsonb, created_at timestamptz default now());
create index if not exists fort_log_c on public.fort_log(clan_id,id desc);
create table if not exists public.war_rally(id bigserial primary key, clan_id uuid not null, leader uuid not null, tkind text not null, target uuid, tclan uuid, relic int, tx int, ty int, gather_until timestamptz not null, launched boolean default false, done boolean default false, created_at timestamptz default now());
create table if not exists public.war_rally_m(rally_id bigint references public.war_rally on delete cascade, user_id uuid not null, troops jsonb not null, primary key(rally_id,user_id));
create table if not exists public.world_relic(id int primary key, x int not null, y int not null, clan_id uuid references public.clans on delete set null, held_since timestamptz);
insert into public.world_relic(id,x,y) values (1,30,30),(2,90,30),(3,30,90),(4,90,90),(5,60,60) on conflict do nothing;
do $$ declare t text; begin foreach t in array array['war_army','war_report','clan_fort','fort_garrison','fort_log','war_rally','war_rally_m','world_relic'] loop
 execute format('alter table public.%I enable row level security',t); execute format('revoke all on public.%I from anon, authenticated',t); end loop; end $$;

-- yardımcılar
create or replace function public.sf_war_window() returns boolean language sql stable set search_path='' as $$
 select extract(hour from now() at time zone 'Europe/Istanbul') between 20 and 22 or (extract(dow from now() at time zone 'Europe/Istanbul') in (0,6) and extract(hour from now() at time zone 'Europe/Istanbul') between 14 and 16) $$;
create or replace function public.sf_tm(t int) returns numeric language sql immutable as $$ select 1+.3*(greatest(1,least(5,coalesce(t,1)))-1) $$;
create or replace function public.sf_war_tiers(u uuid) returns jsonb language sql stable set search_path='' as $$ select coalesce((select tier from public.war_army where user_id=u),'{"tayfa":1,"zipkin":1,"topcu":1}') $$;
-- gerçek birlik -> etkin (kademe çarpanlı)
create or replace function public.sf_war_eff(tr jsonb, tier jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('tayfa',coalesce((tr->>'tayfa')::numeric,0)*public.sf_tm((tier->>'tayfa')::int),'zipkin',coalesce((tr->>'zipkin')::numeric,0)*public.sf_tm((tier->>'zipkin')::int),'topcu',coalesce((tr->>'topcu')::numeric,0)*public.sf_tm((tier->>'topcu')::int)) $$;
create or replace function public.sf_jadd(a jsonb, b jsonb, m numeric default 1) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(k, round(coalesce((a->>k)::numeric,0)+m*coalesce((b->>k)::numeric,0),2)),'{}') from (select jsonb_object_keys(coalesce(a,'{}')) k union select jsonb_object_keys(coalesce(b,'{}'))) z $$;
create or replace function public.sf_war_clean(tr jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('tayfa',greatest(0,floor(coalesce((tr->>'tayfa')::numeric,0))),'zipkin',greatest(0,floor(coalesce((tr->>'zipkin')::numeric,0))),'topcu',greatest(0,floor(coalesce((tr->>'topcu')::numeric,0)))) $$;

-- savaş gücü çarpanı: kaptan/teknoloji + kale + kadim fener
create or replace function public.sf_war_buff(u uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare d jsonb; A record; base numeric; b numeric:=1; c uuid; f public.clan_fort; fb numeric:=0; rb numeric:=0; st numeric:=0; begin
 select data into d from public.saves where user_id=u;
 if d is not null then select * into A from public.sf_army(d);
  base:=public.sf_n(d,'{troops,tayfa}',1e6)*10+public.sf_n(d,'{troops,zipkin}',1e6)*14+public.sf_n(d,'{troops,topcu}',1e6)*19;
  b:=least(3,greatest(1,case when base>0 then A.atk/base else 1 end)); end if;
 select clan_id into c from public.clan_members where user_id=u;
 if c is not null then select * into f from public.clan_fort where clan_id=c;
  if found and f.dur>0 and coalesce(f.burn_until,'-infinity')<now() then fb:=.03*f.lvl; st:=.05*f.lvl; end if;
  select .05*count(*) into rb from public.world_relic where clan_id=c; end if;
 return jsonb_build_object('m',round(b*(1+fb+rb),3),'fort',fb,'relic',rb,'store',st,'lootm',coalesce(least(A.lootm,2),1),'pw',coalesce(A.power,0)); end $$;

-- deterministik savaş motoru. Tayfa(Abordajcı) > Zıpkıncı > Topçu > Tayfa
create or replace function public.sf_war_fight(a jsonb, ab numeric, d jsonb, db numeric, seed int) returns jsonb language plpgsql immutable set search_path='' as $$
declare atk numeric[]:=array[10,14,19]; hp numeric[]:=array[40,28,18]; an numeric[]; dn numeric[]; ka numeric[]; kd numeric[];
 r int; i int; j int; at numeric; dt numeric; m numeric; x numeric; y numeric; da numeric; dd numeric; ska boolean; skd boolean; ev jsonb:='[]'; a0 numeric; d0 numeric; a1 numeric; d1 numeric; win boolean; s int:=abs(seed); begin
 an:=array[coalesce((a->>'tayfa')::numeric,0),coalesce((a->>'zipkin')::numeric,0),coalesce((a->>'topcu')::numeric,0)];
 dn:=array[coalesce((d->>'tayfa')::numeric,0),coalesce((d->>'zipkin')::numeric,0),coalesce((d->>'topcu')::numeric,0)];
 a0:=an[1]*50+an[2]*42+an[3]*37; d0:=dn[1]*50+dn[2]*42+dn[3]*37;
 for r in 1..8 loop at:=an[1]+an[2]+an[3]; dt:=dn[1]+dn[2]+dn[3]; exit when at<=0.5 or dt<=0.5;
  ka:=array[0,0,0]; kd:=array[0,0,0]; da:=0; dd:=0; ska:=r%3=0; skd:=r%4=0;
  for i in 1..3 loop for j in 1..3 loop
   m:=case when (i%3)+1=j then 1.35 when (j%3)+1=i then .75 else 1 end;
   x:=an[i]*atk[i]*ab*(.9+((s>>((r+i*3+j)%24))&15)/75.0)*m*(dn[j]/dt)*(case when ska then 1.4 else 1 end)*.35; kd[j]:=kd[j]+x/hp[j]; da:=da+x;
   y:=dn[i]*atk[i]*db*(.9+((s>>((r+i*3+j+5)%24))&15)/75.0)*m*(an[j]/at)*(case when skd then 1.3 else 1 end)*.35; ka[j]:=ka[j]+y/hp[j]; dd:=dd+y;
  end loop; end loop;
  for i in 1..3 loop an[i]:=greatest(0,an[i]-ka[i]); dn[i]:=greatest(0,dn[i]-kd[i]); end loop;
  ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t',case when ska then 'skill' else 'hit' end,'v',round(da)),jsonb_build_object('r',r,'s','d','t',case when skd then 'skill' else 'hit' end,'v',round(dd)));
 end loop;
 a1:=an[1]*50+an[2]*42+an[3]*37; d1:=dn[1]*50+dn[2]*42+dn[3]*37;
 win:=a0>0 and (d1<=d0*.02 or (case when a0>0 then a1/a0 else 0 end)>(case when d0>0 then d1/d0 else 0 end));
 return jsonb_build_object('win',win,'log',ev,'ar',jsonb_build_object('tayfa',round(an[1],2),'zipkin',round(an[2],2),'topcu',round(an[3],2)),'dr',jsonb_build_object('tayfa',round(dn[1],2),'zipkin',round(dn[2],2),'topcu',round(dn[3],2)),'a0',round(a0),'d0',round(d0),'a1',round(a1),'d1',round(d1)); end $$;

-- kayıt üzerinden kendi kaynak/birlik düşümü (negatif birlik = ekle). Kilitler, rev+1
create or replace function public.sf_war_take(u uuid, p_res jsonb, p_tr jsonb, p_gems int default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare sv public.saves; d jsonb; k text; v numeric; h numeric; begin
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if; d:=sv.data;
 for k,v in select key,value::numeric from jsonb_each_text(coalesce(p_res,'{}')) loop
  if k not in ('fish','wood','crys') or v<0 then raise exception 'Geçersiz'; end if; h:=public.sf_n(d,array['res',k],1e12);
  if h<v then raise exception 'Kaynak yetersiz'; end if; d:=jsonb_set(d,array['res',k],to_jsonb(h-v)); end loop;
 for k,v in select key,floor(value::numeric) from jsonb_each_text(coalesce(p_tr,'{}')) loop
  if k not in ('tayfa','zipkin','topcu') then raise exception 'Geçersiz'; end if; h:=public.sf_n(d,array['troops',k],1e7);
  if h<v then raise exception 'Yeterli birlik yok'; end if; d:=jsonb_set(d,array['troops',k],to_jsonb(h-v)); end loop;
 if p_gems>0 then h:=public.sf_n(d,'{gems}',1e9); if h<p_gems then raise exception 'Elmas yetersiz'; end if; d:=jsonb_set(d,'{gems}',to_jsonb(h-p_gems)); end if;
 update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 return jsonb_build_object('rev',sv.rev,'res',d->'res','troops',d->'troops','gems',d->'gems'); end $$;

-- kayıp dağıtımı: n gerçek birlik, oran f[t]=kalan/başlangıç (etkin). Ölü/yaralı ayrımı, revir kapasitesi
create or replace function public.sf_war_cas(u uuid, n jsonb, a0 jsonb, ar jsonb, wfrac numeric, give_back boolean, p_extra jsonb, p_kind text, p_bid bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; lost jsonb:='{}'; wnd jsonb:='{}'; back jsonb:='{}'; tot numeric; l numeric; w numeric; cap numeric; used numeric; rv jsonb; f numeric; begin
 insert into public.war_army(user_id) values(u) on conflict do nothing;
 select revir into rv from public.war_army where user_id=u for update;
 used:=coalesce((select sum(value::numeric) from jsonb_each_text(rv)),0); cap:=1000+20*coalesce((select stage from public.profiles where id=u),1);
 foreach k in array array['tayfa','zipkin','topcu'] loop tot:=coalesce((n->>k)::numeric,0); if tot<=0 then continue; end if;
  f:=case when coalesce((a0->>k)::numeric,0)>0 then least(1,coalesce((ar->>k)::numeric,0)/(a0->>k)::numeric) else 1 end;
  l:=least(tot,ceil(tot*(1-f)-0.0001)); w:=least(floor(l*wfrac),greatest(0,cap-used)); used:=used+w;
  lost:=lost||jsonb_build_object(k,l); if w>0 then wnd:=wnd||jsonb_build_object(k,w); end if; back:=back||jsonb_build_object(k,case when give_back then tot-l else -l end); end loop;
 update public.war_army set revir=public.sf_jadd(revir,wnd), updated_at=now() where user_id=u;
 insert into public.events(user_id,kind,delta) values(u,p_kind,jsonb_build_object('troops',back,'res',coalesce(p_extra,'{}'),'battle',p_bid,'wounded',wnd));
 return jsonb_build_object('lost',lost,'wounded',wnd,'back',back); end $$;

-- ===== B: ordu =====
create or replace function public.army_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.war_army; begin if u is null then raise exception 'Giriş gerekli'; end if;
 insert into public.war_army(user_id) values(u) on conflict do nothing; select * into a from public.war_army where user_id=u;
 return jsonb_build_object('tier',a.tier,'revir',a.revir,'cap',1000+20*coalesce((select stage from public.profiles where id=u),1),'buff',public.sf_war_buff(u),'window',public.sf_war_window()); end $$;
create or replace function public.army_tier_up(p_t text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t int; r jsonb; c jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if p_t not in ('tayfa','zipkin','topcu') then raise exception 'Geçersiz'; end if; insert into public.war_army(user_id) values(u) on conflict do nothing;
 select coalesce((tier->>p_t)::int,1) into t from public.war_army where user_id=u for update; if t>=5 then raise exception 'En üst kademe'; end if;
 c:=jsonb_build_object('fish',600*t*t,'wood',450*t*t,'crys',80*t*t); r:=public.sf_war_take(u,c,'{}');
 update public.war_army set tier=jsonb_set(tier,array[p_t],to_jsonb(t+1)) where user_id=u;
 return r||jsonb_build_object('tier',(select tier from public.war_army where user_id=u)); end $$;
-- revir: kaynakla (2🐟+1🪵/birlik) ya da elmasla (1💎/10 birlik) iyileştir
create or replace function public.army_heal(p_gems boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rv jsonb; n numeric; r jsonb; neg jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 select revir into rv from public.war_army where user_id=u for update; n:=coalesce((select sum(value::numeric) from jsonb_each_text(coalesce(rv,'{}'))),0);
 if n<=0 then raise exception 'Revir boş'; end if;
 select jsonb_object_agg(key,-(value::numeric)) into neg from jsonb_each_text(rv);
 if p_gems then r:=public.sf_war_take(u,'{}',neg,ceil(n/10)::int); else r:=public.sf_war_take(u,jsonb_build_object('fish',2*n,'wood',n),neg); end if;
 update public.war_army set revir='{}' where user_id=u; return r||jsonb_build_object('healed',n); end $$;

-- ===== C: PvP, keşif, kalkan, raporlar =====
create or replace function public.sf_war_target_ok(u uuid, t uuid) returns void language plpgsql stable set search_path='' as $$
declare tg public.profiles; begin
 if t=u then raise exception 'Kendine saldıramazsın'; end if; select * into tg from public.profiles where id=t; if not found then raise exception 'Hedef yok'; end if;
 if tg.shield_until>now() then raise exception 'Hedef kalkan altında'; end if; if public.sf_protected(tg) then raise exception 'Yeni kaptan koruması (7 gün)'; end if;
 if (select clan_id from public.clan_members where user_id=u) is not null and (select clan_id from public.clan_members where user_id=u)=(select clan_id from public.clan_members where user_id=t) then raise exception 'Klan arkadaşına saldıramazsın'; end if; end $$;
create or replace function public.sf_march_t(fx int, fy int, tx int, ty int) returns int language sql immutable as $$ select least(180,10+ceil(sqrt(power(tx-fx,2)+power(ty-fy,2))*3))::int $$;

create or replace function public.world_attack_player(p_target uuid, p_tr jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.world_pos; q public.world_pos; tr jsonb; r jsonb; t int; m public.world_march; me public.profiles; dday text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); begin
 if u is null then raise exception 'Giriş gerekli'; end if; perform public.sf_war_target_ok(u,p_target);
 select * into me from public.profiles where id=u for update; if me.raid_day=dday and me.raid_n>=15 then raise exception 'Bugünkü baskın hakkın bitti'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 if (select count(*) from public.world_march where user_id=u and not done)>=2 then raise exception 'Sefer kuyruğu dolu'; end if;
 p:=public.sf_world_assign(u); select * into q from public.world_pos where user_id=p_target; if not found then q:=public.sf_world_assign(p_target); end if;
 r:=public.sf_war_take(u,'{}',tr); t:=public.sf_march_t(p.x,p.y,q.x,q.y);
 update public.profiles set raid_n=case when raid_day=dday then raid_n+1 else 1 end, raid_day=dday, shield_until=least(shield_until,now()), has_attacked=true where id=u;
 insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at,target,army) values(u,p.x,p.y,q.x,q.y,'pvp',0,0,now()+make_interval(secs=>t),p_target,tr) returning * into m;
 return r||jsonb_build_object('id',m.id,'secs',t); end $$;

create or replace function public.world_scout(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d jsonb; r jsonb; tg public.profiles; o jsonb; k text; t jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; if p_target=u then raise exception 'Geçersiz'; end if;
 select * into tg from public.profiles where id=p_target; if not found then raise exception 'Hedef yok'; end if;
 r:=public.sf_war_take(u,'{"fish":50}','{}'); select data into d from public.saves where user_id=p_target; t:=public.sf_war_tiers(p_target); o:='{}';
 foreach k in array array['tayfa','zipkin','topcu'] loop o:=o||jsonb_build_object(k,round(public.sf_n(d,array['troops',k],1e7),-1)); end loop;
 o:=jsonb_build_object('nick',tg.nick,'troops',o,'tier',t,'res',jsonb_build_object('fish',round(public.sf_n(d,'{res,fish}',1e12),-2),'wood',round(public.sf_n(d,'{res,wood}',1e12),-2),'crys',round(public.sf_n(d,'{res,crys}',1e12),-2)),'sh',coalesce(tg.shield_until>now(),false),'buff',(public.sf_war_buff(p_target)->'m'));
 insert into public.war_report(uids,kind,data) values(array[u],'scout',o||jsonb_build_object('target',p_target));
 return r||jsonb_build_object('scout',o); end $$;

create or replace function public.world_shield(p_h int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c int; r jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 c:=case p_h when 8 then 150 when 24 then 350 else null end; if c is null then raise exception 'Geçersiz'; end if;
 if exists(select 1 from public.world_march where user_id=u and not done and kind in ('pvp','rally')) then raise exception 'Sefer sürerken kalkan açılamaz'; end if;
 r:=public.sf_war_take(u,'{}','{}',c); update public.profiles set shield_until=greatest(coalesce(shield_until,now()),now())+make_interval(hours=>p_h) where id=u;
 return r||jsonb_build_object('shield_until',(select shield_until from public.profiles where id=u)); end $$;

create or replace function public.war_reports() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'win',win,'data',data,'at',extract(epoch from created_at)*1000) order by id desc),'[]') from (select * from public.war_report where auth.uid()=any(uids) order by id desc limit 25) z $$;

-- PvP / rally çözümü: savunan = ada (birlikler + kule) ya da kale (garnizon + kuleler) ya da kadim fener muhafızı
create or replace function public.sf_war_hit(m public.world_march) returns jsonb language plpgsql security definer set search_path='' as $$
declare grp jsonb:='[]'; g record; aeff jsonb:='{}'; deff jsonb:='{}'; ab numeric:=0; wsum numeric:=0; db numeric; res jsonb; dd jsonb; bid bigint; win boolean; loot jsonb:='{}'; k text; v numeric; capv numeric; share numeric;
 bf jsonb; dbf jsonb; vu uuid[]:='{}'; f public.clan_fort; dmg int; aclan uuid; rep jsonb; tower jsonb; out jsonb; dn text; an text; dg record; tot numeric; begin
 -- saldıran grup
 if m.kind='rally' then for g in select user_id, troops from public.war_rally_m where rally_id=m.rally_id loop grp:=grp||jsonb_build_array(jsonb_build_object('u',g.user_id,'n',g.troops)); end loop;
 else grp:=jsonb_build_array(jsonb_build_object('u',m.user_id,'n',m.army)); end if;
 for g in select (e->>'u')::uuid u, e->'n' n from jsonb_array_elements(grp) e loop
  aeff:=public.sf_jadd(aeff,public.sf_war_eff(g.n,public.sf_war_tiers(g.u))); bf:=public.sf_war_buff(g.u);
  v:=coalesce((g.n->>'tayfa')::numeric,0)+coalesce((g.n->>'zipkin')::numeric,0)+coalesce((g.n->>'topcu')::numeric,0); ab:=ab+(bf->>'m')::numeric*v; wsum:=wsum+v; vu:=vu||g.u; end loop;
 ab:=case when wsum>0 then ab/wsum else 1 end; select clan_id into aclan from public.clan_members where user_id=m.user_id; select nick into an from public.profiles where id=m.user_id;
 if m.target is not null then -- ada
  select data into dd from public.saves where user_id=m.target; dbf:=public.sf_war_buff(m.target); db:=(dbf->>'m')::numeric*1.1;
  tower:=jsonb_build_object('tayfa',30,'zipkin',20,'topcu',20); deff:=public.sf_jadd(public.sf_war_eff(coalesce(dd->'troops','{}'),public.sf_war_tiers(m.target)),tower);
  select nick into dn from public.profiles where id=m.target;
 elsif m.tclan is not null then -- kale
  select * into f from public.clan_fort where clan_id=m.tclan for update; if not found then return null; end if;
  db:=1.15+.03*f.lvl; tower:=jsonb_build_object('tayfa',60*f.lvl,'zipkin',60*f.lvl,'topcu',60*f.lvl); deff:=tower;
  for g in select user_id, troops from public.fort_garrison where clan_id=f.clan_id loop deff:=public.sf_jadd(deff,public.sf_war_eff(g.troops,public.sf_war_tiers(g.user_id))); end loop;
  select '['||tag||']' into dn from public.clans where id=f.clan_id;
 else -- kadim fener
  db:=1.2; tower:=jsonb_build_object('tayfa',180,'zipkin',180,'topcu',180); if (select clan_id from public.world_relic where id=m.relic) is not null then tower:=jsonb_build_object('tayfa',270,'zipkin',270,'topcu',270); end if; deff:=tower; dn:='relic:'||m.relic;
 end if;
 res:=public.sf_war_fight(aeff,ab,deff,db,hashtext('w'||m.id)); win:=(res->>'win')::boolean;
 insert into public.war_report(uids,kind,win,data) values(vu,case when m.kind='rally' then 'rally' else 'pvp' end,win,'{}') returning id into bid;
 -- ganimet (ada)
 if m.target is not null and win then for k in select unnest(array['fish','wood','crys']) loop
   v:=public.sf_n(dd,array['res',k],1e12)*(.15-coalesce((dbf->>'store')::numeric,0)*.15); capv:=(case when k='crys' then .3 else 1 end)*(400+(public.sf_war_buff(m.user_id)->>'pw')::numeric*1.5)*(case when m.kind='rally' then 2 else 1 end);
   loot:=loot||jsonb_build_object(k,floor(greatest(0,least(v,capv)))); end loop; end if;
 -- saldıran kayıpları + dönüş (+ganimet payı)
 for g in select (e->>'u')::uuid u, e->'n' n from jsonb_array_elements(grp) e loop
  v:=coalesce((g.n->>'tayfa')::numeric,0)+coalesce((g.n->>'zipkin')::numeric,0)+coalesce((g.n->>'topcu')::numeric,0); share:=case when wsum>0 then v/wsum else 1 end;
  out:=public.sf_war_cas(g.u,g.n,aeff,res->'ar',.6,true,(select coalesce(jsonb_object_agg(key,floor(value::numeric*share)),'{}') from jsonb_each_text(loot)),'war',bid);
  grp:=jsonb_set(grp,array[(select (o-1)::text from jsonb_array_elements(grp) with ordinality x(e,o) where (e->>'u')::uuid=g.u)],jsonb_build_object('u',g.u,'n',g.n,'cas',out,'nick',(select nick from public.profiles where id=g.u))); end loop;
 -- savunan kayıpları
 if m.target is not null then
  out:=public.sf_war_cas(m.target,coalesce(dd->'troops','{}'),deff,res->'dr',.8,false,(select coalesce(jsonb_object_agg(key,-(value::numeric)),'{}') from jsonb_each_text(loot)),'raided',bid);
  update public.profiles set shield_until=now()+case when win then interval '4 hours' else interval '30 minutes' end where id=m.target and coalesce(shield_until,now())<now();
  vu:=vu||m.target; rep:=jsonb_build_object('def',out);
 elsif m.tclan is not null then
  for g in select user_id, troops from public.fort_garrison where clan_id=f.clan_id for update loop
   out:=public.sf_war_cas(g.user_id,g.troops,deff,res->'dr',.8,false,'{}','fort_def',bid);
   update public.fort_garrison set troops=public.sf_war_clean(public.sf_jadd(troops,out->'lost',-1)) where clan_id=f.clan_id and user_id=g.user_id; vu:=vu||g.user_id; end loop;
  delete from public.fort_garrison where clan_id=f.clan_id and (troops->>'tayfa')::numeric+(troops->>'zipkin')::numeric+(troops->>'topcu')::numeric<1;
  dmg:=case when win then 400+round((res->>'a1')::numeric*.6)::int else round(((res->>'a0')::numeric-(res->>'a1')::numeric)*.05)::int end;
  update public.clan_fort set dur=greatest(0,dur-dmg), burn_until=case when dur-dmg<=0 then now()+interval '2 hours' else burn_until end where clan_id=f.clan_id returning * into f;
  insert into public.fort_log(clan_id,kind,data) values(f.clan_id,'attacked',jsonb_build_object('by',an,'tag',(select tag from public.clans where id=aclan),'win',win,'dmg',dmg,'dur',f.dur,'burn',f.dur<=0,'bid',bid));
  insert into public.messages(channel,user_id,nick,avatar,body,lang) select 'clan:'||f.clan_id, m.user_id, '🏰', 'ali', '🏰⚔️ ['||coalesce((select tag from public.clans where id=aclan),'?')||'] '||an||' → -'||dmg||' 🧱 ('||f.dur||')'||case when f.dur<=0 then ' 🔥' else '' end, 'xx';
  vu:=vu||coalesce((select array_agg(user_id) from public.clan_members where clan_id=f.clan_id),'{}'); rep:=jsonb_build_object('fort',jsonb_build_object('dmg',dmg,'dur',f.dur,'lvl',f.lvl,'burn',f.dur<=0));
 else
  if win then update public.world_relic set clan_id=aclan, held_since=now() where id=m.relic; end if; rep:=jsonb_build_object('relic',m.relic);
 end if;
 rep:=rep||jsonb_build_object('att',an,'def',dn,'target',m.target,'tclan',m.tclan,'relic',m.relic,'grp',grp,'loot',loot,'ab',round(ab,2),'db',round(db,2),'aeff',aeff,'deff',deff,'log',res->'log','a0',res->'a0','d0',res->'d0','a1',res->'a1','d1',res->'d1','att_id',m.user_id);
 update public.war_report set uids=(select array_agg(distinct x) from unnest(vu) x), data=rep where id=bid;
 return rep||jsonb_build_object('id',bid,'win',win); end $$;

-- ===== Rally =====
create or replace function public.war_rally_start(p_kind text, p_target text, p_tr jsonb, p_wait int default 60) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; tr jsonb; r jsonb; rid bigint; tx int; ty int; tg uuid; tc uuid; rl int; tag text; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if p_wait not in (60,300) then raise exception 'Geçersiz'; end if;
 if p_kind='player' then tg:=p_target::uuid; perform public.sf_war_target_ok(u,tg); select x,y into tx,ty from public.world_pos where user_id=tg;
 elsif p_kind='fort' then tc:=p_target::uuid; if tc=c then raise exception 'Geçersiz'; end if; if not public.sf_war_window() then raise exception 'Savaş penceresi kapalı'; end if;
  select x,y into tx,ty from public.clan_fort where clan_id=tc; if tx is null then raise exception 'Hedef yok'; end if;
 elsif p_kind='relic' then rl:=p_target::int; if not public.sf_war_window() then raise exception 'Savaş penceresi kapalı'; end if;
  select x,y into tx,ty from public.world_relic where id=rl and clan_id is distinct from c; if tx is null then raise exception 'Hedef yok'; end if;
 else raise exception 'Geçersiz'; end if;
 if tx is null then raise exception 'Hedef yok'; end if;
 if exists(select 1 from public.war_rally where clan_id=c and not launched) then raise exception 'Klanın zaten bir toplu saldırı hazırlıyor'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 r:=public.sf_war_take(u,'{}',tr); perform public.sf_world_assign(u);
 insert into public.war_rally(clan_id,leader,tkind,target,tclan,relic,tx,ty,gather_until) values(c,u,p_kind,tg,tc,rl,tx,ty,now()+make_interval(secs=>p_wait)) returning id into rid;
 insert into public.war_rally_m values(rid,u,tr); update public.profiles set shield_until=least(shield_until,now()), has_attacked=true where id=u;
 insert into public.messages(channel,user_id,nick,avatar,body,lang) select 'clan:'||c,u,nick,avatar,'📯 RALLY → '||case p_kind when 'fort' then '🏰 ['||(select tag from public.clans where id=tc)||']' when 'relic' then '🗼 #'||rl else (select nick from public.profiles where id=tg) end||' ⏱️ '||p_wait||'s','xx' from public.profiles where id=u;
 return r||jsonb_build_object('rally',rid); end $$;
create or replace function public.war_rally_join(p_id bigint, p_tr jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.war_rally; tr jsonb; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select * into w from public.war_rally where id=p_id for update;
 if not found or w.launched or w.gather_until<now() then raise exception 'Toplu saldırı kapandı'; end if;
 if w.clan_id is distinct from (select clan_id from public.clan_members where user_id=u) then raise exception 'Geçersiz'; end if;
 if exists(select 1 from public.war_rally_m where rally_id=p_id and user_id=u) then raise exception 'Zaten katıldın'; end if;
 if (select count(*) from public.war_rally_m where rally_id=p_id)>=10 then raise exception 'Toplu saldırı dolu'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 r:=public.sf_war_take(u,'{}',tr); insert into public.war_rally_m values(p_id,u,tr); return r||jsonb_build_object('ok',true); end $$;

-- ===== Klan Kalesi =====
create or replace function public.sf_fort_max(l int) returns int language sql immutable as $$ select 5000+2500*(l-1) $$;
create or replace function public.sf_fort_need(l int) returns bigint language sql immutable as $$ select (3000*l*l)::bigint $$;
create or replace function public.fort_place(p_x int, p_y int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; rl text; p public.world_pos; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id, role into c, rl from public.clan_members where user_id=u;
 if c is null or rl<>'lider' then raise exception 'Yalnızca klan lideri'; end if; if exists(select 1 from public.clan_fort where clan_id=c) then raise exception 'Klanın zaten bir kalesi var'; end if;
 if p_x<1 or p_y<1 or p_x>=public.sf_world_n()-1 or p_y>=public.sf_world_n()-1 then raise exception 'Geçersiz konum'; end if;
 p:=public.sf_world_assign(u); if greatest(abs(p.x-p_x),abs(p.y-p_y))>8 then raise exception 'Adana çok uzak'; end if;
 if exists(select 1 from public.world_pos where x=p_x and y=p_y) or exists(select 1 from public.clan_fort where greatest(abs(x-p_x),abs(y-p_y))<=6) or exists(select 1 from public.world_relic where greatest(abs(x-p_x),abs(y-p_y))<=4) then raise exception 'Konum dolu'; end if;
 insert into public.clan_fort(clan_id,x,y,dur) values(c,p_x,p_y,public.sf_fort_max(1));
 insert into public.fort_log(clan_id,kind,data) values(c,'placed',jsonb_build_object('by',(select nick from public.profiles where id=u),'x',p_x,'y',p_y));
 return public.fort_info(); end $$;
create or replace function public.fort_donate(p_k text, p_n int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; r jsonb; f public.clan_fort; add int; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if p_k not in ('fish','wood','crys') or p_n<1 or p_n>1000000 then raise exception 'Geçersiz'; end if;
 select * into f from public.clan_fort where clan_id=c for update; if not found then raise exception 'Kale yok'; end if; if f.lvl>=10 then raise exception 'En üst seviye'; end if;
 r:=public.sf_war_take(u,jsonb_build_object(p_k,p_n),'{}'); add:=p_n*case when p_k='crys' then 3 else 1 end; f.xp:=f.xp+add;
 while f.lvl<10 and f.xp>=public.sf_fort_need(f.lvl) loop f.xp:=f.xp-public.sf_fort_need(f.lvl); f.lvl:=f.lvl+1; f.dur:=f.dur+2500;
  insert into public.fort_log(clan_id,kind,data) values(c,'lvl',jsonb_build_object('lvl',f.lvl)); end loop;
 update public.clan_fort set xp=f.xp, lvl=f.lvl, dur=f.dur where clan_id=c;
 insert into public.fort_log(clan_id,kind,data) values(c,'donate',jsonb_build_object('by',(select nick from public.profiles where id=u),'k',p_k,'n',p_n));
 return r||jsonb_build_object('fort',public.fort_info()); end $$;
create or replace function public.fort_garrison(p_tr jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; tr jsonb; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if not exists(select 1 from public.clan_fort where clan_id=c) then raise exception 'Kale yok'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 r:=public.sf_war_take(u,'{}',tr);
 insert into public.fort_garrison values(c,u,tr) on conflict(clan_id,user_id) do update set troops=public.sf_jadd(public.fort_garrison.troops,excluded.troops);
 insert into public.fort_log(clan_id,kind,data) values(c,'garrison',jsonb_build_object('by',(select nick from public.profiles where id=u),'tr',tr));
 return r||jsonb_build_object('fort',public.fort_info()); end $$;
create or replace function public.fort_recall() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; tr jsonb; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u;
 delete from public.fort_garrison where user_id=u returning troops into tr; if tr is null then raise exception 'Garnizonda birliğin yok'; end if;
 r:=public.sf_war_take(u,'{}',(select jsonb_object_agg(key,-(value::numeric)) from jsonb_each_text(tr)));
 return r||jsonb_build_object('fort',public.fort_info()); end $$;
create or replace function public.fort_repair(p_n int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; f public.clan_fort; n int; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 select * into f from public.clan_fort where clan_id=c for update; if not found then raise exception 'Kale yok'; end if;
 n:=least(p_n,ceil((public.sf_fort_max(f.lvl)-f.dur)/2.0)::int); if n<1 then raise exception 'Kale sağlam'; end if;
 r:=public.sf_war_take(u,jsonb_build_object('wood',n),'{}');
 update public.clan_fort set dur=least(public.sf_fort_max(lvl),dur+2*n), burn_until=case when burn_until>now() then now() else burn_until end where clan_id=c;
 insert into public.fort_log(clan_id,kind,data) values(c,'repair',jsonb_build_object('by',(select nick from public.profiles where id=u),'n',2*n));
 return r||jsonb_build_object('fort',public.fort_info()); end $$;
create or replace function public.fort_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; rl text; f public.clan_fort; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id, role into c, rl from public.clan_members where user_id=u;
 if c is null then return jsonb_build_object('clan',null,'window',public.sf_war_window()); end if; select * into f from public.clan_fort where clan_id=c;
 return jsonb_build_object('clan',c,'lead',rl='lider','window',public.sf_war_window(),
  'fort',case when f.clan_id is null then null else jsonb_build_object('x',f.x,'y',f.y,'lvl',f.lvl,'xp',f.xp,'need',public.sf_fort_need(f.lvl),'dur',f.dur,'max',public.sf_fort_max(f.lvl),'burn',coalesce(f.burn_until>now(),false),'burn_until',extract(epoch from f.burn_until)*1000,'buff',.03*f.lvl,'store',.05*f.lvl,'r',2+f.lvl/3) end,
  'gar',(select coalesce(jsonb_agg(jsonb_build_object('nick',p.nick,'me',g.user_id=u,'tr',g.troops)),'[]') from public.fort_garrison g join public.profiles p on p.id=g.user_id where g.clan_id=c),
  'log',(select coalesce(jsonb_agg(jsonb_build_object('k',kind,'d',data,'at',extract(epoch from created_at)*1000) order by id desc),'[]') from (select * from public.fort_log where clan_id=c order by id desc limit 20) z),
  'rallies',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'kind',w.tkind,'tx',w.tx,'ty',w.ty,'until',extract(epoch from w.gather_until)*1000,'launched',w.launched,'leader',(select nick from public.profiles where id=w.leader),
     'tname',case w.tkind when 'player' then (select nick from public.profiles where id=w.target) when 'fort' then (select '['||tag||']' from public.clans where id=w.tclan) else '#'||w.relic end,
     'joined',exists(select 1 from public.war_rally_m where rally_id=w.id and user_id=u),'n',(select count(*) from public.war_rally_m where rally_id=w.id),
     'tr',(select coalesce(sum((troops->>'tayfa')::numeric+(troops->>'zipkin')::numeric+(troops->>'topcu')::numeric),0) from public.war_rally_m where rally_id=w.id))),'[]') from public.war_rally w where w.clan_id=c and not w.done),
  'incoming',(select coalesce(jsonb_agg(jsonb_build_object('tag',(select tag from public.clans where id=w.clan_id),'until',extract(epoch from w.gather_until)*1000,'launched',w.launched)),'[]') from public.war_rally w where w.tclan=c and not w.done),
  'relics',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'x',x,'y',y,'mine',clan_id=c)),'[]') from public.world_relic where clan_id=c)); end $$;

-- ===== dünya çözümleyici (tüm varan seferler + toplanan rally) =====
create or replace function public.world_resolve() returns jsonb language plpgsql security definer set search_path='' as $$
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

-- dünya görünümüne kaleler + kadim fenerler
create or replace function public.world_extra(p_x int, p_y int, p_w int, p_h int) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('forts',(select coalesce(jsonb_agg(jsonb_build_object('x',f.x,'y',f.y,'lvl',f.lvl,'cid',f.clan_id,'tag',c.tag,'cic',c.icon,'dur',f.dur,'max',public.sf_fort_max(f.lvl),'burn',coalesce(f.burn_until>now(),false),'r',2+f.lvl/3,'mine',f.clan_id=public.my_clan())),'[]')
   from public.clan_fort f join public.clans c on c.id=f.clan_id where f.x between p_x-6 and p_x+least(p_w,25)+6 and f.y between p_y-6 and p_y+least(p_h,25)+6),
  'relics',(select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'x',r.x,'y',r.y,'tag',c.tag,'cic',c.icon,'mine',r.clan_id is not null and r.clan_id=public.my_clan())),'[]') from public.world_relic r left join public.clans c on c.id=r.clan_id),
  'window',public.sf_war_window()) $$;

revoke all on function public.sf_war_take(uuid,jsonb,jsonb,int), public.sf_war_cas(uuid,jsonb,jsonb,jsonb,numeric,boolean,jsonb,text,bigint), public.sf_war_hit(public.world_march), public.sf_war_buff(uuid), public.sf_war_target_ok(uuid,uuid), public.sf_war_tiers(uuid) from public, anon, authenticated;
do $$ declare f text; begin foreach f in array array['army_info()','army_tier_up(text)','army_heal(boolean)','world_attack_player(uuid,jsonb)','world_scout(uuid)','world_shield(int)','war_reports()','war_rally_start(text,text,jsonb,int)','war_rally_join(bigint,jsonb)','fort_place(int,int)','fort_donate(text,int)','fort_garrison(jsonb)','fort_recall()','fort_repair(int)','fort_info()','world_resolve()','world_extra(int,int,int,int)'] loop
 execute 'revoke all on function public.'||f||' from public, anon'; execute 'grant execute on function public.'||f||' to authenticated'; end loop; end $$;
