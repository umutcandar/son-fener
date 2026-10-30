import { createGearState, restoreGear, equipmentStats, awardFirstClearItem, FIRST_CLEAR_LOOT } from './equipment.js';
import { encounterEnemies, enemyIntent } from './encounters.js';
import { initializeLiveCombat, restoreLiveCombat, advanceLiveCombat, castLiveAbility } from './live-combat.js';
export { HERO_ABILITIES, abilityState, liveEnemyIntent } from './live-combat.js';
export { enemyIntent, ENEMY_ROLES } from './encounters.js';
export { ITEMS, SLOTS, RARITIES, FIRST_CLEAR_LOOT, itemById, forgeItem, equipItem, unequipItem, equipmentStats } from './equipment.js';
// Starfort's local, deterministic rules. No DOM, storage or network side effects.
export const STORAGE_KEY = 'starfort:v1';
export const RESOURCES = {
  gold: { name: 'Altın', icon: '◈' }, wood: { name: 'Kereste', icon: '🪵' },
  stone: { name: 'Taş', icon: '⬟' }, aether: { name: 'Yıldız özü', icon: '✦' },
};
export const BUILDINGS = [
  { id: 'keep', name: 'Yıldız Kalesi', icon: '♜', maxLevel: 8, description: 'Üretimi ve yapıların seviye sınırını artırır.', baseCost: { gold: 100, wood: 80, stone: 70 } },
  { id: 'farm', name: 'Hasat Avlusu', icon: '🌾', maxLevel: 8, description: 'Vadinin hasadından altın kazanır.', baseCost: { gold: 55, wood: 40 }, production: { resource: 'gold', perMinute: 20 } },
  { id: 'lumber', name: 'Karaorman Keresteliği', icon: '🪵', maxLevel: 8, description: 'Kalenin yapıları için kereste üretir.', baseCost: { gold: 50, stone: 25 }, production: { resource: 'wood', perMinute: 15 } },
  { id: 'quarry', name: 'Aytaşı Ocağı', icon: '⬟', maxLevel: 8, description: 'Kadim kayalardan yapı taşı çıkarır.', baseCost: { gold: 60, wood: 35 }, production: { resource: 'stone', perMinute: 12 } },
  { id: 'forge', name: 'Kor Demirhanesi', icon: '⚒', maxLevel: 8, description: 'Her yükseltme takım saldırısını %5 artırır; 2. ve 4. seviyelerde yeni ekipmanlar açılır.', baseCost: { gold: 85, wood: 40, stone: 55 } },
  { id: 'tavern', name: 'Yemin Hanı', icon: '⚑', maxLevel: 8, description: 'Her yükseltme kahramanların canını %4 artırır.', baseCost: { gold: 80, wood: 65, stone: 30 } },
  { id: 'observatory', name: 'Yıldız Rasathanesi', icon: '✦', maxLevel: 8, description: 'Gökyüzünden yıldız özü toplar.', baseCost: { gold: 90, wood: 45, stone: 60 }, production: { resource: 'aether', perMinute: 3 } },
];
export const HEROES = [
  { id: 'aldren', name: 'Aldren', title: 'Kül Muhafızı', role: 'tank', color: '#c89463', description: 'Kalenin son yeminli muhafızı.', skill: 'Siper: İlk hedef olur; ayaktayken takım %15 az hasar alır.', hp: 170, attack: 18, unlockStage: 0 },
  { id: 'lyra', name: 'Lyra', title: 'Yıldız Dokuyucu', role: 'mage', color: '#aa91ed', description: 'Sönen yıldızların dilini bilen büyücü.', skill: 'Yıldız kıvılcımı: Her düşmana saldırısının %65’i kadar hasar.', hp: 100, attack: 26, unlockStage: 0 },
  { id: 'rovan', name: 'Rovan', title: 'Gölge İzci', role: 'ranger', color: '#8bc39a', description: 'Karaorman yollarını gölgelerden okur.', skill: 'Avcı oku: En az canı kalan düşmana %130 hasar.', hp: 110, attack: 23, unlockStage: 0 },
  { id: 'mira', name: 'Mira', title: 'Ay Rahibesi', role: 'healer', color: '#e5c790', description: 'Kaybolan ışığı yaralıların kalbine taşır.', skill: 'Ay duası: Yaralı bir müttefiki iyileştirir ve düşmana vurur.', hp: 115, attack: 20, unlockStage: 2 },
  { id: 'doran', name: 'Doran', title: 'Demir Yemin', role: 'fighter', color: '#cc7c71', description: 'Sürgündeki savaşçı, kalenin yeni kılıcı.', skill: 'İkiz darbe: İki kez %75 hasarla saldırır.', hp: 145, attack: 28, unlockStage: 4 },
  { id: 'vesper', name: 'Vesper', title: 'Gölge Düellocusu', role: 'assassin', color: '#ba8cbd', description: 'Karaorman’ın sessiz adımı, yeminlilerin keskin hançeri.', skill: 'Son gölge: En az canı kalan düşmana %160 hasar. Düşük canıyla korunmaya ihtiyaç duyar.', hp: 85, attack: 27, unlockStage: 3 },
  { id: 'eira', name: 'Eira', title: 'Kutup Kâhini', role: 'mage', color: '#9ecfe2', description: 'Kuzeyin buzunda, yıldızların sesini duyan kâhin.', skill: 'Ayaz çemberi: Her düşmana %55 hasar; en yaralı müttefike saldırısının %60’ı kadar can.', hp: 120, attack: 24, unlockStage: 6 },
];
// Premium candidates are playable only in isolated training until server entitlements exist.
export const SPECIAL_HEROES = [
  { id:'aurelion',name:'Aurelion',title:'Şafak Mareşali',role:'tank',color:'#dfbd74',premium:true,hp:185,attack:29,description:'Şafak yeminiyle mühürlenmiş kraliyet muhafızı.',skill:'Güneş darbesi: İlk hedefe %160, diğerlerine %30 hasar. Aldren yoksa darbeleri karşılar ve %8 siper sağlar.' },
  { id:'nyxara',name:'Nyxara',title:'Tutulma Kâhini',role:'mage',color:'#b895db',premium:true,hp:105,attack:32,description:'Tutulmanın iki yüzünü de gören yıldız büyücüsü.',skill:'Tutulma: Her düşmana %75 hasar; kendine saldırısının %30’u kadar can yeniler.' },
];
export const ALL_HEROES = [...HEROES,...SPECIAL_HEROES];
export const STAGES = [
  { id: 1, name: 'Kül Geçidi', description: 'Kaleye yaklaşan ilk akıncıları durdur.', enemyName: 'Kül Akıncısı', enemyCount: 3, recommendedPower: 250, reward: { gold: 120, wood: 60, stone: 35, aether: 12 } },
  { id: 2, name: 'Kırık Şapel', description: 'Mira’yı gölge kuşatmasından kurtar.', enemyName: 'Gölge Müridi', enemyCount: 3, recommendedPower: 310, reward: { gold: 160, wood: 70, stone: 50, aether: 18 } },
  { id: 3, name: 'Karaorman', description: 'Yıldız yolunu kapatan avcıları yen.', enemyName: 'Diken Avcısı', enemyCount: 4, recommendedPower: 380, reward: { gold: 190, wood: 100, stone: 65, aether: 22 } },
  { id: 4, name: 'Demir Kapı', description: 'Doran’ın son direnişine yetiş.', enemyName: 'Demir Lejyoner', enemyCount: 4, recommendedPower: 450, reward: { gold: 230, wood: 110, stone: 90, aether: 28 } },
  { id: 5, name: 'Sessiz Mahzen', description: 'Uyandırılan ölülerin yürüyüşünü kes.', enemyName: 'Mahzen Bekçisi', enemyCount: 4, recommendedPower: 540, reward: { gold: 280, wood: 130, stone: 110, aether: 35 } },
  { id: 6, name: 'Ayaz Surları', description: 'Kuzeyin donmuş kalesine ulaş.', enemyName: 'Ayaz Şövalyesi', enemyCount: 5, recommendedPower: 650, reward: { gold: 330, wood: 150, stone: 135, aether: 42 } },
  { id: 7, name: 'Tutulma Kulesi', description: 'Tutulmayı besleyen muhafızları dağıt.', enemyName: 'Tutulma Muhafızı', enemyCount: 5, recommendedPower: 780, reward: { gold: 400, wood: 180, stone: 160, aether: 50 } },
  { id: 8, name: 'Yıldızsız Taht', description: 'Karanlığın kalbindeki son yemini boz.', enemyName: 'Boşluk Şövalyesi', enemyCount: 5, recommendedPower: 920, reward: { gold: 500, wood: 220, stone: 200, aether: 65 } },
];

