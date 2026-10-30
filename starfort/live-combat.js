// Deterministic automatic combat. All times are simulation milliseconds, never wall-clock dates.
import { combatOutcome, bossStrike, crownPressure } from './encounters.js';
export const HERO_ABILITIES = {
  aldren: {name:'Yemin Siperi',type:'shield',description:'6 saniye boyunca bütün takıma canlarının %22’si + saldırının %40’ı kadar kalkan.',cooldown:7000},
  lyra: {name:'Yıldız Fırtınası',type:'star',description:'Tüm düşmanlara %160 hasar. Hazırlanan büyüleri ve yıkımı keser.',cooldown:7000},
  rovan: {name:'İşaretli Av',type:'mark',description:'Seçili hedefe %280 hasar; hedef 6 saniye boyunca %25 fazla hasar alır.',cooldown:7000},
  mira: {name:'Ayın Lütfu',type:'heal',description:'Tüm takıma saldırının %125’i + şifa kadar can; en yaralıya 5 saniyelik kalkan.',cooldown:7000},
  doran: {name:'Kıran Darbe',type:'stun',description:'Seçili hedefe %320 hasar; hazırlığını bozar ve 1,8 saniye sersemletir.',cooldown:7000},
  vesper: {name:'Gece İnfazı',type:'execute',description:'Seçili hedefe %240 hasar. Hedefin canı %40 altındaysa %400 hasar.',cooldown:7000},
  eira: {name:'Buz Halesi',type:'frost',description:'Tüm düşmanlara %125 hasar; hazırlıklarını bozar ve 1,5 saniye dondurur.',cooldown:7000},
  aurelion: {name:'Şafak Yemini',type:'sun',description:'Hedefe %300, diğer düşmanlara %80 hasar; takıma 5 saniyelik %10 can kalkanı.',cooldown:7000},
  nyxara: {name:'Tam Tutulma',type:'eclipse',description:'Tüm düşmanlara %160 hasar; verdiği toplam hasarın %20’si kadar kendini iyileştirir.',cooldown:7000},
};
const periods={aldren:3000,lyra:3200,rovan:2600,mira:3100,doran:2900,vesper:2400,eira:3200,aurelion:3000,nyxara:3100};
const enemyPeriod=enemy=>enemy.role==='boss'?4200:enemy.role==='elite'?4000:enemy.role==='caster'?3900:3500;
const living=units=>units.filter(unit=>unit.hp>0);
const clamp=(value,min,max,fallback)=>Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const fail=error=>({ok:false,error,events:[]});
const fighterState=(battle,unit)=>battle.live.allies[unit.id]||battle.live.enemies[unit.id];

export function initializeLiveCombat(battle) {
  if(battle.live) return;
  battle.live={elapsedMs:0,
    allies:Object.fromEntries(battle.allies.map((hero,index)=>[hero.id,{nextAt:650+index*420,energy:70,cooldownUntil:0,shield:0,shieldUntil:0}])),
    enemies:Object.fromEntries(battle.enemies.map((enemy,index)=>[enemy.id,{nextAt:2100+index*420,attacks:0,casting:null,stunnedUntil:0,markedUntil:0}]))};
}

export function restoreLiveCombat(battle,saved) {
  if(!saved || typeof saved!=='object') return;
  initializeLiveCombat(battle);
  const live=battle.live, t=clamp(saved.elapsedMs,0,360000,0);
  live.elapsedMs=t;
  for(const hero of battle.allies) {
    const source=saved.allies?.[hero.id]||{}, unit=live.allies[hero.id];
    unit.nextAt=clamp(source.nextAt,hero.hp>0?t:0,t+periods[hero.id],t+650);
    unit.energy=clamp(source.energy,0,100,70);
    unit.cooldownUntil=clamp(source.cooldownUntil,0,t+7000,0);
    unit.shieldUntil=clamp(source.shieldUntil,0,t+6000,0);
    unit.shield=unit.shieldUntil>t?clamp(source.shield,0,hero.maxHp,0):0;
  }
  for(const enemy of battle.enemies) {
    const source=saved.enemies?.[enemy.id]||{}, unit=live.enemies[enemy.id];
    unit.nextAt=clamp(source.nextAt,enemy.hp>0?t:0,t+enemyPeriod(enemy),t+2100);
    unit.attacks=Math.floor(clamp(source.attacks,0,500,0));
    unit.stunnedUntil=clamp(source.stunnedUntil,0,t+1800,0);
    unit.markedUntil=clamp(source.markedUntil,0,t+6000,0);
    const cast=source.casting;
    const castAllowed=cast && ((cast.kind==='crush'&&enemy.role==='boss')||(cast.kind==='cleave'&&enemy.role==='elite')||(cast.kind==='volley'&&enemy.role==='caster')||(cast.kind==='brand'&&(enemy.role==='caster'||enemy.role==='boss'))||(cast.kind==='siphon'&&(enemy.role==='caster'||enemy.role==='boss')));
    if(castAllowed
      && Number.isFinite(cast.startedAt) && Number.isFinite(cast.endsAt) && cast.startedAt>=0
      && cast.startedAt<=t && cast.endsAt>=t && cast.endsAt<=t+2400) {
      unit.casting={kind:cast.kind,startedAt:cast.startedAt,endsAt:cast.endsAt};
      unit.nextAt=cast.endsAt;
    }
  }
}

