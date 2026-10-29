-- Batch 9: klan teknolojisi/bağış + yardım bonusu + sıkılaştırılmış kayıt büyüme sınırı
create table if not exists public.clan_tech(clan_id uuid references public.clans(id) on delete cascade, tech text, pts bigint not null default 0, primary key(clan_id,tech));
create table if not exists public.clan_donations(clan_id uuid references public.clans(id) on delete cascade, user_id uuid, pts bigint not null default 0, day date, n int not null default 0, primary key(clan_id,user_id));
alter table public.clan_tech enable row level security; alter table public.clan_donations enable row level security;
drop policy if exists ct_read on public.clan_tech; create policy ct_read on public.clan_tech for select to authenticated using (clan_id=public.my_clan());
drop policy if exists cd_read on public.clan_donations; create policy cd_read on public.clan_donations for select to authenticated using (clan_id=public.my_clan());

create or replace function public.clan_tech_lv(p_clan uuid,p_tech text) returns int language sql stable security definer set search_path to '' as $$
 select case when p is null then 0 when p>=80000 then 5 when p>=35000 then 4 when p>=15000 then 3 when p>=6000 then 2 when p>=2000 then 1 else 0 end
 from (select (select pts from public.clan_tech where clan_id=p_clan and tech=p_tech) p) x $$;

create or replace function public.clan_donate(p_tech text,p_res text,p_amt int) returns jsonb language plpgsql security definer set search_path to '' as $$
declare c uuid:=public.my_clan(); s public.saves; have numeric; pts int; dn public.clan_donations; td date:=(now() at time zone 'Europe/Istanbul')::date;
begin if c is null then raise exception 'Klan yok'; end if;
 if p_tech not in('prod','store','help') or p_res not in('fish','wood','crys') or p_amt not in(100,500,1000,5000) then raise exception 'Geçersiz bağış'; end if;
 select * into dn from public.clan_donations where clan_id=c and user_id=auth.uid() for update;
 if found and dn.day=td and dn.n>=10 then raise exception 'Bugünkü bağış hakkın bitti'; end if;
 select * into s from public.saves where user_id=auth.uid() for update;
 if not found then raise exception 'Önce oyunu kaydet'; end if;
 have:=public.sf_n(s.data,array['res',p_res],1e12);
 if have<p_amt then raise exception 'Yeterli kaynak yok'; end if;
 update public.saves set data=jsonb_set(data,array['res',p_res],to_jsonb(floor(have-p_amt))),rev=rev+1 where user_id=auth.uid() returning * into s;
 pts:=p_amt*case when p_res='crys' then 3 else 1 end;
 insert into public.clan_tech values(c,p_tech,pts) on conflict(clan_id,tech) do update set pts=public.clan_tech.pts+excluded.pts;
 insert into public.clan_donations values(c,auth.uid(),pts,td,1) on conflict(clan_id,user_id) do update set pts=public.clan_donations.pts+excluded.pts,n=case when public.clan_donations.day=td then public.clan_donations.n+1 else 1 end,day=td;
 return jsonb_build_object('ok',true,'rev',s.rev,'pts',pts,'lv',public.clan_tech_lv(c,p_tech),'left',10-coalesce((select n from public.clan_donations where clan_id=c and user_id=auth.uid()),0)); end $$;
revoke all on function public.clan_donate(text,text,int) from public,anon; grant execute on function public.clan_donate(text,text,int) to authenticated;
revoke all on function public.clan_tech_lv(uuid,text) from public,anon; grant execute on function public.clan_tech_lv(uuid,text) to authenticated;

create or replace function public.give_help(p_req bigint) returns void language plpgsql security definer set search_path to '' as $function$
declare r public.help_requests; begin select * into r from public.help_requests where id=p_req for update;
 if not found or r.clan_id is distinct from public.my_clan() or r.user_id=auth.uid() or r.helps>=r.max_helps then raise exception 'Yardım edilemez'; end if;
 insert into public.help_given values(p_req,auth.uid()); update public.help_requests set helps=helps+1 where id=p_req;
 insert into public.events(user_id,kind,delta) values(r.user_id,'help',jsonb_build_object('help_sec',60+15*public.clan_tech_lv(r.clan_id,'help'),'from',(select nick from public.profiles where id=auth.uid())));