const MAX_OFFLINE = 4 * 60 * 60 * 1000, MAX_RESOURCE = 1e9, MAX_HERO_LEVEL = 20;
const buildingById = id => BUILDINGS.find(item => item.id === id);
const heroById = id => ALL_HEROES.find(item => item.id === id);
const stageById = id => STAGES.find(item => item.id === id);
const clone = value => JSON.parse(JSON.stringify(value));
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const timestamp = value => Number.isFinite(value) && value >= 0;
const safeNow = now => timestamp(now) ? now : Date.now();
const fail = error => ({ ok: false, error });
const activeBattle = state => state.battle?.status === 'active';
const unlocked = (state, hero) => hero && (hero.premium ? state.trialHero === hero.id : (!hero.unlockStage || state.cleared.includes(hero.unlockStage)));
const zeroResources = () => Object.fromEntries(Object.keys(RESOURCES).map(id => [id, 0]));
const canPay = (state, cost) => Object.entries(cost).every(([id, amount]) => state.res[id] >= amount);
const pay = (state, cost) => { for (const [id, amount] of Object.entries(cost)) state.res[id] -= amount; };
const award = (state, gain) => { for (const [id, amount] of Object.entries(gain)) state.res[id] = Math.min(MAX_RESOURCE, state.res[id] + amount); };
const nextStage = state => state.cleared.length + 1;

