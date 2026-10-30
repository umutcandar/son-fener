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
function formationFor(stage) {
  if (stage.id <= 8) return formations[stage.id - 1];
  const roles = Array.from({ length: stage.enemyCount }, (_, index) => index % 2 ? 'caster' : 'raider');
  if (stage.rank === 'elite') roles[0] = 'elite';
  if (stage.rank === 'boss') roles[0] = 'boss';
  return roles;
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
    return {id:`enemy-${index+1}`,name,role,chapter:stage.chapter||1,hp,maxHp:hp,attack};
  });
}
export function enemyIntent(battle,enemy) {
  const round=battle.round+1;
  if(battle.combatVersion!==1 && enemy.role==='boss' && round%3===0)
    return {type:'crush',label:'Yıkım dalgası',detail:'Bu tur bütün takıma ağır darbe. Savun veya Yıldız ile boz.',danger:true,multiplier:.95};
  if(battle.combatVersion!==1 && enemy.role==='elite' && round%3===0)
    return {type:'cleave',label:'Çift kılıç',detail:'Seçkin bu tur her kahramana yarır. Yıldız çağrısı bunu bozar.',danger:true,multiplier:.55};
  if(battle.combatVersion!==1 && enemy.role==='caster' && (battle.affix==='brand' || enemy.chapter===2) && round%3===0)
    return {type:'brand',label:'Damga',detail:'Kırık Taç bu tur tek kahramanı damgalar. Kalkan ağırlığı keser.',danger:true,multiplier:1.35};
  if(battle.combatVersion!==1 && enemy.role==='caster' && (battle.affix==='siphon' || enemy.chapter===3) && round%2===0)
    return {type:'siphon',label:'Kuyu emişi',detail:'Yıldız Kuyusu takıma vurur ve en yaralı düşmanı iyileştirir.',danger:true,multiplier:.4,heal:.45};
  if(battle.combatVersion!==1 && enemy.role==='caster' && round%2===0)
    return {type:'volley',label:'Gölge yağmuru',detail:'Bu tur bütün kahramanlara büyü saldırısı.',danger:true,multiplier:.55};
  return {type:'strike',label:enemy.role==='boss'?'Ağır kesiş':'Ön safa saldırı',detail:'Ayaktaki muhafıza, yoksa en yaralı kahramana saldırır.',danger:false,multiplier:1};
}