exception when unique_violation then raise exception 'Zaten yardım ettin'; end $function$;

create or replace function public.clan_info() returns jsonb language sql stable security definer set search_path to '' as $function$
 select case when c.id is null then null else jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'icon',c.icon,'boss_wk',c.boss_wk,'boss_dmg',c.boss_dmg,
  'tech',coalesce((select jsonb_object_agg(t.tech,t.pts) from public.clan_tech t where t.clan_id=c.id),'{}'::jsonb),
  'don_left',10-coalesce((select case when d.day=(now() at time zone 'Europe/Istanbul')::date then d.n else 0 end from public.clan_donations d where d.clan_id=c.id and d.user_id=auth.uid()),0),
  'members',(select jsonb_agg(jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'power',p.power,'role',m.role,'kraken',case when p.kraken_wk=c.boss_wk then p.kraken_dmg else 0 end,
     'don',coalesce((select d.pts from public.clan_donations d where d.clan_id=c.id and d.user_id=p.id),0)) order by case m.role when 'lider' then 0 when 'yardımcı' then 1 else 2 end, p.power desc)
   from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c.id)) end
 from (select 1) x left join public.clans c on c.id=public.my_clan() $function$;

-- kayıt büyüme sınırı: önceki +8000 ve 60/sn çok cömertti. Çevrimdışı kazanç oyunda 8 saatle sınırlı, bu yüzden dt de 8 saatle kırpılır.
create or replace function public.save_game(p_data jsonb, p_rev integer) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare s public.saves; dt numeric; k text; capv numeric; ov numeric; nv numeric; fl int:=0; a record; d jsonb:=p_data; al jsonb;
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if octet_length(p_data::text)>200000 then raise exception 'kayıt çok büyük'; end if;
 perform public.ensure_profile();
 select * into s from public.saves where user_id=auth.uid() for update;
 if found then
  if p_rev is distinct from s.rev then return jsonb_build_object('conflict',true,'rev',s.rev,'data',s.data,'updated_at',s.updated_at); end if;
  dt:=least(greatest(extract(epoch from now()-s.updated_at),1),28800); al:=s.allow;
  for k in select unnest(array['fish','wood','crys']) loop
   ov:=public.sf_n(s.data,array['res',k],1e12); nv:=public.sf_n(d,array['res',k],1e12);
   capv:=ov+4000+dt*(25+ov*0.0004)+coalesce((al->>k)::numeric,0);
   if nv>capv then d:=jsonb_set(d,array['res',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  ov:=public.sf_n(s.data,'{gems}',1e9); nv:=public.sf_n(d,'{gems}',1e9); capv:=ov+3000+dt*0.1+coalesce((al->>'gems')::numeric,0);
  if nv>capv then d:=jsonb_set(d,'{gems}',to_jsonb(floor(capv))); fl:=fl+1; end if;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop
   ov:=public.sf_n(s.data,array['troops',k],1e6); nv:=public.sf_n(d,array['troops',k],1e6); capv:=ov+300+dt*1.5;
   if nv>capv then d:=jsonb_set(d,array['troops',k],to_jsonb(floor(capv))); fl:=fl+1; end if; end loop;
  update public.saves set data=d, rev=rev+1, allow='{}', flags=flags+fl, updated_at=now() where user_id=auth.uid() returning * into s;
 else
  for k in select unnest(array['fish','wood','crys']) loop if public.sf_n(d,array['res',k],1e12)>50000 then d:=jsonb_set(d,array['res',k],'50000'); fl:=fl+1; end if; end loop;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop if public.sf_n(d,array['troops',k],1e6)>2000 then d:=jsonb_set(d,array['troops',k],'2000'); fl:=fl+1; end if; end loop;
  insert into public.saves(user_id,data,flags) values(auth.uid(),d,fl) returning * into s;
 end if;
 select * into a from public.sf_army(d);
 update public.profiles set power=a.power, stage=least(public.sf_n(d,'{stage}',1000),1000)::int where id=auth.uid();
 return jsonb_build_object('ok',true,'rev',s.rev,'clamped',fl,'data',case when fl>0 then d end,'power',a.power); end $function$;
