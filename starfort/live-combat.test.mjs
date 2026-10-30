import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';
import { createBattleRunner } from './battle-runner.js';
const NOW=Date.UTC(2026,9,30,12), copy=value=>JSON.parse(JSON.stringify(value));
function fresh(stage=1,level=1,team=null) {
  let state=R.createState(NOW);state.cleared=Array.from({length:stage-1},(_,i)=>i+1);
  state=R.restoreState(state,NOW);
  for(const hero of Object.values(state.heroes))hero.level=level;
  if(team)R.setTeam(state,team);
  assert.equal(R.startLiveBattle(state,stage).ok,true);
  return state;
}
function advance(state,ms,step=100) {
  const result=[];
  for(let time=0;time<ms&&state.battle.status==='active';time+=step) {
    const next=R.advanceCombat(state,Math.min(step,ms-time));
    assert.equal(next.ok,true);result.push(...next.events);
  }
  return result;
}
function rejectsUnchanged(state,operation) {
  const before=copy(state);assert.equal(operation().ok,false);assert.deepEqual(state,before);
}

test('live combat attacks without user commands and initial team can win the first encounter',()=>{
  const state=fresh(), before=copy(state.res);
  advance(state,600);assert.ok(state.battle.enemies.every(enemy=>enemy.hp===enemy.maxHp));
  advance(state,100);assert.ok(state.battle.enemies[0].hp<state.battle.enemies[0].maxHp);
  advance(state,45000);
  assert.equal(state.battle.status,'won');
  assert.ok(state.battle.live.elapsedMs<45000);
  assert.equal(state.res.gold,before.gold+R.STAGES[0].reward.gold);
  assert.equal(state.inventory.lunar_charm,1);
});

test('simulation is deterministic across tick sizes and live save/reload',()=>{
  const a=fresh(4), b=copy(a);
  R.selectTarget(a,'enemy-4');R.selectTarget(b,'enemy-4');
  advance(a,7600,100);advance(b,7600,400);
  assert.deepEqual(a,b);
  const loaded=R.restoreState(JSON.stringify(a),NOW);
  assert.deepEqual(loaded,a);
  advance(a,45000);advance(loaded,45000);
  assert.deepEqual(loaded,a);
  assert.deepEqual(R.restoreState(a,NOW),a);
});

test('abilities charge through combat, spend once and cannot be spammed',()=>{
  const state=fresh(4);
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'lyra'));
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'mira'));
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'missing'));
  advance(state,4500);
  assert.equal(R.abilityState(state.battle,'lyra').ready,true);
  const before=state.battle.enemies.map(enemy=>enemy.hp);
  assert.equal(R.useHeroAbility(state,'lyra').ok,true);
  assert.equal(state.battle.live.allies.lyra.energy,0);
  assert.ok(R.abilityState(state.battle,'lyra').cooldown>0);
  assert.ok(state.battle.enemies.every((enemy,index)=>enemy.hp<before[index]));
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'lyra'));
  rejectsUnchanged(state,()=>R.battleTurn(state,'strike'));
  rejectsUnchanged(state,()=>R.advanceCombat(state,60000));
  rejectsUnchanged(state,()=>R.advanceCombat(state,-1));
});

test('Aldren shield absorbs incoming damage and expires in simulation time',()=>{
  const shielded=fresh(), normal=fresh();
  shielded.battle.live.allies.aldren.energy=100;
  R.useHeroAbility(shielded,'aldren');
  const amount=shielded.battle.live.allies.aldren.shield;
  advance(shielded,2200);advance(normal,2200);
  assert.ok(shielded.battle.allies[0].hp>normal.battle.allies[0].hp);
  assert.ok(shielded.battle.live.allies.aldren.shield<amount);
  advance(shielded,4000);
  assert.ok(Object.values(shielded.battle.live.allies).every(unit=>unit.shield===0));
});

test('healing skill uses relic bonus and protects the most wounded living ally',()=>{
  const state=fresh(3,1,['aldren','mira','rovan']);
  // The battle snapshot includes equipment-derived healing.
  state.battle.allies[1].healing=6;
  state.battle.allies[0].hp-=60;state.battle.allies[2].hp-=50;
  const hp=state.battle.allies[2].hp;
  state.battle.live.allies.mira.energy=100;
  assert.equal(R.useHeroAbility(state,'mira').ok,true);
  assert.equal(state.battle.allies[2].hp,hp+31);
  assert.ok(state.battle.live.allies.rovan.shield>0);
  assert.ok(state.battle.allies.every(hero=>hero.hp<=hero.maxHp));
});

