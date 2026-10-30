// The same intent description drives combat and the visible forecast.
const formations = [
  ['raider','raider','raider'],
  ['raider','raider','caster'],
  ['raider','caster','raider','caster'],
  ['boss','raider','raider','caster'],
  ['raider','caster','caster','raider'],
  ['boss','raider','caster','raider','caster'],
  ['raider','caster','caster','raider','caster'],
  ['boss','caster','raider','caster','raider'],
];
export const ENEMY_ROLES = { raider:'Akıncı', caster:'Gölge Büyücüsü', elite:'Seçkin', boss:'Bölge Efendisi' };
const bossNames = { 4:'Demir Cellat', 6:'Ayaz Komutanı', 8:'Yıldızsız Hükümdar', 10:'Mühür Lordu', 20:'Taçsı Hükümdar', 30:'Kuyu Hükümdarı' };
// Stages 9–30 each have their own mix. The first eight formations stay fixed.
const laterFormations = {
  9: ['elite', 'raider', 'caster', 'raider'],
  10: ['boss', 'raider', 'elite', 'caster', 'raider'],
  11: ['raider', 'raider', 'raider', 'caster'],
  12: ['caster', 'raider', 'caster', 'raider'],
  13: ['raider', 'caster', 'caster', 'caster'],
  14: ['raider', 'raider', 'caster', 'raider'],
  15: ['elite', 'caster', 'caster', 'raider'],
  16: ['caster', 'caster', 'raider', 'raider'],
  17: ['raider', 'caster', 'raider', 'caster'],
  18: ['raider', 'caster', 'raider', 'raider'],
  19: ['caster', 'raider', 'raider', 'caster'],
  20: ['boss', 'caster', 'raider', 'elite', 'caster'],
  21: ['caster', 'caster', 'raider', 'raider'],
  22: ['raider', 'caster', 'caster', 'raider'],
  23: ['caster', 'raider', 'caster', 'caster'],
  24: ['raider', 'raider', 'caster', 'caster'],
  25: ['elite', 'raider', 'raider', 'caster'],
  26: ['caster', 'caster', 'caster', 'raider'],
  27: ['raider', 'caster', 'raider', 'raider'],
  28: ['caster', 'raider', 'raider', 'raider'],
  29: ['raider', 'caster', 'caster', 'raider'],
  30: ['boss', 'caster', 'caster', 'raider', 'elite'],
};
function formationFor(stage) {
  if (stage.id <= 8) return formations[stage.id - 1];
  return laterFormations[stage.id];
}
export function bossStrike(enemy, amount) {
  let left = Math.max(1, Math.round(amount));
  let dealt = 0;
  if (enemy.seal > 0) {
    const soaked = Math.min(enemy.seal, left);
    enemy.seal -= soaked;
    left -= soaked;
    dealt += soaked;
    if (left <= 0) return dealt;
  }
  const damage = Math.min(enemy.hp, left);
  enemy.hp -= damage;
  dealt += damage;
  if (enemy.role === 'boss' && enemy.stageId === 10 && enemy.hp > 0 && enemy.hp <= enemy.maxHp * 0.5 && !enemy.sealRefilled) {
    enemy.sealRefilled = true;
    enemy.seal = enemy.sealMax || Math.round(enemy.maxHp * 0.35);
  }
  return dealt;
}
export function crownPressure(battle, target, enemy) {
  if (!enemy || enemy.stageId !== 20 || !(enemy.maxHp > 0) || enemy.hp > enemy.maxHp * 0.5) return 1;
  if (!battle.marks) battle.marks = {};
  battle.marks[target.id] = (battle.marks[target.id] || 0) + 1;
  return battle.marks[target.id] >= 3 ? 2 : 1;
}
export function combatOutcome(battle) {
  if (!battle?.allies || !battle.enemies) return null;
  const heroes = battle.allies.filter(unit => unit.id !== 'ward');
  if (heroes.length && heroes.every(unit => unit.hp <= 0)) return 'lost';
  const ward = battle.allies.find(unit => unit.id === 'ward');
  if (battle.objective === 'protect' && ward && ward.hp <= 0) return 'lost';
  if (battle.enemies.every(unit => unit.hp <= 0)) return 'won';
  if (battle.objective === 'priority' && battle.enemies.some(unit => unit.objective && unit.hp <= 0)) return 'won';
  const held = battle.objective === 'survive' && heroes.some(unit => unit.hp > 0)
    && ((battle.live && battle.live.elapsedMs >= (battle.surviveMs || 28000))
      || (!battle.live && battle.round >= (battle.surviveRounds || 5)));
  return held ? 'won' : null;
}
function stageBases(stage) {
  const hp = [68, 90, 112, 138, 166, 192, 220, 250];
  const attack = [10, 12, 15, 18, 21, 24, 27, 31];
  if (stage.id <= 8) return { hp: hp[stage.id - 1], attack: attack[stage.id - 1] };
  const step = stage.id - 8;
  return { hp: Math.round(268 * 1.07 ** step), attack: Math.round(33 * 1.055 ** step) };
}
export function encounterEnemies(stage, version=2) {
  const bases = stageBases(stage);
  return Array.from({length:stage.enemyCount},(_,index)=>{
    const role=version===1?'raider':formationFor(stage)[index];
    const hp=Math.round(bases.hp*(role==='boss'?1.65:role==='elite'?1.4:role==='caster'?0.8:1));
    const attack=Math.round(bases.attack*(role==='boss'?1.15:role==='elite'?1.1:role==='caster'?0.85:1));
    const name=role==='boss'?(bossNames[stage.id]||`${stage.name} Efendisi`):
      role==='elite'?`${stage.enemyName}`:
      role==='caster'?`Gölge Büyücüsü ${index+1}`:`${stage.enemyName} ${index+1}`;
    return {id:`enemy-${index+1}`,name,role,chapter:stage.chapter||1,stageId:stage.id,hp,maxHp:hp,attack};
  });
}
function woundedBoss(enemy) {
  return enemy.role === 'boss' && enemy.maxHp > 0 && enemy.hp <= enemy.maxHp * 0.5;
}
export function enemyIntent(battle,enemy) {
  const round=battle.round+1;
  const v2=battle.combatVersion!==1;
  // Chapter bosses change the fight once they drop under half health.
  if(v2 && woundedBoss(enemy) && enemy.stageId===20 && round%2===0)
    return {type:'brand',label:'Taç öfkesi',detail:'Hükümdar yarı canın altında damgalar. Kalkan ağırlığı keser, Yıldız bozar.',danger:true,multiplier:1.2};
  if(v2 && woundedBoss(enemy) && enemy.stageId===30 && round%2===0)
    return {type:'siphon',label:'Kuyu çöküşü',detail:'Hükümdar yarı canın altında kuyuyu emer ve kendini iyileştirir.',danger:true,multiplier:.55,heal:.6};
  if(v2 && woundedBoss(enemy) && enemy.stageId===10 && round%2===0)
    return {type:'crush',label:'Mühür kırığı',detail:'Mühür Lordu yarı canın altında yıkımı daha sık hazırlar.',danger:true,multiplier:.95};
  if(v2 && enemy.role==='boss' && round%3===0)
    return {type:'crush',label:'Yıkım dalgası',detail:'Bu tur bütün takıma ağır darbe. Savun veya Yıldız ile boz.',danger:true,multiplier:.95};
  if(v2 && enemy.role==='elite' && round%3===0)
    return {type:'cleave',label:'Çift kılıç',detail:'Seçkin bu tur her kahramana yarır. Yıldız çağrısı bunu bozar.',danger:true,multiplier:.55};
  if(v2 && enemy.role==='caster' && (battle.affix==='brand' || enemy.chapter===2) && round%3===0)
    return {type:'brand',label:'Damga',detail:'Kırık Taç bu tur tek kahramanı damgalar. Kalkan ağırlığı keser.',danger:true,multiplier:1.35};
  if(v2 && enemy.role==='caster' && (battle.affix==='siphon' || enemy.chapter===3) && round%2===0)
    return {type:'siphon',label:'Kuyu emişi',detail:'Yıldız Kuyusu takıma vurur ve en yaralı düşmanı iyileştirir.',danger:true,multiplier:.4,heal:.45};
  if(v2 && enemy.role==='caster' && round%2===0)
    return {type:'volley',label:'Gölge yağmuru',detail:'Bu tur bütün kahramanlara büyü saldırısı.',danger:true,multiplier:.55};
  if(v2 && woundedBoss(enemy) && (enemy.stageId===20 || enemy.stageId===30))
    return {type:'strike',label:'Öfke',detail:'Yaralı hükümdar daha sert keser.',danger:false,multiplier:1.25};
  return {type:'strike',label:enemy.role==='boss'?'Ağır kesiş':'Ön safa saldırı',detail:'Ayaktaki muhafıza, yoksa en yaralı kahramana saldırır.',danger:false,multiplier:1};
}
