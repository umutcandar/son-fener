-- Savaş Revizyonu Faz A: ortak dünya haritası (koordinatlar, görünüm, PvE kampları, seferler, taşınma)
create table if not exists public.world_pos(user_id uuid primary key references auth.users(id) on delete cascade, x smallint not null, y smallint not null, moved_at timestamptz not null default now(), unique(x,y));
alter table public.world_pos enable row level security;
create table if not exists public.world_march(id bigserial primary key, user_id uuid not null references auth.users(id) on delete cascade, fx smallint, fy smallint, tx smallint, ty smallint, kind text not null, slot int, lvl int, started_at timestamptz not null default now(), arrive_at timestamptz not null, done boolean not null default false, result jsonb);
create index if not exists world_march_live on public.world_march(arrive_at) where not done;
create index if not exists world_march_user on public.world_march(user_id, done);
create table if not exists public.world_pve_hit(user_id uuid not null references auth.users(id) on delete cascade, x smallint, y smallint, slot int, primary key(user_id,x,y,slot));
alter table public.world_march enable row level security; alter table public.world_pve_hit enable row level security;
revoke all on public.world_pos, public.world_march, public.world_pve_hit from anon, authenticated;

create or replace function public.sf_world_n() returns int language sql immutable as $$ select 120 $$;
create or replace function public.sf_world_slot() returns int language sql stable as $$ select floor(extract(epoch from now())/7200)::int $$;
-- deterministik kamp: hücre başına hash; %1 kamp yoğunluğu
create or replace function public.sf_world_camp(p_x int, p_y int, p_slot int) returns jsonb language sql immutable as $$
 select case when h%23=0 then jsonb_build_object('x',p_x,'y',p_y,'k',case when (h/23)%2=0 then 'pirate' else 'fog' end,'lvl',1+(h/46)%10) end
 from (select abs(hashtext(p_x||':'||p_y||':'||p_slot)) h) z $$;
create or replace function public.sf_world_camp_pw(lvl int) returns int language sql immutable as $$ select (120*power(lvl,1.6))::int $$;

create or replace function public.sf_world_assign(u uuid) returns public.world_pos language plpgsql security definer set search_path='' as $$
declare p public.world_pos; cx int; cy int; i int; nx int; ny int; n int:=public.sf_world_n(); begin
 select * into p from public.world_pos where user_id=u; if found then return p; end if;
 select w.x,w.y into cx,cy from public.world_pos w join public.clan_members m on m.user_id=w.user_id where m.clan_id=(select clan_id from public.clan_members where user_id=u) order by random() limit 1;
 for i in 1..60 loop
  if cx is not null and i<=40 then nx:=greatest(0,least(n-1,cx+floor(random()*9)::int-4)); ny:=greatest(0,least(n-1,cy+floor(random()*9)::int-4));
  else nx:=10+floor(random()*(n-20))::int; ny:=10+floor(random()*(n-20))::int; end if;
  if public.sf_world_camp(nx,ny,public.sf_world_slot()) is null and not exists(select 1 from public.world_pos where x=nx and y=ny) then
   insert into public.world_pos(user_id,x,y) values(u,nx,ny) on conflict do nothing returning * into p; if p.user_id is not null then return p; end if; end if; end loop;
 raise exception 'Harita dolu'; end $$;

create or replace function public.world_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.world_pos; begin if u is null then raise exception 'Giriş gerekli'; end if;
 p:=public.sf_world_assign(u);
 return jsonb_build_object('x',p.x,'y',p.y,'n',public.sf_world_n(),'slot',public.sf_world_slot(),'reloc_cost',200,
  'marches',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'tx',tx,'ty',ty,'kind',kind,'lvl',lvl,'arrive',extract(epoch from arrive_at)*1000,'done',done,'result',result) order by id desc),'[]') from (select * from public.world_march where user_id=u and (not done or arrive_at>now()-interval '10 minutes') order by id desc limit 10) q)); end $$;

