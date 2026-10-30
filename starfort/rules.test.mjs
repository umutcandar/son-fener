// Run with: node --test starfort/rules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';

const NOW = Date.UTC(2026, 9, 30, 12);
const copy = value => JSON.parse(JSON.stringify(value));
const fresh = () => R.createState(NOW);
const restored = state => R.restoreState(JSON.stringify(state), NOW);
function clearBattle(state) {
  for (let i = 0; i < 100 && state.battle.status === 'active'; i++) {
    assert.equal(R.battleTurn(state, state.battle.starCharge >= 100 ? 'star' : 'strike').ok, true);
  }
  return state.battle.status;
}
function progressed(cleared = 4) {
  const state = fresh();
  state.cleared = Array.from({ length: cleared }, (_, i) => i + 1);
  return restored(state);
}
function rejectsUnchanged(state, operation) {
  const before = copy(state), result = operation();
  assert.equal(result.ok, false);
  assert.equal(typeof result.error, 'string');
  assert.deepEqual(state, before);
}

test('new game has separate storage, seven buildings and three independent heroes', () => {
  const a = fresh(), b = fresh();
  assert.equal(R.STORAGE_KEY, 'starfort:v1');
  assert.equal(a.version, 1);
  assert.equal(R.BUILDINGS.length, 7);
  assert.equal(R.STAGES.length, 8);
  assert.deepEqual(a.buildings, Object.fromEntries(R.BUILDINGS.map(building => [building.id, 1])));
  assert.deepEqual(Object.keys(a.heroes), ['aldren', 'lyra', 'rovan']);
  assert.deepEqual(a.team, ['aldren', 'lyra', 'rovan']);
  assert.ok(R.teamPower(a) >= R.STAGES[0].recommendedPower);
  a.heroes.aldren.level++;
  a.res.gold = 0;
  assert.equal(b.heroes.aldren.level, 1);
  assert.equal(b.res.gold, 280);
});

test('save round trip preserves progression, active battle and input ownership', () => {
  const state = progressed();
  state.heroes.mira.level = 3;
  state.buildings.forge = 2;
  assert.equal(R.setTeam(state, ['aldren', 'mira', 'doran']).ok, true);
  assert.equal(R.startBattle(state, 5).ok, true);
  R.battleTurn(state, 'guard');
  assert.deepEqual(restored(state), state);
  const raw = copy(state), loaded = R.restoreState(raw, NOW);
  loaded.res.gold++;
  loaded.heroes.mira.level++;
  loaded.battle.allies[0].hp--;
  assert.deepEqual(raw, state, 'restore must not share mutable objects with its input');
});

test('malformed, incompatible and partially damaged saves get valid defaults', () => {
  for (const raw of [null, undefined, '', '{broken', 'null', [], 1, { version: 0 }, { version: 2 }]) {
    assert.deepEqual(R.restoreState(raw, NOW), fresh());
  }
  const damaged = { version: 1, res: { gold: -1, wood: Infinity, stone: '99', aether: 1e12 },
    buildings: { keep: 0, forge: 999, tavern: 2 }, heroes: { aldren: { level: -4 }, mira: { level: 9 } },
    team: ['mira', 'mira', 'unknown'], cleared: [1, 3, 8], selectedStage: 8,
    lastCollected: NOW + 3600000, battle: { stageId: 1, status: 'active', round: 0 } };
  const state = R.restoreState(damaged, NOW);
  assert.equal(state.res.gold, 280);
  assert.equal(state.res.wood, 180);
  assert.equal(state.res.stone, 150);
  assert.equal(state.res.aether, 1e9);
  assert.equal(state.buildings.keep, 1);
  assert.equal(state.buildings.forge, 1);
  assert.equal(state.buildings.tavern, 2);
  assert.deepEqual(state.cleared, [1]);
  assert.equal(state.heroes.mira, undefined);
  assert.equal(state.heroes.aldren.level, 1);
  assert.deepEqual(state.team, fresh().team);
  assert.equal(state.selectedStage, 1);
  assert.equal(state.lastCollected, NOW);
  assert.equal(state.battle, null);
});

