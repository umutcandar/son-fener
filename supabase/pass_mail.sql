-- Batch 21: sunucu takipli Fener Bileti (30 kademe ücretsiz/premium) + Posta kutusu (sistem postaları, ekli ödüller, savaş sonuçları)
create table if not exists public.pass_state(user_id uuid primary key references public.profiles on delete cascade, season text not null default '', xp int not null default 0, prem boolean not null default false,
 cl_f int[] not null default '{}', cl_p int[] not null default '{}', dday text not null default '', dly jsonb not null default '{}', updated_at timestamptz not null default now());
alter table public.pass_state enable row level security;
create table if not exists public.mail(id bigint generated always as identity primary key, user_id uuid not null references public.profiles on delete cascade, kind text not null, tk text not null, args jsonb not null default '[]',
 att jsonb, read boolean not null default false, claimed boolean not null default false, created_at timestamptz not null default now());
create index if not exists mail_user_idx on public.mail(user_id, created_at desc);
alter table public.mail enable row level security;
drop policy if exists mail_own on public.mail; create policy mail_own on public.mail for select using (user_id=auth.uid());

create or replace function public.sf_pass_season() returns text language sql stable set search_path='' as $$ select to_char(now() at time zone 'Europe/Istanbul','YYYY-MM') $$;
create or replace function public.sf_pass_cap(src text) returns int language sql immutable set search_path='' as $$
 select case src when 'pve' then 300 when 'raid' then 100 when 'arena' then 75 when 'front' then 100 when 'help' then 50 when 'boss' then 100 when 'login' then 50 when 'task' then 150 else 0 end $$;
-- iç: XP ekle (kaynak başına günlük tavan, ay değişince sezon sıfırlanır)
create or replace function public.sf_pass_xp(u uuid, src text, n int) returns int language plpgsql security definer set search_path='' as $$
declare p public.pass_state; d text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); z text:=public.sf_pass_season(); used int; g int; begin
 if u is null or n<=0 then return 0; end if;
 insert into public.pass_state(user_id) values(u) on conflict do nothing;
 select * into p from public.pass_state where user_id=u for update;
 if p.season<>z then p.season:=z; p.xp:=0; p.prem:=false; p.cl_f:='{}'; p.cl_p:='{}'; end if;
 if p.dday<>d then p.dday:=d; p.dly:='{}'; end if;
 used:=coalesce((p.dly->>src)::int,0); g:=greatest(0,least(n,public.sf_pass_cap(src)-used));
 update public.pass_state set season=p.season, xp=p.xp+g, prem=p.prem, cl_f=p.cl_f, cl_p=p.cl_p, dday=p.dday, dly=jsonb_set(p.dly,array[src],to_jsonb(used+g)), updated_at=now() where user_id=u;
 return g; end $$;
revoke execute on function public.sf_pass_xp(uuid,text,int) from public, anon, authenticated;
create or replace function public.sf_pass_rw(i int, prem boolean) returns jsonb language sql immutable set search_path='' as $$
 select case when prem then case when i%5=4 then '{"ticket":1}'::jsonb when i%2=1 then '{"gems":25}'::jsonb else jsonb_build_object('crys',60+i*10) end
  else case when i%5=4 then '{"gems":30}'::jsonb when i%2=1 then jsonb_build_object('wood',80+i*20) else jsonb_build_object('fish',80+i*20) end end $$;
-- iç: posta gönder
create or replace function public.sf_mail(u uuid, k text, t text, a jsonb, at jsonb) returns void language sql security definer set search_path='' as $$
 insert into public.mail(user_id,kind,tk,args,att) values(u,k,t,coalesce(a,'[]'),at) $$;
revoke execute on function public.sf_mail(uuid,text,text,jsonb,jsonb) from public, anon, authenticated;

-- XP kaynakları (sunucu doğrulamalı)
create or replace function public.sf_trg_pass_battle() returns trigger language plpgsql security definer set search_path='' as $$
declare k text:=coalesce(new.kind,'raid'); begin
 if k='raid' then perform public.sf_pass_xp(new.attacker,'raid',case when new.win then 30 else 15 end);
 elsif k='arena' then perform public.sf_pass_xp(new.attacker,'arena',case when new.win then 25 else 10 end);
 elsif k='front' then perform public.sf_pass_xp(new.attacker,'front',25); end if;
 if k='raid' then perform public.sf_mail(new.defender,'raided',case when new.win then 'mail.raided_lost' else 'mail.raided_def' end,jsonb_build_array(coalesce(new.att_nick,'?')),null); end if;
 return null; end $$;