-- görünüm: en çok 25x25 hücre; yalnız herkese açık alanlar
create or replace function public.world_view(p_x int, p_y int, p_w int, p_h int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); vw int:=least(greatest(p_w,1),25); vh int:=least(greatest(p_h,1),25); s int:=public.sf_world_slot(); begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 return jsonb_build_object('slot',s,'next',(s+1)*7200000::bigint,
 'isl',(select coalesce(jsonb_agg(jsonb_build_object('id',w.user_id,'x',w.x,'y',w.y,'nick',pr.nick,'av',pr.avatar,'lv',pr.stage,'pw',pr.power,'tag',c.tag,'cic',c.icon,'cid',c.id,'sh',coalesce(pr.shield_until>now(),false),'me',w.user_id=u,'mate',c.id is not null and c.id=public.my_clan())),'[]')
   from public.world_pos w join public.profiles pr on pr.id=w.user_id left join public.clan_members m on m.user_id=w.user_id left join public.clans c on c.id=m.clan_id
   where w.x between p_x and p_x+vw-1 and w.y between p_y and p_y+vh-1),
 'camps',(select coalesce(jsonb_agg(cp||jsonb_build_object('pw',public.sf_world_camp_pw((cp->>'lvl')::int))),'[]') from (select public.sf_world_camp(gx,gy,s) cp, gx, gy from generate_series(p_x,p_x+vw-1) gx, generate_series(p_y,p_y+vh-1) gy) q
   where cp is not null and gx between 0 and public.sf_world_n()-1 and gy between 0 and public.sf_world_n()-1 and not exists(select 1 from public.world_pos where x=gx and y=gy) and not exists(select 1 from public.world_pve_hit where user_id=u and x=gx and y=gy and slot=s)),
 'marches',(select coalesce(jsonb_agg(jsonb_build_object('id',m.id,'nick',pr.nick,'me',m.user_id=u,'fx',m.fx,'fy',m.fy,'tx',m.tx,'ty',m.ty,'kind',m.kind,'t0',extract(epoch from m.started_at)*1000,'t1',extract(epoch from m.arrive_at)*1000)),'[]')
   from public.world_march m join public.profiles pr on pr.id=m.user_id where not m.done and m.arrive_at>now()-interval '5 seconds'
   and greatest(m.fx,m.tx)>=p_x and least(m.fx,m.tx)<=p_x+vw-1 and greatest(m.fy,m.ty)>=p_y and least(m.fy,m.ty)<=p_y+vh-1)); end $$;

