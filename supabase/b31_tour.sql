-- Batch 31: haftalık turnuva (sunucu tarafı gruplar, güç eşleşmeli)
create table if not exists public.tour_entry(wk text not null,user_id uuid not null references auth.users on delete cascade,grp int,pw int not null default 0,pts int not null default 0,w int not null default 0,l int not null default 0,created_at timestamptz default now(),primary key(wk,user_id));
create table if not exists public.tour_match(wk text not null,a uuid not null,b uuid not null,win boolean not null,created_at timestamptz default now(),primary key(wk,a,b));
create table if not exists public.tour_done(wk text primary key,at timestamptz default now());
alter table public.tour_entry enable row level security;alter table public.tour_match enable row level security;alter table public.tour_done enable row level security;
revoke all on public.tour_entry,public.tour_match,public.tour_done from anon,authenticated;
create index if not exists tour_entry_grp on public.tour_entry(wk,grp);

create or replace function public.sf_tour_wk() returns text language sql stable set search_path='' as $$ select to_char(now() at time zone 'Europe/Istanbul','IYYY-"W"IW') $$;
create or replace function public.sf_tour_dow() returns int language sql stable set search_path='' as $$ select extract(isodow from now() at time zone 'Europe/Istanbul')::int $$;
create or replace function public.sf_tour_pw(u uuid) returns int language sql stable security definer set search_path='' as $$
 select coalesce((select (public.sf_caps(s.data,coalesce((select a.lineup from public.arena a where a.user_id=u),'[]'))).power from public.saves s where s.user_id=u),0) $$;

-- gruplama: grubu olmayan katılımcıları güce göre 8'li gruplara böl; son grup <4 ise bir öncekiyle birleşir
create or replace function public.sf_tour_group(p_wk text default null) returns int language plpgsql security definer set search_path='' as $$
declare vw text:=coalesce(p_wk,public.sf_tour_wk()); base int; n int; r record; i int:=0; g int; begin
 select coalesce(max(grp),0) into base from public.tour_entry where wk=vw;
 update public.tour_entry e set pw=public.sf_tour_pw(e.user_id) where wk=vw and grp is null;
 select count(*) into n from public.tour_entry where wk=vw and grp is null; if n=0 then return 0; end if;
 for r in select user_id from public.tour_entry where wk=vw and grp is null order by pw desc,created_at loop
  g:=i/8; if n>=8 and n%8>0 and n%8<4 and g=n/8 then g:=g-1; end if;
  update public.tour_entry set grp=base+1+g where wk=vw and user_id=r.user_id; i:=i+1; end loop;
 return n; end $$;

create or replace function public.tour_join() returns jsonb language plpgsql security definer set search_path='' as $$
declare vw text:=public.sf_tour_wk(); p int; begin
 if auth.uid() is null then raise exception 'auth'; end if;
 if public.sf_tour_dow()>=5 then return jsonb_build_object('err','closed'); end if;
 p:=public.sf_tour_pw(auth.uid()); if p<=0 then return jsonb_build_object('err','nocap'); end if;
 insert into public.tour_entry(wk,user_id,pw) values(vw,auth.uid(),p) on conflict do nothing; return jsonb_build_object('ok',true); end $$;

create or replace function public.tour_me() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare vw text:=public.sf_tour_wk(); me public.tour_entry; begin
 select * into me from public.tour_entry where wk=vw and user_id=auth.uid();
 return jsonb_build_object('wk',vw,'dow',public.sf_tour_dow(),'now',now(),'n',(select count(*) from public.tour_entry where wk=vw),
  'joined',me.user_id is not null,'grp',me.grp,'mypw',public.sf_tour_pw(auth.uid()),
  'rows',case when me.grp is null then '[]'::jsonb else (select coalesce(jsonb_agg(x order by x.pts desc,x.w desc,x.pw),'[]') from (
   select e.user_id id,p.nick,p.avatar,e.pw,e.pts,e.w,e.l,exists(select 1 from public.tour_match m where m.wk=vw and m.a=auth.uid() and m.b=e.user_id) fought
   from public.tour_entry e join public.profiles p on p.id=e.user_id where e.wk=vw and e.grp=me.grp) x) end,
  'last',(select jsonb_build_object('wk',e.wk,'rk',(select count(*)+1 from public.tour_entry o where o.wk=e.wk and o.grp=e.grp and (o.pts>e.pts or (o.pts=e.pts and o.w>e.w) or (o.pts=e.pts and o.w=e.w and o.pw<e.pw))))
    from public.tour_entry e where e.user_id=auth.uid() and e.wk<vw and e.grp is not null order by e.wk desc limit 1)); end $$;

