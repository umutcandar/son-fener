-- Son Fener Kalesi: Wartune tarzı şehir (sunucu kilitli). Ada birleştirme ızgarası ekonomi olarak kalır; şehir askeri katman.
create table if not exists public.war_city(user_id uuid primary key references auth.users on delete cascade, b jsonb not null default '{}', q jsonb not null default '[]', form jsonb not null default '{}', seeded jsonb, created timestamptz default now());
alter table public.war_city enable row level security;
drop policy if exists wc_own on public.war_city; create policy wc_own on public.war_city for select using (user_id=auth.uid());
revoke insert,update,delete on public.war_city from anon, authenticated;
create or replace function public.sf_city_def() returns jsonb language sql immutable as $$ select '{
 "kale":{"c":{"wood":400,"fish":300,"crys":100},"t":120,"u":1},"kisla":{"c":{"wood":200,"fish":200},"t":60,"u":1},
 "zkule":{"c":{"wood":200,"fish":150,"crys":40},"t":60,"u":3},"dokum":{"c":{"wood":250,"fish":100,"crys":80},"t":90,"u":5},
 "tezgah":{"c":{"wood":300,"fish":200,"crys":60},"t":90,"u":10},"revir":{"c":{"wood":150,"fish":200},"t":60,"u":2},
 "akademi":{"c":{"wood":200,"fish":100,"crys":100},"t":90,"u":4},"sur":{"c":{"wood":300,"fish":100,"crys":40},"t":60,"u":1},
 "ambar":{"c":{"wood":250,"fish":150},"t":60,"u":1}}'::jsonb $$;
create or replace function public.sf_city_cost(k text, l int) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(key, round(value::numeric*power(l,1.6))),'{}') from jsonb_each_text(public.sf_city_def()->k->'c') $$;
create or replace function public.sf_city_secs(k text, l int) returns int language sql immutable set search_path='' as $$
 select least(86400, round((public.sf_city_def()->k->>'t')::numeric*power(1.22,l-1)))::int $$;
create or replace function public.sf_vip(d jsonb) returns int language sql immutable as $$
 select (select count(*) from unnest(array[0,100,300,700,1500,3000,6000]) x where coalesce((d->>'vipPts')::numeric,0)>=x)::int-1 $$;
