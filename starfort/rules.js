import { createGearState, restoreGear, equipmentStats, awardFirstClearItem, FIRST_CLEAR_LOOT } from './equipment.js';
import { encounterEnemies, enemyIntent, combatOutcome, bossStrike, crownPressure } from './encounters.js';
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
const LATER_GOALS = {
  9: 'priority', 11: 'priority', 12: 'survive', 13: 'survive', 14: 'protect',
  15: 'priority', 16: 'survive', 17: 'protect', 18: 'priority', 19: 'priority',
  21: 'survive', 22: 'protect', 23: 'survive', 24: 'priority', 25: 'priority',
  26: 'survive', 27: 'protect', 28: 'survive', 29: 'priority',
};
const SURVIVE_MS = { 12: 22000, 13: 28000, 16: 34000, 21: 22000, 23: 28000, 26: 34000, 28: 22000 };
export const STAGES = [
  { id: 1, chapter: 1, name: 'Kül Geçidi', description: 'Kaleye yaklaşan ilk akıncıları durdur.', enemyName: 'Kül Akıncısı', enemyCount: 3, recommendedPower: 250, reward: { gold: 120, wood: 60, stone: 35, aether: 12 } },
  { id: 2, chapter: 1, name: 'Kırık Şapel', description: 'Mira’yı gölge kuşatmasından kurtar.', enemyName: 'Gölge Müridi', enemyCount: 3, recommendedPower: 310, reward: { gold: 160, wood: 70, stone: 50, aether: 18 } },
  { id: 3, chapter: 1, name: 'Karaorman', description: 'Yıldız yolunu kapatan avcıları yen.', enemyName: 'Diken Avcısı', enemyCount: 4, recommendedPower: 380, reward: { gold: 190, wood: 100, stone: 65, aether: 22 } },
  { id: 4, chapter: 1, name: 'Demir Kapı', description: 'Doran’ın son direnişine yetiş.', enemyName: 'Demir Lejyoner', enemyCount: 4, recommendedPower: 450, reward: { gold: 230, wood: 110, stone: 90, aether: 28 } },
  { id: 5, chapter: 1, name: 'Sessiz Mahzen', description: 'Uyandırılan ölülerin yürüyüşünü kes.', enemyName: 'Mahzen Bekçisi', enemyCount: 4, recommendedPower: 540, reward: { gold: 280, wood: 130, stone: 110, aether: 35 } },
  { id: 6, chapter: 1, name: 'Ayaz Surları', description: 'Kuzeyin donmuş kalesine ulaş.', enemyName: 'Ayaz Şövalyesi', enemyCount: 5, recommendedPower: 650, reward: { gold: 330, wood: 150, stone: 135, aether: 42 } },
  { id: 7, chapter: 1, name: 'Tutulma Kulesi', description: 'Tutulmayı besleyen muhafızları dağıt.', enemyName: 'Tutulma Muhafızı', enemyCount: 5, recommendedPower: 780, reward: { gold: 400, wood: 180, stone: 160, aether: 50 } },
  { id: 8, chapter: 1, name: 'Yıldızsız Taht', description: 'Karanlığın kalbindeki son yemini boz.', enemyName: 'Boşluk Şövalyesi', enemyCount: 5, recommendedPower: 920, reward: { gold: 500, wood: 220, stone: 200, aether: 65 } },
  ...laterStages(),
];
function laterStages() {
  const rows = [
    [9, 'Kül Kalıntısı', 'Kül Artığı', 'elite', 'Tahttan kaçan seçkin artığı durdur.'],
    [10, 'Kuzey Mührü', 'Mühür Bekçisi', 'boss', 'Kuzey kapısının son mührünü kır.'],
    [11, 'Taç Yolu', 'Harabe Akıncısı', 'fight', 'Batı yolunu kesen ilk safları dağıt.'],
    [12, 'Kırık Avlu', 'Avlu Nöbetçisi', 'fight', 'Çökmüş avludaki nöbeti boz.'],
    [13, 'Çan Kulesi', 'Çan Müridi', 'fight', 'Çan kulesindeki büyücüleri sustur.'],
    [14, 'Paslı Köprü', 'Köprü Akıncısı', 'fight', 'Köprüyü tutan safları yar.'],
    [15, 'Seçkin Muhafız', 'Taç Seçkini', 'elite', 'Kırık tacın seçkinlerini durdur.'],
    [16, 'Kör Şapel', 'Kör Rahip', 'fight', 'Işıksız şapelin ayinini kes.'],
    [17, 'Zincir Avlusu', 'Zincirli', 'fight', 'Zincire vurulmuş safları boz.'],
    [18, 'Kızıl Sundurma', 'Sundurma Nöbetçisi', 'fight', 'Sundurmadaki bekçileri indir.'],
    [19, 'Taç Kapısı', 'Kapı Lejyoneri', 'fight', 'Taç kapısının önünü aç.'],
    [20, 'Kırık Taç', 'Taçsı Hükümdar', 'boss', 'Kırık tacın sahibini tahtından indir.'],
    [21, 'Kuyu Yokuşu', 'Kuyu Akıncısı', 'fight', 'Yıldız kuyusuna inen yokuşu temizle.'],
    [22, 'İlk Halka', 'Halka Nöbetçisi', 'fight', 'Kuyunun ilk halkasını geç.'],
    [23, 'Fısıltı Basamağı', 'Fısıltı Büyücüsü', 'fight', 'Basamaklardaki fısıltıyı kes.'],
    [24, 'Cam Köprü', 'Cam Muhafız', 'fight', 'Cam köprüdeki safları dağıt.'],
    [25, 'Kuyu Seçkinleri', 'Kuyu Seçkini', 'elite', 'Kuyunun seçkin nöbetini boz.'],
    [26, 'Derin Sahanlık', 'Sahanlık Bekçisi', 'fight', 'Derindeki sahanlığı aç.'],
    [27, 'Yankı Odası', 'Yankı Müridi', 'fight', 'Yankıyı büyüyle besleyenleri sustur.'],
    [28, 'Son Halka', 'Halka Şövalyesi', 'fight', 'Son halkayı tutan şövalyeleri yen.'],
    [29, 'Kuyu Eşiği', 'Eşik Bekçisi', 'fight', 'Eşiğin önündeki son safları yar.'],
    [30, 'Yıldız Kuyusu', 'Kuyu Hükümdarı', 'boss', 'Kuyunun dibindeki yıldızsız iradeyi boz.'],
  ];
  return rows.map(([id, name, enemyName, rank, description]) => {
    const objective = id === 10 ? 'seal' : id === 20 || id === 30 ? 'priority' : (LATER_GOALS[id] || null);
    const surviveMs = objective === 'survive' ? SURVIVE_MS[id] : null;
    const goal = objective === 'survive' ? ` Görev: ${Math.round(surviveMs / 1000)} saniye dayan.` : objective === 'protect' ? ' Görev: Emanet’i koru.' : objective === 'priority' ? ' Görev: işaretli hedefi indir.' : objective === 'seal' ? ' Görev: mühürü kır, sonra lordu indir.' : '';
    return {
    id, chapter: id <= 10 ? 1 : id <= 20 ? 2 : 3, name, enemyName, description: description + goal, rank, objective, surviveMs,
    enemyCount: rank === 'boss' ? 5 : 4,
    recommendedPower: 980 + (id - 8) * 85,
    reward: { gold: 520 + (id - 8) * 35, wood: 210 + (id - 8) * 16, stone: 190 + (id - 8) * 14, aether: 68 + (id - 8) * 3 },
    victory: `${name} düştü. Yol bir basamak daha indi.`,
  }; });
}