export function createState(now = Date.now()) {
  return {
    version: 1, res: { gold: 280, wood: 180, stone: 150, aether: 65 },
    buildings: Object.fromEntries(BUILDINGS.map(item => [item.id, 1])),
    heroes: Object.fromEntries(HEROES.filter(hero => !hero.unlockStage).map(hero => [hero.id, { level: 1 }])),
    team: ['aldren', 'lyra', 'rovan'], cleared: [], selectedStage: 1,
    lastCollected: safeNow(now), battle: null, ...createGearState(),
  };
}

export function restoreState(raw, now = Date.now()) {
  const time = safeNow(now), state = createState(time);
  try {
    const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!saved || typeof saved !== 'object' || saved.version !== 1) return state;
    for (const id of Object.keys(RESOURCES)) {
      const amount = saved.res?.[id];
      if (Number.isFinite(amount) && amount >= 0) state.res[id] = Math.min(MAX_RESOURCE, amount);
    }
    for (const building of BUILDINGS) {
      const level = saved.buildings?.[building.id];
      if (integer(level, 1, building.maxLevel)) state.buildings[building.id] = level;
    }
    // Only contiguous victories unlock the next chapter; ignore holes in damaged saves.
    while (Array.isArray(saved.cleared) && saved.cleared.includes(nextStage(state)) && state.cleared.length < STAGES.length) state.cleared.push(nextStage(state));
    for (const hero of HEROES.filter(item => unlocked(state, item))) {
      const level = saved.heroes?.[hero.id]?.level;
      state.heroes[hero.id] = { level: integer(level, 1, MAX_HERO_LEVEL) ? level : 1 };
    }
    if (validTeam(state, saved.team)) state.team = [...saved.team];
    if (integer(saved.selectedStage, 1, Math.min(STAGES.length, nextStage(state)))) state.selectedStage = saved.selectedStage;
    if (timestamp(saved.lastCollected)) state.lastCollected = Math.min(time, saved.lastCollected);
    restoreGear(state,saved);
    state.battle = restoreBattle(state, saved.battle);
  } catch { return createState(time); }
  return state;
}

