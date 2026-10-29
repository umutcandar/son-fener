-- Faz D: sunucu VIP (0–10), ilk yükleme, paketler (DEMO ödeme), günlük etkinlik çubuğu, toplam harcama sandıkları, savaş elmas yutakları
create table if not exists public.pay_state(user_id uuid primary key references auth.users on delete cascade, vip_pts numeric not null default 0, spent numeric not null default 0,
 first_at timestamptz, buys jsonb not null default '{}', spend_cl jsonb not null default '[]', act_day date, act_pts int not null default 0, act_k jsonb not null default '{}', act_cl jsonb not null default '[]', q2 boolean not null default false);
create table if not exists public.pay_log(id bigserial primary key, user_id uuid not null references auth.users on delete cascade, sku text not null, price numeric not null, gems int not null, vip int not null, first boolean not null default false, demo boolean not null default true, note text, at timestamptz not null default now());
create index if not exists pay_log_u on public.pay_log(user_id, at desc);
alter table public.pay_state enable row level security; alter table public.pay_log enable row level security;
drop policy if exists ps_own on public.pay_state; create policy ps_own on public.pay_state for select using (user_id=auth.uid());
drop policy if exists pl_own on public.pay_log; create policy pl_own on public.pay_log for select using (user_id=auth.uid());
revoke insert,update,delete on public.pay_state, public.pay_log from anon, authenticated;
-- mevcut VIP puanları korunur (veri kaybı yok)
insert into public.pay_state(user_id,vip_pts) select s.user_id, greatest(0,least(1e6,coalesce((s.data->>'vipPts')::numeric,0))) from public.saves s join auth.users au on au.id=s.user_id on conflict do nothing;
create or replace function public.sf_vipn() returns int[] language sql immutable as $$ select array[0,100,300,700,1500,3000,6000,10000,15000,22000,30000] $$;
create or replace function public.sf_vipl(p numeric) returns int language sql immutable as $$ select (select count(*) from unnest(public.sf_vipn()) x where coalesce(p,0)>=x)::int-1 $$;
create or replace function public.sf_vip_u(u uuid) returns int language sql stable set search_path='' as $$ select public.sf_vipl((select vip_pts from public.pay_state where user_id=u)) $$;
create or replace function public.sf_pay_row(u uuid) returns public.pay_state language plpgsql security definer set search_path='' as $$
declare r public.pay_state; begin insert into public.pay_state(user_id,vip_pts) values(u,greatest(0,least(1e6,coalesce((select (data->>'vipPts')::numeric from public.saves where user_id=u),0)))) on conflict do nothing;
 select * into r from public.pay_state where user_id=u for update;
 if r.act_day is distinct from (now() at time zone 'utc')::date then update public.pay_state set act_day=(now() at time zone 'utc')::date, act_pts=0, act_k='{}', act_cl='[]' where user_id=u returning * into r; end if; return r; end $$;
