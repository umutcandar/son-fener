-- B27: admin review of parked heroes (additive; append-only audit)
alter table public.hero_pending add column if not exists status text not null default 'pending', add column if not exists decided_by uuid, add column if not exists decided_at timestamptz;
create or replace function public.sf_hero_guard(u uuid, d jsonb, out d2 jsonb, out n int) language plpgsql security definer set search_path='' as $$
declare k text; v jsonb; h jsonb:='{}'; ss public.summon_state; ok boolean; mk boolean; off int; offl int; p record;
begin n:=0; d2:=d;
 mk:=exists(select 1 from public.monet where user_id=u and marks>=45);
 select count(*), count(*) filter (where hero_id=any(public.sf_summon_pool(3))) into off, offl from public.hero_own where user_id=u and src='offline';
 if jsonb_typeof(d->'heroes')='object' then
  for k,v in select * from jsonb_each(d->'heroes') loop
   ok:= k='ali' or exists(select 1 from public.hero_own where user_id=u and hero_id=k);
   if not ok and k='sisnur' and mk then insert into public.hero_own values(u,k,'season') on conflict do nothing; ok:=true; end if;
   if not ok and k<>'sisnur' and off<3 and (k=any(public.sf_summon_pool(1)) or k=any(public.sf_summon_pool(2)) or (k=any(public.sf_summon_pool(3)) and offl<1)) then
    insert into public.hero_own values(u,k,'offline') on conflict do nothing; ok:=true; off:=off+1; if k=any(public.sf_summon_pool(3)) then offl:=offl+1; end if; end if;
   if ok then h:=h||jsonb_build_object(k,v); else n:=n+1;
    insert into public.hero_pending(user_id,hero_id,data,why) values(u,k,v,case when k='sisnur' then 'season' else 'offline' end) on conflict (user_id,hero_id) do update set data=excluded.data, at=now() where public.hero_pending.status='pending'; end if; end loop;
  -- restore parked heroes: approved by an admin, or season captain once earned
  for p in select * from public.hero_pending hp where hp.user_id=u and (hp.status='approved' or (hp.hero_id='sisnur' and mk and hp.status='pending')) loop
   if not h ? p.hero_id then h:=h||jsonb_build_object(p.hero_id,coalesce(p.data,'{"lv":1,"star":1}')); n:=n+1; end if;
   insert into public.hero_own values(u,p.hero_id,case when p.status='approved' then 'admin' else 'season' end) on conflict do nothing;
   update public.hero_pending set status='restored' where user_id=u and hero_id=p.hero_id; end loop;
  if n>0 then d2:=jsonb_set(d2,'{heroes}',h); end if; end if;
 select * into ss from public.summon_state where user_id=u;
 if found then
  if public.sf_n(d2,'{pity}',1e6) is distinct from ss.pity::numeric or public.sf_n(d2,'{pity2}',1e6) is distinct from ss.pity2::numeric or public.sf_n(d2,'{selTok}',1e6) is distinct from ss.sel::numeric then n:=n+1; end if;
  d2:=jsonb_set(jsonb_set(jsonb_set(d2,'{pity}',to_jsonb(ss.pity)),'{pity2}',to_jsonb(ss.pity2)),'{selTok}',to_jsonb(ss.sel)); end if;
end $$;
revoke all on function public.sf_hero_guard(uuid,jsonb) from public, anon, authenticated;
create or replace function public.hero_pending_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin if not public.is_admin() then raise exception 'not_admin'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('user_id',hp.user_id,'nick',p.nick,'hero',hp.hero_id,'why',hp.why,'data',hp.data,'at',hp.at,
   'own',(select count(*) from public.hero_own o where o.user_id=hp.user_id),'offline',(select count(*) from public.hero_own o where o.user_id=hp.user_id and o.src='offline'),
   'pulls',(select coalesce(sum(n),0) from public.summon_log l where l.user_id=hp.user_id)) order by hp.at)
  from (select * from public.hero_pending where status='pending' order by at limit 100) hp left join public.profiles p on p.id=hp.user_id),'[]'::jsonb); end $$;
create or replace function public.hero_pending_decide(p_user uuid, p_hero text, p_ok boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.hero_pending; begin if not public.is_admin() then raise exception 'not_admin'; end if;
 select * into r from public.hero_pending where user_id=p_user and hero_id=p_hero and status='pending' for update; if not found then raise exception 'bad_target'; end if;
 update public.hero_pending set status=case when p_ok then 'approved' else 'rejected' end, decided_by=auth.uid(), decided_at=now() where user_id=p_user and hero_id=p_hero;
 if p_ok then insert into public.hero_own values(p_user,p_hero,'admin') on conflict do nothing; end if;
 insert into public.mod_audit(admin,target,act,detail) values(auth.uid(),p_user,case when p_ok then 'hero_approve' else 'hero_reject' end,jsonb_build_object('hero',p_hero,'why',r.why));
 return jsonb_build_object('ok',true); end $$;
create or replace function public.hero_pending_list_s() returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.hero_pending_list(); exception when others then return jsonb_build_object('err',sqlerrm); end $$;
create or replace function public.hero_pending_decide_s(p_user uuid, p_hero text, p_ok boolean) returns jsonb language plpgsql security definer set search_path='' as $$
begin return public.hero_pending_decide(p_user,p_hero,p_ok); exception when others then return jsonb_build_object('err',sqlerrm); end $$;
revoke all on function public.hero_pending_list(),public.hero_pending_decide(uuid,text,boolean),public.hero_pending_list_s(),public.hero_pending_decide_s(uuid,text,boolean) from public,anon;
grant execute on function public.hero_pending_list(),public.hero_pending_decide(uuid,text,boolean),public.hero_pending_list_s(),public.hero_pending_decide_s(uuid,text,boolean) to authenticated;
