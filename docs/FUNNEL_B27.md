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
