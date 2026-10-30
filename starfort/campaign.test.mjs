import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';
import { encounterEnemies, enemyIntent } from './encounters.js';

const NOW = Date.UTC(2026, 9, 30, 12);
const fresh = () => R.createState(NOW);

test('the campaign is three chapters of ten stages and the first eight stay in place', () => {
  assert.equal(R.STAGES.length, 30);
  for (const chapter of [1, 2, 3]) assert.equal(R.STAGES.filter(stage => stage.chapter === chapter).length, 10);
  assert.equal(R.STAGES[0].name, 'Kül Geçidi');
  assert.equal(R.STAGES[7].name, 'Yıldızsız Taht');
  assert.equal(R.STAGES[9].rank, 'boss');
  assert.equal(R.STAGES[14].rank, 'elite');
  assert.equal(R.STAGES[29].name, 'Yıldız Kuyusu');
  const first = encounterEnemies(R.STAGES[0]).map(enemy => enemy.role);
  assert.deepEqual(first, ['raider', 'raider', 'raider']);
  assert.equal(encounterEnemies(R.STAGES[8])[0].role, 'elite');
  assert.equal(encounterEnemies(R.STAGES[9])[0].role, 'boss');
  const cleave = enemyIntent({ round: 2, combatVersion: 2 }, { role: 'elite' });
  assert.equal(cleave.type, 'cleave');
});

test('later stages stay locked until the road is contiguous', () => {
  const state = fresh();
  assert.equal(R.startBattle(state, 9).ok, false);
  state.cleared = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.equal(R.startBattle(R.restoreState(JSON.stringify(state), NOW), 9).ok, true);
});

test('the weekly tower advances on a win, ignores the campaign, and resets the floor next week', () => {
  const state = fresh();
  state.res = { gold: 1e6, wood: 1e6, stone: 1e6, aether: 1e6 };
  for (const id of state.team) for (let i = 0; i < 6; i++) R.upgradeHero(state, id);
  assert.equal(R.startTower(state, NOW).ok, true);
  assert.equal(state.battle.towerFloor, 1);
  assert.notEqual(state.battle.reward.gold, R.STAGES[0].reward.gold);
  for (let i = 0; i < 80 && state.battle.status === 'active'; i++) R.battleTurn(state, 'strike');
  assert.equal(state.battle.status, 'won');
  assert.deepEqual(state.cleared, []);
  assert.equal(state.tower.floor, 2);
  assert.equal(state.tower.best, 1);
  state.tower.floor = 6;
  state.tower.best = 9;
  state.tower.week = 1;
  const reloaded = R.restoreState(JSON.stringify(state), NOW);
  assert.equal(reloaded.tower.floor, 1);
  assert.equal(reloaded.tower.best, 9);
  assert.equal(reloaded.tower.week, R.towerWeek(NOW));
});