drop trigger if exists sf_pass_battle on public.battles; create trigger sf_pass_battle after insert on public.battles for each row execute function public.sf_trg_pass_battle();
create or replace function public.sf_trg_pass_help() returns trigger language plpgsql security definer set search_path='' as $$ begin perform public.sf_pass_xp(new.helper,'help',5); return null; end $$;
drop trigger if exists sf_pass_help on public.help_given; create trigger sf_pass_help after insert on public.help_given for each row execute function public.sf_trg_pass_help();
create or replace function public.sf_trg_pass_pve() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.last_win is distinct from old.last_win then perform public.sf_pass_xp(new.user_id,'pve',case when new.vstage>old.vstage then 40 else 20 end); end if; return null; end $$;
drop trigger if exists sf_pass_pve on public.pve_state; create trigger sf_pass_pve after update on public.pve_state for each row execute function public.sf_trg_pass_pve();
create or replace function public.sf_trg_pass_boss() returns trigger language plpgsql security definer set search_path='' as $$ begin
 if new.boss_n is distinct from old.boss_n and (new.boss_n>old.boss_n or new.boss_day<>old.boss_day) then perform public.sf_pass_xp(new.id,'boss',25); end if; return null; end $$;
drop trigger if exists sf_pass_boss on public.profiles; create trigger sf_pass_boss after update of boss_n on public.profiles for each row execute function public.sf_trg_pass_boss();
-- sunucu ödül/olay kayıtları posta kutusuna da düşer (bilgi amaçlı; ödül zaten otomatik uygulandı)
create or replace function public.sf_trg_ev_mail() returns trigger language plpgsql security definer set search_path='' as $$
declare g int:=coalesce((new.delta->'res'->>'gems')::int,0); begin
 if new.kind='fw' then perform public.sf_mail(new.user_id,'war','mail.fw',jsonb_build_array(g),null);
 elsif new.kind='front' then perform public.sf_mail(new.user_id,'war',case when (new.delta->>'tie')::boolean then 'mail.front_tie' when (new.delta->>'win')::boolean then 'mail.front_win' else 'mail.front_lose' end,jsonb_build_array(g),null);
 elsif new.kind='season' then perform public.sf_mail(new.user_id,'war','mail.arena_season',jsonb_build_array(g),null); end if; return null; end $$;
drop trigger if exists sf_ev_mail on public.events; create trigger sf_ev_mail after insert on public.events for each row execute function public.sf_trg_ev_mail();

-- istemci API
create or replace function public.pass_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pass_state; begin if auth.uid() is null then raise exception 'giriş'; end if;
 perform public.sf_pass_xp(auth.uid(),'login',50);
 select * into p from public.pass_state where user_id=auth.uid();
 return jsonb_build_object('season',p.season,'xp',p.xp,'prem',p.prem,'f',to_jsonb(p.cl_f),'p',to_jsonb(p.cl_p),'dly',p.dly,'caps',jsonb_build_object('pve',300,'raid',100,'arena',75,'front',100,'help',50,'boss',100,'login',50,'task',150)); end $$;
