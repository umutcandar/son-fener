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

test('chapter casters and tower floors do not share one trick', () => {
  const crown = encounterEnemies(R.STAGES[11]).find(enemy => enemy.role === 'caster');
  const well = encounterEnemies(R.STAGES[21]).find(enemy => enemy.role === 'caster');
  const ash = encounterEnemies(R.STAGES[1]).find(enemy => enemy.role === 'caster');
  assert.equal(enemyIntent({ round: 2, combatVersion: 2 }, crown).type, 'brand');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, well).type, 'siphon');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, ash).type, 'volley');
  assert.equal(R.towerAffix(1), 'ash');
  assert.equal(R.towerAffix(2), 'brand');
  assert.equal(R.towerAffix(3), 'siphon');
  const state = fresh();
  R.startTower(state, NOW);
  assert.equal(state.battle.affix, 'ash');
});

test('later stages use different formations, goals, and wounded boss phases', () => {
  const roles = id => encounterEnemies(R.STAGES[id - 1]).map(enemy => enemy.role);
  assert.notDeepEqual(roles(11), roles(12));
  assert.notDeepEqual(roles(12), roles(21));
  assert.notDeepEqual(roles(20), roles(30));
  assert.equal(roles(9)[0], 'elite');
  assert.equal(R.STAGES.find(stage => stage.id === 13).objective, 'survive');
  assert.equal(R.STAGES.find(stage => stage.id === 15).objective, 'priority');
  assert.equal(R.STAGES.find(stage => stage.id === 17).objective, 'protect');
  assert.equal(R.STAGES[0].objective, undefined);
  const seal = { role: 'boss', chapter: 1, stageId: 10, hp: 40, maxHp: 100 };
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, seal).type, 'crush');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, { ...seal, hp: 80 }).type, 'strike');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, { role: 'boss', chapter: 2, stageId: 20, hp: 40, maxHp: 100 }).type, 'brand');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, { role: 'boss', chapter: 3, stageId: 30, hp: 40, maxHp: 100 }).type, 'siphon');
  const gate = { role: 'boss', chapter: 1, stageId: 4, hp: 10, maxHp: 100 };
  assert.equal(enemyIntent({ round: 2, combatVersion: 2 }, gate).type, 'crush');
  assert.equal(enemyIntent({ round: 1, combatVersion: 2 }, gate).type, 'strike');
});

test('priority, survive, and protect can end before every enemy is dead', () => {
  const priority = fresh();
  priority.battle = {
    stageId: 15, round: 0, status: 'active', combatVersion: 2, objective: 'priority',
    allies: [{ id: 'aldren', name: 'Aldren', hp: 200, maxHp: 200, attack: 500, armor: 0, healing: 0 }],
    enemies: [
      { id: 'enemy-1', name: 'Hedef', role: 'elite', chapter: 2, stageId: 15, hp: 30, maxHp: 30, attack: 1, objective: true },
      { id: 'enemy-2', name: 'Artık', role: 'raider', chapter: 2, stageId: 15, hp: 500, maxHp: 500, attack: 1 },
    ],
    starCharge: 0, log: [], reward: { gold: 10 }, rewardApplied: false, loot: null, targetId: null,
  };
  const gold = priority.res.gold;
  assert.equal(R.battleTurn(priority, 'strike').ok, true);
  assert.equal(priority.battle.status, 'won');
  assert.ok(priority.battle.enemies.some(enemy => enemy.hp > 0));
  assert.equal(priority.res.gold, gold + 10);

  const survive = fresh();
  survive.battle = {
    stageId: 13, round: 4, status: 'active', combatVersion: 2, objective: 'survive', surviveRounds: 5,
    allies: [{ id: 'aldren', name: 'Aldren', hp: 80, maxHp: 80, attack: 1, armor: 0, healing: 0 }],
    enemies: [{ id: 'enemy-1', name: 'Saflar', role: 'raider', chapter: 2, stageId: 13, hp: 900, maxHp: 900, attack: 1 }],
    starCharge: 0, log: [], reward: { gold: 7 }, rewardApplied: false, loot: null, targetId: null,
  };
  R.battleTurn(survive, 'strike');
  assert.equal(survive.battle.status, 'won');
  assert.ok(survive.battle.enemies[0].hp > 0);
  assert.equal(survive.cleared.includes(13), true);

  const protect = fresh();
  const before = protect.res.gold;
  protect.battle = {
    stageId: 17, round: 0, status: 'active', combatVersion: 2, objective: 'protect',
    allies: [
      { id: 'aldren', name: 'Aldren', hp: 200, maxHp: 200, attack: 1, armor: 0, healing: 0 },
      { id: 'ward', name: 'Emanet', hp: 1, maxHp: 140, attack: 0, armor: 0, healing: 0 },
    ],
    enemies: [{ id: 'enemy-1', name: 'Avcı', role: 'raider', chapter: 2, stageId: 17, hp: 80, maxHp: 80, attack: 100 }],
    starCharge: 0, log: [], reward: { gold: 40 }, rewardApplied: false, loot: null, targetId: null,
  };
  R.battleTurn(protect, 'strike');
  assert.equal(protect.battle.status, 'lost');
  assert.equal(protect.res.gold, before);
  assert.ok(protect.battle.allies.some(unit => unit.id !== 'ward' && unit.hp > 0));
});

test('a live survive fight ends on the clock and a fallen ward ends a protect fight', () => {
  const state = fresh();
  state.cleared = Array.from({ length: 12 }, (_, index) => index + 1);
  assert.equal(R.startLiveBattle(state, 13).ok, true);
  assert.equal(state.battle.objective, 'survive');
  state.battle.allies.forEach(hero => { hero.hp = 9000; hero.maxHp = 9000; });
  const purse = state.res.gold;
  for (let i = 0; i < 40 && state.battle.status === 'active'; i++) R.advanceCombat(state, 1000);
  assert.equal(state.battle.status, 'won');
  assert.ok(state.battle.enemies.some(enemy => enemy.hp > 0));
  assert.ok(state.battle.live.elapsedMs >= 28000);
  assert.equal(state.res.gold, purse + R.STAGES[12].reward.gold);

  const escort = fresh();
  escort.cleared = Array.from({ length: 16 }, (_, index) => index + 1);
  const held = escort.res.gold;
  assert.equal(R.startLiveBattle(escort, 17).ok, true);
  assert.equal(escort.battle.allies.some(unit => unit.id === 'ward'), true);
  escort.battle.allies.find(unit => unit.id === 'ward').hp = 0;
  R.advanceCombat(escort, 1000);
  assert.equal(escort.battle.status, 'lost');
  assert.equal(escort.res.gold, held);
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