export function abilityState(battle,heroId) {
  const hero=battle.allies.find(unit=>unit.id===heroId), unit=battle.live?.allies[heroId];
  const cooldown=Math.max(0,(unit?.cooldownUntil||0)-(battle.live?.elapsedMs||0));
  return {energy:unit?.energy||0,cooldown,ready:Boolean(hero?.hp>0&&battle.status==='active'&&unit&&unit.energy>=100&&cooldown===0)};
}

export function liveEnemyIntent(battle,enemy) {
  const unit=battle.live?.enemies[enemy.id], t=battle.live?.elapsedMs||0;
  if(!unit) return {label:'Otomatik saldırı',danger:false};
  if(unit.stunnedUntil>t) return {label:'Sersemledi',danger:false,remaining:unit.stunnedUntil-t};
  if(unit.casting) {
    const wind={crush:'Yıkım hazırlanıyor',cleave:'Çift kılıç hazırlanıyor',volley:'Gölge yağmuru',brand:'Damga hazırlanıyor',siphon:'Kuyu emişi hazırlanıyor'};
    return {label:wind[unit.casting.kind]||'Hazırlık',danger:true,remaining:Math.max(0,unit.casting.endsAt-t),progress:(t-unit.casting.startedAt)/(unit.casting.endsAt-unit.casting.startedAt)};
  }
  if(enemy.role==='boss' && enemy.hp<=enemy.maxHp*0.5 && enemy.stageId===20) return {label:'Taç öfkesi',danger:false};
  if(enemy.role==='boss' && enemy.hp<=enemy.maxHp*0.5 && enemy.stageId===30) return {label:'Kuyu çöküşü',danger:false};
  if(enemy.role==='boss' && enemy.hp<=enemy.maxHp*0.5 && enemy.stageId===10) return {label:'Mühür kırığı',danger:false};
  return {label:enemy.role==='boss'?'Ağır kesiş':enemy.role==='caster'?'Gölge oku':'Ön safa saldırı',danger:false};
}

function selectedEnemy(battle,weakest=false) {
  const enemies=living(battle.enemies);
  return enemies.find(enemy=>enemy.id===battle.targetId)||(weakest?enemies.sort((a,b)=>a.hp-b.hp)[0]:enemies[0]);
}
function record(battle,actorId,kind,label,action) {
  const before=new Map([...battle.allies,...battle.enemies].map(unit=>[unit.id,{hp:unit.hp,shield:fighterState(battle,unit)?.shield||0}]));
  action();
  const changes=[...battle.allies,...battle.enemies].map(unit=>({id:unit.id,delta:unit.hp-before.get(unit.id).hp,shieldDelta:(fighterState(battle,unit)?.shield||0)-before.get(unit.id).shield})).filter(change=>change.delta||change.shieldDelta);
  battle.log=[...battle.log,`${(battle.live.elapsedMs/1000).toFixed(1)} sn · ${label}`].slice(-30);
  return {actorId,kind,label,changes};
}
function damageEnemy(battle,enemy,amount) {
  if(!enemy || enemy.hp<=0) return 0;
  const marked=battle.live.enemies[enemy.id].markedUntil>battle.live.elapsedMs;
  const raw=Math.max(1,Math.round(amount*(marked?1.25:1)));
  if(enemy.role==='boss' && (enemy.stageId===10 || enemy.seal>0)) return bossStrike(enemy, raw);
  const damage=Math.min(enemy.hp, raw);
  enemy.hp-=damage;
  return damage;
}
function damageHero(battle,hero,amount) {
  const unit=battle.live.allies[hero.id];
  const tank=living(battle.allies).find(hero=>hero.id==='aldren')||living(battle.allies).find(hero=>hero.id==='aurelion');
  const damage=Math.max(1,Math.round(amount*(tank?.id==='aldren'?.85:tank?.id==='aurelion'?.92:1)*(1-hero.armor/100)));
  const absorbed=Math.min(unit.shield,damage);
  unit.shield-=absorbed;
  hero.hp=Math.max(0,hero.hp-damage+absorbed);
  unit.energy=Math.min(100,unit.energy+4);
}
function heal(hero,amount) { hero.hp=Math.min(hero.maxHp,hero.hp+Math.round(amount)); }
function shield(battle,hero,amount,duration) {
  const unit=battle.live.allies[hero.id];
  unit.shield=Math.max(unit.shield,Math.round(amount));
  unit.shieldUntil=battle.live.elapsedMs+duration;
}
function interrupt(battle,enemy,duration) {
  const unit=battle.live.enemies[enemy.id], now=battle.live.elapsedMs;
  unit.casting=null;
  unit.stunnedUntil=now+duration;
  unit.nextAt=Math.max(unit.nextAt,now+duration+600);
}
function settled(battle) {
  return combatOutcome(battle)!=null;
}
function cleanupTarget(battle) {
  if(!battle.enemies.some(enemy=>enemy.id===battle.targetId&&enemy.hp>0)) battle.targetId=null;
}

