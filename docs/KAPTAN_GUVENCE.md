# Captain safety (Batch 26)

Goal: a player never loses a captain.

## Summoning is online-only
`recruitN` and `selOpen` show `ui.need_online` when offline. There are no more local rolls. Every summon/pick runs on the server (`summon`, `summon_pick`), which writes `hero_own`.

## Legacy offline heroes (`sf_hero_guard`, supabase/b26_guard_gov.sql)
When a save contains a hero that isn't in `hero_own`:
1. `ali` is always kept.
2. `sisnur` (season captain) is kept when `monet.marks >= 45`. Otherwise it is parked in `hero_pending` and restored automatically on the first save after marks reach 45. A trigger on `monet` also writes `hero_own` as soon as marks reach 45.
3. Any other valid pool hero is auto-granted (`src='offline'`), up to **3 per account, at most 1 legendary**. That's about what a player could plausibly pull offline from free daily calls and tickets.
4. Anything beyond that is parked in `hero_pending` (data kept, never deleted) for manual review. It is not shown destructively.

## Grant-path audit
| Path | Grants a captain? | Server record |
|---|---|---|
| Summon (free/ticket/gems) | yes | `summon` → hero_own 'summon' |
| Selection token (80-pull) | yes | `summon_pick` → hero_own 'summon' |
| Season captain (Rota Bileti marks ≥45) | sisnur | monet trigger + guard → 'season' |
| Shop / monet items | no (gems/tickets/res only) | – |
| Mail, login calendar, Fener Pass, events, rewards | no (`addRes`: gems/tickets/res) | – |
| Baseline (pre-B25 saves) | – | 'baseline' |

## Governor perks
* 👑 badge next to chat nicks and on the profile clan line (`gov_list`).
* Election result mail: winners get `mail.gov_win` (+30 gems attachment), other home-zone clans get `mail.gov_lost`.
* +5% production headroom in `save_game` (`sf_is_gov`) and the client clanB.prod. Applied once, even for multiple zones.