const MAX_OFFLINE = 4 * 60 * 60 * 1000, MAX_RESOURCE = 1e9, MAX_HERO_LEVEL = 20, MAX_HERO_STARS = 5;
export const OATHS = [
  { id: 'collect', name: 'İlk hasat', detail: 'Biriken üretimi topla.', reward: { gold: 80, wood: 40 } },
  { id: 'farm', name: 'Avluyu yükselt', detail: 'Hasat Avlusu’nu 2. seviyeye çıkar.', reward: { wood: 60, stone: 30 } },
  { id: 'hero', name: 'Yemini güçlendir', detail: 'Bir kahramanı geliştir.', reward: { gold: 40, aether: 15 } },
  { id: 'march', name: 'Geçidi tut', detail: 'Kül Geçidi’ni kazan.', reward: { gold: 100, stone: 40 } },
  { id: 'arm', name: 'Kuşan', detail: 'Bir kahramana ekipman tak.', reward: { gold: 70, wood: 30 } },
  { id: 'keep', name: 'Kaleyi yükselt', detail: 'Yıldız Kalesi’ni 2. seviyeye çıkar.', reward: { wood: 40, stone: 50, aether: 8 } },
  { id: 'chapel', name: 'Şapele yürü', detail: 'Kırık Şapel’i kazan.', reward: { gold: 120, aether: 20 } },
];
export const LOGIN_REWARDS = [
  { gold: 50 }, { wood: 40 }, { stone: 30 }, { gold: 80, wood: 20 },
  { aether: 10 }, { gold: 100, stone: 40 }, { gold: 150, wood: 60, aether: 15 },
];
export const DAILY_TASKS = [
  { id: 'collect', name: 'Üretimi topla', need: 1, reward: { gold: 40 } },
  { id: 'upgrade', name: 'Bir yapı veya kahraman geliştir', need: 1, reward: { wood: 30, stone: 20 } },
  { id: 'battle', name: 'Bir seferi bitir', need: 1, reward: { gold: 50, aether: 8 } },
];
const utcDay = now => { const date = new Date(now); return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`; };
const emptyDaily = now => ({ stamp: utcDay(now), lastLogin: '', streak: 0, tasks: { collect: 0, upgrade: 0, battle: 0 }, claimedTasks: [] });
const emptyDeeds = () => ({ collects: 0, upgrades: 0, battles: 0 });
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
    oaths: [], stars: {}, starChests: [], deeds: emptyDeeds(), daily: emptyDaily(safeNow(now)),
    tower: { week: towerWeek(safeNow(now)), floor: 1, best: 0 },
    muted: false, tutorial: 0,
  };
}
export const CAMPAIGN_CHAPTERS = [
  { id: 1, name: 'Kül Yolu', land: 'Kuzey sınırı' },
  { id: 2, name: 'Kırık Taç', land: 'Batı harabeleri' },
  { id: 3, name: 'Yıldız Kuyusu', land: 'Güney uçurumu' },
];
export const towerWeek = now => Math.floor(safeNow(now) / (7 * 86400000));

export const LESSONS = [
  { hero: 'aldren', name: 'Aldren', line: 'Bu tepe sönmesin diye ayaktayız. Önce birikeni topla.' },
  { hero: 'lyra', name: 'Lyra', line: 'Hasat Avlusu’nu bir kez yükselt. Tepede bir sancak belirecek.' },
  { hero: 'rovan', name: 'Rovan', line: 'Kül Geçidi’ne yürü. Biz saldırırız. Sen hazır yeteneği seçersin.' },
];
export function lessonFor(state) {
  const step = state?.tutorial || 0;
  return step < LESSONS.length ? LESSONS[step] : null;
}
export function advanceLesson(state) {
  state.tutorial = Math.min(LESSONS.length, (state.tutorial || 0) + 1);
  return lessonFor(state);
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
      const savedHero = saved.heroes?.[hero.id];
      const heroState = { level: integer(savedHero?.level, 1, MAX_HERO_LEVEL) ? savedHero.level : 1 };
      if (integer(savedHero?.stars, 1, MAX_HERO_STARS)) heroState.stars = savedHero.stars;
      state.heroes[hero.id] = heroState;
    }
    if (validTeam(state, saved.team)) state.team = [...saved.team];
    if (integer(saved.selectedStage, 1, Math.min(STAGES.length, nextStage(state)))) state.selectedStage = saved.selectedStage;
    if (timestamp(saved.lastCollected)) state.lastCollected = Math.min(time, saved.lastCollected);
    restoreGear(state,saved);
    state.oaths = OATHS.map(oath => oath.id).filter(id => Array.isArray(saved.oaths) && saved.oaths.includes(id));
    state.stars = {};
    for (const stage of STAGES) {
      const earned = saved.stars?.[stage.id];
      if (integer(earned, 1, 3)) state.stars[stage.id] = earned;
    }
    state.starChests = STAGES.map(stage => stage.id).filter(id => Array.isArray(saved.starChests) && saved.starChests.includes(id));
    state.deeds = emptyDeeds();
    for (const key of Object.keys(state.deeds)) if (integer(saved.deeds?.[key], 0, 100000)) state.deeds[key] = saved.deeds[key];
    state.daily = restoreDaily(saved.daily, time);
    state.tower = restoreTower(saved.tower, time);
    state.battle = restoreBattle(state, saved.battle);
    state.muted = saved.muted === true;
    if (integer(saved.tutorial, 0, LESSONS.length)) state.tutorial = saved.tutorial;
    else if (state.cleared.length || state.oaths.length) state.tutorial = LESSONS.length;
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
  noteDeed(state, 'collect', now);
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
  noteDeed(state, 'upgrade', now);
  return { ok: true };
}

export function nextStep(state) {
  const hero = state.team
    .map(id => ({ id, cost: heroCost(state, id), hero: heroById(id) }))
    .filter(item => item.cost && state.heroes[item.id].level < MAX_HERO_LEVEL && canPay(state, item.cost))
    .sort((a, b) => a.cost.gold - b.cost.gold)[0];
  if (hero) return { kind: 'hero', id: hero.id, detail: `${hero.hero.name} şimdi geliştirilebilir. Bir sonraki deneme buna dayanır.` };
  const building = BUILDINGS
    .map(item => ({ item, cost: upgradeCost(state, item.id) }))
    .filter(({ item, cost }) => cost && state.buildings[item.id] < item.maxLevel && (item.id === 'keep' || state.buildings[item.id] < state.buildings.keep + 1) && canPay(state, cost))
    .sort((a, b) => (a.cost.gold || 0) - (b.cost.gold || 0))[0];
  if (building) return { kind: 'building', id: building.item.id, detail: `${building.item.name} şimdi geliştirilebilir. Tepede yeni bir iz bırakır.` };
  if (Object.values(production(state)).some(amount => amount > 0)) return { kind: 'collect', detail: 'Birikmiş üretimi topla. Sonraki geliştirme ona bağlı.' };
  return { kind: 'wait', detail: 'Üretim birikince topla, sonra en ucuz kahramanı geliştir.' };
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
  noteDeed(state, 'upgrade');
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
  const starMod = 1 + (state.heroes[id].stars || 0) * 0.08;
  const maxHp = Math.round(hero.hp * (1 + (level - 1) * 0.12) * (1 + (state.buildings.tavern - 1) * 0.04) * starMod) + gear.hp;
  return { id, name: hero.name, color: hero.color, hp: maxHp, maxHp, armor:gear.armor, healing:gear.healing,
    attack: Math.round(hero.attack * (1 + (level - 1) * 0.15) * (1 + (state.buildings.forge - 1) * 0.05) * starMod) + gear.attack };
}
export function heroStarCost(state, id) {
  if (!state.heroes[id]) return null;
  const rank = state.heroes[id].stars || 0;
  return { gold: 120 * (rank + 1), aether: 12 * (rank + 1) };
}
export function raiseHeroStar(state, id) {
  if (!state.heroes[id] || !unlocked(state, heroById(id))) return fail('Bu kahraman henüz katılmadı.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  const rank = state.heroes[id].stars || 0;
  if (rank >= MAX_HERO_STARS) return fail('Kahraman en yüksek yıldızda.');
  const cost = heroStarCost(state, id);
  if (!canPay(state, cost)) return fail('Yeterli kaynak yok.');
  pay(state, cost);
  state.heroes[id].stars = rank + 1;
  return { ok: true, stars: state.heroes[id].stars };
}

function restoreDaily(saved, now) {
  const daily = emptyDaily(now);
  if (!saved || typeof saved !== 'object') return daily;
  if (typeof saved.stamp === 'string' && /^\d{4}-\d{1,2}-\d{1,2}$/.test(saved.stamp)) daily.stamp = saved.stamp;
  if (typeof saved.lastLogin === 'string' && saved.lastLogin.length < 16) daily.lastLogin = saved.lastLogin;
  if (integer(saved.streak, 0, 9999)) daily.streak = saved.streak;
  for (const key of Object.keys(daily.tasks)) if (integer(saved.tasks?.[key], 0, 100000)) daily.tasks[key] = saved.tasks[key];
  daily.claimedTasks = DAILY_TASKS.map(task => task.id).filter(id => Array.isArray(saved.claimedTasks) && saved.claimedTasks.includes(id));
  return daily;
}
export function syncDaily(state, now = Date.now()) {
  const day = utcDay(safeNow(now));
  if (!state.daily || state.daily.stamp === day) return false;
  state.daily.stamp = day;
  state.daily.tasks = { collect: 0, upgrade: 0, battle: 0 };
  state.daily.claimedTasks = [];
  return true;
}
function noteDeed(state, kind, now = Date.now()) {
  if (!state.daily || !state.deeds) return;
  syncDaily(state, now);
  if (state.deeds[kind === 'collect' ? 'collects' : kind === 'upgrade' ? 'upgrades' : 'battles'] < 100000) {
    state.deeds[kind === 'collect' ? 'collects' : kind === 'upgrade' ? 'upgrades' : 'battles']++;
  }
  if (state.daily.tasks[kind] < 100000) state.daily.tasks[kind]++;
}
function oathMet(state, id) {
  if (id === 'collect') return state.deeds.collects > 0;
  if (id === 'farm') return state.buildings.farm >= 2;
  if (id === 'hero') return Object.values(state.heroes).some(hero => hero.level >= 2);
  if (id === 'march') return state.cleared.includes(1);
  if (id === 'arm') return Object.values(state.loadouts || {}).some(slots => slots && Object.keys(slots).length > 0);
  if (id === 'keep') return state.buildings.keep >= 2;
  if (id === 'chapel') return state.cleared.includes(2);
  return false;
}
export function currentOath(state) {
  return OATHS.find(oath => !state.oaths?.includes(oath.id)) || null;
}
export function oathStatus(state, id) {
  if (!OATHS.some(oath => oath.id === id)) return 'unknown';
  if (state.oaths?.includes(id)) return 'claimed';
  if (currentOath(state)?.id !== id) return 'later';
  return oathMet(state, id) ? 'ready' : 'open';
}
export function claimOath(state, id) {
  const oath = OATHS.find(item => item.id === id);
  const next = currentOath(state);
  if (!oath || !next || next.id !== id) return fail('Önce sıradaki yemini tamamla.');
  if (state.oaths.includes(id)) return fail('Bu yemin zaten alındı.');
  if (!oathMet(state, id)) return fail('Yemin henüz tamamlanmadı.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  state.oaths.push(id);
  award(state, oath.reward);
  return { ok: true, reward: { ...oath.reward } };
}
export function claimLogin(state, now = Date.now()) {
  const time = safeNow(now);
  syncDaily(state, time);
  const day = utcDay(time);
  if (state.daily.lastLogin === day) return fail('Bugünün armağanı alındı.');
  const yesterday = utcDay(time - 86400000);
  state.daily.streak = state.daily.lastLogin === yesterday ? Math.min(9999, state.daily.streak + 1) : 1;
  state.daily.lastLogin = day;
  const reward = LOGIN_REWARDS[(state.daily.streak - 1) % LOGIN_REWARDS.length];
  award(state, reward);
  return { ok: true, reward: { ...reward }, streak: state.daily.streak };
}
export function claimDailyTask(state, id, now = Date.now()) {
  syncDaily(state, now);
  const task = DAILY_TASKS.find(item => item.id === id);
  if (!task) return fail('Bilinmeyen günlük iş.');
  if (state.daily.claimedTasks.includes(id)) return fail('Bu işin ödülü alındı.');
  if ((state.daily.tasks[id] || 0) < task.need) return fail('Günlük iş henüz bitmedi.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  state.daily.claimedTasks.push(id);
  award(state, task.reward);
  return { ok: true, reward: { ...task.reward } };
}
export function battleStars(battle) {
  if (!battle || battle.status !== 'won') return 0;
  let stars = 1;
  if (battle.allies?.every(unit => unit.hp > 0)) stars++;
  const fast = battle.live ? battle.live.elapsedMs <= 75000 : battle.round <= 6;
  if (fast) stars++;
  return stars;
}
export function claimStarChest(state, stageId) {
  const stage = stageById(stageId);
  if (!stage) return fail('Bilinmeyen bölge.');
  if ((state.stars?.[stageId] || 0) < 3) return fail('Sandık için üç yıldız gerekli.');
  if (state.starChests.includes(stageId)) return fail('Yıldız sandığı zaten alındı.');
  if (activeBattle(state)) return fail('Önce devam eden savaşı tamamla.');
  state.starChests.push(stageId);
  const reward = { gold: 60 + stageId * 20, aether: 4 + stageId };
  award(state, reward);
  return { ok: true, reward };
}
function restoreTower(saved, now) {
  const week = towerWeek(now);
  const best = integer(saved?.best, 0, 500) ? saved.best : 0;
  if (saved && integer(saved.week, 0, 1e9) && saved.week === week) {
    return { week, floor: integer(saved.floor, 1, 500) ? saved.floor : 1, best };
  }
  return { week, floor: 1, best };
}
function towerEnemies(floor) {
  const count = 3 + (floor % 5 === 0 ? 2 : floor % 3 === 0 ? 1 : 0);
  const hp = Math.round(70 * 1.12 ** (floor - 1));
  const attack = Math.round(11 * 1.08 ** (floor - 1));
  return Array.from({ length: count }, (_, index) => {
    const role = floor % 10 === 0 && index === 0 ? 'boss' : floor % 5 === 0 && index === 0 ? 'elite' : index % 2 ? 'caster' : 'raider';
    const scaledHp = Math.round(hp * (role === 'boss' ? 1.65 : role === 'elite' ? 1.4 : role === 'caster' ? 0.8 : 1));
    const scaledAttack = Math.round(attack * (role === 'boss' ? 1.15 : role === 'elite' ? 1.1 : role === 'caster' ? 0.85 : 1));
    const name = role === 'boss' ? `Kule Efendisi ${floor}` : role === 'elite' ? `Kule Seçkini ${floor}` : `Kule Nöbetçisi ${index + 1}`;
    return { id: `enemy-${index + 1}`, name, role, hp: scaledHp, maxHp: scaledHp, attack: scaledAttack };
  });
}
export function towerAffix(floor) {
  return floor % 3 === 2 ? 'brand' : floor % 3 === 0 ? 'siphon' : 'ash';
}
export function towerReward(floor) {
  return { gold: 30 + floor * 18, wood: 10 + floor * 6, aether: 2 + Math.floor(floor / 2) };
}
export function startTower(state, now = Date.now()) {
  if (activeBattle(state)) return fail('Devam eden bir savaş var.');
  if (!validTeam(state, state.team)) return fail('Üç kahramanlık takımını tamamla.');
  const tower = restoreTower(state.tower, now);
  state.tower = tower;
  const battle = newBattle(state, STAGES[0]);
  battle.towerFloor = tower.floor;
  battle.affix = towerAffix(tower.floor);
  battle.enemies = towerEnemies(tower.floor);
  battle.reward = towerReward(tower.floor);
  battle.log = [`Yıldız Kulesi ${tower.floor}. kat: nöbetçiler hazır.`];
  state.battle = battle;
  return { ok: true, floor: tower.floor };
}
function finishTower(state, events) {
  const battle = state.battle;
  const won = battle.enemies.every(unit => unit.hp <= 0);
  const lost = battle.allies.every(unit => unit.hp <= 0);
  if (won) {
    battle.status = 'won';
    if (!battle.rewardApplied) {
      award(state, battle.reward);
      const tower = state.tower || { week: towerWeek(Date.now()), floor: battle.towerFloor, best: 0 };
      tower.best = Math.max(tower.best || 0, battle.towerFloor);
      tower.floor = battle.towerFloor + 1;
      state.tower = tower;
      battle.rewardApplied = true;
      noteDeed(state, 'battle');
      events.push(`Yıldız Kulesi ${battle.towerFloor}. kat düştü. Sıradaki kat açıldı.`);
    }
  } else if (lost) {
    battle.status = 'lost';
    battle.rewardApplied = true;
    events.push('Kule bu hafta burada seni bekliyor. Kaynak kaybetmedin.');
  }
  return battle.status !== 'active';
}

export function teamPower(state) {
  return Math.round(state.team.reduce((sum, id) => {
    const hero = heroStats(state, id);
    return sum + hero.attack * 2 + hero.maxHp * 0.35 + hero.armor * 2 + hero.healing;
  }, 0));
}

function newBattle(state, stage, combatVersion=2) {
  const battle = { stageId: stage.id, round: 0, status: 'active', combatVersion, targetId:null,
    allies: state.team.map(id => heroStats(state, id)),
    enemies: encounterEnemies(stage,combatVersion),
    starCharge: 40, log: [`${stage.name}: Kahramanlar savaşa hazır.`], reward: clone(stage.reward), rewardApplied: false, loot: null };
  if (stage.objective) {
    battle.objective = stage.objective;
    if (stage.objective === 'survive') {
      battle.surviveMs = stage.surviveMs || 28000;
      battle.surviveRounds = Math.max(4, Math.round(battle.surviveMs / 5600));
    }
    if (stage.objective === 'priority' && battle.enemies[0]) {
      battle.enemies[0].objective = true;
      battle.enemies[0].name = `${stage.enemyName} · Hedef`;
    }
    if (stage.objective === 'protect') {
      battle.allies.push({ id: 'ward', name: 'Emanet', hp: 140, maxHp: 140, attack: 0, armor: 8, healing: 0, color: '#c5ced6' });
      battle.log.push('Emanet seninle. Düşerse sefer biter.');
    }
    if (stage.id === 10) {
      const boss = battle.enemies.find(unit => unit.role === 'boss');
      if (boss) { boss.sealMax = Math.round(boss.maxHp * 0.35); boss.seal = boss.sealMax; boss.sealRefilled = false; }
    }
  }
  return battle;
}

function restoreBattle(state, saved) {
  if (saved?.towerFloor) return null;
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
  battle.targetId = battle.enemies.some(enemy=>enemy.id===saved.targetId && enemy.hp>0)?saved.targetId:null;
  battle.round = saved.round;
  battle.starCharge = integer(saved.starCharge, 0, 100) ? saved.starCharge : 40;
  battle.log = Array.isArray(saved.log) ? saved.log.filter(line => typeof line === 'string').slice(-30).map(line => line.slice(0, 240)) : battle.log;
  // Loading a completed battle must never grant its reward a second time.
  battle.rewardApplied = saved.status !== 'active';
  battle.loot = saved.status === 'won' && saved.loot === FIRST_CLEAR_LOOT[saved.stageId] ? saved.loot : null;
  restoreLiveCombat(battle,saved.live);
  const outcome = combatOutcome(battle);
  if ((saved.status === 'active' && outcome) || (saved.status !== 'active' && outcome !== saved.status)) return null;
  battle.status = saved.status;
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
  if (target?.role === 'boss' && (target.stageId === 10 || target.seal > 0)) return bossStrike(target, amount);
  const damage = Math.min(target.hp, Math.max(1, Math.round(amount)));
  target.hp -= damage;
  return damage;
}

function finishBattle(state, events) {
  const battle = state.battle;
  if (battle.towerFloor) return finishTower(state, events);
  const outcome = combatOutcome(battle);
  if (outcome === 'won') {
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
      state.stars[battle.stageId] = Math.max(state.stars[battle.stageId] || 0, battleStars(battle));
      noteDeed(state, 'battle');
    }
    events.push(battle.objective === 'survive' ? 'Süre doldu. Kalan saflar dağıldı.' : battle.objective === 'priority' ? 'Hedef düştü. Artıklar kaçtı.' : 'Zafer! Ganimet kaleye taşındı.');
  } else if (outcome === 'lost') {
    battle.status = 'lost';
    if (!battle.rewardApplied) noteDeed(state, 'battle');
    battle.rewardApplied = true;
    events.push(battle.objective === 'protect' && battle.allies.some(unit => unit.id === 'ward' && unit.hp <= 0) && battle.allies.some(unit => unit.id !== 'ward' && unit.hp > 0) ? 'Emanet düştü. Sefer burada biter.' : 'Takım geri çekildi. Kahramanlarını güçlendirip yeniden deneyebilirsin.');
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
      if (hero.id === 'ward') continue;
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
      if(action==='star' && ['crush','cleave','brand','siphon'].includes(intent.type)) {
        events.push(`${enemy.name}: ${intent.label} yıldız çağrısıyla bozuldu!`);
        frame(enemy.id,'interrupt','Yıkım engellendi');
        continue;
      }
      const ward = battle.objective === 'protect' ? aliveAllies().find(hero => hero.id === 'ward') : null;
      const tank = aliveAllies().find(hero => hero.id === 'aldren') || aliveAllies().find(hero => hero.id === 'aurelion');
      const heroes = aliveAllies().filter(hero => hero.id !== 'ward');
      const front = ward && battle.round % 2 === 1 ? ward : (tank || heroes.sort((a,b)=>a.hp-b.hp)[0]);
      const targets = intent.type==='strike'?[front]:aliveAllies();
      for(const target of targets) {
        const pressure = intent.type === 'brand' ? crownPressure(battle, target, enemy) : 1;
        const damage=hit(target,enemy.attack*intent.multiplier*pressure*(tank?.id==='aldren'?.85:tank?.id==='aurelion'?.92:1)*(1-target.armor/100)*(action==='guard'?.5:1));
        events.push(`${enemy.name}, ${target.name} için ${damage} hasar verdi.`);
      }
      frame(enemy.id,intent.type,intent.label);
      if (intent.type === 'siphon' && aliveEnemies().length) {
        const wounded = aliveEnemies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        const healed = Math.min(wounded.maxHp - wounded.hp, Math.round(enemy.attack * (intent.heal || 0.45)));
        wounded.hp += healed;
        if (healed) events.push(`${enemy.name}, kuyudan ${wounded.name} için ${healed} can çekti.`);
      }
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