export function castLiveAbility(battle,heroId) {
  const ability=HERO_ABILITIES[heroId], hero=battle.allies.find(unit=>unit.id===heroId);
  if(!ability||!hero||!battle.live||battle.status!=='active') return fail('Bu yetenek kullanılamıyor.');
  if(!abilityState(battle,heroId).ready) return fail('Kahramanın ayakta, enerjisinin dolu ve yeteneğinin hazır olması gerekli.');
  const unit=battle.live.allies[heroId];
  unit.energy=0; unit.cooldownUntil=battle.live.elapsedMs+ability.cooldown;
  const event=record(battle,heroId,ability.type,`${hero.name} · ${ability.name}`,()=>{
    const target=selectedEnemy(battle,true), allies=living(battle.allies), enemies=living(battle.enemies);
    if(heroId==='aldren') allies.forEach(ally=>shield(battle,ally,ally.maxHp*.22+hero.attack*.4,6000));
    else if(heroId==='mira') {
      const wounded=[...allies].sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      allies.forEach(ally=>heal(ally,hero.attack*1.25+hero.healing));
      shield(battle,wounded,wounded.maxHp*.15,5000);
    } else if(heroId==='rovan') {
      damageEnemy(battle,target,hero.attack*2.8);
      if(target.hp>0) battle.live.enemies[target.id].markedUntil=battle.live.elapsedMs+6000;
    } else if(heroId==='doran') { damageEnemy(battle,target,hero.attack*3.2); interrupt(battle,target,1800); }
    else if(heroId==='vesper') damageEnemy(battle,target,hero.attack*(target.hp/target.maxHp<.4?4:2.4));
    else if(heroId==='aurelion') {
      enemies.forEach(enemy=>damageEnemy(battle,enemy,hero.attack*(enemy===target?3:.8)));
      allies.forEach(ally=>shield(battle,ally,ally.maxHp*.1,5000));
    } else {
      let dealt=0;
      for(const enemy of enemies) {
        dealt+=damageEnemy(battle,enemy,hero.attack*(heroId==='eira'?1.25:1.6));
        if(heroId==='lyra'||heroId==='eira') interrupt(battle,enemy,heroId==='eira'?1500:1000);
      }
      if(heroId==='nyxara') heal(hero,dealt*.2+hero.healing);
    }
  });
  cleanupTarget(battle);
  return {ok:true,events:[event]};
}

function heroAttack(battle,hero) {
  if(!periods[hero.id]) return null;
  const unit=battle.live.allies[hero.id], attack=hero.attack;
  unit.nextAt=battle.live.elapsedMs+periods[hero.id];
  unit.energy=Math.min(100,unit.energy+18);
  return record(battle,hero.id,'strike',`${hero.name} · ${['lyra','nyxara','eira'].includes(hero.id)?'Büyü oku':'Temel saldırı'}`,()=>{
    const target=selectedEnemy(battle,['rovan','vesper'].includes(hero.id));
    const scale=hero.id==='mira'?.5:['lyra','nyxara','eira'].includes(hero.id)?.75:hero.id==='vesper'?.9:1;
    damageEnemy(battle,target,attack*scale);
    if(hero.id==='mira'||hero.id==='eira') {
      const wounded=living(battle.allies).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      heal(wounded,attack*(hero.id==='mira'?.35:.2)+hero.healing*.35);
    }
  });
}

