-- Son Fener çevrimiçi şema (Supabase). Tüm hassas işlemler security definer RPC'ler üzerinden.
create table public.profiles(
 id uuid primary key references auth.users on delete cascade,
 nick text not null default 'Kaptan', avatar text not null default 'ali',
 power int not null default 0, stage int not null default 1,
 kraken_wk text not null default '', kraken_dmg bigint not null default 0, boss_day text not null default '', boss_n int not null default 0,
 shield_until timestamptz not null default now(), last_raid timestamptz, raid_day text not null default '', raid_n int not null default 0,
 chat_last timestamptz, chat_win timestamptz, chat_n int not null default 0, muted_until timestamptz,
 created_at timestamptz not null default now());
create table public.saves(user_id uuid primary key references auth.users on delete cascade, data jsonb not null, rev int not null default 1,
 allow jsonb not null default '{}', flags int not null default 0, updated_at timestamptz not null default now());
create table public.clans(id uuid primary key default gen_random_uuid(), name text not null unique, tag text not null unique, icon text not null default '🛡️',
 descr text not null default '', boss_wk text not null default '', boss_dmg bigint not null default 0, created_at timestamptz not null default now());
create table public.clan_members(user_id uuid primary key references public.profiles on delete cascade, clan_id uuid not null references public.clans on delete cascade,
 role text not null check(role in('lider','yardımcı','üye')), joined_at timestamptz not null default now());
create index on public.clan_members(clan_id);
create table public.events(id bigint generated always as identity primary key, user_id uuid not null references public.profiles on delete cascade, kind text not null, delta jsonb not null, claimed boolean not null default false, created_at timestamptz not null default now());
create index on public.events(user_id) where not claimed;
create table public.battles(id bigint generated always as identity primary key, attacker uuid not null references public.profiles on delete cascade, defender uuid not null references public.profiles on delete cascade,
 win boolean not null, loot jsonb not null, att_lost jsonb not null, def_lost jsonb not null, rounds jsonb not null, att_nick text, def_nick text, att_power int, def_power int, created_at timestamptz not null default now());
create index on public.battles(attacker);create index on public.battles(defender);
create table public.help_requests(id bigint generated always as identity primary key, clan_id uuid not null references public.clans on delete cascade, user_id uuid not null references public.profiles on delete cascade,
 label text not null, helps int not null default 0, max_helps int not null default 5, created_at timestamptz not null default now());
create table public.help_given(req bigint references public.help_requests on delete cascade, helper uuid references public.profiles on delete cascade, primary key(req,helper));
create table public.messages(id bigint generated always as identity primary key, channel text not null, user_id uuid not null references public.profiles on delete cascade,
 nick text not null, avatar text not null, body text not null, lang text not null default 'tr', created_at timestamptz not null default now());
create index on public.messages(channel, id desc);
create table public.chat_reports(msg bigint references public.messages on delete cascade, reporter uuid references public.profiles on delete cascade, created_at timestamptz default now(), primary key(msg,reporter));
create table public.mutes(user_id uuid references public.profiles on delete cascade, muted uuid references public.profiles on delete cascade, primary key(user_id,muted));

alter table public.profiles enable row level security; alter table public.saves enable row level security; alter table public.clans enable row level security;
alter table public.clan_members enable row level security; alter table public.events enable row level security; alter table public.battles enable row level security;
alter table public.help_requests enable row level security; alter table public.help_given enable row level security; alter table public.messages enable row level security;
alter table public.chat_reports enable row level security; alter table public.mutes enable row level security;

create or replace function public.my_clan() returns uuid language sql stable security definer set search_path='' as $$ select clan_id from public.clan_members where user_id=(select auth.uid()) $$;