-- istemci görev XP'si: güvenilmez, günlük 150 tavanlı
create or replace function public.pass_task(p_n int) returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'giriş'; end if; perform public.sf_pass_xp(auth.uid(),'task',least(greatest(coalesce(p_n,0),0),150)); return public.pass_me(); end $$;
create or replace function public.pass_claim(p_i int, p_prem boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pass_state; rw jsonb; begin
 perform public.pass_me(); select * into p from public.pass_state where user_id=auth.uid() for update;
 if p_i<0 or p_i>=30 or p_i>=least(30,p.xp/100) then raise exception 'Kilitli'; end if;
 if p_prem and not p.prem then raise exception 'Premium yok'; end if;
 if (p_prem and p_i=any(p.cl_p)) or (not p_prem and p_i=any(p.cl_f)) then raise exception 'Alındı'; end if;
 if p_prem then update public.pass_state set cl_p=cl_p||p_i where user_id=auth.uid(); else update public.pass_state set cl_f=cl_f||p_i where user_id=auth.uid(); end if;
 rw:=public.sf_pass_rw(p_i,p_prem); perform public.sf_allow_add(auth.uid(),rw); return rw; end $$;
-- DEMO premium (gerçek ödeme yok)
create or replace function public.pass_prem_demo() returns jsonb language plpgsql security definer set search_path='' as $$ begin
 perform public.pass_me(); update public.pass_state set prem=true where user_id=auth.uid();
 insert into public.monet_log(user_id,price,item) values(auth.uid(),89.99,'pass_prem_demo');
 perform public.sf_mail(auth.uid(),'system','mail.prem','[]',null); return public.pass_me(); end $$;

create or replace function public.mail_list() returns jsonb language plpgsql security definer set search_path='' as $$ begin
 if auth.uid() is null then raise exception 'giriş'; end if;
 if not exists(select 1 from public.mail where user_id=auth.uid() and kind='welcome') then perform public.sf_mail(auth.uid(),'welcome','mail.welcome','[]','{"gems":50,"ticket":1}'); end if;
 if not exists(select 1 from public.mail where user_id=auth.uid() and kind='system' and tk='mail.pass_new' and args->>0=public.sf_pass_season()) then perform public.sf_mail(auth.uid(),'system','mail.pass_new',jsonb_build_array(public.sf_pass_season()),'{"crys":100}'); end if;
 return coalesce((select jsonb_agg(to_jsonb(m) order by m.created_at desc, m.id desc) from (select id,kind,tk,args,att,read,claimed,created_at from public.mail where user_id=auth.uid() and created_at>now()-interval '30 days' order by created_at desc, id desc limit 50) m),'[]'); end $$;
create or replace function public.mail_read(p_id bigint) returns void language sql security definer set search_path='' as $$ update public.mail set read=true where id=p_id and user_id=auth.uid() $$;
create or replace function public.mail_claim(p_id bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.mail; begin select * into m from public.mail where id=p_id and user_id=auth.uid() for update;
 if not found then raise exception 'Posta yok'; end if; if m.att is null or m.claimed then raise exception 'Alındı'; end if;
 update public.mail set claimed=true, read=true where id=p_id; perform public.sf_allow_add(auth.uid(),m.att); return m.att; end $$;
revoke all on function public.pass_me(), public.pass_task(int), public.pass_claim(int,boolean), public.pass_prem_demo(), public.mail_list(), public.mail_read(bigint), public.mail_claim(bigint) from public, anon;
grant execute on function public.pass_me(), public.pass_task(int), public.pass_claim(int,boolean), public.pass_prem_demo(), public.mail_list(), public.mail_read(bigint), public.mail_claim(bigint) to authenticated;
-- tek seferlik: sunucu takibinden önceki yerel ilerlemeyi aktar (yalnızca Ekim 2026 sezonu, XP 1500 tavanlı; alınmış kademeler korunur ki tekrar alınamasın)
alter table public.pass_state add column if not exists imported boolean not null default false;
create or replace function public.pass_import(p_xp int, p_f int[], p_p int[], p_prem boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pass_state; begin perform public.pass_me(); select * into p from public.pass_state where user_id=auth.uid() for update;
 if not p.imported and p.season='2026-10' then
  update public.pass_state set imported=true, xp=greatest(xp,least(greatest(coalesce(p_xp,0),0),1500)),
   cl_f=(select coalesce(array_agg(distinct x),'{}') from unnest(cl_f||coalesce(p_f,'{}')) x where x between 0 and 29),
   cl_p=(select coalesce(array_agg(distinct x),'{}') from unnest(cl_p||coalesce(p_p,'{}')) x where x between 0 and 29), prem=prem or coalesce(p_prem,false) where user_id=auth.uid();
 elsif not p.imported then update public.pass_state set imported=true where user_id=auth.uid(); end if; return public.pass_me(); end $$;
revoke all on function public.pass_import(int,int[],int[],boolean) from public, anon; grant execute on function public.pass_import(int,int[],int[],boolean) to authenticated;