function enemyAttack(battle,enemy) {
  const unit=battle.live.enemies[enemy.id], now=battle.live.elapsedMs;
  if(unit.stunnedUntil>now) { unit.nextAt=unit.stunnedUntil; return null; }
  const cast=unit.casting;
  if(!cast) {
    unit.attacks++;
    const chapter = enemy.chapter || 1;
    const affix = battle.affix;
    const wounded = enemy.role==='boss' && enemy.maxHp>0 && enemy.hp<=enemy.maxHp*0.5;
    const phase = wounded && enemy.stageId===20 && unit.attacks%2===0 ? 'brand'
      : wounded && enemy.stageId===30 && unit.attacks%2===0 ? 'siphon'
      : wounded && enemy.stageId===10 && unit.attacks%2===0 ? 'crush' : null;
    const kind=phase
      || (enemy.role==='boss'&&unit.attacks%3===0?'crush'
      :enemy.role==='elite'&&unit.attacks%3===0?'cleave'
      :enemy.role==='caster'&&(affix==='brand'||chapter===2)&&unit.attacks%3===0?'brand'
      :enemy.role==='caster'&&(affix==='siphon'||chapter===3)&&unit.attacks%2===0?'siphon'
      :enemy.role==='caster'&&unit.attacks%2===0?'volley':null);
    if(kind) {
      const duration=kind==='crush'?2400:kind==='cleave'?1800:1500;
      unit.casting={kind,startedAt:now,endsAt:now+duration}; unit.nextAt=now+duration;
      const wind=kind==='crush'?'Yıkım hazırlanıyor!':kind==='cleave'?'Çift kılıç hazırlanıyor!':kind==='brand'?'Damga hazırlanıyor!':kind==='siphon'?'Kuyu emişi hazırlanıyor!':'Gölge yağmuru hazırlanıyor!';
      return record(battle,enemy.id,'windup',`${enemy.name} · ${wind}`,()=>{});
    }
  }
  unit.casting=null; unit.nextAt=now+enemyPeriod(enemy);
  const castName={crush:'Yıkım dalgası',cleave:'Çift kılıç',brand:'Damga',siphon:'Kuyu emişi',volley:'Gölge yağmuru'};
  return record(battle,enemy.id,cast?.kind||'strike',`${enemy.name} · ${castName[cast?.kind]||'Saldırı'}`,()=>{
    const allies=living(battle.allies), tank=allies.find(hero=>hero.id==='aldren')||allies.find(hero=>hero.id==='aurelion');
    const ward=battle.objective==='protect'?allies.find(hero=>hero.id==='ward'):null;
    const enraged=!cast && (enemy.stageId===20||enemy.stageId===30) && enemy.role==='boss' && enemy.maxHp>0 && enemy.hp<=enemy.maxHp*0.5;
    const ratio=(cast?.kind==='crush'?1.3:cast?.kind==='cleave'?0.6:cast?.kind==='brand'?1.25:cast?.kind==='siphon'?0.4:cast?.kind==='volley'?0.75:1)*(enraged?1.2:1);
    const hitAll = cast && cast.kind !== 'brand';
    const heroes=allies.filter(hero=>hero.id!=='ward');
    const front=ward && unit.attacks%2===0 ? ward : (tank||heroes.sort((a,b)=>a.hp-b.hp)[0]);
    const chosen = (hitAll ? allies : [front]).filter(Boolean);
    chosen.forEach(hero=>damageHero(battle,hero,enemy.attack*ratio*(cast?.kind==='brand'?crownPressure(battle,hero,enemy):1)));
    if(cast?.kind==='siphon') {
      const foe=living(battle.enemies).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];
      if(foe) foe.hp=Math.min(foe.maxHp, foe.hp+Math.round(enemy.attack*0.45));
    }
  });
}

export function advanceLiveCombat(battle,deltaMs) {
  if(!battle.live||battle.status!=='active') return fail('Devam eden canlı savaş yok.');
  if(!Number.isFinite(deltaMs)||deltaMs<=0||deltaMs>1000) return fail('Geçersiz savaş süresi.');
  const end=battle.live.elapsedMs+deltaMs, events=[];
  while(!settled(battle)) {
    const queue=[...living(battle.allies).filter(unit=>periods[unit.id]).map(unit=>({unit,side:'ally',at:battle.live.allies[unit.id].nextAt})),
      ...living(battle.enemies).map(unit=>({unit,side:'enemy',at:battle.live.enemies[unit.id].nextAt}))].sort((a,b)=>a.at-b.at);
    const next=queue[0];
    if(!next || next.at>end) break;
    battle.live.elapsedMs=next.at;
    for(const hero of battle.allies) if(battle.live.allies[hero.id].shieldUntil<=next.at) battle.live.allies[hero.id].shield=0;
    const event=next.side==='ally'?heroAttack(battle,next.unit):enemyAttack(battle,next.unit);
    if(event) events.push(event);
  }
  battle.live.elapsedMs=settled(battle)?battle.live.elapsedMs:end;
  for(const hero of battle.allies) if(battle.live.allies[hero.id].shieldUntil<=battle.live.elapsedMs) battle.live.allies[hero.id].shield=0;
  cleanupTarget(battle);
  return {ok:true,events};
}
