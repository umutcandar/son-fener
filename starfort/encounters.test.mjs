import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from './rules.js';
import { battleMarkup } from './battle-view.js';
const NOW=Date.UTC(2026,9,30,12), copy=value=>JSON.parse(JSON.stringify(value));
function atStage(id) {
  let state=R.createState(NOW);
  state.cleared=Array.from({length:id-1},(_,i)=>i+1);
  state=R.restoreState(state,NOW); R.startBattle(state,id);
  return state;
}

test('manual targeting changes the attacked enemy and rejects invalid targets atomically',()=>{
  const state=atStage(1), resources=copy(state.res);
  assert.equal(R.selectTarget(state,'enemy-3').ok,true);
  const selected=copy(state);
  assert.equal(R.selectTarget(state,'missing').ok,false);
  assert.deepEqual(state,selected);
  const turn=R.battleTurn(state,'strike'), first=turn.frames[0];
  assert.equal(first.actorId,'aldren');
  assert.deepEqual(first.changes.map(change=>change.id),['enemy-3']);
  assert.deepEqual(state.res,resources);
  assert.equal(R.restoreState(state,NOW).battle.targetId,state.battle.targetId);
  state.battle.enemies[0].hp=0;
  assert.equal(R.selectTarget(state,'enemy-1').ok,false);
});

test('encounters introduce casters and bosses with visible next-turn intentions',()=>{
  const first=atStage(1), chapel=atStage(2), gate=atStage(4);
  assert.ok(first.battle.enemies.every(enemy=>enemy.role==='raider'));
  assert.ok(chapel.battle.enemies.some(enemy=>enemy.role==='caster'));
  assert.equal(gate.battle.enemies[0].role,'boss');
  assert.ok(gate.battle.enemies[0].maxHp>gate.battle.enemies[1].maxHp);
  chapel.battle.round=1; gate.battle.round=2;
  assert.equal(R.enemyIntent(chapel.battle,chapel.battle.enemies[2]).type,'volley');
  assert.equal(R.enemyIntent(gate.battle,gate.battle.enemies[0]).type,'crush');
});

test('caster volley hits each living hero and guard reduces its damage',()=>{
  const strike=atStage(2); strike.battle.round=1;
  strike.battle.allies.forEach(hero=>hero.attack=1);
  const guard=copy(strike);
  const a=R.battleTurn(strike,'strike').frames.find(frame=>frame.kind==='volley');
  const b=R.battleTurn(guard,'guard').frames.find(frame=>frame.kind==='volley');
  assert.equal(a.changes.length,3);
  assert.equal(b.changes.length,3);
  assert.ok(a.changes.every(change=>change.delta<0));
  assert.ok(b.changes.reduce((sum,x)=>sum-x.delta,0)<a.changes.reduce((sum,x)=>sum-x.delta,0));
});

test('telegraphed boss attack can be guarded or interrupted with star at the right turn',()=>{
  const strike=atStage(4); strike.battle.round=2; strike.battle.starCharge=100;
  strike.battle.allies.forEach(hero=>hero.attack=1);
  const guard=copy(strike), star=copy(strike);
  const attack=R.battleTurn(strike,'strike').frames.find(frame=>frame.kind==='crush');
  const defense=R.battleTurn(guard,'guard').frames.find(frame=>frame.kind==='crush');
  assert.equal(attack.changes.length,3);
  assert.ok(defense.changes.reduce((n,x)=>n-x.delta,0)<attack.changes.reduce((n,x)=>n-x.delta,0));
  const casting=R.battleTurn(star,'star');
  assert.ok(casting.frames.some(frame=>frame.actorId==='enemy-1'&&frame.kind==='interrupt'&&frame.changes.length===0));
  assert.equal(casting.frames.some(frame=>frame.kind==='crush'),false);
  assert.equal(star.battle.starCharge,0);
});

test('presentation frames are ordered snapshots with no extra rewards or shared mutable state',()=>{
  const state=atStage(1), turn=R.battleTurn(state,'strike');
  assert.deepEqual(turn.frames.slice(0,3).map(frame=>frame.actorId),state.team);
  assert.ok(turn.frames.every(frame=>frame.battle.round===1));
  const saved=copy(state);
  turn.frames[0].battle.allies[0].hp=0;
  turn.frames[0].battle.enemies[0].hp=0;
  assert.deepEqual(state,saved);
  const loaded=R.restoreState(state,NOW);
  for(let n=0;n<50&&state.battle.status==='active';n++) {
    const action=state.battle.starCharge>=100?'star':'strike';
    R.battleTurn(state,action); R.battleTurn(loaded,action);
  }
  assert.deepEqual(loaded,state);
  const final=copy(state);
  assert.equal(R.battleTurn(state,'strike').ok,false);
  assert.deepEqual(state,final);
});

test('pre-redesign battle saves keep original enemies, HP and straightforward enemy turns',()=>{
  const old=atStage(4);
  delete old.battle.combatVersion; delete old.battle.targetId;
  old.battle.enemies.forEach((enemy,index)=>{
    delete enemy.role;
    enemy.name=`Demir Lejyoner ${index+1}`; enemy.maxHp=138; enemy.hp=138-index*12; enemy.attack=18;
  });
  old.battle.round=2;
  const loaded=R.restoreState(old,NOW);
  assert.equal(loaded.battle.combatVersion,1);
  assert.deepEqual(loaded.battle.enemies.map(enemy=>enemy.hp),old.battle.enemies.map(enemy=>enemy.hp));
  assert.ok(loaded.battle.enemies.every(enemy=>enemy.maxHp===138&&R.enemyIntent(loaded.battle,enemy).type==='strike'));
  assert.deepEqual(loaded.res,old.res);
  assert.deepEqual(loaded.cleared,old.cleared);
  assert.deepEqual(R.restoreState(loaded,NOW),loaded);
});

test('battle presentation uses targetable full-body sprites, forecast and honest trial rewards',()=>{
  const state=atStage(4); R.prepareLiveBattle(state);
  state.battle.live.enemies['enemy-1'].casting={kind:'crush',startedAt:0,endsAt:2400};
  const html=battleMarkup({battle:state.battle});
  assert.ok(html.includes('battle-heroes-1.webp'));
  assert.ok(html.includes('battle-enemies.webp'));
  assert.equal((html.match(/data-target=/g)||[]).length,4);
  assert.ok(html.includes('YIKIM HAZIRLANIYOR'));
  assert.ok(html.includes('data-battle-speed'));
  assert.equal(html.includes('data-turn='),false);
  state.battle.status='won'; state.battle.loot='star_lens';
  const trial=battleMarkup({battle:state.battle,trial:true});
  assert.ok(trial.includes('İlerlemen ve kaynakların değişmez'));
  assert.equal(trial.includes('reward-chips'),false);
  assert.equal(trial.includes('data-retry-stage'),false);
});