-- okuma politikaları (yazma yalnızca RPC ile; mutes hariç)
create policy p_read on public.profiles for select to authenticated using (true);
create policy s_read on public.saves for select to authenticated using (user_id=(select auth.uid()));
create policy c_read on public.clans for select to authenticated using (true);
create policy m_read on public.clan_members for select to authenticated using (true);
create policy e_read on public.events for select to authenticated using (user_id=(select auth.uid()));
create policy b_read on public.battles for select to authenticated using (attacker=(select auth.uid()) or defender=(select auth.uid()));
create policy h_read on public.help_requests for select to authenticated using (clan_id=(select public.my_clan()));
create policy msg_read on public.messages for select to authenticated using (channel='tr' or channel='clan:'||(select public.my_clan())::text);
create policy mu_all on public.mutes for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
revoke all on all tables in schema public from anon;
revoke insert,update,delete on public.profiles,public.saves,public.clans,public.clan_members,public.events,public.battles,public.help_requests,public.help_given,public.messages,public.chat_reports from authenticated;

-- ===== sunucu tarafı ordu hesabı (logic.js armyPower/simulate ile aynı kurallar) =====
create table public.hero_def(id text primary key, p int, sk_t text, sk_v numeric);
alter table public.hero_def enable row level security; create policy hd_read on public.hero_def for select to authenticated using(true);
insert into public.hero_def values('kaan',120,'atk',.15),('mei',115,'hp',.18),('tunc',72,'atk',.08),('deniz',66,'fish',.12),('nene',60,'loot',.15),('ela',42,'train',.12),('ali',40,'night',.10);
create or replace function public.sf_n(d jsonb, path text[], mx numeric) returns numeric language sql immutable set search_path='' as $$
 select least(greatest(coalesce(case when jsonb_typeof(d#>path)='number' then (d#>>path)::numeric end,0),0),mx) $$;
-- döner: atk, hp, power, loot çarpanı
create or replace function public.sf_army(d jsonb, out atk numeric, out hp numeric, out power int, out lootm numeric) language plpgsql stable set search_path='' as $$
declare hb numeric:=0; sa numeric:=0; sh numeric:=0; sl numeric:=0; ta numeric; th numeric; r record; ty numeric[]; 
begin
 for r in select h.id,h.sk_t,h.sk_v, round(h.p*(1+.5*(public.sf_n(d,array['heroes',h.id,'star'],6)-1))*(1+.1*(greatest(public.sf_n(d,array['heroes',h.id,'lv'],60),1)-1))) hp_,
   public.sf_n(d,array['heroes',h.id,'star'],6) st
   from public.hero_def h where d->'heroes' ? h.id and public.sf_n(d,array['heroes',h.id,'star'],6)>=1 order by 4 desc limit 3 loop
  hb:=hb+r.hp_; if r.sk_t='atk' then sa:=sa+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='hp' then sh:=sh+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='loot' then sl:=sl+r.sk_v*(1+.25*(r.st-1)); end if;
 end loop;
 ta:=(1+public.sf_n(d,'{tech,harp}',5)*.1)*(1+public.sf_n(d,'{gear,cannon}',10)*.06)*(1+sa);
 th:=(1+public.sf_n(d,'{tech,hull}',5)*.1)*(1+public.sf_n(d,'{gear,plate}',10)*.06+public.sf_n(d,'{gear,sail}',10)*.04)*(1+sh);
 ty:=array[public.sf_n(d,'{troops,tayfa}',100000),public.sf_n(d,'{troops,zipkin}',100000),public.sf_n(d,'{troops,topcu}',100000)];
 atk:=(ty[1]*10+ty[2]*14+ty[3]*19)*ta+hb*1.2; hp:=(ty[1]*40+ty[2]*28+ty[3]*18)*th+hb*2;
 power:=round((ty[1]*10+ty[2]*14+ty[3]*19)*ta+(ty[1]*40+ty[2]*28+ty[3]*18)*th*.25+hb*2);
 lootm:=(1+public.sf_n(d,'{tech,loot}',3)*.1+public.sf_n(d,'{gear,sail}',10)*.03)*(1+sl);
end $$;

-- ===== hesap =====
create or replace function public.ensure_profile() returns public.profiles language plpgsql security definer set search_path='' as $$
declare p public.profiles; begin
 if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 insert into public.profiles(id,nick) values(auth.uid(),'Kaptan'||lpad((floor(random()*9999))::int::text,4,'0')) on conflict(id) do nothing;
 select * into p from public.profiles where id=auth.uid(); return p; end $$;
create or replace function public.set_profile(p_nick text, p_avatar text) returns void language plpgsql security definer set search_path='' as $$
begin p_nick:=btrim(p_nick);
 -- harf (Latin/Türkçe/CJK dahil tüm Unicode harfleri), rakam, boşluk, _ ; 3-16 karakter
 if p_nick !~ '^[[:alnum:]_ ]{3,16}$' or public.sf_bad(p_nick) then raise exception 'Geçersiz isim'; end if;
 if not exists(select 1 from public.hero_def where id=p_avatar) then raise exception 'Geçersiz portre'; end if;
 update public.profiles set nick=p_nick, avatar=p_avatar where id=auth.uid(); end $$;

-- ===== küfür filtresi (TR, basit) =====
create or replace function public.sf_norm(t text) returns text language sql immutable set search_path='' as $$
 select translate(lower(t),'ıİşŞğĞüÜöÖçÇ013457@$','iisSggUuooCcoieastas') $$;
create or replace function public.sf_bad(t text) returns boolean language sql immutable set search_path='' as $$
 select public.sf_norm(t) ~ '(amk|amina|aminak|orospu|orosbu|pic|piç|sik(ik|tir|erim|eyim)|yarrak|yarak|got(veren|lek)|ibne|kahpe|pezevenk|serefsiz|gavat|ananı|anani|mk\M|fuck|shit|bitch)' $$;
create or replace function public.sf_clean(t text) returns text language sql immutable set search_path='' as $$
 select regexp_replace(t,'(?i)(amk|amına?|orospu|orosbu|piç|siktir|sikerim|sikeyim|yarrak|ibne|kahpe|pezevenk|şerefsiz|gavat|fuck|shit|bitch|操你|他妈的|傻逼)','***','g') $$;

-- ===== bulut kayıt (çakışma: rev + updated_at; hile: kaynak artışı sınırı) =====
create or replace function public.save_game(p_data jsonb, p_rev int) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.saves; dt numeric; k text; capv numeric; ov numeric; nv numeric; fl int:=0; a record; d jsonb:=p_data; al jsonb;
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if octet_length(p_data::text)>200000 then raise exception 'kayıt çok büyük'; end if;
 perform public.ensure_profile();
 select * into s from public.saves where user_id=auth.uid() for update;
 if found then
  if p_rev is distinct from s.rev then return jsonb_build_object('conflict',true,'rev',s.rev,'data',s.data,'updated_at',s.updated_at); end if;
  dt:=greatest(extract(epoch from now()-s.updated_at),1); al:=s.allow;
  for k in select unnest(array['fish','wood','crys']) loop
   ov:=public.sf_n(s.data,array['res',k],1e12); nv:=public.sf_n(d,array['res',k],1e12);
   capv:=ov+8000+dt*(60+ov*0.002)+coalesce((al->>k)::numeric,0);
   if nv>capv then d:=jsonb_set(d,array['res',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  ov:=public.sf_n(s.data,'{gems}',1e9); nv:=public.sf_n(d,'{gems}',1e9); capv:=ov+3000+dt*0.5+coalesce((al->>'gems')::numeric,0);
  if nv>capv then d:=jsonb_set(d,'{gems}',to_jsonb(floor(capv))); fl:=fl+1; end if;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop
   ov:=public.sf_n(s.data,array['troops',k],1e6); nv:=public.sf_n(d,array['troops',k],1e6); capv:=ov+300+dt*1.5;
   if nv>capv then d:=jsonb_set(d,array['troops',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  update public.saves set data=d, rev=rev+1, allow='{}', flags=flags+fl, updated_at=now() where user_id=auth.uid() returning * into s;
 else
  -- ilk kayıt: makul başlangıç sınırları
  for k in select unnest(array['fish','wood','crys']) loop if public.sf_n(d,array['res',k],1e12)>50000 then d:=jsonb_set(d,array['res',k],'50000'); fl:=fl+1; end if; end loop;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop if public.sf_n(d,array['troops',k],1e6)>2000 then d:=jsonb_set(d,array['troops',k],'2000'); fl:=fl+1; end if; end loop;
  insert into public.saves(user_id,data,flags) values(auth.uid(),d,fl) returning * into s;
 end if;
 select * into a from public.sf_army(d);
 update public.profiles set power=a.power, stage=least(public.sf_n(d,'{stage}',1000),1000)::int where id=auth.uid();
 return jsonb_build_object('ok',true,'rev',s.rev,'clamped',fl,'data',case when fl>0 then d end,'power',a.power); end $$;

-- sunucunun gönderdiği değişiklikler (ganimet, kayıp, klan yardımı)
create or replace function public.claim_events() returns setof public.events language plpgsql security definer set search_path='' as $$
declare e public.events; k text; begin
 for e in update public.events set claimed=true where user_id=auth.uid() and not claimed returning * loop
  for k in select jsonb_object_keys(e.delta->'res') loop
   if (e.delta->'res'->>k)::numeric>0 then update public.saves set allow=jsonb_set(allow,array[k],to_jsonb(coalesce((allow->>k)::numeric,0)+(e.delta->'res'->>k)::numeric)) where user_id=auth.uid(); end if; end loop;
  return next e; end loop; end $$;

-- ===== klanlar =====
create or replace function public.list_clans(p_q text default '') returns table(id uuid,name text,tag text,icon text,descr text,members bigint,power bigint) language sql stable security definer set search_path='' as $$
 select c.id,c.name,c.tag,c.icon,c.descr,count(m.user_id),coalesce(sum(p.power),0) from public.clans c left join public.clan_members m on m.clan_id=c.id left join public.profiles p on p.id=m.user_id
 where p_q='' or c.name ilike '%'||replace(replace(p_q,'%',''),'_','')||'%' or c.tag ilike '%'||replace(replace(p_q,'%',''),'_','')||'%' group by c.id order by 7 desc limit 50 $$;
create or replace function public.create_clan(p_name text,p_tag text,p_icon text) returns uuid language plpgsql security definer set search_path='' as $$
declare cid uuid; begin perform public.ensure_profile(); p_name:=btrim(p_name); p_tag:=upper(btrim(p_tag));
 if exists(select 1 from public.clan_members where user_id=auth.uid()) then raise exception 'Zaten bir klandasın'; end if;
 if p_name !~ '^[[:alnum:] _-]{3,20}$' or public.sf_bad(p_name) then raise exception 'Geçersiz klan adı'; end if;
 if p_tag !~ '^[[:alnum:]]{2,4}$' or public.sf_bad(p_tag) then raise exception 'Etiket 2-4 harf olmalı'; end if;
 if p_icon not in('🛡️','⛵','🗡️','🕊️','🦑','🗼','⚓','🔱') then p_icon:='🛡️'; end if;
 insert into public.clans(name,tag,icon) values(p_name,p_tag,p_icon) returning id into cid;
 insert into public.clan_members values(auth.uid(),cid,'lider'); return cid;
exception when unique_violation then raise exception 'Bu ad veya etiket alınmış'; end $$;
create or replace function public.join_clan(p_clan uuid) returns void language plpgsql security definer set search_path='' as $$
begin perform public.ensure_profile(); perform 1 from public.clans where id=p_clan for update; if not found then raise exception 'Klan yok'; end if;
 if exists(select 1 from public.clan_members where user_id=auth.uid()) then raise exception 'Zaten bir klandasın'; end if;
 if (select count(*) from public.clan_members where clan_id=p_clan)>=30 then raise exception 'Klan dolu (30/30)'; end if;
 insert into public.clan_members values(auth.uid(),p_clan,'üye'); end $$;
create or replace function public.leave_clan() returns void language plpgsql security definer set search_path='' as $$
declare m public.clan_members; nxt uuid; begin select * into m from public.clan_members where user_id=auth.uid(); if not found then return; end if;
 delete from public.clan_members where user_id=auth.uid(); delete from public.help_requests where user_id=auth.uid();
 if m.role='lider' then select user_id into nxt from public.clan_members where clan_id=m.clan_id order by (role='yardımcı') desc, joined_at limit 1;
  if nxt is null then delete from public.clans where id=m.clan_id; else update public.clan_members set role='lider' where user_id=nxt; end if; end if; end $$;
create or replace function public.set_role(p_user uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare me public.clan_members; t public.clan_members; begin select * into me from public.clan_members where user_id=auth.uid(); select * into t from public.clan_members where user_id=p_user;
 if me.role is distinct from 'lider' or t.clan_id is distinct from me.clan_id or p_user=auth.uid() then raise exception 'Yetkin yok'; end if;
 if p_role='at' then delete from public.clan_members where user_id=p_user; return; end if;
 if p_role not in('yardımcı','üye','lider') then raise exception 'Geçersiz rol'; end if;
 if p_role='lider' then update public.clan_members set role='yardımcı' where user_id=auth.uid(); end if;
 update public.clan_members set role=p_role where user_id=p_user; end $$;
create or replace function public.kick_member(p_user uuid) returns void language plpgsql security definer set search_path='' as $$
declare me public.clan_members; t public.clan_members; begin select * into me from public.clan_members where user_id=auth.uid(); select * into t from public.clan_members where user_id=p_user;
 if t.clan_id is distinct from me.clan_id or p_user=auth.uid() or not (me.role='lider' or (me.role='yardımcı' and t.role='üye')) then raise exception 'Yetkin yok'; end if;
 delete from public.clan_members where user_id=p_user; end $$;
create or replace function public.clan_info() returns jsonb language sql stable security definer set search_path='' as $$
 select case when c.id is null then null else jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'icon',c.icon,'boss_wk',c.boss_wk,'boss_dmg',c.boss_dmg,
  'members',(select jsonb_agg(jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'power',p.power,'role',m.role,'kraken',case when p.kraken_wk=c.boss_wk then p.kraken_dmg else 0 end) order by p.power desc)
   from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c.id)) end
 from (select 1) x left join public.clans c on c.id=public.my_clan() $$;
-- yardım
create or replace function public.ask_help(p_label text) returns void language plpgsql security definer set search_path='' as $$
declare c uuid:=public.my_clan(); begin if c is null then raise exception 'Klan yok'; end if;
 if (select count(*) from public.help_requests where user_id=auth.uid() and helps<max_helps and created_at>now()-interval '1 day')>=3 then raise exception 'Zaten yardım istedin'; end if;
 insert into public.help_requests(clan_id,user_id,label) values(c,auth.uid(),left(p_label,40)); end $$;
create or replace function public.give_help(p_req bigint) returns void language plpgsql security definer set search_path='' as $$
declare r public.help_requests; begin select * into r from public.help_requests where id=p_req for update;
 if not found or r.clan_id is distinct from public.my_clan() or r.user_id=auth.uid() or r.helps>=r.max_helps then raise exception 'Yardım edilemez'; end if;
 insert into public.help_given values(p_req,auth.uid()); update public.help_requests set helps=helps+1 where id=p_req;
 insert into public.events(user_id,kind,delta) values(r.user_id,'help',jsonb_build_object('help_sec',60,'from',(select nick from public.profiles where id=auth.uid())));
exception when unique_violation then raise exception 'Zaten yardım ettin'; end $$;
create or replace function public.help_all() returns int language plpgsql security definer set search_path='' as $$
declare r record; n int:=0; begin for r in select id from public.help_requests h where clan_id=public.my_clan() and user_id<>auth.uid() and helps<max_helps and not exists(select 1 from public.help_given g where g.req=h.id and g.helper=auth.uid()) loop
 perform public.give_help(r.id); n:=n+1; end loop; return n; end $$;
-- klan krakeni: hasar sunucuda ordu gücüyle sınırlanır
create or replace function public.boss_hit(p_dmg bigint, p_wk text) returns jsonb language plpgsql security definer set search_path='' as $$
declare pw int; d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); p public.profiles; c uuid:=public.my_clan(); dmg bigint;
begin select * into p from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p_wk !~ '^[0-9]{1,6}$' then raise exception 'hafta'; end if;
 if p.boss_day<>d then p.boss_n:=0; end if; if p.boss_n>=8 then raise exception 'Bugünkü saldırı hakkın bitti'; end if;
 select power into pw from public.sf_army((select data from public.saves where user_id=auth.uid()));
 dmg:=least(greatest(p_dmg,0),ceil(coalesce(pw,0)*12*1.6)::bigint);
 update public.profiles set boss_day=d,boss_n=p.boss_n+1, kraken_dmg=case when kraken_wk=p_wk then kraken_dmg+dmg else dmg end, kraken_wk=p_wk where id=auth.uid();
 if c is not null then update public.clans set boss_dmg=case when boss_wk=p_wk then boss_dmg+dmg else dmg end, boss_wk=p_wk where id=c; end if;
 return jsonb_build_object('dmg',dmg,'clan',(select boss_dmg from public.clans where id=c)); end $$;

-- ===== PvP =====
create or replace function public.find_targets() returns table(id uuid,nick text,avatar text,power int,stage int,tag text) language sql stable security definer set search_path='' as $$
 select p.id,p.nick,p.avatar,p.power,p.stage,c.tag from public.profiles p left join public.clan_members m on m.user_id=p.id left join public.clans c on c.id=m.clan_id
 where p.id<>auth.uid() and p.shield_until<now() and exists(select 1 from public.saves s where s.user_id=p.id)
  and (m.clan_id is null or m.clan_id is distinct from public.my_clan())
 order by abs(p.power-(select power from public.profiles where id=auth.uid())), random() limit 6 $$;
create or replace function public.raid(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare me public.profiles; tg public.profiles; A record; D record; ad jsonb; dd jsonb; hp numeric; ehp numeric; mx numeric; emx numeric; rounds jsonb:='[]'; i int; d1 numeric; d2 numeric;
 win boolean; lf numeric; loot jsonb:='{}'; al jsonb:='{}'; dl jsonb:='{}'; k text; v numeric; capv numeric; dday text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); bid bigint;
begin select * into me from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p_target=auth.uid() then raise exception 'Kendine saldıramazsın'; end if;
 if me.last_raid>now()-interval '20 seconds' then raise exception 'Filo hâlâ dönüyor, biraz bekle'; end if;
 if me.raid_day=dday and me.raid_n>=15 then raise exception 'Bugünkü baskın hakkın bitti'; end if;
 select * into tg from public.profiles where id=p_target for update; if not found then raise exception 'Hedef yok'; end if;
 if tg.shield_until>now() then raise exception 'Hedef kalkan altında'; end if;
 if public.my_clan() is not null and public.my_clan()=(select clan_id from public.clan_members where user_id=p_target) then raise exception 'Klan arkadaşına saldıramazsın'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target;
 if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into A from public.sf_army(ad); select * into D from public.sf_army(dd);
 if A.power<=0 then raise exception 'Filon boş — önce tayfa eğit'; end if;
 -- savunan: fener bonusu +%10 ve ada başına sabit muhafız
 hp:=A.hp; mx:=hp; ehp:=D.hp*1.1+200; emx:=ehp;
 for i in 1..10 loop exit when hp<=0 or ehp<=0;
  d1:=round(A.atk*(.85+random()*.3)); ehp:=greatest(0,ehp-d1); d2:=0;
  if ehp>0 then d2:=round((D.atk*1.1+40)*(.85+random()*.3)); hp:=greatest(0,hp-d2); end if;
  rounds:=rounds||jsonb_build_object('d1',d1,'d2',d2,'hp',hp,'eHp',ehp); end loop;
 win:=ehp<=0; lf:=case when mx>0 then least(1,(mx-hp)/mx)*.5 else 0 end;
 for k in select unnest(array['tayfa','zipkin','topcu']) loop
  al:=al||jsonb_build_object(k,-floor(public.sf_n(ad,array['troops',k],1e6)*lf));
  dl:=dl||jsonb_build_object(k,-floor(public.sf_n(dd,array['troops',k],1e6)*(case when win then .3 else .1 end)*least(1,(emx-ehp)/emx))); end loop;
 if win then for k in select unnest(array['fish','wood','crys']) loop
   v:=public.sf_n(dd,array['res',k],1e12); capv:=(case when k='crys' then 0.3 else 1 end)*(400+A.power*1.5);
   loot:=loot||jsonb_build_object(k,floor(least(v*.15,capv)*least(A.lootm,2))); end loop; end if;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power)
  values(auth.uid(),p_target,win,loot,al,dl,rounds,me.nick,tg.nick,A.power,D.power) returning id into bid;
 insert into public.events(user_id,kind,delta) values(auth.uid(),'raid',jsonb_build_object('res',loot,'troops',al,'battle',bid));
 insert into public.events(user_id,kind,delta) values(p_target,'raided',jsonb_build_object('res',(select coalesce(jsonb_object_agg(key,-(value::numeric)),'{}') from jsonb_each_text(loot)),'troops',dl,'battle',bid));
 update public.profiles set last_raid=now(), raid_n=case when raid_day=dday then raid_n+1 else 1 end, raid_day=dday, shield_until=least(shield_until,now()) where id=auth.uid();
 update public.profiles set shield_until=now()+case when win then interval '4 hours' else interval '30 minutes' end where id=p_target;
 return jsonb_build_object('id',bid,'win',win,'loot',loot,'att_lost',al,'def_lost',dl,'rounds',rounds,'myMax',mx,'eMax',emx,'def_nick',tg.nick,'def_avatar',tg.avatar,'def_power',D.power,'att_power',A.power); end $$;

-- ===== sıralama =====
create or replace function public.leaderboard(p_kind text, p_wk text default '') returns table(id uuid,nick text,avatar text,val bigint,tag text) language sql stable security definer set search_path='' as $$
 select p.id,p.nick,p.avatar,case when p_kind='kraken' then p.kraken_dmg else p.power end::bigint,c.tag from public.profiles p left join public.clan_members m on m.user_id=p.id left join public.clans c on c.id=m.clan_id
 where p_kind<>'kraken' or (p.kraken_wk=p_wk and p.kraken_dmg>0) order by 4 desc limit 50 $$;
create or replace function public.clan_board(p_wk text) returns table(name text,tag text,icon text,dmg bigint) language sql stable security definer set search_path='' as $$
 select name,tag,icon,boss_dmg from public.clans where boss_wk=p_wk order by boss_dmg desc limit 20 $$;

-- ===== sohbet =====
create or replace function public.send_chat(p_channel text, p_body text, p_lang text default 'tr') returns void language plpgsql security definer set search_path='' as $$
declare p public.profiles; c uuid:=public.my_clan(); b text; begin select * into p from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p.muted_until>now() then raise exception 'Sohbetten geçici olarak susturuldun'; end if;
 if p_channel<>'tr' and (c is null or p_channel<>'clan:'||c::text) then raise exception 'Kanal yok'; end if;
 b:=btrim(regexp_replace(p_body,'[[:cntrl:]]',' ','g')); if length(b)<1 or length(b)>200 then raise exception 'Mesaj 1-200 karakter olmalı'; end if;
 if p.chat_last>now()-interval '2 seconds' then raise exception 'Çok hızlı yazıyorsun'; end if;
 if p.chat_win>now()-interval '1 minute' and p.chat_n>=12 then raise exception 'Dakikada en fazla 12 mesaj'; end if;
 update public.profiles set chat_last=now(), chat_n=case when chat_win>now()-interval '1 minute' then chat_n+1 else 1 end, chat_win=case when chat_win>now()-interval '1 minute' then chat_win else now() end where id=auth.uid();
 if p_lang not in('tr','en','zh','zh-TW','other') then p_lang:='other'; end if;
 insert into public.messages(channel,user_id,nick,avatar,body,lang) values(p_channel,auth.uid(),p.nick,p.avatar,public.sf_clean(b),p_lang); end $$;
create or replace function public.report_msg(p_msg bigint) returns void language plpgsql security definer set search_path='' as $$
declare u uuid; begin select user_id into u from public.messages where id=p_msg; if u is null or u=auth.uid() then return; end if;
 insert into public.chat_reports(msg,reporter) values(p_msg,auth.uid()) on conflict do nothing;
 if (select count(distinct r.reporter) from public.chat_reports r join public.messages m on m.id=r.msg where m.user_id=u and r.created_at>now()-interval '1 day')>=3 then
  update public.profiles set muted_until=now()+interval '1 hour' where id=u; end if; end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.sf_army(jsonb), public.sf_n(jsonb,text[],numeric) from authenticated;
alter publication supabase_realtime add table public.messages, public.events, public.help_requests;