create or replace function public.world_attack_camp(p_x int, p_y int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.world_pos; s int:=public.sf_world_slot(); cp jsonb; d numeric; t int; m public.world_march; begin
 if u is null then raise exception 'Giriş gerekli'; end if; p:=public.sf_world_assign(u);
 cp:=public.sf_world_camp(p_x,p_y,s); if cp is null or p_x<0 or p_y<0 or p_x>=public.sf_world_n() or p_y>=public.sf_world_n() then raise exception 'Hedef yok'; end if;
 if exists(select 1 from public.world_pve_hit where user_id=u and x=p_x and y=p_y and slot=s) then raise exception 'Bu kamp zaten temizlendi'; end if;
 if (select count(*) from public.world_march where user_id=u and not done)>=1 then raise exception 'Sefer kuyruğu dolu'; end if;
 d:=sqrt(power(p_x-p.x,2)+power(p_y-p.y,2)); t:=least(180,10+ceil(d*3))::int;
 insert into public.world_pve_hit values(u,p_x,p_y,s);
 insert into public.world_march(user_id,fx,fy,tx,ty,kind,slot,lvl,arrive_at) values(u,p.x,p.y,p_x,p_y,cp->>'k',s,(cp->>'lvl')::int,now()+make_interval(secs=>t)) returning * into m;
 return jsonb_build_object('id',m.id,'arrive',extract(epoch from m.arrive_at)*1000,'secs',t); end $$;

-- varan seferleri çöz: deterministik savaş + olay günlüğü; ganimet postayla
create or replace function public.world_resolve() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); m public.world_march; pw numeric; ep numeric; hp numeric; ehp numeric; r int; ev jsonb; d1 numeric; d2 numeric; win boolean; loot jsonb; out jsonb:='[]'; sd int; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select greatest(coalesce(power,0),50) into pw from public.profiles where id=u;
 for m in select * from public.world_march where user_id=u and not done and arrive_at<=now() order by id for update loop
  ep:=public.sf_world_camp_pw(m.lvl); hp:=pw*3; ehp:=ep*3; ev:='[]'; sd:=abs(hashtext(m.id::text));
  for r in 1..8 loop exit when hp<=0 or ehp<=0;
   d1:=round(pw*(0.85+((sd>>r)%30)/100.0)); if r%3=0 then d1:=round(d1*1.5); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','skill','v',d1)); else ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','a','t','hit','v',d1)); end if; ehp:=ehp-d1;
   exit when ehp<=0; d2:=round(ep*(0.85+((sd>>(r+8))%30)/100.0)); ev:=ev||jsonb_build_array(jsonb_build_object('r',r,'s','d','t','hit','v',d2)); hp:=hp-d2; end loop;
  win:=ehp<=0 or (hp>0 and hp/(pw*3)>=ehp/(ep*3));
  loot:=case when win then case when m.kind='pirate' then jsonb_build_object('wood',60*m.lvl,'fish',80*m.lvl) else jsonb_build_object('crys',25*m.lvl,'fish',40*m.lvl) end else null end;
  update public.world_march set done=true, result=jsonb_build_object('win',win,'loot',loot,'pw',pw,'ep',ep,'log',ev) where id=m.id;
  if win then insert into public.mail(user_id,kind,tk,args,att) values(u,'system','mail.camp',jsonb_build_array(m.lvl),loot); end if;
  out:=out||jsonb_build_array(jsonb_build_object('id',m.id,'kind',m.kind,'lvl',m.lvl,'win',win,'loot',loot,'pw',pw,'ep',ep,'log',ev)); end loop;
 return out; end $$;

create or replace function public.world_relocate(p_x int, p_y int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sv public.saves; g numeric; d jsonb; cost int:=200; begin
 if u is null then raise exception 'Giriş gerekli'; end if; perform public.sf_world_assign(u);
 if p_x<0 or p_y<0 or p_x>=public.sf_world_n() or p_y>=public.sf_world_n() then raise exception 'Geçersiz konum'; end if;
 if exists(select 1 from public.world_pos where x=p_x and y=p_y) or public.sf_world_camp(p_x,p_y,public.sf_world_slot()) is not null then raise exception 'Konum dolu'; end if;
 if exists(select 1 from public.world_march where user_id=u and not done) then raise exception 'Sefer sürerken taşınamazsın'; end if;
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if;
 d:=sv.data; g:=public.sf_n(d,'{gems}',1e9); if g<cost then raise exception 'Elmas yetersiz'; end if;
 d:=jsonb_set(d,'{gems}',to_jsonb(g-cost)); update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 update public.world_pos set x=p_x, y=p_y, moved_at=now() where user_id=u;
 return jsonb_build_object('rev',sv.rev,'gems',d->'gems','x',p_x,'y',p_y); end $$;

revoke all on function public.sf_world_assign(uuid) from public, anon, authenticated;
revoke all on function public.world_me(), public.world_view(int,int,int,int), public.world_attack_camp(int,int), public.world_resolve(), public.world_relocate(int,int) from public, anon;
grant execute on function public.world_me(), public.world_view(int,int,int,int), public.world_attack_camp(int,int), public.world_resolve(), public.world_relocate(int,int) to authenticated;
