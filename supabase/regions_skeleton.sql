-- B24 skeleton: Sea Regions & Governor. NOT APPLIED. No gameplay yet.
create table if not exists sea_region(id smallint primary key, code text unique not null, name_key text not null);
create table if not exists region_member(user_id uuid primary key references auth.users on delete cascade, region_id smallint not null references sea_region, since timestamptz default now());
create table if not exists region_influence(region_id smallint references sea_region, clan_id uuid, wk text, pts bigint default 0, primary key(region_id,clan_id,wk));
create table if not exists governor_election(id bigserial primary key, region_id smallint references sea_region, wk text not null, opens_at timestamptz, closes_at timestamptz, winner_clan uuid, closed boolean default false, unique(region_id,wk));
create table if not exists governor_vote(election_id bigint references governor_election on delete cascade, voter uuid references auth.users on delete cascade, clan_id uuid not null, weight numeric, at timestamptz default now(), primary key(election_id,voter));
alter table sea_region enable row level security; alter table region_member enable row level security;
alter table region_influence enable row level security; alter table governor_election enable row level security; alter table governor_vote enable row level security;
create policy sr_read on sea_region for select using (true);
create policy ri_read on region_influence for select using (true);
create policy ge_read on governor_election for select using (true);
create policy rm_own on region_member for select using (user_id=auth.uid());
create policy gv_own on governor_vote for select using (voter=auth.uid());
-- writes: RPCs only (region_join, governor_vote_cast, close_elections cron) — TODO
