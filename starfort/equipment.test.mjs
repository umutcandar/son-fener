import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';

const NOW = Date.UTC(2026, 9, 30, 12);
const copy = value => JSON.parse(JSON.stringify(value));
const fresh = () => R.createState(NOW);
const restore = value => R.restoreState(JSON.stringify(value), NOW);
function rejectsUnchanged(state, operation) {
  const before = copy(state);
  assert.equal(operation().ok, false);
  assert.deepEqual(state, before);
}
function finish(state) {
  for(let n=0; n<200 && state.battle.status==='active'; n++) {
    if(state.battle.live) R.advanceCombat(state,500);
    else R.battleTurn(state,state.battle.starCharge>=100?'star':'strike');
  }
  return state.battle.status;
}

test('legacy saves keep progress and receive previously earned equipment once', () => {
  const old = fresh();
  old.cleared = [1,2,3,4]; old.heroes.aldren.level = 4;
  old.buildings.keep = 3; old.res.gold = 517;
  delete old.inventory; delete old.loadouts;
  const loaded = restore(old);
  for(const key of ['res','buildings','team','cleared','lastCollected']) assert.deepEqual(loaded[key],old[key]);
  assert.equal(loaded.heroes.aldren.level,4);
  assert.deepEqual(loaded.inventory,{iron_sword:1,ward_mail:1,lunar_charm:1,ember_blade:1,warden_plate:1,star_lens:1});
  assert.deepEqual(restore(loaded),loaded);
  const input=copy(old); R.restoreState(input,NOW); assert.deepEqual(input,old);
});

test('forging spends listed resources once, checks level, balance and inventory cap', () => {
  const state=fresh(), before=copy(state.res), cost=R.itemById('iron_sword').cost;
  assert.equal(R.forgeItem(state,'iron_sword').ok,true);
  assert.equal(state.inventory.iron_sword,2);
  for(const key of Object.keys(before)) assert.equal(state.res[key],before[key]-(cost[key]||0));
  rejectsUnchanged(state,()=>R.forgeItem(state,'royal_blade'));
  rejectsUnchanged(state,()=>R.forgeItem(state,'missing'));
  state.inventory.iron_sword=20;
  rejectsUnchanged(state,()=>R.forgeItem(state,'iron_sword'));
  state.res.gold=0;
  rejectsUnchanged(state,()=>R.forgeItem(state,'ward_mail'));
});

test('equipment copies cannot be shared and replacing or removing gear returns availability', () => {
  const state=fresh();
  assert.equal(R.equipItem(state,'aldren','iron_sword').ok,true);
  rejectsUnchanged(state,()=>R.equipItem(state,'rovan','iron_sword'));
  rejectsUnchanged(state,()=>R.equipItem(state,'mira','iron_sword'));
  rejectsUnchanged(state,()=>R.equipItem(state,'aldren','missing'));
  state.inventory.ember_blade=1;
  assert.equal(R.equipItem(state,'aldren','ember_blade').ok,true);
  assert.equal(R.equipItem(state,'rovan','iron_sword').ok,true);
  const inventory=copy(state.inventory);
  assert.equal(R.unequipItem(state,'aldren','weapon').ok,true);
  assert.equal(R.equipItem(state,'lyra','ember_blade').ok,true);
  assert.deepEqual(state.inventory,inventory);
  assert.equal(R.forgeItem(state,'iron_sword').ok,true);
  assert.equal(R.equipItem(state,'aldren','iron_sword').ok,true);
  assert.deepEqual(restore(state),state);
});

test('restoration rejects unknown items, wrong slots, unowned heroes and excess equipped copies', () => {
  const damaged=fresh();
  damaged.inventory={iron_sword:1,ward_mail:999,lunar_charm:-2,ember_blade:1.3,moonheart:'2',unknown:100};
  damaged.loadouts={aldren:{weapon:'iron_sword',armor:'iron_sword'},lyra:{weapon:'iron_sword',armor:'ward_mail',relic:'lunar_charm'},rovan:{relic:'unknown'},mira:{armor:'ward_mail'}};
  const loaded=restore(damaged);
  assert.deepEqual(loaded.inventory,{iron_sword:1,ward_mail:20});
  assert.deepEqual(loaded.loadouts,{aldren:{weapon:'iron_sword'},lyra:{armor:'ward_mail'}});
  assert.deepEqual(restore(loaded),loaded);
});