test('production is capped at four hours and collecting cannot duplicate it', () => {
  const state = fresh(), before = copy(state.res);
  assert.deepEqual(R.production(state, NOW + 60000), { gold: 20, wood: 15, stone: 12, aether: 3 });
  const gain = R.production(state, NOW + 24 * 3600000);
  assert.deepEqual(gain, { gold: 4800, wood: 3600, stone: 2880, aether: 720 });
  assert.deepEqual(R.production(state, NOW + 4 * 3600000), gain);
  const result = R.collect(state, NOW + 24 * 3600000);
  assert.deepEqual(result.gain, gain);
  for (const id of Object.keys(R.RESOURCES)) assert.equal(state.res[id], before[id] + gain[id]);
  assert.deepEqual(R.collect(state, NOW + 24 * 3600000).gain, { gold: 0, wood: 0, stone: 0, aether: 0 });
  rejectsUnchanged(state, () => R.collect(state, NOW));
  rejectsUnchanged(state, () => R.collect(state, NaN));
});

test('building costs are paid once, cannot overspend and obey keep level limits', () => {
  const state = fresh(), before = copy(state.res), cost = R.upgradeCost(state, 'farm');
  assert.equal(R.upgradeBuilding(state, 'farm').ok, true);
  assert.equal(state.buildings.farm, 2);
  for (const [id, amount] of Object.entries(cost)) assert.equal(state.res[id], before[id] - amount);
  assert.equal(R.production(state, NOW + 60000).gold, 40);
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'farm'));
  assert.equal(R.upgradeBuilding(state, 'keep').ok, true);
  assert.equal(R.production(state, NOW + 60000).gold, 42);
  state.res = { gold: 0, wood: 0, stone: 0, aether: 0 };
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'forge'));
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'unknown'));
  state.buildings.keep = 8;
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'keep'));
  assert.ok(Object.values(state.res).every(amount => amount >= 0));
});

test('hero upgrades increase team power and invalid/locked/capped upgrades are atomic', () => {
  const state = fresh(), power = R.teamPower(state), cost = R.heroCost(state, 'lyra'), before = copy(state.res);
  assert.equal(R.upgradeHero(state, 'lyra').ok, true);
  assert.equal(state.heroes.lyra.level, 2);
  assert.ok(R.teamPower(state) > power);
  for (const [id, amount] of Object.entries(cost)) assert.equal(state.res[id], before[id] - amount);
  rejectsUnchanged(state, () => R.upgradeHero(state, 'mira'));
  rejectsUnchanged(state, () => R.upgradeHero(state, 'unknown'));
  state.heroes.lyra.level = 20;
  rejectsUnchanged(state, () => R.upgradeHero(state, 'lyra'));
  state.res = { gold: 0, wood: 0, stone: 0, aether: 0 };
  rejectsUnchanged(state, () => R.upgradeHero(state, 'aldren'));
});

test('upgrading a producer settles elapsed output at its old rate', () => {
  const state = fresh();
  const cost = R.upgradeCost(state, 'farm');
  assert.equal(R.upgradeBuilding(state, 'farm', NOW + 60000).ok, true);
  assert.equal(state.res.gold, 280 + 20 - cost.gold);
  assert.equal(state.lastCollected, NOW + 60000);
  assert.equal(R.production(state, NOW + 120000).gold, 40);
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'keep', NOW));
});

test('team requires exactly three unique unlocked heroes', () => {
  const state = fresh();
  for (const ids of [null, [], ['aldren'], ['aldren', 'lyra', 'lyra'], ['aldren', 'lyra', 'mira'], ['aldren', 'lyra', 'unknown']]) {
    rejectsUnchanged(state, () => R.setTeam(state, ids));
  }
  const advanced = progressed(2), ids = ['aldren', 'mira', 'rovan'];
  assert.equal(R.setTeam(advanced, ids).ok, true);
  ids[0] = 'lyra';
  assert.equal(advanced.team[0], 'aldren');
});

