-- Batch 11: kaptan yetenek/teçhizat gücü, arena güç bandı, oyuncu kartı, engelle/şikayet, özel mesaj
CREATE OR REPLACE FUNCTION public.sf_caps(d jsonb, lineup jsonb, OUT atk numeric, OUT hp numeric, OUT power integer, OUT heroes jsonb)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare r record; sa numeric:=0; sh numeric:=0; hb numeric:=0; ids text[]; begin heroes:='[]';
 select array_agg(x) into ids from (select distinct jsonb_array_elements_text(case when jsonb_typeof(lineup)='array' then lineup else '[]' end) x limit 3) t;
 for r in select h.*, round(h.p*(1+.5*(public.sf_n(d,array['heroes',h.id,'star'],6)-1))*(1+.1*(greatest(public.sf_n(d,array['heroes',h.id,'lv'],60),1)-1)))*(1+.06*public.sf_n(d,array['heroes',h.id,'tal'],5))*(1+.03*(public.sf_n(d,array['heroes',h.id,'eq','k'],5)+public.sf_n(d,array['heroes',h.id,'eq','s'],5)+public.sf_n(d,array['heroes',h.id,'eq','c'],5))) hp_, public.sf_n(d,array['heroes',h.id,'star'],6) st
  from public.hero_def h where d->'heroes' ? h.id and public.sf_n(d,array['heroes',h.id,'star'],6)>=1 and (ids is null or h.id=any(ids)) order by 5 desc limit 3 loop
  hb:=hb+r.hp_; heroes:=heroes||jsonb_build_object('id',r.id,'p',r.hp_);
  if r.sk_t='atk' then sa:=sa+r.sk_v*(1+.25*(r.st-1)); elsif r.sk_t='hp' then sh:=sh+r.sk_v*(1+.25*(r.st-1)); end if; end loop;
 atk:=hb*1.2*(1+public.sf_n(d,'{gear,cannon}',10)*.06)*(1+sa); hp:=hb*4*(1+public.sf_n(d,'{gear,plate}',10)*.06)*(1+sh); power:=round(hb*2); end $function$
