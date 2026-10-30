import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';

const NOW = Date.UTC(2026, 9, 30, 12);
const NEXT = Date.UTC(2026, 9, 31, 12);
const SKIP = Date.UTC(2026, 10, 2, 12);
const fresh = () => R.createState(NOW);
const copy = value => JSON.parse(JSON.stringify(value));

test('old saves gain oaths, stars and a daily board without losing progress', () => {
  const legacy = { version: 1, res: { gold: 10, wood: 20, stone: 30, aether: 4 }, buildings: { keep: 3, farm: 2 }, cleared: [1], heroes: { aldren: { level: 4 } }, team: ['aldren', 'lyra', 'rovan'], lastCollected: NOW };
  const state = R.restoreState(legacy, NOW);
  assert.equal(state.version, 1);
  assert.equal(state.res.gold, 10);
  assert.equal(state.buildings.keep, 3);
  assert.equal(state.buildings.farm, 2);
  assert.deepEqual(state.cleared, [1]);
  assert.equal(state.heroes.aldren.level, 4);
  assert.deepEqual(state.oaths, []);
  assert.deepEqual(state.stars, {});
  assert.equal(state.deeds.collects, 0);
  assert.equal(state.daily.streak, 0);
  assert.deepEqual(R.restoreState(JSON.stringify(state), NOW), state);
});

test('oaths pay once, in order, and survive a reload', () => {
  const state = fresh();
  assert.equal(R.claimOath(state, 'farm').ok, false);
  assert.equal(R.claimOath(state, 'collect').ok, false);
  assert.equal(R.collect(state, NOW + 60000).ok, true);
  const before = state.res.gold;
  assert.equal(R.claimOath(state, 'collect').ok, true);
  assert.equal(state.res.gold, before + R.OATHS[0].reward.gold);
  assert.equal(R.claimOath(state, 'collect').ok, false);
  state.buildings.farm = 2;
  assert.equal(R.currentOath(state).id, 'farm');
  assert.equal(R.oathStatus(state, 'farm'), 'ready');
  assert.equal(R.claimOath(state, 'farm').ok, true);
  assert.deepEqual(R.restoreState(JSON.stringify(state), NOW).oaths, ['collect', 'farm']);
});

test('daily login streaks, resets after a skipped day, and tasks pay once per day', () => {
  const state = fresh();
  const first = R.claimLogin(state, NOW);
  assert.equal(first.ok, true);
  assert.equal(first.streak, 1);
  assert.equal(R.claimLogin(state, NOW + 1000).ok, false);
  const second = R.claimLogin(state, NEXT);
  assert.equal(second.streak, 2);
  assert.equal(second.reward.wood, R.LOGIN_REWARDS[1].wood);
  const skipped = R.claimLogin(state, SKIP);
  assert.equal(skipped.streak, 1);
  R.collect(state, SKIP + 1000);
  assert.equal(state.daily.tasks.collect, 1);
  const paid = R.claimDailyTask(state, 'collect', SKIP + 1000);
  assert.equal(paid.ok, true);
  assert.equal(R.claimDailyTask(state, 'collect', SKIP + 2000).ok, false);
  assert.equal(R.claimDailyTask(state, 'battle', SKIP + 2000).ok, false);
  const later = R.restoreState(JSON.stringify(state), SKIP + 86400000);
  assert.equal(R.syncDaily(later, SKIP + 86400000), true);
  assert.equal(later.daily.tasks.collect, 0);
  assert.deepEqual(later.daily.claimedTasks, []);
  assert.equal(later.daily.streak, 1);
});

test('stage stars do not change the victory purse and a three-star chest pays once', () => {
  const battle = { status: 'won', round: 4, allies: [{ hp: 10 }, { hp: 3 }, { hp: 1 }] };
  assert.equal(R.battleStars(battle), 3);
  assert.equal(R.battleStars({ status: 'won', round: 9, allies: [{ hp: 0 }, { hp: 2 }] }), 1);
  const state = fresh();
  R.startBattle(state, 1);
  const before = copy(state.res);
  for (let i = 0; i < 100 && state.battle.status === 'active'; i++) R.battleTurn(state, state.battle.starCharge >= 100 ? 'star' : 'strike');
  assert.equal(state.battle.status, 'won');
  for (const [id, amount] of Object.entries(R.STAGES[0].reward)) assert.equal(state.res[id], before[id] + amount);
  assert.ok(state.stars[1] >= 1);
  state.stars[1] = 3;
  const chest = R.claimStarChest(state, 1);
  assert.equal(chest.ok, true);
  assert.equal(state.res.gold, before.gold + R.STAGES[0].reward.gold + chest.reward.gold);
  assert.equal(R.claimStarChest(state, 1).ok, false);
});

test('hero stars raise power only after they are paid for', () => {
  const state = fresh();
  const before = R.teamPower(state);
  assert.equal(R.heroStats(state, 'aldren').attack, R.heroStats(fresh(), 'aldren').attack);
  state.res.gold = 5000;
  state.res.aether = 500;
  assert.equal(R.raiseHeroStar(state, 'aldren').ok, true);
  assert.equal(state.heroes.aldren.stars, 1);
  assert.ok(R.teamPower(state) > before);
  assert.equal(R.restoreState(JSON.stringify(state), NOW).heroes.aldren.stars, 1);
  state.heroes.aldren.stars = 5;
  assert.equal(R.raiseHeroStar(state, 'aldren').ok, false);
});
