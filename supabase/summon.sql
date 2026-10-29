-- Batch 24: Sunucu tarafı kaptan çağırma. Açık oranlar: Efsanevi %5, Epik %25, Nadir %70.
-- 40 çağrıda Efsanevi garanti, 80 çağrıda seçmeli Efsanevi hakkı. Sayaçlar ve elmas sunucuda.
create table if not exists public.summon_state(user_id uuid primary key references auth.users on delete cascade, pity int not null default 0, pity2 int not null default 0, sel int not null default 0, total int not null default 0, free_day text, migrated jsonb, created_at timestamptz default now());
create table if not exists public.summon_log(id bigserial primary key, user_id uuid not null, n int, pay text, cost int, out jsonb, at timestamptz default now());
alter table public.summon_state enable row level security; alter table public.summon_log enable row level security;
drop policy if exists summon_state_own on public.summon_state;
create policy summon_state_own on public.summon_state for select using (user_id=auth.uid());

create or replace function public.sf_summon_pool(r int) returns text[] language sql immutable as $$
 select case r when 3 then array['kaan','mei','selin'] when 2 then array['tunc','deniz','nene','lale'] else array['ela','ali','baris'] end $$;

-- ilk kullanımda yerel sayaçları tek sefer taşı (sınırlı: 39 / 79 / 1)
create or replace function public.sf_summon_state(u uuid, d jsonb) returns public.summon_state language plpgsql security definer set search_path='' as $$
declare s public.summon_state; p int; p2 int; t int; begin
 select * into s from public.summon_state where user_id=u for update;
 if found then return s; end if;
 p:=least(greatest(coalesce(public.sf_n(d,'{pity}',39),0),0),39)::int; p2:=least(greatest(coalesce(public.sf_n(d,'{pity2}',79),0),0),79)::int; t:=least(greatest(coalesce(public.sf_n(d,'{selTok}',1),0),0),1)::int;
 insert into public.summon_state(user_id,pity,pity2,sel,migrated) values(u,p,p2,t,jsonb_build_object('pity',d->'pity','pity2',d->'pity2','selTok',d->'selTok')) returning * into s; return s; end $$;

create or replace function public.summon_me() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); d jsonb; s public.summon_state; today text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD'); begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 select data into d from public.saves where user_id=u; s:=public.sf_summon_state(u,coalesce(d,'{}'));
 return jsonb_build_object('pity',s.pity,'pity2',s.pity2,'sel',s.sel,'total',s.total,'free',coalesce(s.free_day,'')<>today,'odds',jsonb_build_object('3',5,'2',25,'1',70),'p1',40,'p2',80); end $$;

create or replace function public.sf_summon_apply(d jsonb, id text, out d2 jsonb, out isnew boolean) language plpgsql immutable as $$
begin
 if d->'heroes' ? id then d2:=jsonb_set(d,array['heroes',id,'sh'],to_jsonb(coalesce((d->'heroes'->id->>'sh')::int,0)+10)); isnew:=false;
 else d2:=jsonb_set(d,array['heroes',id],'{"star":1,"sh":0,"lv":1}'); isnew:=true; end if; end $$;

