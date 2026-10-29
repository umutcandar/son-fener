-- Batch 10: klan teknolojisi bonusları kayıt sınırında + seviye atlama duyurusu
create or replace function public.clan_donate(p_tech text,p_res text,p_amt int) returns jsonb language plpgsql security definer set search_path to '' as $$
declare lv0 int; lv1 int; c uuid:=public.my_clan(); s public.saves; have numeric; pts int; dn public.clan_donations; td date:=(now() at time zone 'Europe/Istanbul')::date;
begin if c is null then raise exception 'Klan yok'; end if;
 if p_tech not in('prod','store','help') or p_res not in('fish','wood','crys') or p_amt not in(100,500,1000,5000) then raise exception 'Geçersiz bağış'; end if;
 select * into dn from public.clan_donations where clan_id=c and user_id=auth.uid() for update;
 if found and dn.day=td and dn.n>=10 then raise exception 'Bugünkü bağış hakkın bitti'; end if;
 select * into s from public.saves where user_id=auth.uid() for update;
 if not found then raise exception 'Önce oyunu kaydet'; end if;
 have:=public.sf_n(s.data,array['res',p_res],1e12);
 if have<p_amt then raise exception 'Yeterli kaynak yok'; end if;
 update public.saves set data=jsonb_set(data,array['res',p_res],to_jsonb(floor(have-p_amt))),rev=rev+1 where user_id=auth.uid() returning * into s;
 lv0:=public.clan_tech_lv(c,p_tech);
 pts:=p_amt*case when p_res='crys' then 3 else 1 end;
 insert into public.clan_tech values(c,p_tech,pts) on conflict(clan_id,tech) do update set pts=public.clan_tech.pts+excluded.pts;
 insert into public.clan_donations values(c,auth.uid(),pts,td,1) on conflict(clan_id,user_id) do update set pts=public.clan_donations.pts+excluded.pts,n=case when public.clan_donations.day=td then public.clan_donations.n+1 else 1 end,day=td;
 lv1:=public.clan_tech_lv(c,p_tech);
 if lv1>lv0 then insert into public.messages(channel,user_id,nick,avatar,body,lang) values('clan:'||c,auth.uid(),coalesce((select nick from public.profiles where id=auth.uid()),'?'),'🔬','§tech:'||p_tech||':'||lv1,'tr'); end if;
 return jsonb_build_object('ok',true,'rev',s.rev,'pts',pts,'lv',lv1,'up',lv1>lv0,'left',10-coalesce((select n from public.clan_donations where clan_id=c and user_id=auth.uid()),0)); end $$;

create or replace function public.save_game(p_data jsonb, p_rev integer) returns jsonb language plpgsql security definer set search_path to '' as $function$
declare cl uuid:=public.my_clan(); bp numeric:=0.02*coalesce(public.clan_tech_lv(public.my_clan(),'prod'),0); bs numeric:=0.05*coalesce(public.clan_tech_lv(public.my_clan(),'store'),0); s public.saves; dt numeric; k text; capv numeric; ov numeric; nv numeric; fl int:=0; a record; d jsonb:=p_data; al jsonb;
begin if auth.uid() is null then raise exception 'giriş gerekli'; end if;
 if octet_length(p_data::text)>200000 then raise exception 'kayıt çok büyük'; end if;
 perform public.ensure_profile();
 select * into s from public.saves where user_id=auth.uid() for update;
 if found then
  if p_rev is distinct from s.rev then return jsonb_build_object('conflict',true,'rev',s.rev,'data',s.data,'updated_at',s.updated_at); end if;
  dt:=least(greatest(extract(epoch from now()-s.updated_at),1),28800); al:=s.allow;
  for k in select unnest(array['fish','wood','crys']) loop
   ov:=public.sf_n(s.data,array['res',k],1e12); nv:=public.sf_n(d,array['res',k],1e12);
   capv:=ov+4000*(1+bs)+dt*(25+ov*0.0004)*(1+bp)+coalesce((al->>k)::numeric,0);
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