export function production(state, now = Date.now()) {
  const gain = zeroResources();
  if (!timestamp(now) || !timestamp(state.lastCollected)) return gain;
  const minutes = Math.max(0, Math.min(MAX_OFFLINE, now - state.lastCollected)) / 60000;
  const keepBonus = 1 + (state.buildings.keep - 1) * 0.05;
  for (const building of BUILDINGS.filter(item => item.production)) {
    const { resource, perMinute } = building.production;
    gain[resource] += Math.floor(perMinute * state.buildings[building.id] * keepBonus * minutes);
  }
  return gain;
}

export function collect(state, now = Date.now()) {
  if (!timestamp(now) || now < state.lastCollected) return { ...fail('Geçersiz toplama zamanı.'), gain: zeroResources() };
  const gain = production(state, now);
  for (const id of Object.keys(gain)) gain[id] = Math.min(gain[id], MAX_RESOURCE - state.res[id]);
  award(state, gain);
  state.lastCollected = now;
  return { ok: true, gain };
}

export function upgradeCost(state, id) {
  const building = buildingById(id);
  if (!building) return null;
  return Object.fromEntries(Object.entries(building.baseCost).map(([resource, amount]) => [resource, Math.ceil(amount * 1.65 ** (state.buildings[id] - 1))]));
}