test('boss wind-up is visible and can be interrupted before its damage resolves',()=>{
  const state=fresh(4,10);state.battle.allies.forEach(hero=>hero.attack=1);
  advance(state,10600);
  const boss=state.battle.enemies[0];
  assert.equal(state.battle.live.enemies[boss.id].casting.kind,'crush');
  assert.equal(R.liveEnemyIntent(state.battle,boss).danger,true);
  const interrupted=copy(state);
  interrupted.battle.live.allies.lyra.energy=100;
  assert.equal(R.useHeroAbility(interrupted,'lyra').ok,true);
  assert.equal(interrupted.battle.live.enemies[boss.id].casting,null);
  const normalEvents=advance(state,3000), cutEvents=advance(interrupted,3000);
  assert.ok(normalEvents.some(event=>event.actorId===boss.id&&event.kind==='crush'));
  assert.equal(cutEvents.some(event=>event.actorId===boss.id&&event.kind==='crush'),false);
});

test('Rovan marks the selected target and subsequent attacks deal increased damage',()=>{
  const marked=fresh(4);R.selectTarget(marked,'enemy-2');
  marked.battle.live.allies.rovan.energy=100;
  R.useHeroAbility(marked,'rovan');
  assert.ok(marked.battle.live.enemies['enemy-2'].markedUntil>0);
  const unmarked=copy(marked);unmarked.battle.live.enemies['enemy-2'].markedUntil=0;
  advance(marked,700);advance(unmarked,700);
  assert.ok(marked.battle.enemies[1].hp<unmarked.battle.enemies[1].hp);
});

test('every hero has a usable distinct ability and fallen heroes cannot cast',()=>{
  let state=fresh(8,3,['doran','vesper','eira']);
  for(const id of state.team) {
    state.battle.live.allies[id].energy=100;
    assert.equal(R.useHeroAbility(state,id).ok,true);
    assert.equal(state.battle.live.allies[id].energy,0);
  }
  state.battle.allies[0].hp=0;state.battle.live.allies.doran.energy=100;
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'doran'));
  assert.equal(Object.keys(R.HERO_ABILITIES).length,9);
});

test('old active battles enter live combat without changing HP, equipment or earned progress',()=>{
  const old=R.createState(NOW);R.startBattle(old,1);R.battleTurn(old,'guard');
  const before=copy(old);
  assert.equal(R.prepareLiveBattle(old).ok,true);
  for(const key of ['res','heroes','buildings','team','cleared','inventory','loadouts']) assert.deepEqual(old[key],before[key]);
  assert.deepEqual(old.battle.allies,before.battle.allies);
  assert.deepEqual(old.battle.enemies,before.battle.enemies);
  const live=copy(old);R.prepareLiveBattle(old);assert.deepEqual(old,live);
  assert.deepEqual(R.restoreState(old,NOW),old);
});

test('victory is paid once even if a live timer or ability fires after completion',()=>{
  const state=fresh();advance(state,45000);
  const saved=copy(state);
  rejectsUnchanged(state,()=>R.advanceCombat(state,100));
  rejectsUnchanged(state,()=>R.useHeroAbility(state,'rovan'));
  assert.deepEqual(R.restoreState(saved,NOW),saved);
  R.startLiveBattle(state,1);advance(state,45000);
  assert.equal(state.inventory.lunar_charm,1);
});

test('malformed live metadata cannot invent energy, shields or invalid casts',()=>{
  const state=fresh(4);state.battle.live.allies.aldren={energy:900,shield:1e9,shieldUntil:999999,nextAt:-10,cooldownUntil:-5};
  state.battle.live.enemies['enemy-2'].casting={kind:'crush',startedAt:0,endsAt:2300};
  const loaded=R.restoreState(state,NOW);
  assert.equal(loaded.battle.live.allies.aldren.energy,100);
  assert.ok(loaded.battle.live.allies.aldren.shield<=loaded.battle.allies[0].maxHp);
  assert.ok(loaded.battle.live.allies.aldren.shieldUntil<=6000);
  assert.equal(loaded.battle.live.enemies['enemy-2'].casting,null);
});

test('runner pauses on closed/hidden surfaces, resumes without catch-up and supports 2x',()=>{
  const state=fresh();let time=0,visible=true,callback,scheduled=0,cancelled=0;
  const runner=createBattleRunner({now:()=>time,canRun:()=>visible&&state.battle.status==='active',advance:ms=>R.advanceCombat(state,ms),schedule:fn=>{callback=fn;scheduled++;return 1;},cancel:()=>cancelled++});
  runner.resume();runner.resume();assert.equal(scheduled,1);
  time=100;callback();assert.equal(state.battle.live.elapsedMs,100);
  runner.pause();const paused=copy(state);time+=3600000;callback();assert.deepEqual(state,paused);
  runner.resume();time+=100;callback();assert.equal(state.battle.live.elapsedMs,200);
  runner.setSpeed(2);time+=100;callback();assert.equal(state.battle.live.elapsedMs,400);
  visible=false;time+=100;callback();assert.equal(runner.running,false);
  assert.equal(state.battle.live.elapsedMs,400);assert.equal(cancelled,2);
});