;
CREATE OR REPLACE FUNCTION public.sf_army(d jsonb, OUT atk numeric, OUT hp numeric, OUT power integer, OUT lootm numeric)
 RETURNS record
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare hb numeric:=0; sa numeric:=0; sh numeric:=0; sl numeric:=0; ta numeric; th numeric; r record; ty numeric[]; 
begin
 for r in select h.id,h.sk_t,h.sk_v, round(h.p*(1+.5*(public.sf_n(d,array['heroes',h.id,'star'],6)-1))*(1+.1*(greatest(public.sf_n(d,array['heroes',h.id,'lv'],60),1)-1)))*(1+.06*public.sf_n(d,array['heroes',h.id,'tal'],5))*(1+.03*(public.sf_n(d,array['heroes',h.id,'eq','k'],5)+public.sf_n(d,array['heroes',h.id,'eq','s'],5)+public.sf_n(d,array['heroes',h.id,'eq','c'],5))) hp_,
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
end $function$
;
create or replace function public.sf_cap_fight(p_target uuid, p_kind text, p_equal boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare ad jsonb; dd jsonb; A record; D record; R record; me public.arena; tg public.arena; ch int:=0; bid bigint; mp public.profiles; tp public.profiles; begin
 if p_target=auth.uid() then raise exception 'Kendinle savaşamazsın'; end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target; if ad is null or dd is null then raise exception 'Kayıt yok'; end if;
 select * into mp from public.profiles where id=auth.uid(); select * into tp from public.profiles where id=p_target;
 if p_kind='arena' then me:=public.arena_me(); if me.tickets<=0 then raise exception 'Bugünkü arena biletin bitti'; end if;
  select * into tg from public.arena where user_id=p_target; if not found then raise exception 'Rakip arenada değil'; end if; else
  if exists(select 1 from public.battles where attacker=auth.uid() and kind='duel' and created_at>now()-interval '15 seconds') then raise exception 'Biraz bekle'; end if;
  select * into tg from public.arena where user_id=p_target; end if;
 if p_equal then ad:=public.sf_equalize(ad); dd:=public.sf_equalize(dd); end if;
 select * into A from public.sf_caps(ad,'[]'); select * into D from public.sf_caps(dd,coalesce(tg.lineup,'[]'));
 if A.power<=0 then raise exception 'Kaptanın yok'; end if;
 if p_kind='arena' and not p_equal and D.power<A.power*0.6 and exists(select 1 from public.arena_opponents() o where o.power>=A.power*0.6) then raise exception 'arena_weak'; end if;
 if exists(select 1 from public.mutes where (user_id=auth.uid() and muted=p_target) or (user_id=p_target and muted=auth.uid())) then raise exception 'blocked'; end if;
 select * into R from public.sf_duel(jsonb_build_object('atk',A.atk,'hp',A.hp),jsonb_build_object('atk',D.atk*1.05,'hp',D.hp*1.05));
 if p_kind='arena' and p_equal then ch:=round(32*((case when R.win then 1 else 0 end)-1/(1+power(10,(tg.eq_rating-me.eq_rating)/400.0))));
  update public.arena set eq_rating=greatest(0,eq_rating+ch), tickets=tickets-1 where user_id=auth.uid(); update public.arena set eq_rating=greatest(0,eq_rating-ch/2) where user_id=p_target;
 elsif p_kind='arena' then ch:=round(32*((case when R.win then 1 else 0 end)-1/(1+power(10,(tg.rating-me.rating)/400.0))));
  if ch>0 and D.power<A.power then ch:=greatest(1,round(ch*greatest(.5,D.power::numeric/A.power))); end if;
  update public.arena set rating=greatest(0,rating+ch), tickets=tickets-1, wins=wins+(R.win)::int, losses=losses+(not R.win)::int, best=greatest(best,rating+ch) where user_id=auth.uid();
  update public.arena set rating=greatest(0,rating-ch/2) where user_id=p_target; end if;
 insert into public.battles(attacker,defender,win,loot,att_lost,def_lost,rounds,att_nick,def_nick,att_power,def_power,kind)
  values(auth.uid(),p_target,R.win,jsonb_build_object('equal',p_equal,'rating',ch,'a',A.heroes,'d',D.heroes),'{}','{}',R.rounds,mp.nick,tp.nick,A.power,D.power,p_kind) returning id into bid;
 return jsonb_build_object('id',bid,'kind',p_kind,'win',R.win,'rounds',R.rounds,'myMax',R.amax,'eMax',R.bmax,'rating_change',ch,'a',A.heroes,'d',D.heroes,'def_nick',tp.nick,'def_avatar',tp.avatar,'att_power',A.power,'def_power',D.power,
  'arena',(select to_jsonb(x) from public.arena x where user_id=auth.uid())); end $$;
-- Arena eşleştirme: güç bandı (0.7x–1.4x) öncelikli, sonra derece yakınlığı; engellenenler hariç
create or replace function public.arena_opponents() returns table(id uuid,nick text,avatar text,rating int,tier text,power int) language sql security definer set search_path='' as $$
 with me as (select rating from public.arena_me()), mp as (select region_id,(public.sf_caps(s.data,coalesce(a.lineup,'[]'))).power pw from public.profiles p join public.saves s on s.user_id=p.id left join public.arena a on a.user_id=p.id where p.id=auth.uid()),
 c as (select p.id,p.nick,p.avatar,coalesce(a.rating,1000) r,(public.sf_caps(s.data,coalesce(a.lineup,'[]'))).power pw
  from public.profiles p join public.saves s on s.user_id=p.id left join public.arena a on a.user_id=p.id, mp
  where p.id<>auth.uid() and p.region_id=mp.region_id and not exists(select 1 from public.mutes m where (m.user_id=auth.uid() and m.muted=p.id) or (m.user_id=p.id and m.muted=auth.uid())))
 select c.id,c.nick,c.avatar,c.r,public.sf_tier(c.r),c.pw from c, me, mp
 where c.pw>0 order by (c.pw between mp.pw*0.7 and mp.pw*1.4) desc, abs(ln(greatest(c.pw,1)::numeric/greatest(mp.pw,1)))+abs(c.r-me.rating)/400.0, random() limit 5 $$;

-- Özel mesaj kanalı: dm:<küçük uuid>:<büyük uuid>
create or replace function public.dm_channel(a uuid, b uuid) returns text language sql immutable set search_path='' as $$ select 'dm:'||least(a::text,b::text)||':'||greatest(a::text,b::text) $$;
create table if not exists public.dm_reads(user_id uuid not null references auth.users on delete cascade, peer uuid not null, last_id bigint not null default 0, primary key(user_id,peer));
alter table public.dm_reads enable row level security;
drop policy if exists dr_own on public.dm_reads; create policy dr_own on public.dm_reads for select using (user_id=(select auth.uid()));
create index if not exists messages_dm_idx on public.messages(channel,id) where channel like 'dm:%';

drop policy if exists msg_read on public.messages;
create policy msg_read on public.messages for select using (channel='tr' or channel='clan:'||((select public.my_clan()))::text or channel='r:'||((select region_id from public.profiles where id=(select auth.uid())))::text
 or (channel like 'dm:%' and (split_part(channel,':',2)=(select auth.uid())::text or split_part(channel,':',3)=(select auth.uid())::text)));

create or replace function public.send_chat(p_channel text, p_body text, p_lang text DEFAULT 'tr'::text) returns void language plpgsql security definer set search_path to '' as $function$
declare p public.profiles; c uuid:=public.my_clan(); b text; peer uuid; begin select * into p from public.profiles where id=auth.uid() for update; if not found then raise exception 'profil yok'; end if;
 if p.muted_until>now() then raise exception 'Sohbetten geçici olarak susturuldun'; end if;
 if p_channel like 'dm:%' then
  begin peer:=case when split_part(p_channel,':',2)=auth.uid()::text then split_part(p_channel,':',3)::uuid when split_part(p_channel,':',3)=auth.uid()::text then split_part(p_channel,':',2)::uuid end; exception when others then peer:=null; end;
  if peer is null or peer=auth.uid() or p_channel<>public.dm_channel(auth.uid(),peer) or not exists(select 1 from public.profiles where id=peer) then raise exception 'Kanal yok'; end if;
  if exists(select 1 from public.mutes where (user_id=auth.uid() and muted=peer) or (user_id=peer and muted=auth.uid())) then raise exception 'blocked'; end if;
 elsif p_channel<>'tr' and p_channel<>'r:'||p.region_id::text and (c is null or p_channel<>'clan:'||c::text) then raise exception 'Kanal yok'; end if;
 b:=btrim(regexp_replace(p_body,'[[:cntrl:]]',' ','g')); if length(b)<1 or length(b)>200 then raise exception 'Mesaj 1-200 karakter olmalı'; end if;
 if b like '§%' then b:=' '||b; end if;
 if p.chat_last>now()-interval '2 seconds' then raise exception 'Çok hızlı yazıyorsun'; end if;
 if p.chat_win>now()-interval '1 minute' and p.chat_n>=12 then raise exception 'Dakikada en fazla 12 mesaj'; end if;
 update public.profiles set chat_last=now(), chat_n=case when chat_win>now()-interval '1 minute' then chat_n+1 else 1 end, chat_win=case when chat_win>now()-interval '1 minute' then chat_win else now() end where id=auth.uid();
 if p_lang !~ '^[a-zA-Z]{2}(-[A-Za-z]{2})?$' then p_lang:='other'; end if;
 insert into public.messages(channel,user_id,nick,avatar,body,lang) values(p_channel,auth.uid(),p.nick,p.avatar,public.sf_clean(b),p_lang); end $function$;

create or replace function public.dm_list() returns table(peer uuid,nick text,avatar text,last_body text,last_at timestamptz,last_id bigint,unread int,blocked boolean) language sql stable security definer set search_path='' as $$
 with mine as (select m.*, case when split_part(m.channel,':',2)=auth.uid()::text then split_part(m.channel,':',3) else split_part(m.channel,':',2) end::uuid pr
   from public.messages m where m.channel like 'dm:%' and (split_part(m.channel,':',2)=auth.uid()::text or split_part(m.channel,':',3)=auth.uid()::text) and m.created_at>now()-interval '30 days'),
 lastm as (select distinct on (pr) pr,body,created_at,id from mine order by pr,id desc)
 select l.pr,p.nick,p.avatar,l.body,l.created_at,l.id,
  (select count(*) from mine x where x.pr=l.pr and x.user_id=l.pr and x.id>coalesce((select r.last_id from public.dm_reads r where r.user_id=auth.uid() and r.peer=l.pr),0))::int,
  exists(select 1 from public.mutes u where u.user_id=auth.uid() and u.muted=l.pr)
 from lastm l join public.profiles p on p.id=l.pr order by l.id desc limit 50 $$;
create or replace function public.dm_read(p_peer uuid) returns void language sql security definer set search_path='' as $$
 insert into public.dm_reads(user_id,peer,last_id) select auth.uid(),p_peer,coalesce(max(id),0) from public.messages where channel=public.dm_channel(auth.uid(),p_peer)
 on conflict (user_id,peer) do update set last_id=greatest(public.dm_reads.last_id,excluded.last_id) $$;

-- Oyuncu şikayeti
create table if not exists public.player_reports(id bigint generated always as identity primary key, target uuid not null, reporter uuid not null, reason text not null, created_at timestamptz not null default now(), day date not null default (now() at time zone 'Europe/Istanbul')::date, unique(target,reporter,day));
alter table public.player_reports enable row level security;
create or replace function public.report_player(p_target uuid, p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin if p_target is null or p_target=auth.uid() or not exists(select 1 from public.profiles where id=p_target) then raise exception 'bad_target'; end if;
 if p_reason not in ('spam','abuse','name','cheat','other') then p_reason:='other'; end if;
 insert into public.player_reports(target,reporter,reason) values(p_target,auth.uid(),p_reason) on conflict do nothing;
 if (select count(distinct reporter) from public.player_reports where target=p_target and created_at>now()-interval '1 day')>=3 then update public.profiles set muted_until=greatest(coalesce(muted_until,now()),now()+interval '1 hour') where id=p_target; end if; end $$;
create or replace function public.block_player(p_target uuid, p_on boolean) returns boolean language plpgsql security definer set search_path='' as $$
begin if p_target is null or p_target=auth.uid() then raise exception 'bad_target'; end if;
 if p_on then insert into public.mutes(user_id,muted) select auth.uid(),p_target where not exists(select 1 from public.mutes where user_id=auth.uid() and muted=p_target);
 else delete from public.mutes where user_id=auth.uid() and muted=p_target; end if; return p_on; end $$;

-- Oyuncu kartı
create or replace function public.player_card(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare p public.profiles; s public.saves; a public.arena; cp record; cl record; begin
 select * into p from public.profiles where id=p_id; if not found then raise exception 'bad_target'; end if;
 select * into s from public.saves where user_id=p_id; select * into a from public.arena where user_id=p_id;
 select c.id,c.name,c.tag,c.icon,m.role into cl from public.clan_members m join public.clans c on c.id=m.clan_id where m.user_id=p_id;
 select * into cp from public.sf_caps(coalesce(s.data,'{}'),coalesce(a.lineup,'[]'));
 return jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'power',p.power,'stage',p.stage,'region',p.region_id,'cap_power',cp.power,
  'heroes',(select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','p',x->'p','star',s.data#>array['heroes',x->>'id','star'],'lv',s.data#>array['heroes',x->>'id','lv'],'tal',s.data#>array['heroes',x->>'id','tal'])),'[]') from jsonb_array_elements(cp.heroes) x),
  'rating',coalesce(a.rating,1000),'tier',public.sf_tier(coalesce(a.rating,1000)),'wins',coalesce(a.wins,0),'losses',coalesce(a.losses,0),'best',coalesce(a.best,1000),
  'clan',case when cl.id is null then null else jsonb_build_object('id',cl.id,'name',cl.name,'tag',cl.tag,'icon',cl.icon,'role',cl.role) end,
  'st',jsonb_build_object('wins',public.sf_n(coalesce(s.data,'{}'),'{st,wins}',1e9),'boss',public.sf_n(coalesce(s.data,'{}'),'{st,boss}',1e9),'repel',public.sf_n(coalesce(s.data,'{}'),'{st,repel}',1e9),'heroes',(select count(*) from jsonb_object_keys(coalesce(s.data->'heroes','{}')))),
  'blocked',exists(select 1 from public.mutes where user_id=auth.uid() and muted=p_id),'blocks_me',exists(select 1 from public.mutes where user_id=p_id and muted=auth.uid())); end $$;
revoke all on function public.player_card(uuid), public.block_player(uuid,boolean), public.report_player(uuid,text), public.dm_read(uuid), public.dm_list() from public, anon;
grant execute on function public.player_card(uuid), public.block_player(uuid,boolean), public.report_player(uuid,text), public.dm_read(uuid), public.dm_list() to authenticated;