create or replace function public.sf_city_seed(d jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare mx jsonb:='{}'; c jsonb; kale int; y int; begin
 for c in select value from jsonb_each(coalesce(d->'g','{}')) union all select g.value from jsonb_each(coalesce(d->'isl','{}')) i, jsonb_each(case when jsonb_typeof(i.value->'g')='object' then i.value->'g' else '{}' end) g loop
  if jsonb_typeof(c)='object' and c ? 'k' then mx:=mx||jsonb_build_object(c->>'k',greatest(coalesce((mx->>(c->>'k'))::int,0),least(30,coalesce((c->>'lv')::int,1)))); end if; end loop;
 kale:=greatest(1,least(30,coalesce((d#>>'{fener,lv}')::int,1))); y:=least(kale,greatest(1,coalesce((mx->>'yard')::int,1)));
 return jsonb_build_object('kale',kale,'kisla',y,'zkule',case when kale>=3 then y else 0 end,'dokum',case when kale>=5 then y else 0 end,'tezgah',0,
  'revir',case when kale>=2 then 1 else 0 end,'akademi',case when kale>=4 then least(kale,greatest(1,coalesce((mx->>'lab')::int,1))) else 0 end,
  'sur',least(kale,greatest(1,coalesce((mx->>'tower')::int,1))),'ambar',1); end $$;
create or replace function public.sf_city_ensure(u uuid) returns void language plpgsql security definer set search_path='' as $$
declare s jsonb; begin if exists(select 1 from public.war_city where user_id=u) then return; end if;
 s:=public.sf_city_seed(coalesce((select data from public.saves where user_id=u),'{}'));
 insert into public.war_city(user_id,b,seeded) values(u,s,s) on conflict do nothing; end $$;
create or replace function public.sf_city_lv(u uuid, k text) returns int language sql stable set search_path='' as $$
 select coalesce((select (b->>k)::int from public.war_city where user_id=u),0) $$;
-- biten inşaatları uygula (kilitli satır)
create or replace function public.sf_city_tick(u uuid) returns public.war_city language plpgsql security definer set search_path='' as $$
declare r public.war_city; e jsonb; nq jsonb:='[]'; begin perform public.sf_city_ensure(u);
 select * into r from public.war_city where user_id=u for update;
 for e in select value from jsonb_array_elements(r.q) loop
  if (e->>'until')::timestamptz<=now() then r.b:=jsonb_set(r.b,array[e->>'k'],to_jsonb((e->>'to')::int)); else nq:=nq||jsonb_build_array(e); end if; end loop;
 update public.war_city set b=r.b,q=nq where user_id=u returning * into r; return r; end $$;
create or replace function public.sf_city_out(r public.war_city) returns jsonb language plpgsql stable set search_path='' as $$
declare d jsonb; k text; l int; lst jsonb:='[]'; busy jsonb; ok text; begin select data into d from public.saves where user_id=r.user_id;
 for k in select jsonb_object_keys(public.sf_city_def()) loop l:=coalesce((r.b->>k)::int,0);
  select value into busy from jsonb_array_elements(r.q) where value->>'k'=k limit 1;
  ok:=case when l>=30 then 'max' when k<>'kale' and (r.b->>'kale')::int<(public.sf_city_def()->k->>'u')::int then 'kale'
   when k<>'kale' and l+1>(r.b->>'kale')::int then 'kale' when k='kale' and (coalesce((r.b->>'kisla')::int,0)<l or coalesce((r.b->>'sur')::int,0)<l) then 'kisla_sur' else null end;
  lst:=lst||jsonb_build_array(jsonb_build_object('key',k,'lvl',l,'max',30,'until',busy->>'until','unlock',(public.sf_city_def()->k->>'u')::int,
   'next',case when l>=30 then null else jsonb_build_object('cost',public.sf_city_cost(k,l+1),'secs',public.sf_city_secs(k,l+1),'req',ok) end)); end loop;
 return jsonb_build_object('list',lst,'q',r.q,'slots',1+case when public.sf_vip(d)>=2 then 1 else 0 end,'vip',public.sf_vip(d),'form',r.form,
  'tier',public.sf_war_tiers(r.user_id),'base',coalesce((select tier from public.war_army where user_id=r.user_id),'{"tayfa":1,"zipkin":1,"topcu":1}'),'akreq',jsonb_build_array(2,5,9,14),'now',now()); end $$;
create or replace function public.city_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin if u is null then raise exception 'Giriş gerekli'; end if; return public.sf_city_out(public.sf_city_tick(u)); end $$;
create or replace function public.city_upgrade(p_k text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.war_city; o jsonb; e jsonb; l int; t jsonb; d jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if not (public.sf_city_def() ? p_k) then raise exception 'Geçersiz'; end if; r:=public.sf_city_tick(u); o:=public.sf_city_out(r);
 select value into e from jsonb_array_elements(o->'list') where value->>'key'=p_k;
 if e->>'until' is not null then raise exception 'Zaten inşa ediliyor'; end if;
 if jsonb_array_length(r.q)>=(o->>'slots')::int then raise exception 'İnşaat sırası dolu'; end if;
 if e->'next' is null then raise exception 'En üst seviye'; end if; if e#>>'{next,req}' is not null then raise exception 'Kale seviyesi yetersiz'; end if;
 l:=(e->>'lvl')::int+1; t:=public.sf_war_take(u,public.sf_city_cost(p_k,l),'{}');
 update public.war_city set q=q||jsonb_build_array(jsonb_build_object('k',p_k,'to',l,'until',now()+make_interval(secs=>public.sf_city_secs(p_k,l)))) where user_id=u returning * into r;
 return t||jsonb_build_object('city',public.sf_city_out(r)); end $$;
-- hızlandır: başlamış her dakika 1💎 (dürüst, sabit)
create or replace function public.city_speed(p_k text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.war_city; e jsonb; g int; t jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 r:=public.sf_city_tick(u); select value into e from jsonb_array_elements(r.q) where value->>'k'=p_k;
 if e is null then raise exception 'İnşaat yok'; end if; g:=greatest(1,ceil(extract(epoch from ((e->>'until')::timestamptz-now()))/60))::int;
 t:=public.sf_war_take(u,'{}','{}',g);
 update public.war_city set q=(select coalesce(jsonb_agg(case when value->>'k'=p_k then jsonb_set(value,'{until}',to_jsonb(now())) else value end),'[]') from jsonb_array_elements(q)) where user_id=u;
 r:=public.sf_city_tick(u); return t||jsonb_build_object('spent',g,'city',public.sf_city_out(r)); end $$;
-- diziliş 3x3: 0-2 ön, 3-5 orta, 6-8 arka; en çok 4 birlik yığını + 1 kaptan
create or replace function public.city_form(p_cells jsonb, p_hero text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); v text; n int:=0; h int:=0; i int; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if jsonb_typeof(p_cells)<>'array' or jsonb_array_length(p_cells)<>9 then raise exception 'Geçersiz'; end if;
 for i in 0..8 loop v:=p_cells->>i; if v is null then continue; end if;
  if v='hero' then h:=h+1; elsif v in ('tayfa','zipkin','topcu') then n:=n+1; else raise exception 'Geçersiz'; end if; end loop;
 if n>4 or h>1 then raise exception 'Diziliş dolu'; end if;
 if p_hero is not null and not ((select data from public.saves where user_id=u)->'heroes' ? p_hero) then raise exception 'Kaptan yok'; end if;
 perform public.sf_city_ensure(u); update public.war_city set form=jsonb_build_object('cells',p_cells,'hero',p_hero) where user_id=u;
 return public.sf_city_out(public.sf_city_tick(u)); end $$;
-- etkin kademe = araştırma + bina (%1/sv) + diziliş + kaptan uzmanlığı (0.3 = 1 kademe)
create or replace function public.sf_war_tiers(u uuid) returns jsonb language plpgsql stable set search_path='' as $$
declare t jsonb; c public.war_city; o jsonb:='{}'; k text; m numeric; i int; cl jsonb; hl text; begin
 t:=coalesce((select tier from public.war_army where user_id=u),'{"tayfa":1,"zipkin":1,"topcu":1}'); select * into c from public.war_city where user_id=u;
 hl:=case c.form->>'hero' when 'kaan' then 'topcu' when 'lale' then 'topcu' when 'tunc' then 'zipkin' when 'selin' then 'zipkin' when 'deniz' then 'tayfa' when 'ali' then 'tayfa' when 'baris' then 'tayfa' else 'all' end;
 cl:=case when jsonb_typeof(c.form->'cells')='array' then c.form->'cells' else '[]' end;
 foreach k in array array['tayfa','zipkin','topcu'] loop
  m:=.01*coalesce((c.b->>(case k when 'tayfa' then 'kisla' when 'zipkin' then 'zkule' else 'dokum' end))::int,0);
  for i in 0..8 loop if cl->>i=k then
    if i<=2 and k='tayfa' then m:=m+.05; elsif i>=6 and k<>'tayfa' then m:=m+.10; end if; exit; end if; end loop;
  if c.form->>'hero' is not null and (cl ? 'hero') then m:=m+case when hl=k then .08 when hl='all' then .03 else 0 end; end if;
  o:=o||jsonb_build_object(k,round(greatest(1,least(5,coalesce((t->>k)::int,1)))+m/.3,3)); end loop; return o; end $$;
create or replace function public.sf_war_eff(tr jsonb, tier jsonb) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('tayfa',coalesce((tr->>'tayfa')::numeric,0)*(1+.3*(greatest(1,coalesce((tier->>'tayfa')::numeric,1))-1)),'zipkin',coalesce((tr->>'zipkin')::numeric,0)*(1+.3*(greatest(1,coalesce((tier->>'zipkin')::numeric,1))-1)),'topcu',coalesce((tr->>'topcu')::numeric,0)*(1+.3*(greatest(1,coalesce((tier->>'topcu')::numeric,1))-1))) $$;
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
 return jsonb_build_object('m',round(b*(1+fb+rb),3),'fort',fb,'relic',rb,'store',least(.6,st+.015*public.sf_city_lv(u,'ambar')),'lootm',coalesce(least(A.lootm,2),1),'pw',coalesce(A.power,0)); end $$;
create or replace function public.army_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a public.war_army; begin if u is null then raise exception 'Giriş gerekli'; end if;
 insert into public.war_army(user_id) values(u) on conflict do nothing; select * into a from public.war_army where user_id=u;
 return jsonb_build_object('tier',a.tier,'revir',a.revir,'cap',1000+20*coalesce((select stage from public.profiles where id=u),1)+300*public.sf_city_lv(u,'revir'),'buff',public.sf_war_buff(u),'window',public.sf_war_window()); end $$;
create or replace function public.sf_war_cas(u uuid, n jsonb, a0 jsonb, ar jsonb, wfrac numeric, give_back boolean, p_extra jsonb, p_kind text, p_bid bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare k text; lost jsonb:='{}'; wnd jsonb:='{}'; back jsonb:='{}'; tot numeric; l numeric; w numeric; cap numeric; used numeric; rv jsonb; f numeric; begin
 insert into public.war_army(user_id) values(u) on conflict do nothing;
 select revir into rv from public.war_army where user_id=u for update;
 used:=coalesce((select sum(value::numeric) from jsonb_each_text(rv)),0); cap:=1000+20*coalesce((select stage from public.profiles where id=u),1)+300*public.sf_city_lv(u,'revir');
 foreach k in array array['tayfa','zipkin','topcu'] loop tot:=coalesce((n->>k)::numeric,0); if tot<=0 then continue; end if;
  f:=case when coalesce((a0->>k)::numeric,0)>0 then least(1,coalesce((ar->>k)::numeric,0)/(a0->>k)::numeric) else 1 end;
  l:=least(tot,ceil(tot*(1-f)-0.0001)); w:=least(floor(l*wfrac),greatest(0,cap-used)); used:=used+w;
  lost:=lost||jsonb_build_object(k,l); if w>0 then wnd:=wnd||jsonb_build_object(k,w); end if; back:=back||jsonb_build_object(k,case when give_back then tot-l else -l end); end loop;
 update public.war_army set revir=public.sf_jadd(revir,wnd), updated_at=now() where user_id=u;
 insert into public.events(user_id,kind,delta) values(u,p_kind,jsonb_build_object('troops',back,'res',coalesce(p_extra,'{}'),'battle',p_bid,'wounded',wnd));
 return jsonb_build_object('lost',lost,'wounded',wnd,'back',back); end $$;
create or replace function public.army_tier_up(p_t text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t int; r jsonb; c jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if p_t not in ('tayfa','zipkin','topcu') then raise exception 'Geçersiz'; end if; insert into public.war_army(user_id) values(u) on conflict do nothing;
 select coalesce((tier->>p_t)::int,1) into t from public.war_army where user_id=u for update; if t>=5 then raise exception 'En üst kademe'; end if; perform public.sf_city_ensure(u); if public.sf_city_lv(u,'akademi')<(array[2,5,9,14])[t] then raise exception 'Akademi seviyesi yetersiz'; end if;
 c:=jsonb_build_object('fish',600*t*t,'wood',450*t*t,'crys',80*t*t); r:=public.sf_war_take(u,c,'{}');
 update public.war_army set tier=jsonb_set(tier,array[p_t],to_jsonb(t+1)) where user_id=u;
 return r||jsonb_build_object('tier',(select tier from public.war_army where user_id=u)); end $$;
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
  tower:=jsonb_build_object('tayfa',30*(1+.15*public.sf_city_lv(m.target,'sur')),'zipkin',20*(1+.15*public.sf_city_lv(m.target,'sur')),'topcu',20*(1+.15*public.sf_city_lv(m.target,'sur'))); deff:=public.sf_jadd(public.sf_war_eff(coalesce(dd->'troops','{}'),public.sf_war_tiers(m.target)),tower);
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

insert into public.war_city(user_id,b,seeded) select s.user_id, public.sf_city_seed(s.data), public.sf_city_seed(s.data) from public.saves s join auth.users au on au.id=s.user_id on conflict do nothing;
revoke all on function public.sf_city_ensure(uuid), public.sf_city_tick(uuid), public.sf_city_out(public.war_city) from public, anon, authenticated;
do $$ declare f text; begin foreach f in array array['city_info()','city_upgrade(text)','city_speed(text)','city_form(jsonb,text)'] loop
 execute 'revoke all on function public.'||f||' from public, anon'; execute 'grant execute on function public.'||f||' to authenticated'; end loop; end $$;