test('equipping gear changes combat stats and damage; unequipping restores original power', () => {
  const plain=fresh(), geared=fresh(), original=R.heroStats(plain,'aldren'), power=R.teamPower(plain);
  R.equipItem(geared,'aldren','iron_sword'); R.equipItem(geared,'aldren','ward_mail');
  const stats=R.heroStats(geared,'aldren');
  assert.equal(stats.attack,original.attack+4);
  assert.equal(stats.maxHp,original.maxHp+30);
  assert.equal(stats.armor,3);
  assert.ok(R.teamPower(geared)>power);
  // Keep attack identical to measure armor independently of enemies killed by the sword.
  R.unequipItem(geared,'aldren','weapon');
  R.startBattle(plain,1); R.startBattle(geared,1);
  R.battleTurn(plain,'strike'); R.battleTurn(geared,'strike');
  const lost=state=>state.battle.allies[0].maxHp-state.battle.allies[0].hp;
  assert.ok(lost(geared)<lost(plain));
  assert.deepEqual(restore(geared),geared);
  finish(geared);
  R.unequipItem(geared,'aldren','weapon'); R.unequipItem(geared,'aldren','armor');
  assert.deepEqual(R.heroStats(geared,'aldren'),original);
  assert.equal(R.teamPower(geared),power);
});

test('healing relic adds actual healing for a healer', () => {
  let plain=fresh(); plain.cleared=[1,2]; plain=restore(plain);
  R.setTeam(plain,['aldren','mira','lyra']);
  const geared=copy(plain); geared.inventory.lunar_charm=1;
  R.equipItem(geared,'mira','lunar_charm');
  for(const state of [plain,geared]) {
    R.startBattle(state,3); state.battle.allies[2].hp-=60; R.battleTurn(state,'strike');
  }
  assert.equal(geared.battle.allies[2].hp-plain.battle.allies[2].hp,6);
});

test('active battles freeze forging and loadouts and resume deterministically with gear', () => {
  const state=fresh(); R.equipItem(state,'rovan','iron_sword'); R.startBattle(state,1);
  R.battleTurn(state,'guard');
  rejectsUnchanged(state,()=>R.equipItem(state,'aldren','ward_mail'));
  rejectsUnchanged(state,()=>R.unequipItem(state,'rovan','weapon'));
  rejectsUnchanged(state,()=>R.forgeItem(state,'iron_sword'));
  const loaded=restore(state);
  finish(state); finish(loaded);
  assert.deepEqual(loaded,state);
});

test('first-clear item is awarded once and neither replay nor reload duplicates it', () => {
  let state=fresh(); R.startBattle(state,1);
  assert.equal(finish(state),'won');
  assert.equal(state.battle.loot,'lunar_charm');
  assert.equal(state.inventory.lunar_charm,1);
  state=restore(state);
  assert.equal(state.battle.loot,'lunar_charm');
  rejectsUnchanged(state,()=>R.battleTurn(state,'strike'));
  R.startBattle(state,1); assert.equal(finish(state),'won');
  assert.equal(state.inventory.lunar_charm,1);
  assert.equal(state.battle.loot,null);
  assert.equal(restore(state).inventory.lunar_charm,1);
});

test('special hero training never changes the real save or grants ownership on reload', () => {
  const state=fresh(); R.equipItem(state,'rovan','iron_sword');
  state.heroes.aldren.level=4; state.heroes.lyra.level=4; state.heroes.rovan.level=4;
  const before=copy(state);
  for(const hero of R.SPECIAL_HEROES) {
    const trial=R.createHeroTrial(state,hero.id);
    assert.equal(trial.team[0],hero.id);
    assert.equal(trial.heroes[hero.id].level,4);
    assert.equal(finish(trial),'won');
    assert.deepEqual(state,before);
    const loaded=restore(trial);
    assert.equal(loaded.heroes[hero.id],undefined);
    assert.equal(loaded.team.includes(hero.id),false);
    assert.equal(loaded.trialHero,undefined);
  }
  assert.equal(R.createHeroTrial(state,'unknown'),null);
  rejectsUnchanged(state,()=>R.setTeam(state,['aurelion','lyra','rovan']));
});

test('new special hero skills give distinct observable combat behavior', () => {
  const aurelion=R.createHeroTrial(fresh(),'aurelion');
  aurelion.battle.live.allies.aurelion.energy=100;
  R.useHeroAbility(aurelion,'aurelion');
  assert.ok(aurelion.battle.enemies.every(enemy=>enemy.hp<enemy.maxHp));
  assert.ok(aurelion.battle.enemies[0].hp<aurelion.battle.enemies[1].hp);
  assert.ok(Object.values(aurelion.battle.live.allies).every(hero=>hero.shield>0));
  const nyxara=R.createHeroTrial(fresh(),'nyxara');
  nyxara.battle.allies[0].hp-=40;
  nyxara.battle.enemies.forEach(enemy=>enemy.attack=1);
  const hp=nyxara.battle.allies[0].hp;
  nyxara.battle.live.allies.nyxara.energy=100;
  R.useHeroAbility(nyxara,'nyxara');
  assert.ok(nyxara.battle.allies[0].hp>hp);
  assert.ok(nyxara.battle.enemies.every(enemy=>enemy.hp<enemy.maxHp));
});
