# New-player funnel (Batch 27)

Simulated with `node tools/sim_funnel.mjs ../logic.js 3600`. It's a greedy bot from a fresh `newState`: tutorial ~2 min, 5 s ticks, and it follows each quest's `go` target. It's idealized, so real players are maybe 1.5–2.5× slower.

| Quest | Before | After |
|---|---|---|
| 8 survivors | 1.6m | 1.6m |
| First island freed | 15.1m (was #9) | **2.1m (moved to #6)** |
| Lighthouse Lv2 | 9.8m | **2.9m** |
| Shipyard | 13.8m | 3.0m |
| Summon a captain (quest) | 15.1m | **3.4m** (free daily call usable from 2.0m) |
| Lighthouse Lv3 | 20.5m | 8.1m |
| Observatory / first research | 29.1m / 29.5m | 8.2m / 8.6m |
| Captain Lv5 → 5 islands | 33.1m | 14.8m |
| Max gap between goals | 8.6m (5 gaps over 3m) | 6.3m (2 gaps over 3m) |

## Changes (logic.js, fair, no pay walls)
- Lighthouse Lv1→2 costs 180 wood instead of 240. This was the biggest stall (8 min of saving wood).
- "Reach 8 survivors" now rewards 100 fish + 100 wood + 1 ticket (was 150 fish + 1 ticket).
- "Free the first island" moved from #9 to #6. Players can fight right after the tutorial, so it's the next clear goal, and it now gives +80 wood. i18n d.QUESTS.6–9 were reindexed in all 11 languages.
- "Build a shipyard" rewards 80 wood + 40 fish (was 80 fish). Wood was the bottleneck and fish was piling up.
- Captain level cost is now fish 30·lv, wood 18·lv, crys 12·lv (was 30/30/8). Crystals were piling up and wood stalled "Captain Lv5".
- Raid/arena (online only): a one-time nudge once a captain has been summoned and stage≥3 (~4 min in the sim). The War button pulses and a toast points to the daily raid/arena task. PvP isn't a story-quest gate, so offline players aren't blocked.

## Batch 28: 2-hour run with island quests (Coral Atoll onward)

`node tools/sim_funnel.mjs ../logic.js 7200` (run inside `tools/`). The bot now plays every island it owns: it switches to the island, collects, assigns workers, builds that island's kinds, merges, upgrades and levels up the outpost. It also claims Mercan/Volkan when a quest asks, saves resources for quest-target builds and Lighthouse levels, attacks the Kraken boss, stars up captains, upgrades gear and research, and claims achievements and dailies. Gems are only spent from gems earned in play (no purchases). Gaps are counted as story-quest gaps, and as "reward moments" (any quest, daily, achievement, island win or star-up).

Tuning (client-side only; server-verified stage power `260·1.32^(n-1)` is unchanged):
- `fenerTime(lv) = min(12·(lv+1)², 60+40·lv)`, so late Lighthouse waits are 3.7–5 min instead of 5–10 min.
- Woodcutter `perW` 3 → 3.6. This was the chronic wood shortage, and it fixes "Captain Lv5" (#17), which now has 0 min of waiting.
- `gearCost` wood 120 → 90 per step (same curve).
- `heroLvCost` crystal 12·lv → 8·lv.

| same bot, 120 min | before (b27 logic) | after (b28) |
|---|---|---|
| Captain Lv5 (#17) gap | wood-starved in b27 (6.3 min) | 0 min |
| Lighthouse Sv5 (#29) | 14.3 min | 7.2 min |
| Lighthouse Sv6 (#35) | 12.8 min | 9.2 min |
| Lighthouse Sv7 (#39) | 11.8 min | 6.6 min |
| max gap between reward moments | 13.7 min | 9.8 min |
| all 40 quests done | 120 min | 113 min |

There are no dead ends: every quest completes in 2 h without paying. There is still one long gap: "Free 20 islands" (#38) takes about 20 min. The cause is the stage power curve, which the server checks in `pve*.sql`. It was left alone on purpose; changing it needs a server migration. Mid-game Lighthouse quests are still gated by build timers and resources (gaps of 4–9 min). During those waits, dailies, island wins and the return screen fill in. Next steps could be side quests during Lighthouse waits, or a softer stage curve on the server.

## Return screen (batch 28)
After ≥1 min away the screen shows: idle production at 50% speed (+10% per Offline research level), capped at 8 h (the cap is shown, with "limit reached" when hit), and an optional demo ad (3 s) for ×2. After ≥1 h away it also shows today's goals: dailies done/ready, login reward, free summon, and the next quest with its progress. Fix: the daily-login popup used to replace this screen. Login now opens after you collect.

## Batch 29
- The early gaps (#8 Shipyard, #14 Lighthouse Sv3, #23 Lighthouse Sv4) were all caused by running out of wood right after a Lighthouse upgrade. Quest rewards changed: Lighthouse Sv2 now also gives +100 wood, "Rescue 3 islands" +200 wood, and "Build 4 on the atoll" 350 wood + 150 fish. Result: #8 and #14 are under 3 min, #23 is 5.9 min.
- Island milestone chests at 11/13/14/16/17/18/19 islands. The reward is wood 150n, fish 100n, crystal 40n, gems 10+n. The server checks it with `mile_claim` (verified stage ≥ n, each chest once) and adds it to the save allowance. The sim reaches all 40 quests in about 77 min (was 113). The longest quest gap is now #38 at 13–16 min (was 23.8); the run-to-run spread is wide. The server stage curve is unchanged.
