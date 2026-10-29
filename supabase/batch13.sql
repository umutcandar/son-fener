-- Batch 13: stardust save cap, append-only moderation audit, soft-error RPC wrappers (expected refusals return {err} instead of HTTP 400)
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
  ov:=public.sf_n(s.data,'{ush}',1e6); nv:=public.sf_n(d,'{ush}',1e6); capv:=ov+60+dt*0.003+coalesce((al->>'ush')::numeric,0);
  if nv>capv then d:=jsonb_set(d,'{ush}',to_jsonb(floor(capv))); fl:=fl+1; end if;
  update public.saves set data=d, rev=rev+1, allow='{}', flags=flags+fl, updated_at=now() where user_id=auth.uid() returning * into s;
 else
  for k in select unnest(array['fish','wood','crys']) loop if public.sf_n(d,array['res',k],1e12)>50000 then d:=jsonb_set(d,array['res',k],'50000'); fl:=fl+1; end if; end loop;
  for k in select unnest(array['tayfa','zipkin','topcu']) loop if public.sf_n(d,array['troops',k],1e6)>2000 then d:=jsonb_set(d,array['troops',k],'2000'); fl:=fl+1; end if; end loop;
  if public.sf_n(d,'{ush}',1e6)>200 then d:=jsonb_set(d,'{ush}','200'); fl:=fl+1; end if;
  insert into public.saves(user_id,data,flags) values(auth.uid(),d,fl) returning * into s;
 end if;
 select * into a from public.sf_army(d);
 update public.profiles set power=a.power, stage=least(public.sf_n(d,'{stage}',1000),1000)::int where id=auth.uid();
 return jsonb_build_object('ok',true,'rev',s.rev,'clamped',fl,'data',case when fl>0 then d end,'power',a.power); end $function$;
create table if not exists public.mod_audit(id bigint generated always as identity primary key, admin uuid not null, target uuid, act text not null, detail jsonb default '{}', at timestamptz not null default now());
alter table public.mod_audit enable row level security;
revoke update,delete,truncate on public.mod_audit from public,anon,authenticated;
create or replace function public.mod_audit_ro() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'mod_audit is append-only'; end $$;
drop trigger if exists mod_audit_ro on public.mod_audit;
create trigger mod_audit_ro before update or delete on public.mod_audit for each row execute function public.mod_audit_ro();
create or replace function public.mod_action(p_target uuid, p_act text) returns void language plpgsql security definer set search_path='' as $$
declare np int; nm int;
begin
 if not public.is_admin() then raise exception 'not_admin'; end if;
 if p_act not in ('mute1h','mute24h','unmute','dismiss') then raise exception 'bad_target'; end if;
 if p_act='mute1h' then update public.profiles set muted_until=now()+interval '1 hour' where id=p_target;
 elsif p_act='mute24h' then update public.profiles set muted_until=now()+interval '24 hours' where id=p_target;
 elsif p_act='unmute' then update public.profiles set muted_until=null where id=p_target; end if;
 update public.player_reports set resolved_at=now(),resolved_by=auth.uid() where target=p_target and resolved_at is null; get diagnostics np=row_count;
 update public.chat_reports set resolved_at=now() where resolved_at is null and msg in (select id from public.messages where user_id=p_target); get diagnostics nm=row_count;
 insert into public.mod_audit(admin,target,act,detail) values(auth.uid(),p_target,p_act,jsonb_build_object('player_reports',np,'chat_reports',nm));
end $$;
create or replace function public.mod_log() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'not_admin'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'admin',pa.nick,'target',pt.nick,'act',l.act,'detail',l.detail,'at',l.at) order by l.id desc)
  from (select * from public.mod_audit order by id desc limit 50) l left join public.profiles pa on pa.id=l.admin left join public.profiles pt on pt.id=l.target),'[]'::jsonb); end $$;
revoke all on function public.mod_log() from public,anon; grant execute on function public.mod_log() to authenticated;
create or replace function public.send_chat_s(p_channel text,p_body text,p_lang text) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.send_chat(p_channel,p_body,p_lang); return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.send_chat_s(text,text,text) from public,anon; grant execute on function public.send_chat_s(text,text,text) to authenticated;
create or replace function public.mod_reports_s() returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.mod_reports();
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.mod_reports_s() from public,anon; grant execute on function public.mod_reports_s() to authenticated;
create or replace function public.mod_log_s() returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.mod_log();
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.mod_log_s() from public,anon; grant execute on function public.mod_log_s() to authenticated;
create or replace function public.mod_action_s(p_target uuid,p_act text) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.mod_action(p_target,p_act); return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.mod_action_s(uuid,text) from public,anon; grant execute on function public.mod_action_s(uuid,text) to authenticated;
create or replace function public.arena_fight_s(p_target uuid,p_equal boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.arena_fight(p_target,p_equal);
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.arena_fight_s(uuid,boolean) from public,anon; grant execute on function public.arena_fight_s(uuid,boolean) to authenticated;
create or replace function public.report_player_s(p_target uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.report_player(p_target,p_reason); return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.report_player_s(uuid,text) from public,anon; grant execute on function public.report_player_s(uuid,text) to authenticated;
create or replace function public.block_player_s(p_target uuid,p_on boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin return jsonb_build_object('ok',public.block_player(p_target,p_on));
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.block_player_s(uuid,boolean) from public,anon; grant execute on function public.block_player_s(uuid,boolean) to authenticated;
create or replace function public.report_msg_s(p_msg bigint) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform public.report_msg(p_msg); return jsonb_build_object('ok',true);
exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.report_msg_s(bigint) from public,anon; grant execute on function public.report_msg_s(bigint) to authenticated;