test('stage gates are sequential, early battles are playable and heroes unlock on victories', () => {
  const state = fresh();
  for (const id of [0, 2, 9, '1', NaN]) rejectsUnchanged(state, () => R.startBattle(state, id));
  for (const id of [1, 2]) {
    assert.equal(R.startBattle(state, id).ok, true);
    assert.equal(clearBattle(state), 'won');
    assert.ok(state.battle.round <= 6);
  }
  assert.deepEqual(state.cleared, [1, 2]);
  assert.deepEqual(state.heroes.mira, { level: 1 });
  assert.equal(state.heroes.doran, undefined);
  assert.equal(R.startBattle(state, 3).ok, true);
  rejectsUnchanged(state, () => R.startBattle(state, 1));
  rejectsUnchanged(state, () => R.upgradeHero(state, 'lyra'));
  rejectsUnchanged(state, () => R.upgradeBuilding(state, 'forge'));
  rejectsUnchanged(state, () => R.setTeam(state, ['aldren', 'mira', 'rovan']));
});

test('victory rewards are applied exactly once, including after a completed save reload', () => {
  let state = fresh();
  R.startBattle(state, 1);
  const before = copy(state.res);
  assert.equal(clearBattle(state), 'won');
  for (const [id, amount] of Object.entries(R.STAGES[0].reward)) assert.equal(state.res[id], before[id] + amount);
  assert.equal(state.battle.rewardApplied, true);
  const saved = copy(state);
  rejectsUnchanged(state, () => R.battleTurn(state, 'strike'));
  state = restored(state);
  assert.deepEqual(state, saved);
  rejectsUnchanged(state, () => R.battleTurn(state, 'star'));
  assert.deepEqual(state.res, saved.res);
});

test('invalid actions and unavailable star casts leave the entire battle untouched', () => {
  const state = fresh();
  rejectsUnchanged(state, () => R.battleTurn(state, 'strike'));
  R.startBattle(state, 1);
  assert.equal(state.battle.starCharge, 40);
  rejectsUnchanged(state, () => R.battleTurn(state, 'unknown'));
  rejectsUnchanged(state, () => R.battleTurn(state, 'star'));
});

test('guard reduces retaliation and charges star; star hits every foe and heals', () => {
  const strike = fresh(), guard = fresh();
  R.startBattle(strike, 2 - 1);
  R.startBattle(guard, 1);
  R.battleTurn(strike, 'strike');
  R.battleTurn(guard, 'guard');
  const lost = state => state.battle.allies.reduce((sum, hero) => sum + hero.maxHp - hero.hp, 0);
  assert.ok(lost(guard) < lost(strike));
  assert.equal(strike.battle.starCharge, 65);
  assert.equal(guard.battle.starCharge, 80);
  R.battleTurn(guard, 'guard');
  assert.equal(guard.battle.starCharge, 100);
  const enemies = guard.battle.enemies.map(enemy => enemy.hp), hp = guard.battle.allies[0].hp;
  assert.equal(R.battleTurn(guard, 'star').ok, true);
  assert.equal(guard.battle.starCharge, 0);
  assert.ok(guard.battle.enemies.every((enemy, i) => enemy.hp < enemies[i]));
  assert.ok(guard.battle.allies[0].hp >= hp, 'a winning star cast still heals before finishing');
});

test('party skills change combat: tank intercepts, mage spreads damage, healer restores HP', () => {
  const base = fresh();
  R.startBattle(base, 1);
  R.battleTurn(base, 'strike');
  assert.ok(base.battle.allies[0].hp < base.battle.allies[0].maxHp);
  assert.equal(base.battle.allies[1].hp, base.battle.allies[1].maxHp);
  assert.equal(base.battle.allies[2].hp, base.battle.allies[2].maxHp);
  assert.ok(base.battle.enemies.every(enemy => enemy.hp < enemy.maxHp));
  const healer = progressed();
  R.setTeam(healer, ['aldren', 'mira', 'doran']);
  R.startBattle(healer, 5);
  healer.battle.allies[2].hp -= 70;
  const hp = healer.battle.allies[2].hp;
  const result = R.battleTurn(healer, 'strike');
  assert.ok(healer.battle.allies[2].hp > hp);
  assert.ok(result.events.some(line => line.includes('ikiz darbe')));
});

