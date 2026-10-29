# Moderation / admin role

Admin rights live only in the server table `public.admins` (RLS on, no policies — not readable or writable from the client).
All moderation RPCs (`mod_reports`, `mod_action`) check `public.is_admin()` server-side and raise `not_admin` otherwise.
The client only shows the 🛡️ Moderation button (own profile) when `is_admin()` returns true; no secrets are shipped.

## Make an account admin (Supabase dashboard → SQL editor)
```sql
-- by nickname (check it is unique first)
insert into public.admins(user_id) select id from public.profiles where nick='umutcandar' on conflict do nothing;
-- or by auth user id (Authentication → Users)
insert into public.admins(user_id) values('<user-uuid>') on conflict do nothing;
```
Remove: `delete from public.admins where user_id='<user-uuid>';`

## What admins can do
- See unresolved player reports (last 14 days, grouped per player) and reported chat messages.
- Actions: mute 1h, mute 24h, unmute, dismiss. Every action marks the related reports resolved (`resolved_at`), nothing is deleted.

## Audit log (Batch 13)
Every `mod_action` call appends a row to `public.mod_audit` (admin, target, act, detail, at). The table is append-only: UPDATE/DELETE/TRUNCATE are revoked and a trigger rejects updates/deletes even for the owner. Admins see the latest entries in the moderation panel (`mod_log()`).