export function upgradeBuilding(state, id, now = state.lastCollected) {
  const building = buildingById(id);
  if (!building) return fail('Bilinmeyen yapı.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  if (state.buildings[id] >= building.maxLevel) return fail('Yapı en yüksek seviyede.');
  if (id !== 'keep' && state.buildings[id] >= state.buildings.keep + 1) return fail('Önce Yıldız Kalesi’ni yükselt.');
  const cost = upgradeCost(state, id);
  if (!canPay(state, cost)) return fail('Yeterli kaynak yok.');
  if (!timestamp(now) || now < state.lastCollected) return fail('Geçersiz geliştirme zamanı.');
  // Settle elapsed production at the old level before changing its rate.
  collect(state, now);
  pay(state, cost);
  state.buildings[id]++;
  return { ok: true };
}

export function heroCost(state, id) {
  if (!heroById(id) || !state.heroes[id]) return null;
  const level = state.heroes[id].level;
  return { gold: 60 * level, wood: 15 * level, aether: 6 * level };
}

export function upgradeHero(state, id) {
  if (!unlocked(state, heroById(id)) || !state.heroes[id]) return fail('Bu kahraman henüz katılmadı.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  if (state.heroes[id].level >= MAX_HERO_LEVEL) return fail('Kahraman en yüksek seviyede.');
  const cost = heroCost(state, id);
  if (!canPay(state, cost)) return fail('Yeterli kaynak yok.');
  pay(state, cost);
  state.heroes[id].level++;
  return { ok: true };
}

function validTeam(state, ids) {
  return Array.isArray(ids) && ids.length === 3 && new Set(ids).size === 3
    && ids.every(id => unlocked(state, heroById(id)) && state.heroes[id]);
}

export function setTeam(state, ids) {
  if (activeBattle(state)) return fail('Savaş sırasında takım değiştirilemez.');
  if (!validTeam(state, ids)) return fail('Takıma üç farklı, açık kahraman seç.');
  state.team = [...ids];
  return { ok: true };
}

export function heroStats(state, id) {
  const hero = heroById(id), level = state.heroes[id].level, gear = equipmentStats(state,id);
  const maxHp = Math.round(hero.hp * (1 + (level - 1) * 0.12) * (1 + (state.buildings.tavern - 1) * 0.04)) + gear.hp;
  return { id, name: hero.name, color: hero.color, hp: maxHp, maxHp, armor:gear.armor, healing:gear.healing,
    attack: Math.round(hero.attack * (1 + (level - 1) * 0.15) * (1 + (state.buildings.forge - 1) * 0.05)) + gear.attack };
}

export function teamPower(state) {
  return Math.round(state.team.reduce((sum, id) => {
    const hero = heroStats(state, id);
    return sum + hero.attack * 2 + hero.maxHp * 0.35 + hero.armor * 2 + hero.healing;
  }, 0));
}

function newBattle(state, stage, combatVersion=2) {
  return { stageId: stage.id, round: 0, status: 'active', combatVersion, targetId:null,
    allies: state.team.map(id => heroStats(state, id)),
    enemies: encounterEnemies(stage,combatVersion),
    starCharge: 40, log: [`${stage.name}: Kahramanlar savaşa hazır.`], reward: clone(stage.reward), rewardApplied: false, loot: null };
}

function restoreBattle(state, saved) {
  if (!saved || !integer(saved.stageId, 1, Math.min(STAGES.length, nextStage(state)))
    || !['active', 'won', 'lost'].includes(saved.status) || !integer(saved.round, 0, 100)) return null;
  // Existing in-progress battles retain the original enemies and attack rules.
  const battle = newBattle(state, stageById(saved.stageId), saved.combatVersion===2?2:1);
  for (const side of ['allies', 'enemies']) {
    if (!Array.isArray(saved[side]) || saved[side].length !== battle[side].length) return null;
    for (let index = 0; index < battle[side].length; index++) {
      const unit = battle[side][index], source = saved[side][index];
      if (!source || source.id !== unit.id || !integer(source.hp, 0, unit.maxHp)) return null;
      unit.hp = source.hp;
    }
  }
  const alliesLive = battle.allies.some(unit => unit.hp > 0), enemiesLive = battle.enemies.some(unit => unit.hp > 0);
  if ((saved.status === 'active' && (!alliesLive || !enemiesLive))
    || (saved.status === 'won' && enemiesLive) || (saved.status === 'lost' && alliesLive)) return null;
  battle.status = saved.status;
  battle.targetId = battle.enemies.some(enemy=>enemy.id===saved.targetId && enemy.hp>0)?saved.targetId:null;
  battle.round = saved.round;
  battle.starCharge = integer(saved.starCharge, 0, 100) ? saved.starCharge : 40;
  battle.log = Array.isArray(saved.log) ? saved.log.filter(line => typeof line === 'string').slice(-30).map(line => line.slice(0, 240)) : battle.log;
  // Loading a completed battle must never grant its reward a second time.
  battle.rewardApplied = saved.status !== 'active';
  battle.loot = saved.status === 'won' && saved.loot === FIRST_CLEAR_LOOT[saved.stageId] ? saved.loot : null;
  restoreLiveCombat(battle,saved.live);
  return battle;
}

export function startBattle(state, stageId) {
  const stage = stageById(stageId);
  if (!stage) return fail('Bilinmeyen bölge.');
  if (activeBattle(state)) return fail('Devam eden bir savaş var.');
  if (stageId > nextStage(state)) return fail('Önce önceki bölgeyi temizle.');
  if (!validTeam(state, state.team)) return fail('Üç kahramanlık takımını tamamla.');
  state.selectedStage = stageId;
  state.battle = newBattle(state, stage);
  return { ok: true };
}

export function selectTarget(state,id) {
  if(!activeBattle(state)) return fail('Devam eden savaş yok.');
  if(id!==null && !state.battle.enemies.some(enemy=>enemy.id===id && enemy.hp>0)) return fail('Ayaktaki bir düşmanı seç.');
  state.battle.targetId=id;
  return {ok:true};
}

export function prepareLiveBattle(state) {
  if(!activeBattle(state)) return fail('Devam eden savaş yok.');
  initializeLiveCombat(state.battle);
  return {ok:true};
}
export function startLiveBattle(state,stageId) {
  const started=startBattle(state,stageId);
  if(started.ok) prepareLiveBattle(state);
  return started;
}
function settleLiveResult(state,result) {
  if(!result.ok) return result;
  const messages=[];
  finishBattle(state,messages);
  state.battle.log=[...state.battle.log,...messages].slice(-30);
  return result;
}
export function advanceCombat(state,deltaMs) {
  if(!activeBattle(state)) return fail('Devam eden savaş yok.');
  return settleLiveResult(state,advanceLiveCombat(state.battle,deltaMs));
}
export function useHeroAbility(state,heroId) {
  if(!activeBattle(state)) return fail('Devam eden savaş yok.');
  return settleLiveResult(state,castLiveAbility(state.battle,heroId));
}

function hit(target, amount) {
  const damage = Math.min(target.hp, Math.max(1, Math.round(amount)));
  target.hp -= damage;
  return damage;
}

function finishBattle(state, events) {
  const battle = state.battle;
  if (battle.enemies.every(unit => unit.hp <= 0)) {
    battle.status = 'won';
    if (!battle.rewardApplied) {
      award(state, battle.reward);
      if (!state.cleared.includes(battle.stageId)) {
        state.cleared.push(battle.stageId);
        const loot = awardFirstClearItem(state,battle.stageId);
        battle.loot = loot?.id || null;
        if(loot) events.push(`${loot.name} kazanıldı. Cephanelikten bir kahramana takabilirsin.`);
      }
      for (const hero of HEROES.filter(item => unlocked(state, item) && !state.heroes[item.id])) {
        state.heroes[hero.id] = { level: 1 };
        events.push(`${hero.name}, kalenin yeminlilerine katıldı.`);
      }
      battle.rewardApplied = true;
    }
    events.push('Zafer! Ganimet kaleye taşındı.');
  } else if (battle.allies.every(unit => unit.hp <= 0)) {
    battle.status = 'lost';
    battle.rewardApplied = true;
    events.push('Takım geri çekildi. Kahramanlarını güçlendirip yeniden deneyebilirsin.');
  }
  return battle.status !== 'active';
}

export function battleTurn(state, action) {
  if(state.battle?.live) return { ...fail('Bu savaş otomatik ilerliyor; kahraman yeteneklerini kullan.'), events: [] };
  if (!['strike', 'guard', 'star'].includes(action)) return { ...fail('Geçersiz savaş eylemi.'), events: [] };
  if (!activeBattle(state)) return { ...fail('Devam eden savaş yok.'), events: [] };
  const battle = state.battle, events = [], frames = [];
  let previousHp = new Map([...battle.allies,...battle.enemies].map(unit=>[unit.id,unit.hp]));
  const frame = (actorId,kind,label) => {
    const changes=[...battle.allies,...battle.enemies].filter(unit=>unit.hp!==previousHp.get(unit.id)).map(unit=>({id:unit.id,delta:unit.hp-previousHp.get(unit.id)}));
    frames.push({actorId,kind,label,changes,battle:clone(battle)});
    previousHp=new Map([...battle.allies,...battle.enemies].map(unit=>[unit.id,unit.hp]));
  };
  if (action === 'star' && battle.starCharge < 100) return { ...fail('Yıldız çağrısı için 100 yük gerekli.'), events };
  battle.round++;
  const aliveAllies = () => battle.allies.filter(unit => unit.hp > 0);
  const aliveEnemies = () => battle.enemies.filter(unit => unit.hp > 0);
  const focusedEnemy = () => aliveEnemies().find(enemy=>enemy.id===battle.targetId);
  const primaryEnemy = () => focusedEnemy() || aliveEnemies()[0];
  if (action === 'star') {
    battle.starCharge -= 100;
    const power = aliveAllies().reduce((sum, hero) => sum + hero.attack, 0) * 0.9;
    for (const enemy of aliveEnemies()) hit(enemy, power);
    for (const hero of aliveAllies()) hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(hero.maxHp * 0.15));
    events.push('Yıldız çağrısı! Düşmanlara ışık yağdı, müttefiklerin yaraları kapandı.');
    frame(null,'star','Yıldız çağrısı');
  } else {
    battle.starCharge = Math.min(100, battle.starCharge + (action === 'guard' ? 40 : 25));
    const strength = action === 'guard' ? 0.4 : 1;
    if (action === 'guard') { events.push('Siper alındı: Gelen hasar bu tur yarıya iner.'); frame(null,'guard','Siper alındı'); }
    for (const hero of aliveAllies()) {
      if (!aliveEnemies().length) break;
      const attack = hero.attack * strength;
      if (hero.id === 'mira') {
        const target = aliveAllies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const healed = Math.min(target.maxHp - target.hp, Math.round(hero.attack * 0.9) + hero.healing);
        target.hp += healed;
        hit(primaryEnemy(), attack * 0.6);
        events.push(`Mira, ${target.name} için ${healed} can yeniledi.`);
      } else if (hero.id === 'aurelion') {
        const targets = [primaryEnemy(),...aliveEnemies().filter(enemy=>enemy!==primaryEnemy())];
        targets.forEach((enemy,index)=>hit(enemy,attack*(index===0?1.6:.3)));
        events.push('Aurelion güneş darbesiyle düşman saflarını yardı.');
      } else if (hero.id === 'nyxara') {
        for(const enemy of aliveEnemies()) hit(enemy,attack*.75);
        hero.hp=Math.min(hero.maxHp,hero.hp+Math.round(hero.attack*.3)+hero.healing);
        events.push('Nyxara tutulmayı çağırdı ve kendi yaralarını sardı.');
      } else if (hero.id === 'lyra') {
        for (const enemy of aliveEnemies()) hit(enemy, attack * 0.65);
        events.push('Lyra bütün düşmanlara yıldız kıvılcımı gönderdi.');
      } else if (hero.id === 'vesper') {
        const target = focusedEnemy() || aliveEnemies().sort((a, b) => a.hp - b.hp)[0];
        events.push(`Vesper’in son gölgesi ${hit(target, attack * 1.6)} hasar verdi.`);
      } else if (hero.id === 'eira') {
        for (const enemy of aliveEnemies()) hit(enemy, attack * 0.55);
        const target = aliveAllies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const healed = Math.min(target.maxHp - target.hp, Math.round(hero.attack * 0.6) + hero.healing);
        target.hp += healed;
        events.push(`Eira ayaz çemberini açtı; ${target.name} için ${healed} can yeniledi.`);
      } else if (hero.id === 'rovan') {
        const target = focusedEnemy() || aliveEnemies().sort((a, b) => a.hp - b.hp)[0];
        events.push(`Rovan’ın avcı oku ${hit(target, attack * 1.3)} hasar verdi.`);
      } else if (hero.id === 'doran') {
        let damage = 0;
        for (let i = 0; i < 2 && aliveEnemies().length; i++) damage += hit(primaryEnemy(), attack * 0.75);
        events.push(`Doran’ın ikiz darbesi ${damage} hasar verdi.`);
      } else events.push(`${hero.name} ${hit(primaryEnemy(), attack)} hasar verdi.`);
      frame(hero.id,action==='guard'?'guard-strike':'strike',`${hero.name} · ${heroById(hero.id).skill.split(':')[0]}`);
    }
  }
  if (!finishBattle(state, events)) {
    for (const enemy of aliveEnemies()) {
      if (!aliveAllies().length) break;
      const intent=enemyIntent({...battle,round:battle.round-1},enemy);
      if(action==='star' && intent.type==='crush') {
        events.push(`${enemy.name}: Yıkım dalgası yıldız çağrısıyla bozuldu!`);
        frame(enemy.id,'interrupt','Yıkım engellendi');
        continue;
      }
      const tank = aliveAllies().find(hero => hero.id === 'aldren') || aliveAllies().find(hero => hero.id === 'aurelion');
      const targets = intent.type==='strike'?[tank || aliveAllies().sort((a,b)=>a.hp-b.hp)[0]]:aliveAllies();
      for(const target of targets) {
        const damage=hit(target,enemy.attack*intent.multiplier*(tank?.id==='aldren'?.85:tank?.id==='aurelion'?.92:1)*(1-target.armor/100)*(action==='guard'?.5:1));
        events.push(`${enemy.name}, ${target.name} için ${damage} hasar verdi.`);
      }
      frame(enemy.id,intent.type,intent.label);

    }
    finishBattle(state, events);
  }
  if(!aliveEnemies().some(enemy=>enemy.id===battle.targetId)) battle.targetId=null;
  battle.log = [...battle.log, ...events].slice(-30);
  return { ok: true, events, frames };
}

// Deliberately isolated from the player save and all real purchases.
export function createHeroTrial(playerState, heroId) {
  const hero = SPECIAL_HEROES.find(hero => hero.id === heroId);
  if(!hero) return null;
  const trial = restoreState(JSON.stringify(playerState));
  trial.battle = null;
  trial.trialHero = heroId;
  trial.heroes[heroId] = { level: Math.max(1,Math.round(trial.team.reduce((n,id)=>n+trial.heroes[id].level,0)/3)) };
  trial.team[0] = heroId;
  startLiveBattle(trial,Math.min(STAGES.length,trial.cleared.length+1));
  return trial;
}