create or replace function public.summon(p_n int, p_pay text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sv public.saves; d jsonb; s public.summon_state; today text:=to_char(now() at time zone 'Europe/Istanbul','YYYY-MM-DD');
 cost int:=0; i int; r numeric; rar int; pool text[]; id text; nw boolean; outj jsonb:='[]'; g numeric; tk numeric; ush numeric:=0; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if p_n not in (1,10) or p_pay not in ('free','ticket','gems') or (p_pay<>'gems' and p_n<>1) then raise exception 'Geçersiz çağrı'; end if;
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if;
 d:=sv.data; s:=public.sf_summon_state(u,d);
 g:=public.sf_n(d,'{gems}',1e9); tk:=public.sf_n(d,'{tickets}',1e6);
 if p_pay='free' then if coalesce(s.free_day,'')=today then raise exception 'Bugünkü ücretsiz çağrı kullanıldı'; end if; s.free_day:=today;
 elsif p_pay='ticket' then if tk<1 then raise exception 'Bilet yok'; end if; d:=jsonb_set(d,'{tickets}',to_jsonb(tk-1));
 else cost:=case when p_n=1 then 30 else 270 end; if g<cost then raise exception 'Elmas yetersiz'; end if; d:=jsonb_set(d,'{gems}',to_jsonb(g-cost)); end if;
 for i in 1..p_n loop
  s.pity:=s.pity+1; s.pity2:=s.pity2+1; if s.pity2>=80 then s.pity2:=0; s.sel:=s.sel+1; end if;
  r:=random()*100; rar:=case when r<5 then 3 when r<30 then 2 else 1 end; if s.pity>=40 then rar:=3; end if; if rar=3 then s.pity:=0; end if;
  pool:=public.sf_summon_pool(rar); id:=pool[1+floor(random()*array_length(pool,1))::int];
  select x.d2,x.isnew into d,nw from public.sf_summon_apply(d,id) x; if not nw then ush:=ush+2; end if;
  outj:=outj||jsonb_build_array(jsonb_build_object('id',id,'r',rar,'new',nw)); end loop;
 d:=jsonb_set(d,'{ush}',to_jsonb(public.sf_n(d,'{ush}',1e6)+ush)); d:=jsonb_set(d,'{pity}',to_jsonb(s.pity)); d:=jsonb_set(d,'{pity2}',to_jsonb(s.pity2)); d:=jsonb_set(d,'{selTok}',to_jsonb(s.sel));
 update public.summon_state set pity=s.pity,pity2=s.pity2,sel=s.sel,total=s.total+p_n,free_day=s.free_day where user_id=u;
 update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 insert into public.summon_log(user_id,n,pay,cost,out) values(u,p_n,p_pay,cost,outj);
 return jsonb_build_object('rev',sv.rev,'out',outj,'gems',d->'gems','tickets',d->'tickets','ush',d->'ush','heroes',d->'heroes','pity',s.pity,'pity2',s.pity2,'sel',s.sel); end $$;

create or replace function public.summon_pick(p_id text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); sv public.saves; d jsonb; s public.summon_state; nw boolean; begin
 if u is null then raise exception 'Giriş gerekli'; end if;
 if not p_id=any(public.sf_summon_pool(3)) then raise exception 'Geçersiz kaptan'; end if;
 select * into sv from public.saves where user_id=u for update; if not found then raise exception 'Kayıt bulunamadı'; end if;
 d:=sv.data; s:=public.sf_summon_state(u,d); if s.sel<1 then raise exception 'Seçim hakkın yok'; end if;
 select x.d2,x.isnew into d,nw from public.sf_summon_apply(d,p_id) x; d:=jsonb_set(d,'{selTok}',to_jsonb(s.sel-1));
 update public.summon_state set sel=sel-1 where user_id=u; update public.saves set data=d, rev=rev+1 where user_id=u returning * into sv;
 insert into public.summon_log(user_id,n,pay,cost,out) values(u,1,'pick',0,jsonb_build_array(jsonb_build_object('id',p_id,'r',3,'new',nw)));
 return jsonb_build_object('rev',sv.rev,'out',jsonb_build_array(jsonb_build_object('id',p_id,'r',3,'new',nw)),'heroes',d->'heroes','sel',s.sel-1); end $$;

revoke execute on function public.sf_summon_state(uuid,jsonb), public.sf_summon_apply(jsonb,text) from public, anon, authenticated;
revoke execute on function public.summon_me(), public.summon(int,text), public.summon_pick(text) from public, anon;
grant execute on function public.summon_me(), public.summon(int,text), public.summon_pick(text) to authenticated;