-- kayda ver: elmas/kaynak + kalıcı alanlar; VIP puanı aynası (sunucu kaynak doğrusu)
create or replace function public.sf_pay_give(u uuid, p_gems int, p_res jsonb, p_patch jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare sv public.saves; d jsonb; k text; v numeric; begin select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Önce oyunu kaydet'; end if; d:=sv.data;
 for k,v in select key,value::numeric from jsonb_each_text(coalesce(p_res,'{}')) loop if k in ('fish','wood','crys') and v>0 then d:=jsonb_set(d,array['res',k],to_jsonb(public.sf_n(d,array['res',k],1e12)+v)); end if; end loop;
 if p_gems>0 then d:=jsonb_set(d,'{gems}',to_jsonb(public.sf_n(d,'{gems}',1e9)+p_gems)); end if;
 if p_patch ? 'builders' then d:=jsonb_set(d,'{builders}',to_jsonb(least(5,public.sf_n(d,'{builders}',10)+(p_patch->>'builders')::int))); end if;
 if p_patch ? 'monthly' then d:=jsonb_set(d,'{monthly}',to_jsonb(greatest(extract(epoch from now())*1000,public.sf_n(d,'{monthly}',1e14))+30*864e5)); end if;
 if p_patch ? 'buy' then d:=jsonb_set(d,'{buy}',coalesce(d->'buy','{}')||(p_patch->'buy')); end if;
 d:=jsonb_set(d,'{vipPts}',to_jsonb((select vip_pts from public.pay_state where user_id=u)));
 update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 return jsonb_build_object('rev',sv.rev,'res',d->'res','gems',d->'gems','troops',d->'troops','vipPts',d->'vipPts','builders',d->'builders','monthly',d->'monthly','buy',d->'buy'); end $$;
-- katalog: fiyatlar mağazada gösterilenle aynı; "değer" = içerik, sahte indirim yok
create or replace function public.sf_pay_cat() returns jsonb language sql immutable as $$ select '{
 "starter":{"p":49.99,"g":300,"r":{"wood":500,"crys":200},"x":{"builders":1},"v":100,"once":1},
 "monthly":{"p":89.99,"g":300,"x":{"monthly":1},"v":150},
 "g1":{"p":29.99,"g":100,"v":30},"g2":{"p":149.99,"g":600,"v":150},"g3":{"p":299.99,"g":1300,"v":300},"g4":{"p":599.99,"g":2800,"v":600},
 "noads":{"p":79.99,"g":0,"x":{"buy":{"noads":1}},"v":80,"once":1},
 "b_war":{"p":99.99,"g":300,"r":{"fish":2000,"wood":2000,"crys":500},"v":100},
 "b_build":{"p":59.99,"g":150,"r":{"wood":3000,"crys":1000},"v":60},
 "b_heal":{"p":39.99,"g":100,"r":{"fish":3000},"v":40}}'::jsonb $$;
create or replace function public.sf_first_bonus() returns jsonb language sql immutable as $$ select '{"gx":2,"r":{"fish":1000,"wood":1000,"crys":1000}}'::jsonb $$;
create or replace function public.sf_spend_ch() returns jsonb language sql immutable as $$ select '[{"t":100,"g":50,"r":{"fish":1000,"wood":1000}},{"t":300,"g":150,"r":{"crys":500}},{"t":700,"g":300,"r":{"fish":3000,"wood":3000}},{"t":1500,"g":600,"r":{"crys":1500}},{"t":3000,"g":1200,"r":{"fish":8000,"wood":8000,"crys":3000}},{"t":6000,"g":2500,"r":{"fish":15000,"wood":15000,"crys":6000}}]'::jsonb $$;
create or replace function public.sf_act_ch() returns jsonb language sql immutable as $$ select '[{"t":20,"g":0,"r":{"fish":500,"wood":500}},{"t":40,"g":20,"r":{}},{"t":60,"g":0,"r":{"wood":800,"crys":300}},{"t":80,"g":30,"r":{}},{"t":100,"g":50,"r":{"fish":1000,"wood":1000}}]'::jsonb $$;
-- etkinlik puanı: anahtar başına günlük tavan (dürüst, sunucu sayar)
create or replace function public.sf_act_def() returns jsonb language sql immutable as $$ select '{"login":[10,10],"city_up":[10,20],"city_speed":[5,10],"tier":[10,10],"attack":[10,30],"scout":[5,10],"donate":[5,10],"rally":[10,20],"heal":[5,10],"garrison":[5,5]}'::jsonb $$;
create or replace function public.sf_act(u uuid, k text) returns void language plpgsql security definer set search_path='' as $$
declare r public.pay_state; df jsonb:=public.sf_act_def()->k; have int; add int; begin if df is null then return; end if; r:=public.sf_pay_row(u);
 have:=coalesce((r.act_k->>k)::int,0); add:=least((df->>0)::int,(df->>1)::int-have); if add<=0 then return; end if;
 update public.pay_state set act_k=jsonb_set(act_k,array[k],to_jsonb(have+add)), act_pts=least(100,act_pts+add) where user_id=u; end $$;
