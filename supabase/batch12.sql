-- Batch 12: public clan view + admin-gated moderation
create table if not exists public.admins(user_id uuid primary key references auth.users(id) on delete cascade, added_at timestamptz default now());
alter table public.admins enable row level security; -- no policies: nobody can read/write via API
alter table public.player_reports add column if not exists resolved_at timestamptz, add column if not exists resolved_by uuid;
alter table public.chat_reports add column if not exists resolved_at timestamptz;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admins where user_id=auth.uid()) $$;

create or replace function public.clan_public(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',c.id,'name',c.name,'tag',c.tag,'icon',c.icon,'descr',c.descr,'region',c.region_id,
  'power',coalesce((select sum(p.power) from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c.id),0),
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'nick',p.nick,'avatar',p.avatar,'role',m.role,'power',p.power) order by (m.role='lider') desc,p.power desc)
    from public.clan_members m join public.profiles p on p.id=m.user_id where m.clan_id=c.id),'[]'::jsonb))
 from public.clans c where c.id=p_id $$;

create or replace function public.mod_reports() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'not_admin'; end if;
 return jsonb_build_object(
  'players',coalesce((select jsonb_agg(x order by x->>'last' desc) from (
    select jsonb_build_object('target',r.target,'nick',p.nick,'avatar',p.avatar,'n',count(*),'reporters',count(distinct r.reporter),
      'reasons',jsonb_agg(distinct r.reason),'last',max(r.created_at),'muted_until',p.muted_until) x
    from public.player_reports r join public.profiles p on p.id=r.target
    where r.resolved_at is null and r.created_at>now()-interval '14 days' group by r.target,p.nick,p.avatar,p.muted_until limit 100) s),'[]'::jsonb),
  'msgs',coalesce((select jsonb_agg(x order by x->>'at' desc) from (
    select jsonb_build_object('msg',m.id,'body',left(m.body,200),'user_id',m.user_id,'nick',p.nick,'channel',case when m.channel like 'dm:%' then 'dm' else m.channel end,'n',count(*),'at',m.created_at) x
    from public.chat_reports cr join public.messages m on m.id=cr.msg left join public.profiles p on p.id=m.user_id
    where cr.resolved_at is null and m.created_at>now()-interval '14 days' group by m.id,p.nick limit 100) s),'[]'::jsonb));
end $$;

create or replace function public.mod_action(p_target uuid, p_act text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.is_admin() then raise exception 'not_admin'; end if;
 if p_act not in ('mute1h','mute24h','unmute','dismiss') then raise exception 'bad_target'; end if;
 if p_act='mute1h' then update public.profiles set muted_until=now()+interval '1 hour' where id=p_target;
 elsif p_act='mute24h' then update public.profiles set muted_until=now()+interval '24 hours' where id=p_target;
 elsif p_act='unmute' then update public.profiles set muted_until=null where id=p_target; end if;
 update public.player_reports set resolved_at=now(),resolved_by=auth.uid() where target=p_target and resolved_at is null;
 update public.chat_reports set resolved_at=now() where resolved_at is null and msg in (select id from public.messages where user_id=p_target);
end $$;

revoke all on function public.is_admin(),public.clan_public(uuid),public.mod_reports(),public.mod_action(uuid,text) from public,anon;
grant execute on function public.is_admin(),public.clan_public(uuid),public.mod_reports(),public.mod_action(uuid,text) to authenticated;
-- Make an admin (run in Supabase SQL editor, never from the client):
--   insert into public.admins(user_id) select id from public.profiles where nick='umutcandar' on conflict do nothing;
--   (or use the auth user id: insert into public.admins(user_id) values('<uuid>');)
