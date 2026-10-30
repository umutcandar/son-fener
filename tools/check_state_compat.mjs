// Offline save-compatibility checks. Run: node tools/check_state_compat.mjs
// Imports only the pure game rules; no browser storage, server or network is used.
import assert from 'node:assert/strict';
import test from 'node:test';
import * as L from '../logic.js';

const NOW = Date.UTC(2026, 9, 29, 19, 0, 0);
const copy = value => JSON.parse(JSON.stringify(value));
const reload = state => L.migrate(copy(state), NOW);
const islandGrids = state => copy(Object.fromEntries(L.grids(state)));

// A pre-v2 save, deliberately independent of newState's current defaults.
function legacySave() {
  return {
    v: 1, res: { fish: 180.5, wood: 320, crys: 96.25 }, gems: 125,
    g: {
      '1,0': { k: 'mine', lv: 2, w: 2, stored: 12.5 },
      '0,1': { k: 'fisher', lv: 1, w: 1, stored: 7 },
      '-1,0': { k: 'wood', lv: 1, w: 1, stored: 5 },
      '-1,1': { k: 'hut', lv: 2, w: 0, stored: 0 },
    },
    fener: { lv: 3, on: true, end: NOW + 60000, dur: 60 }, surv: 6,
    troops: { tayfa: 12, zipkin: 4, topcu: 2 },
    train: { t: 'tayfa', n: 5, end: NOW + 20000, dur: 20 },
    tech: { net: 1 }, research: null,
    heroes: {
      reis: { star: 2, sh: 7, lv: 8 }, derya: { star: 1, sh: 3 },
      poyraz: { star: 1, sh: 4 }, mercan: { star: 1, sh: 5 },
      lodos: { star: 2, sh: 6 }, kumru: { star: 1, sh: 9 },
    },
    stage: 5, vipPts: 100, monthly: 0, monthlyClaim: '', builders: 1,
    q: 8, tut: 9, st: { collect: 31, wins: 4, recruit: 9 },
    daily: { date: '2026-10-29', p: { collect: 3 }, c: {} },
    freeCall: '2026-10-29', t0: NOW - 3600000, saved: NOW - 300000,
    raftT: 12, rescueT: 35, nightN: 15, buy: {},
  };
}

// A progressed v2 save with Volkan active and both other island grids stored.
function currentSave() {
  const state = legacySave();
  return {
    ...state, v: 2, cur: 'volkan', surv: 6, stage: 13,
    g: {
      '1,0': { k: 'hut', lv: 2, w: 0, stored: 0 },
      '0,1': { k: 'forge', lv: 2, w: 1, stored: 18.75 },
    },
    isl: {
      home: { own: 1, lv: 1, g: state.g },
      mercan: { own: 1, lv: 2, g: {
        '1,0': { k: 'hut', lv: 1, w: 0, stored: 0 },
        '0,1': { k: 'pearl', lv: 2, w: 1, stored: 3.25 },
      } },
      volkan: { own: 1, lv: 2, g: null },
    },
    heroes: {
      kaan: { star: 3, sh: 17, lv: 12, tal: 2, eq: { k: 2, s: 1, c: 3 } },
      ali: { star: 2, sh: 8, lv: 6 }, sisnur: { star: 1, sh: 4, lv: 3 },
    },
    st: { collect: 31, trained: 18, recruit: 79, wins: 12, merge: 7,
      repel: 5, boss: 3, claims: 2 },
    gear: { cannon: 2, plate: 1, sail: 1 },
    pity: 39, pity2: 79, selTok: 2, tickets: 8, ush: 11,
    boss: { w: 147, dmg: 12000, day: '2026-10-29', n: 2, ref: 4000 },
    login: { n: 5, last: '2026-10-29', total: 12 },
    pass: { xp: 450, tq: 270, prem: 1, cl: { f: { 0: 1 }, p: { 0: 1 } } },
    ach: { merge: 1 }, seen: { chapter1: 1 },
    set: { snd: 0, mus: 0, vib: 1, lang: 'en' },
    weekly: { w: '2026-10-26', p: { battle: 12 }, c: {} },
    ev: { d: '2026-10-29', p: 180, c: [0] },
    season: { id: 1, marks: 47, last: '2026-10-29', route: 1, cr: 47 },
    spend: { on: 1, lim: 500, m: '2026-10', sum: 59.99,
      q: [{ id: 'offer', amount: 59.99 }], pend: { lim: 750, on: 1, at: NOW + 86400000 } },
    reef: { n: 2 }, conv: { next: NOW + 14400000, n: 4, w: 3 },
  };
}

test('new saves are serializable, current-version and independent', () => {
  const first = L.newState(NOW), second = L.newState(NOW);
  assert.equal(first.v, L.SAVE_V);
  assert.equal(first.saved, NOW);
  assert.equal(first.cur, 'home');
  assert.deepEqual(L.owned(first), ['home']);
  assert.equal(Object.keys(first.g).length, 4);
  assert.deepEqual(copy(first), first);
  assert.deepEqual(reload(first), first);
  first.res.wood = 0;
  first.heroes.ali.sh = 99;
  first.g['1,0'].lv = 7;
  assert.equal(second.res.wood, 60);
  assert.equal(second.heroes.ali.sh, 0);
  assert.equal(second.g['1,0'].lv, 1);
});

