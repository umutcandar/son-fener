# Deniz Bölgeleri ve Vali (Sea Regions & Governor) — design draft (B24)

Status (B25): live. Schema in supabase/sea_zones.sql. Each server sea (public.regions) has 7 zones. A clan leader picks a home zone (can change once per week). Influence = this week's Serpent damage/100 + 20 per member (hourly cron :17). Leaders and officers vote with weight sqrt(own clan influence), at any time during the week. zone_close runs Mondays 00:05 (UTC+3), is idempotent, and a clan can't govern a 3rd week in a row. The title is cosmetic for now; a buff is a later step.

## Idea
- The sea is split into **regions**, for example 7 per server-sea: Kuzey Akıntısı, Mercan Sığlığı, Sis Körfezi...
- Each region has one **Governor** seat, held by a clan for one season week.
- The Governor clan gets a small, capped buff (for example +5% production for members in that region) and a cosmetic title.
- There is **no pay-to-win**: the buff can't be bought, and gems never affect elections or control.

## How a seat is won (proposal)
1. **Influence:** clans earn region influence from weekly activity (craid damage, pass XP, PvE stage clears) by members registered in that region.
2. **Election:** in the last 24 h of the week, clan leaders and officers cast votes. Each clan's vote weight is sqrt(influence), so big clans count less per point. The top weighted clan becomes Governor.
3. A clan can't hold more than 1 seat, and the same clan can't hold a seat 3 weeks in a row.

## Server rules
- Everything is computed server-side: influence comes from existing logs, and the election is closed by pg_cron (free tier).
- RLS: regions, governors and results are public to read. Votes are readable only by the voter's own clan. All writes go through RPCs only.

## Next steps
regions seed → influence aggregation job → vote RPC → close_election cron → UI sheet (map tab) → buff applied in save_game caps.