test('a saved mid-battle game has exactly the same deterministic outcome', () => {
  const state = fresh();
  R.startBattle(state, 1);
  R.battleTurn(state, 'guard');
  const loaded = restored(state);
  clearBattle(state);
  clearBattle(loaded);
  assert.deepEqual(loaded, state);
});

test('defeat grants no reward and retry restores the party', () => {
  const state = progressed(7);
  R.startBattle(state, 8);
  const before = copy(state.res);
  assert.equal(clearBattle(state), 'lost');
  assert.deepEqual(state.res, before);
  assert.equal(state.cleared.includes(8), false);
  assert.deepEqual(restored(state), state);
  rejectsUnchanged(state, () => R.battleTurn(state, 'strike'));
  assert.equal(R.startBattle(state, 8).ok, true);
  assert.ok(state.battle.allies.every(hero => hero.hp === hero.maxHp));
});

test('all eight stages can be cleared with local upgrades and Doran unlocks at stage four', () => {
  const state = fresh();
  state.res = { gold: 1e7, wood: 1e7, stone: 1e7, aether: 1e7 };
  for (const id of state.team) for (let i = 0; i < 8; i++) assert.equal(R.upgradeHero(state, id).ok, true);
  for (const stage of R.STAGES) {
    assert.equal(R.startBattle(state, stage.id).ok, true);
    assert.equal(clearBattle(state), 'won', stage.name);
    assert.equal(Boolean(state.heroes.mira), stage.id >= 2);
    assert.equal(Boolean(state.heroes.doran), stage.id >= 4);
    assert.ok(Object.values(state.res).every(amount => amount >= 0));
  }
  assert.deepEqual(state.cleared, R.STAGES.map(stage => stage.id));
  assert.deepEqual(restored(state), state);
});

test('Vesper and Eira unlock on their chapters and preserve older saves', () => {
  const older = progressed(2);
  assert.equal(older.heroes.vesper, undefined);
  assert.equal(older.heroes.eira, undefined);
  older.res = { gold: 5000, wood: 5000, stone: 5000, aether: 5000 };
  for (let i = 0; i < 4; i++) for (const id of older.team) R.upgradeHero(older, id);
  R.startBattle(older, 3); assert.equal(clearBattle(older), 'won');
  assert.deepEqual(older.heroes.vesper, { level: 1 });
  const oldSave = fresh(); oldSave.cleared = [1,2,3,4,5,6];
  const loaded = restored(oldSave);
  assert.deepEqual(loaded.team, oldSave.team);
  assert.deepEqual(loaded.res, oldSave.res);
  assert.deepEqual(loaded.heroes.vesper, { level: 1 });
  assert.deepEqual(loaded.heroes.eira, { level: 1 });
  assert.equal(R.setTeam(loaded, ['aldren','vesper','eira']).ok, true);
  R.startBattle(loaded, 7);
  loaded.battle.allies[1].hp -= 40;
  const beforeHeal = loaded.battle.allies[1].hp;
  const beforeEnemies = loaded.battle.enemies.map(unit => unit.hp);
  const turn = R.battleTurn(loaded, 'strike');
  assert.ok(turn.events.some(event => event.includes('Vesper')));
  assert.ok(turn.events.some(event => event.includes('Eira')));
  assert.ok(loaded.battle.allies[1].hp > beforeHeal);
  assert.ok(loaded.battle.enemies.every((unit, i) => unit.hp < beforeEnemies[i]));
  assert.deepEqual(restored(loaded), loaded);
});