test('v1 migration retains progress and upgrades every legacy captain ID', () => {
  const old = legacySave(), migrated = reload(old);
  assert.equal(migrated.v, L.SAVE_V);
  for (const [before, after] of Object.entries({
    reis: 'kaan', derya: 'mei', poyraz: 'tunc', mercan: 'deniz', lodos: 'ali', kumru: 'ela',
  })) {
    assert.equal(migrated.heroes[before], undefined);
    assert.deepEqual(migrated.heroes[after], { lv: 1, ...old.heroes[before] });
  }
  for (const field of ['res', 'gems', 'g', 'fener', 'troops', 'train', 'tech',
    'stage', 'q', 'tut', 'daily', 'saved']) assert.deepEqual(migrated[field], old[field], field);
  assert.equal(migrated.st.collect, 31);
  assert.equal(migrated.st.wins, 4);
  assert.equal(migrated.pity2, 0);
  assert.equal(migrated.selTok, 0);
  assert.equal(migrated.isl.home.g, null);
  assert.equal(L.homeG(migrated), migrated.g);
  assert.deepEqual(reload(migrated), migrated, 'reloading must not repeat migration rewards or changes');
});

test('legacy saves repair excess workers without losing buildings or survivors', () => {
  const old = legacySave();
  old.surv = 2;
  const migrated = reload(old);
  assert.equal(migrated.surv, 2);
  assert.equal(L.workers(migrated), 2);
  assert.equal(L.idle(migrated), 0);
  for (const key of Object.keys(old.g)) {
    const { w: oldWorkers, ...oldBuilding } = old.g[key];
    const { w: workers, ...building } = migrated.g[key];
    assert.ok(workers >= 0 && workers <= oldWorkers);
    assert.deepEqual(building, oldBuilding);
  }
});

test('current saves retain all progression, claim markers, timers and settings', () => {
  const saved = currentSave();
  const restored = reload(saved);
  assert.deepEqual(restored, saved);
  assert.deepEqual(reload(restored), saved);
  assert.equal(L.armyPower(restored), L.armyPower(saved));
  assert.deepEqual(L.team(restored).map(h => h.id), L.team(saved).map(h => h.id));
  assert.equal(L.rate(restored, '0,1', 'mercan'), L.rate(saved, '0,1', 'mercan'));
  assert.ok(Number.isFinite(L.armyPower(restored)));
});

test('switching and saving each of three islands preserves every grid and resource', () => {
  let state = reload(currentSave());
  const expected = islandGrids(state), resources = copy(state.res);
  const buildingCount = L.allB(state).length;
  for (const id of ['home', 'mercan', 'volkan', 'mercan', 'home']) {
    assert.equal(L.switchIsland(state, id), null);
    assert.equal(state.cur, id);
    assert.equal(state.isl[id].g, null, 'the active grid lives only in S.g');
    assert.deepEqual(state.g, expected[id]);
    state = reload(state);
    assert.deepEqual(islandGrids(state), expected);
    assert.deepEqual(state.res, resources);
    assert.equal(L.allB(state).length, buildingCount);
  }
  state.g['1,0'].stored = 44.25;
  expected.home['1,0'].stored = 44.25;
  L.switchIsland(state, 'volkan');
  state = reload(state);
  L.switchIsland(state, 'home');
  assert.deepEqual(islandGrids(state), expected, 'edits must survive a round trip through another island');
});

test('40/80 draw guarantees survive saves and issue exactly one choice token', () => {
  let state = L.newState(NOW);
  // Always misses the random legendary roll, exposing the guarantee boundaries.
  const rng = () => 0.999;
  for (let draw = 1; draw <= 80; draw++) {
    const result = L.recruit(state, rng);
    assert.equal(result.h.r, draw === 40 || draw === 80 ? 3 : 1, `draw ${draw}`);
    assert.equal(result.h.season, undefined);
    assert.equal(state.selTok, draw === 80 ? 1 : 0, `token at draw ${draw}`);
    if (draw === 39 || draw === 40 || draw === 79) state = reload(state);
  }
  assert.equal(state.pity, 0);
  assert.equal(state.pity2, 0);
  assert.equal(state.st.recruit, 80);
  state = reload(state);
  L.recruit(state, rng);
  assert.equal(state.pity, 1);
  assert.equal(state.pity2, 1);
  assert.equal(state.selTok, 1);
  const beforeInvalidPick = copy(state);
  assert.equal(L.selPick(state, 'sisnur'), 'NO');
  assert.deepEqual(state, beforeInvalidPick, 'season captain cannot consume a normal choice token');
  const picked = L.selPick(state, 'kaan');
  assert.equal(picked.isNew, true);
  assert.equal(state.selTok, 0);
  assert.deepEqual(state.heroes.kaan, { star: 1, sh: 0, lv: 1 });
  state = reload(state);
  const exhausted = copy(state);
  assert.equal(L.selPick(state, 'kaan'), 'TOK');
  assert.deepEqual(state, exhausted, 'the same token cannot be redeemed again after reloading');
});

test('selecting an owned captain preserves upgrades and grants duplicate shards', () => {
  const state = reload(currentSave()), hero = copy(state.heroes.kaan);
  const selected = L.selPick(state, 'kaan');
  assert.equal(selected.isNew, false);
  assert.equal(state.selTok, 1);
  assert.deepEqual(state.heroes.kaan, { ...hero, sh: hero.sh + 10 });
  assert.deepEqual(reload(state), state);
});