-- grup içi maç: herkes her rakibe 1 kez saldırır. Galibiyet 3, mağlubiyet 1 puan (katılım). Savaş motoru arena ile aynı (sf_caps + sf_duel), güç kayıtta dondurulmaz: o anki kaptanlar.
create or replace function public.tour_fight(p_target uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare vw text:=public.sf_tour_wk(); me public.tour_entry; tg public.tour_entry; ad jsonb; dd jsonb; xa record; xd record; R record; tp public.profiles; begin
 select * into me from public.tour_entry where wk=vw and user_id=auth.uid(); select * into tg from public.tour_entry where wk=vw and user_id=p_target;
 if me.grp is null or tg.grp is null or me.grp<>tg.grp or p_target=auth.uid() then return jsonb_build_object('err','not_group'); end if;
 if exists(select 1 from public.tour_done where wk=vw) then return jsonb_build_object('err','closed'); end if;
 if exists(select 1 from public.tour_match m where m.wk=vw and m.a=auth.uid() and m.b=p_target) then return jsonb_build_object('err','fought'); end if;
 select data into ad from public.saves where user_id=auth.uid(); select data into dd from public.saves where user_id=p_target;
 select * into xa from public.sf_caps(ad,'[]'); select * into xd from public.sf_caps(dd,coalesce((select lineup from public.arena where user_id=p_target),'[]'));
 if xa.power<=0 then return jsonb_build_object('err','nocap'); end if;
 select * into R from public.sf_duel(jsonb_build_object('atk',xa.atk,'hp',xa.hp),jsonb_build_object('atk',xd.atk,'hp',xd.hp));
 insert into public.tour_match(wk,a,b,win) values(vw,auth.uid(),p_target,R.win);
 update public.tour_entry set pts=pts+case when R.win then 3 else 1 end,w=w+(R.win)::int,l=l+(not R.win)::int where wk=vw and user_id=auth.uid();
 select * into tp from public.profiles where id=p_target;
 return jsonb_build_object('kind','tour','win',R.win,'rounds',R.rounds,'myMax',R.amax,'eMax',R.bmax,'a',xa.heroes,'d',xd.heroes,'def_nick',tp.nick,'def_avatar',tp.avatar,'att_power',xa.power,'def_power',xd.power,'pts',case when R.win then 3 else 1 end); end $$;

-- hafta sonu: grup sırasına göre ödül postası (idempotent)
create or replace function public.sf_tour_settle(p_wk text) returns int language plpgsql security definer set search_path='' as $$
declare r record; n int:=0; at jsonb; begin
 if exists(select 1 from public.tour_done where wk=p_wk) then return 0; end if; insert into public.tour_done(wk) values(p_wk);
 for r in select e.user_id,e.grp,e.w+e.l played,row_number() over(partition by e.grp order by e.pts desc,e.w desc,e.pw) rk,count(*) over(partition by e.grp) gs from public.tour_entry e where e.wk=p_wk and e.grp is not null loop
  if r.played=0 then continue; end if;
  at:=case r.rk when 1 then '{"gems":120,"crys":200}' when 2 then '{"gems":80,"crys":150}' when 3 then '{"gems":50,"crys":100}' else '{"gems":15,"crys":60}' end::jsonb;
  perform public.sf_mail(r.user_id,'system','mail.tour',jsonb_build_array(p_wk,r.rk,r.gs),at); n:=n+1; end loop; return n; end $$;
create or replace function public.sf_tour_close() returns int language sql security definer set search_path='' as $$
 select coalesce(sum(public.sf_tour_settle(wk)),0)::int from (select distinct wk from public.tour_entry where wk<public.sf_tour_wk() and wk not in (select wk from public.tour_done)) t $$;

revoke all on function public.sf_tour_group(text),public.sf_tour_settle(text),public.sf_tour_close(),public.sf_tour_pw(uuid) from public,anon,authenticated;
grant execute on function public.tour_join(),public.tour_me(),public.tour_fight(uuid) to authenticated;
-- Cuma 00:05 ve Pazartesi 00:10 (İstanbul = UTC+3)
select cron.schedule('tour_group','5 21 * * 4','select public.sf_tour_group()');
select cron.schedule('tour_close','10 21 * * 0','select public.sf_tour_close()');