create or replace function public.sf_pay_out(u uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.pay_state; begin select * into r from public.pay_state where user_id=u;
 return jsonb_build_object('vip',public.sf_vipl(r.vip_pts),'pts',r.vip_pts,'vipn',to_jsonb(public.sf_vipn()),'spent',r.spent,'first',r.first_at is not null,'buys',r.buys,'q2',r.q2,
  'cat',public.sf_pay_cat(),'firstb',public.sf_first_bonus(),'spend',jsonb_build_object('ch',public.sf_spend_ch(),'cl',r.spend_cl),
  'act',jsonb_build_object('pts',r.act_pts,'k',r.act_k,'cl',r.act_cl,'ch',public.sf_act_ch(),'def',public.sf_act_def(),'day',r.act_day),
  'log',(select coalesce(jsonb_agg(jsonb_build_object('sku',sku,'p',price,'g',gems,'first',first,'at',at) order by at desc),'[]') from (select * from public.pay_log where user_id=u order by at desc limit 10) z)); end $$;
create or replace function public.pay_info() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); begin if u is null then raise exception 'Giriş gerekli'; end if; perform public.sf_pay_row(u); perform public.sf_act(u,'login'); return public.sf_pay_out(u); end $$;
-- DEMO satın alma: gerçek para çekilmez; harcama sınırı yok
create or replace function public.shop_buy_demo(p_sku text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.pay_state; c jsonb; g int; rs jsonb; fst boolean; o jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 c:=public.sf_pay_cat()->p_sku; if c is null then raise exception 'Geçersiz'; end if; r:=public.sf_pay_row(u);
 if (c->>'once') is not null and coalesce((r.buys->>p_sku)::int,0)>0 then raise exception 'Zaten alındı'; end if;
 fst:=r.first_at is null; g:=(c->>'g')::int; rs:=coalesce(c->'r','{}');
 if fst then g:=g*(public.sf_first_bonus()->>'gx')::int; rs:=public.sf_jadd(rs,public.sf_first_bonus()->'r'); end if;
 update public.pay_state set vip_pts=vip_pts+(c->>'v')::numeric, spent=spent+(c->>'p')::numeric, first_at=coalesce(first_at,now()),
  buys=jsonb_set(buys,array[p_sku],to_jsonb(coalesce((buys->>p_sku)::int,0)+1)) where user_id=u;
 insert into public.pay_log(user_id,sku,price,gems,vip,first) values(u,p_sku,(c->>'p')::numeric,g,(c->>'v')::int,fst);
 o:=public.sf_pay_give(u,g,rs,coalesce(c->'x','{}')); return o||jsonb_build_object('first',fst,'got',jsonb_build_object('g',g,'r',rs),'pay',public.sf_pay_out(u)); end $$;
create or replace function public.pay_spend_claim(p_i int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.pay_state; c jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if; r:=public.sf_pay_row(u); c:=public.sf_spend_ch()->p_i;
 if c is null then raise exception 'Geçersiz'; end if; if r.spend_cl ? p_i::text then raise exception 'Zaten alındı'; end if; if r.spent<(c->>'t')::numeric then raise exception 'Henüz açılmadı'; end if;
 update public.pay_state set spend_cl=spend_cl||to_jsonb(p_i::text) where user_id=u;
 return public.sf_pay_give(u,(c->>'g')::int,c->'r')||jsonb_build_object('pay',public.sf_pay_out(u)); end $$;
create or replace function public.act_claim(p_i int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.pay_state; c jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if; r:=public.sf_pay_row(u); c:=public.sf_act_ch()->p_i;
 if c is null then raise exception 'Geçersiz'; end if; if r.act_cl ? p_i::text then raise exception 'Zaten alındı'; end if; if r.act_pts<(c->>'t')::int then raise exception 'Henüz açılmadı'; end if;
 update public.pay_state set act_cl=act_cl||to_jsonb(p_i::text) where user_id=u;
 return public.sf_pay_give(u,(c->>'g')::int,c->'r')||jsonb_build_object('pay',public.sf_pay_out(u)); end $$;
-- elmas yutağı: kalıcı 2. inşaat sırası (VIP2 beklemeden) 500💎
create or replace function public.city_queue_buy() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.pay_state; t jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if; r:=public.sf_pay_row(u);
 if r.q2 then raise exception 'Zaten alındı'; end if; t:=public.sf_war_take(u,'{}','{}',500); update public.pay_state set q2=true where user_id=u;
 return t||jsonb_build_object('city',public.sf_city_out(public.sf_city_tick(u))); end $$;
create or replace function public.sf_city_slots(u uuid) returns int language sql stable set search_path='' as $$
 select 1+case when public.sf_vip_u(u)>=2 or coalesce((select q2 from public.pay_state where user_id=u),false) then 1 else 0 end+case when public.sf_vip_u(u)>=7 then 1 else 0 end $$;
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
 perform public.sf_act(u,'attack'); return r||jsonb_build_object('id',m.id,'secs',t); end $$;
create or replace function public.world_scout(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d jsonb; r jsonb; tg public.profiles; o jsonb; k text; t jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; if p_target=u then raise exception 'Geçersiz'; end if;
 select * into tg from public.profiles where id=p_target; if not found then raise exception 'Hedef yok'; end if;
 r:=public.sf_war_take(u,'{"fish":50}','{}'); select data into d from public.saves where user_id=p_target; t:=public.sf_war_tiers(p_target); o:='{}';
 foreach k in array array['tayfa','zipkin','topcu'] loop o:=o||jsonb_build_object(k,round(public.sf_n(d,array['troops',k],1e7),-1)); end loop;
 o:=jsonb_build_object('nick',tg.nick,'troops',o,'tier',t,'res',jsonb_build_object('fish',round(public.sf_n(d,'{res,fish}',1e12),-2),'wood',round(public.sf_n(d,'{res,wood}',1e12),-2),'crys',round(public.sf_n(d,'{res,crys}',1e12),-2)),'sh',coalesce(tg.shield_until>now(),false),'buff',(public.sf_war_buff(p_target)->'m'));
 insert into public.war_report(uids,kind,data) values(array[u],'scout',o||jsonb_build_object('target',p_target));
 perform public.sf_act(u,'scout'); return r||jsonb_build_object('scout',o); end $$;
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
 perform public.sf_act(u,'donate'); return r||jsonb_build_object('fort',public.fort_info()); end $$;
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
 perform public.sf_act(u,'rally'); return r||jsonb_build_object('rally',rid); end $$;
create or replace function public.war_rally_join(p_id bigint, p_tr jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); w public.war_rally; tr jsonb; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select * into w from public.war_rally where id=p_id for update;
 if not found or w.launched or w.gather_until<now() then raise exception 'Toplu saldırı kapandı'; end if;
 if w.clan_id is distinct from (select clan_id from public.clan_members where user_id=u) then raise exception 'Geçersiz'; end if;
 if exists(select 1 from public.war_rally_m where rally_id=p_id and user_id=u) then raise exception 'Zaten katıldın'; end if;
 if (select count(*) from public.war_rally_m where rally_id=p_id)>=10 then raise exception 'Toplu saldırı dolu'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 r:=public.sf_war_take(u,'{}',tr); insert into public.war_rally_m values(p_id,u,tr); perform public.sf_act(u,'rally'); return r||jsonb_build_object('ok',true); end $$;
create or replace function public.fort_garrison(p_tr jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c uuid; tr jsonb; r jsonb; begin
 if u is null then raise exception 'Giriş gerekli'; end if; select clan_id into c from public.clan_members where user_id=u; if c is null then raise exception 'Klan gerekli'; end if;
 if not exists(select 1 from public.clan_fort where clan_id=c) then raise exception 'Kale yok'; end if;
 tr:=public.sf_war_clean(p_tr); if (tr->>'tayfa')::numeric+(tr->>'zipkin')::numeric+(tr->>'topcu')::numeric<1 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 r:=public.sf_war_take(u,'{}',tr);
 insert into public.fort_garrison values(c,u,tr) on conflict(clan_id,user_id) do update set troops=public.sf_jadd(public.fort_garrison.troops,excluded.troops);
 insert into public.fort_log(clan_id,kind,data) values(c,'garrison',jsonb_build_object('by',(select nick from public.profiles where id=u),'tr',tr));
 perform public.sf_act(u,'garrison'); return r||jsonb_build_object('fort',public.fort_info()); end $$;
create or replace function public.army_heal(p_gems boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); rv jsonb; n numeric; r jsonb; neg jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 select revir into rv from public.war_army where user_id=u for update; n:=coalesce((select sum(value::numeric) from jsonb_each_text(coalesce(rv,'{}'))),0);
 if n<=0 then raise exception 'Revir boş'; end if;
 select jsonb_object_agg(key,-(value::numeric)) into neg from jsonb_each_text(rv);
 if p_gems then r:=public.sf_war_take(u,'{}',neg,ceil(n/10*(case when public.sf_vip_u(u)>=8 then .75 else 1 end))::int); else r:=public.sf_war_take(u,jsonb_build_object('fish',2*n,'wood',n),neg); end if;
 update public.war_army set revir='{}' where user_id=u; perform public.sf_act(u,'heal'); return r||jsonb_build_object('healed',n); end $$;
create or replace function public.world_shield(p_h int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); c int; r jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 c:=case p_h when 8 then 150 when 24 then 350 else null end; if c is null then raise exception 'Geçersiz'; end if; if public.sf_vip_u(u)>=9 then c:=ceil(c*.8)::int; end if;
 if exists(select 1 from public.world_march where user_id=u and not done and kind in ('pvp','rally')) then raise exception 'Sefer sürerken kalkan açılamaz'; end if;
 r:=public.sf_war_take(u,'{}','{}',c); update public.profiles set shield_until=greatest(coalesce(shield_until,now()),now())+make_interval(hours=>p_h) where id=u;
 return r||jsonb_build_object('shield_until',(select shield_until from public.profiles where id=u)); end $$;
create or replace function public.city_upgrade(p_k text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.war_city; o jsonb; e jsonb; l int; t jsonb; d jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if not (public.sf_city_def() ? p_k) then raise exception 'Geçersiz'; end if; r:=public.sf_city_tick(u); o:=public.sf_city_out(r);
 select value into e from jsonb_array_elements(o->'list') where value->>'key'=p_k;
 if e->>'until' is not null then raise exception 'Zaten inşa ediliyor'; end if;
 if jsonb_array_length(r.q)>=(o->>'slots')::int then raise exception 'İnşaat sırası dolu'; end if;
 if e->'next' is null then raise exception 'En üst seviye'; end if; if e#>>'{next,req}' is not null then raise exception 'Kale seviyesi yetersiz'; end if;
 l:=(e->>'lvl')::int+1; t:=public.sf_war_take(u,public.sf_city_cost(p_k,l),'{}');
 update public.war_city set q=q||jsonb_build_array(jsonb_build_object('k',p_k,'to',l,'until',now()+make_interval(secs=>public.sf_city_secs(p_k,l)))) where user_id=u returning * into r;
 perform public.sf_act(u,'city_up'); return t||jsonb_build_object('city',public.sf_city_out(r)); end $$;
create or replace function public.city_speed(p_k text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.war_city; e jsonb; g int; t jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 r:=public.sf_city_tick(u); select value into e from jsonb_array_elements(r.q) where value->>'k'=p_k;
 if e is null then raise exception 'İnşaat yok'; end if; g:=greatest(1,ceil(extract(epoch from ((e->>'until')::timestamptz-now()))/60))::int; if public.sf_vip_u(u)>=10 then g:=greatest(1,ceil(g*.8)::int); end if;
 t:=public.sf_war_take(u,'{}','{}',g);
 update public.war_city set q=(select coalesce(jsonb_agg(case when value->>'k'=p_k then jsonb_set(value,'{until}',to_jsonb(now())) else value end),'[]') from jsonb_array_elements(q)) where user_id=u;
 r:=public.sf_city_tick(u); perform public.sf_act(u,'city_speed'); return t||jsonb_build_object('spent',g,'city',public.sf_city_out(r)); end $$;
create or replace function public.army_tier_up(p_t text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); t int; r jsonb; c jsonb; begin if u is null then raise exception 'Giriş gerekli'; end if;
 if p_t not in ('tayfa','zipkin','topcu') then raise exception 'Geçersiz'; end if; insert into public.war_army(user_id) values(u) on conflict do nothing;
 select coalesce((tier->>p_t)::int,1) into t from public.war_army where user_id=u for update; if t>=5 then raise exception 'En üst kademe'; end if; perform public.sf_city_ensure(u); if public.sf_city_lv(u,'akademi')<(array[2,5,9,14])[t] then raise exception 'Akademi seviyesi yetersiz'; end if;
 c:=jsonb_build_object('fish',600*t*t,'wood',450*t*t,'crys',80*t*t); r:=public.sf_war_take(u,c,'{}');
 update public.war_army set tier=jsonb_set(tier,array[p_t],to_jsonb(t+1)) where user_id=u;
 perform public.sf_act(u,'tier'); return r||jsonb_build_object('tier',(select tier from public.war_army where user_id=u)); end $$;
create or replace function public.sf_city_out(r public.war_city) returns jsonb language plpgsql stable set search_path='' as $$
declare d jsonb; k text; l int; lst jsonb:='[]'; busy jsonb; ok text; begin select data into d from public.saves where user_id=r.user_id;
 for k in select jsonb_object_keys(public.sf_city_def()) loop l:=coalesce((r.b->>k)::int,0);
  select value into busy from jsonb_array_elements(r.q) where value->>'k'=k limit 1;
  ok:=case when l>=30 then 'max' when k<>'kale' and (r.b->>'kale')::int<(public.sf_city_def()->k->>'u')::int then 'kale'
   when k<>'kale' and l+1>(r.b->>'kale')::int then 'kale' when k='kale' and (coalesce((r.b->>'kisla')::int,0)<l or coalesce((r.b->>'sur')::int,0)<l) then 'kisla_sur' else null end;
  lst:=lst||jsonb_build_array(jsonb_build_object('key',k,'lvl',l,'max',30,'until',busy->>'until','unlock',(public.sf_city_def()->k->>'u')::int,
   'next',case when l>=30 then null else jsonb_build_object('cost',public.sf_city_cost(k,l+1),'secs',public.sf_city_secs(k,l+1),'req',ok) end)); end loop;
 return jsonb_build_object('list',lst,'q',r.q,'slots',public.sf_city_slots(r.user_id),'vip',public.sf_vip_u(r.user_id),'form',r.form,
  'tier',public.sf_war_tiers(r.user_id),'base',coalesce((select tier from public.war_army where user_id=r.user_id),'{"tayfa":1,"zipkin":1,"topcu":1}'),'akreq',jsonb_build_array(2,5,9,14),'now',now()); end $$;

revoke all on function public.sf_pay_row(uuid), public.sf_pay_give(uuid,int,jsonb,jsonb), public.sf_act(uuid,text), public.sf_pay_out(uuid) from public, anon, authenticated;
do $$ declare f text; begin foreach f in array array['pay_info()','shop_buy_demo(text)','pay_spend_claim(int)','act_claim(int)','city_queue_buy()'] loop
 execute 'revoke all on function public.'||f||' from public, anon'; execute 'grant execute on function public.'||f||' to authenticated'; end loop; end $$;
