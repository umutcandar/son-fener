import * as R from './rules.js';
import { createCity2D, CITY_SPOTS } from './city-2d.js';
import { ROLES, HERO_LORE, CHAPTERS } from './content.js';
import { BUILDING_EVOLUTION } from './building-evolution.js';
import { battleMarkup } from './battle-view.js';
import { createBattleRunner } from './battle-runner.js';

const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const number = value => new Intl.NumberFormat('tr-TR', { notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value);
const iconPaths = {
  keep: '<path d="M4 20V8l4 2V7l4 2V4h4v7l4-2v11z"/><path d="M9 20v-5h6v5M12 4V2"/>',
  farm: '<path d="M4 20V10l8-6 8 6v10M8 20v-5h8v5M12 4V2M3 7l2 1M21 7l-2 1"/>',
  lumber: '<path d="M4 20 19 5M7 17l-3-3M10 14l-3-3M13 11l-3-3M16 8l-3-3M19 5l2-2"/>',
  quarry: '<path d="m3 19 5-8 3 4 4-9 6 13zM7 19h10"/>',
  forge: '<path d="M4 20h16M7 17l2-5h6l2 5M12 12V4M9 7l3-3 3 3"/>',
  tavern: '<path d="M5 21V5h14v16M8 5V3h8v2M9 9h6M9 13h6M9 17h6"/>',
  observatory: '<circle cx="12" cy="12" r="3"/><path d="m3 16 5-5 4 4 8-9M16 6h4v4"/>',
  heroes: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.4-4.2 3.2-6.5 8-6.5s7.6 2.3 8 6.5M12 2v2M8 8h.1M16 8h.1"/>',
  expedition: '<path d="m3 20 7-17 4 10 7-3-9 13-3-10z"/>',
  keepMenu: '<path d="M3 20V8l4 2V7l5 2V4h4v7l5-2v11z"/>',
  journal: '<path d="M5 3h14v18H5zM8 7h8M8 11h8M8 15h5"/>',
  star: '<path d="m12 2 2.4 6.8L21 11l-6.6 2.3L12 20l-2.4-6.7L3 11l6.6-2.2z"/>',
  shop: '<path d="M3 8h18l-2-5H5zM5 8v13h14V8M9 21v-7h6v7"/><path d="M3 8c0 5 6 5 6 0 0 5 6 5 6 0 0 5 6 5 6 0"/>',
  armor: '<path d="m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5zM12 5v14M7 8h10"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M15 8.5c-.7-.7-1.5-1-2.7-1-1.5 0-2.5.8-2.5 2s.9 1.8 2.5 2.1 2.5.8 2.5 2-.9 2.2-2.7 2.2c-1.1 0-2.1-.4-2.9-1.2M12 6v12"/>',
  wood: '<path d="m5 4 14 16M8 7l3-3M11 10l4-4M14 13l3-3M17 16l3-3"/>',
  stone: '<path d="m12 3 8 4v10l-8 4-8-4V7zM4 7l8 5 8-5M12 12v9"/>',
};
const svg = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.star}</svg>`;
const resourceIcon = { gold: 'coin', wood: 'wood', stone: 'stone', aether: 'star' };
const resourceName = { gold: 'Altın', wood: 'Kereste', stone: 'Taş', aether: 'Yıldız özü' };
const navItems = [ ['keep', 'keep', 'Köy'], ['heroes', 'heroes', 'Kahramanlar'], ['expedition', 'expedition', 'Seferler'], ['armory', 'forge', 'Cephanelik'], ['shop', 'shop', 'Mağaza'], ['journal', 'journal', 'Kronik'] ];
const sourceBuilding = { gold: 'farm', wood: 'lumber', stone: 'quarry', aether: 'observatory' };
let state;
try { state = R.restoreState(localStorage.getItem(R.STORAGE_KEY)); } catch { state = R.createState(); }
let battleSpeed=1, battleFxExpires=0;
let activeView = 'keep', selectedBuilding = 'keep', toastTimer, scene, selectedSlot = 0, selectedArmoryHero = 'aldren', trialState = null;
const cityLabelNodes = new Map();
const resourcesEl = $('#resources'), navEl = $('#navigation'), inspectorEl = $('#inspector'), workspaceEl = $('#workspace'), questEl = $('#next-quest');
const combatRunner=createBattleRunner({
  advance:tickCombat,
  canRun:()=>$('#battle-dialog').open&&!document.hidden&&(trialState||state).battle?.status==='active',
  onPause:()=>{if(!trialState)persist(); if($('#battle-dialog').open)renderBattle();},
});

let saveLabel = 'Yerel kayıt hazır';
function persist() {
  try { localStorage.setItem(R.STORAGE_KEY, JSON.stringify(state)); saveLabel = 'Yerel kayıt hazır'; }
  catch { saveLabel = 'Kayıt alanı dolu'; }
  const status = $('#save-status'); if (status) status.textContent = saveLabel;
}
function notify(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}
const motionOK = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function flyLoot(origin, gain) {
  if (!motionOK() || !origin) return;
  for (const [id, amount] of Object.entries(gain || {})) {
    if (!amount) continue;
    const target = document.querySelector(`.resource[data-res="${id}"]`);
    if (!target) continue;
    const end = target.getBoundingClientRect();
    const count = Math.min(4, Math.max(2, Math.ceil(amount / 80)));
    for (let i = 0; i < count; i++) {
      const token = document.createElement('span');
      token.className = 'loot-token';
      token.innerHTML = svg(resourceIcon[id]);
      token.style.left = `${origin.left + origin.width / 2}px`;
      token.style.top = `${origin.top + origin.height / 2}px`;
      document.body.append(token);
      const dx = end.left + end.width / 2 - (origin.left + origin.width / 2) + (i - (count - 1) / 2) * 14;
      const dy = end.top + end.height / 2 - (origin.top + origin.height / 2);
      const anim = token.animate([
        { transform: 'translate(-50%, -50%) scale(.55)', opacity: 0 },
        { transform: `translate(calc(-50% + ${dx * .25}px), calc(-50% - 28px)) scale(1)`, opacity: 1, offset: .35 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.4)`, opacity: .05 },
      ], { duration: 620 + i * 45, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' });
      anim.onfinish = () => token.remove();
    }
    target.classList.add('loot-hit');
    setTimeout(() => target.classList.remove('loot-hit'), 420);
  }
}
function markRaised(id) {
  if (!motionOK()) return;
  const label = cityLabelNodes.get(id);
  if (!label) return;
  label.classList.add('just-raised');
  setTimeout(() => label.classList.remove('just-raised'), 900);
}
function result(action, success) { if (!action.ok) { notify(action.error); return false; } if (success) notify(success); persist(); render(); return true; }
function renderResources() {
  resourcesEl.innerHTML = Object.entries(R.RESOURCES).map(([id, item]) => `<div class="resource" data-res="${id}">${svg(resourceIcon[id])}<span><b>${number(state.res[id])}</b><small>${item.name}</small></span><button type="button" class="res-plus" data-building="${sourceBuilding[id]}" aria-label="${item.name} yapısını aç">+</button></div>`).join('');
}
function renderAccount() {
  const mark = document.querySelector('.avatar-mark');
  if (!mark) return;
  if (!mark.querySelector('img')) mark.innerHTML = '<img src="assets/aldren.webp" alt="Köy muhafızı"><b></b>';
  mark.querySelector('b').textContent = state.buildings.keep;
  const status = $('#save-status'); if (status) status.textContent = saveLabel;
  const power = $('#power-chip'); if (power) power.textContent = `✦ ${number(R.teamPower(state))}`;
}
function renderNav() {
  const prodReady = Object.values(R.production(state)).some(amount => amount > 0);
  const marchReady = state.cleared.length < R.STAGES.length && state.battle?.status !== 'active';
  navEl.innerHTML = navItems.map(([id, icon, label]) => {
    const dot = (id === 'keep' && prodReady) || (id === 'expedition' && marchReady);
    return `<button class="nav-item ${activeView === id ? 'active' : ''}" data-view="${id}" aria-label="${label}" aria-current="${activeView === id ? 'page' : 'false'}">${svg(icon)}<span>${label}</span>${dot ? '<i class="nav-dot" aria-hidden="true"></i>' : ''}</button>`;
  }).join('') + '<div class="rail-foot">✦ &nbsp; V 0.7</div>';
}
function renderPicker() {
  $('#building-picker').innerHTML = R.BUILDINGS.map(building => `<button class="building-choice ${selectedBuilding === building.id ? 'active' : ''}" data-building="${building.id}" aria-label="${building.name}, seviye ${state.buildings[building.id]}">${svg(building.id)}<span>${building.name.replace('Karaorman ', '').replace('Yıldız ', '').replace('Kor ', '').replace('Aytaşı ', '')}</span></button>`).join('');
  $('#keep-caption').textContent = `Köy seviyesi ${state.buildings.keep}`;
  for (const building of R.BUILDINGS) {
    let label = cityLabelNodes.get(building.id);
    if (!label) {
      label = document.querySelector(`.city-sprite[data-building="${building.id}"] .city-label`);
      if (!label) continue;
      cityLabelNodes.set(building.id, label);
    }
    const spot = CITY_SPOTS[building.id];
    if (spot) { label.closest('.city-sprite').style.zIndex = selectedBuilding === building.id ? '3' : '1'; }
    label.querySelector('.city-label-level').textContent = state.buildings[building.id];
    label.querySelector('.city-label-name').textContent = building.name.replace('Karaorman ', '').replace('Yıldız Rasathanesi', 'Rasathane').replace('Kor ', '');
    label.classList.toggle('selected', selectedBuilding === building.id);
  }
  renderCityProduction();
}
function renderCityProduction() {
  const gain = R.production(state);
  const total = Object.values(gain).reduce((sum, n) => sum+n, 0);
  $('#city-production').textContent = total ? Object.entries(gain).filter(([,n])=>n).map(([id,n])=>`${number(n)} ${resourceName[id]}`).join(' · ') : 'Kaynaklar birikiyor';
  $('.city-collect').classList.toggle('ready', total > 0);
}
function costHtml(cost, reward = false) {
  return Object.entries(cost || {}).map(([id, amount]) => `<span class="cost ${!reward && state.res[id] < amount ? 'short' : ''}" title="${resourceName[id]}">${svg(resourceIcon[id])}${reward ? '+' : ''}${number(amount)}</span>`).join('');
}

function buildingProduction() {
  return `<div class="production-box"><div class="production-top"><strong>Köyün üretimi</strong><small>En çok 4 saat</small></div><div class="cost-list" id="production-gain">${costHtml(R.production(state), true)}</div><button class="secondary wide" data-collect>Biriken kaynakları topla</button></div>`;
}

function heroCard(hero) {
  const unlocked = !!state.heroes[hero.id], inTeam = state.team.includes(hero.id), level = state.heroes[hero.id]?.level || 1;
  const cost = R.heroCost(state, hero.id), canUpgrade = unlocked && level < 20 && state.battle?.status !== 'active' && Object.entries(cost).every(([id, amount]) => state.res[id] >= amount);
  const attack = unlocked ? R.heroStats(state,hero.id).attack : hero.attack;
  const hp = unlocked ? R.heroStats(state,hero.id).maxHp : hero.hp;
  return `<article class="hero-card ${inTeam ? 'selected' : ''} ${unlocked ? '' : 'locked'}" style="--hero:${hero.color}">
    <div class="hero-portrait">${heroPortrait(hero)}<span class="role-tag">${ROLES[hero.role]}</span><span class="hero-level">${unlocked ? 'SEV. '+level : 'KİLİTLİ'}</span><div class="portrait-title"><small>${hero.title}</small><h3>${hero.name}</h3></div></div>
    <div class="hero-card-content"><p>${HERO_LORE[hero.id]}</p><div class="hero-stats"><span>⚔ ${attack} saldırı</span><span>♡ ${hp} can</span></div><div class="skill">${R.HERO_ABILITIES[hero.id].name}: ${R.HERO_ABILITIES[hero.id].description}</div>
    ${unlocked ? `<button class="${inTeam ? 'secondary' : 'primary'}" data-team="${hero.id}" ${state.battle?.status === 'active' ? 'disabled' : ''}>${state.team[selectedSlot] === hero.id ? 'Bu konumda' : `${selectedSlot + 1}. konuma ${inTeam ? 'taşı' : 'al'}`}</button><div class="cost-list">${costHtml(cost)}</div><button class="secondary" data-upgrade-hero="${hero.id}" ${canUpgrade ? '' : 'disabled'}>${level >= 20 ? 'En yüksek seviye' : 'Kahramanı geliştir'}</button><button class="text-button wide" data-armory-hero="${hero.id}">Ekipmanlarını düzenle</button>` : `<div class="unlock-note">${svg('expedition')} ${R.STAGES[hero.unlockStage - 1].name} zaferiyle katılır</div>`}</div></article>`;
}

function heroPortrait(hero) {
  return `<img class="character-art" src="assets/${hero.id}.webp" alt="${hero.name}, ${hero.title}" width="1024" height="1536" decoding="async">`;
}

function buildingBenefit(building, level) {
  if (building.production) return `${number(building.production.perMinute * level * (1 + (state.buildings.keep - 1) * .05))} ${resourceName[building.production.resource]} / dk`;
  if (building.id === 'keep') return `+%${Math.round((level - 1) * 5)} üretim`;
  return building.id === 'forge' ? `+%${(level - 1) * 5} takım saldırısı` : `+%${(level - 1) * 4} takım canı`;
}
function renderBuildingDialog() {
  const building = R.BUILDINGS.find(item => item.id === selectedBuilding);
  const level = state.buildings[building.id], maxed = level >= building.maxLevel;
  const cost = R.upgradeCost(state, building.id);
  const missing = Object.entries(cost).filter(([id, amount]) => state.res[id] < amount);
  const reason = maxed ? 'Bu yapı en yüksek seviyeye ulaştı.'
    : state.battle?.status === 'active' ? 'Geliştirmek için devam eden savaşı tamamla.'
    : building.id !== 'keep' && level >= state.buildings.keep + 1 ? `Önce Yıldız Kalesi’ni ${state.buildings.keep + 1}. seviyeye geliştir.`
    : missing.length ? `Eksik kaynak: ${missing.map(([id, amount]) => `${number(amount - state.res[id])} ${resourceName[id]}`).join(', ')}.` : '';
  $('#building-content').innerHTML = `<header class="building-dialog-head"><div class="building-dialog-icon">${svg(building.id)}</div><div><span class="eyebrow">SEVİYE ${level} / ${building.maxLevel}</span><h2 id="building-title">${building.name}</h2></div><button class="icon-button" data-close-building aria-label="Bina penceresini kapat">×</button></header>
    <div class="building-dialog-body"><p class="building-dialog-description">${building.description}</p>
    <div class="building-levels" aria-label="Bina seviyesi ${level}">${Array.from({length:building.maxLevel},(_,i)=>`<span class="${i < level ? 'built' : ''}">${i+1}</span>`).join('')}</div>
    <div class="building-benefit"><span>${buildingBenefit(building,level)}</span>${maxed ? '' : `<span class="benefit-arrow">→</span><strong>${buildingBenefit(building,level+1)}</strong>`}</div>
    <div class="evolution-note"><span>${svg('keepMenu')}</span><div><small>${maxed ? 'TAMAMLANAN YAPI' : 'SONRAKİ GÖRÜNÜM'}</small><strong>${BUILDING_EVOLUTION[building.id][maxed ? level-1 : level]}</strong><p>${maxed ? 'Tüm mimari geliştirmeler tamamlandı.' : 'Geliştirdiğinde bu bölüm binaya eklenir.'}</p></div></div>
    ${maxed ? '' : `<div class="upgrade-costs">${Object.entries(cost).map(([id,amount])=>`<div class="${state.res[id] < amount ? 'short' : ''}">${svg(resourceIcon[id])}<span><b>${number(amount)}</b><small>${resourceName[id]}</small></span></div>`).join('')}</div>`}
    <p class="upgrade-reason" role="status">${reason || 'Kaynaklar hazır. Geliştirme anında tamamlanır.'}</p>
    <button class="primary wide" data-upgrade-building="${building.id}" ${reason ? 'disabled' : ''}>${maxed ? 'En yüksek seviye' : `Seviye ${level+1} · Geliştir`}</button>
    ${missing.length && !maxed ? '<button class="secondary wide collect-in-dialog" data-collect>Biriken üretimi topla</button>' : ''}</div>`;
}
function openBuilding(id) {
  if (!R.BUILDINGS.some(building => building.id === id)) return;
  selectedBuilding = id; activeView = 'keep'; render(); scene?.focus(id);
  renderBuildingDialog();
  if (!$('#building-dialog').open) $('#building-dialog').showModal();
}

function renderInspector() {
  const building = R.BUILDINGS.find(item => item.id === selectedBuilding) || R.BUILDINGS[0], level = state.buildings[building.id], cost = R.upgradeCost(state, building.id);
  const blocked = level >= building.maxLevel || (building.id !== 'keep' && level >= state.buildings.keep + 1) || Object.entries(cost).some(([id, amount]) => state.res[id] < amount) || state.battle?.status === 'active';
  const team = state.team.map(id => R.HEROES.find(hero => hero.id === id));
  inspectorEl.innerHTML = `<div class="building-details"><div class="section-head"><small>KÖY YÖNETİMİ</small><span class="level-badge">SEVİYE ${level}</span></div><div class="building-portrait">${svg(building.id)}</div><h2>${building.name}</h2><p class="building-description">${building.description}</p><div class="stat-line"><span>Gelişim</span><b>${level} / ${building.maxLevel}</b></div>${building.production ? `<div class="stat-line"><span>Üretim hızı</span><b>${number(building.production.perMinute * level * (1 + (state.buildings.keep - 1) * .05))} ${resourceName[building.production.resource]} / dk</b></div>` : `<div class="stat-line"><span>Köy etkisi</span><b>${building.id === 'keep' ? '+%5 üretim / seviye' : building.id === 'forge' ? '+%5 saldırı / seviye' : '+%4 can / seviye'}</b></div>`}<div class="cost-list">${costHtml(cost)}</div><button class="primary wide" data-upgrade-building="${building.id}" ${blocked ? 'disabled' : ''}>${level >= building.maxLevel ? 'En yüksek seviye' : `Yapıyı geliştir · ${number(cost.gold || 0)} altın`}</button>${buildingProduction(building)}</div><div class="squad-block"><div class="squad-heading"><h3>Kahramanlar</h3><button class="text-button" data-view="heroes">Dizilimi düzenle</button></div><div class="squad">${team.map(hero => `<div class="squad-member">${heroPortrait(hero)}<span>${hero.name}</span><small>Lv.${state.heroes[hero.id].level}</small></div>`).join('')}</div><div class="team-power"><span>Dizilim gücü</span><strong>${number(R.teamPower(state))} ✦</strong></div></div><p class="inspector-note">Yapılar yükseldikçe görünüşleri değişir. Üretim çevrimdışı olarak en çok 4 saat birikir.</p>`;
}
function renderQuest() {
  const active = state.battle?.status === 'active';
  const stage = active ? R.STAGES[state.battle.stageId - 1] : R.STAGES[state.cleared.length];
  if (!stage) { questEl.innerHTML = '<div class="quest-seal">✦</div><div class="quest-copy"><small>KUZEY SINIRI KURTARILDI</small><h3>Yemin yerine getirildi</h3><p>Sekiz bölge temizlendi. Seferleri yeniden oynayabilirsin.</p></div><button class="primary" data-action="open-expedition">Seferler</button>'; return; }
  questEl.innerHTML = `<div class="quest-seal">${svg('expedition')}</div><div class="quest-copy"><small>${active ? 'DEVAM EDEN SAVAŞ' : 'SIRADAKİ SEFER'}</small><h3>${stage.name}</h3><p>${active ? 'Savaş sürüyor; yeminlilerini yönet.' : `${stage.description} · Önerilen güç ${stage.recommendedPower}`}</p></div><button class="primary" data-action="${active ? 'resume-battle' : 'open-expedition'}">${active ? 'Savaşa dön' : 'Seferi aç'} ${svg('expedition')}</button>`;
}
function renderHeroes() {
  const chosen = state.team.map(id => R.HEROES.find(hero => hero.id === id));
  workspaceEl.innerHTML = `<header><div><span class="eyebrow">KÜL GECESİNDEN SAĞ KALANLAR</span><h2>Kahramanlar</h2><p>Bir kalkan. Bir kıvılcım. Birlikte tutulan bir yemin.</p></div><button class="secondary" data-close-view>Köye dön</button></header>
    <div class="team-editor"><div><span class="eyebrow">SAVAŞ DİZİLİMİ</span><p>Konumu seç, ardından kahramanı yerleştir.</p></div><strong>${number(R.teamPower(state))}<small>TAKIM GÜCÜ</small></strong></div>
    <div class="formation">${chosen.map((hero, index) => `<button class="formation-slot ${selectedSlot === index ? 'active' : ''}" data-select-slot="${index}" aria-pressed="${selectedSlot === index}">${heroPortrait(hero)}<span><small>${String(index+1).padStart(2,'0')} · ${ROLES[hero.role]}</small><b>${hero.name}</b></span><span class="slot-marker">${selectedSlot === index ? '✦' : '+'}</span></button>`).join('')}</div>
    ${state.battle?.status === 'active' ? '<p class="inline-note">Dizilimi değiştirmek için devam eden savaşı tamamla.</p>' : ''}<div class="hero-grid">${R.HEROES.map(heroCard).join('')}</div>`;
}

function renderExpedition() {
  const next = Math.min(state.cleared.length + 1, R.STAGES.length), currentStage = R.STAGES[next-1], chapter = CHAPTERS[next-1];
  workspaceEl.innerHTML = `<header><div><span class="eyebrow">KUZEY SINIRI · BİRİNCİ BÖLÜM</span><h2>Küllerden doğan yol</h2><p>Köyün ışığını karanlığın unuttuğu topraklara taşı.</p></div><button class="secondary" data-close-view>Köye dön</button></header>
    <div class="campaign-hero"><div><span class="eyebrow">${String(next).padStart(2,'0')} / 08 · ${chapter.name}</span><h3>${currentStage.name}</h3><p>${chapter.brief}</p><span class="tactic">${chapter.tactic}</span></div></div>
    <div class="progress-banner"><span>${state.cleared.length} / 8 bölge temizlendi</span><div class="progress-track"><span style="width:${state.cleared.length / 8 * 100}%"></span></div><span>Takım gücü ${number(R.teamPower(state))}</span></div>
    <div class="stage-list">${R.STAGES.map(stage => {
      const done = state.cleared.includes(stage.id), locked = stage.id > next, resume = state.battle?.status === 'active' && state.battle.stageId === stage.id;
      return `<article class="stage-card ${done ? 'done' : stage.id === next ? 'current' : 'locked'}"><div class="stage-number">${done ? '✓' : String(stage.id).padStart(2, '0')}</div><div><span class="eyebrow">${CHAPTERS[stage.id-1].name}</span><h3>${stage.name}</h3><p>${stage.description} · ${stage.enemyCount} düşman · Önerilen güç ${stage.recommendedPower}</p><div class="cost-list">${costHtml(stage.reward, true)}</div>${R.FIRST_CLEAR_LOOT[stage.id]?`<p class="loot-preview">${svg('forge')} İlk zafer: ${R.itemById(R.FIRST_CLEAR_LOOT[stage.id]).name}${done?' · Alındı':''}</p>`:''}</div><button class="${done ? 'secondary' : 'primary'}" ${resume ? 'data-action="resume-battle"' : `data-stage="${stage.id}"`} ${locked || (state.battle?.status === 'active' && !resume) ? 'disabled' : ''}>${resume ? 'Savaşa dön' : done ? 'Yeniden oyna' : locked ? 'Kilitli' : 'Savaşa gir'}</button></article>`;
    }).join('')}</div>`;
}

function renderJournal() {
  workspaceEl.innerHTML = `<header><div><span class="eyebrow">KÖY ARŞİVİ</span><h2>Kül Gecesi kronikleri</h2><p>Kazandığın her sefer, kaybolmuş dünyanın bir parçasını geri getirir.</p></div><button class="secondary" data-close-view>Köye dön</button></header>
  <div class="journal-prologue"><span class="eyebrow">BAŞLANGIÇ</span><h3>Gökyüzü kırıldığında</h3><p>Yıldızlar düştüğünde krallar surlarını yükseltti. Sabah olmadı. Şimdi vadinin ortasında tek bir hisar parlıyor. İçindeki çekirdek, karanlığı uzakta tutuyor; her gece biraz daha zorlanarak.</p><p>Senin yeminin, bu ışığın sönmesine izin vermemek.</p></div>
  <div class="journal-grid">${CHAPTERS.map((chapter,index) => `<article class="journal-card ${state.cleared.includes(index+1) ? 'done' : ''}"><span class="eyebrow">${String(index+1).padStart(2,'0')} · ${R.STAGES[index].name}</span><h3>${chapter.name}</h3><p>${state.cleared.includes(index+1) ? chapter.victory : 'Bu kayıt, bölge kurtarıldığında günlüğe eklenecek.'}</p><span class="level-badge">${state.cleared.includes(index+1) ? 'KAYDA GEÇTİ' : 'KEŞFEDİLMEDİ'}</span></article>`).join('')}</div>`;
}

function itemStats(item) {
  return Object.entries(item.stats).map(([key,value])=>({attack:`+${value} saldırı`,hp:`+${value} can`,armor:`%${value} hasar azaltma`,healing:`+${value} şifa`})[key]).join(' · ');
}
function itemArt(item) {
  const color = {common:'#a5c6ce',epic:'#bfa0e6',legendary:'#ebc67d'}[item.rarity];
  const art = item.slot==='weapon' ? '<path d="M34 6 42 18 25 43 19 38z" fill="#a8b8c8"/><path d="m34 6-9 37 14-26" fill="#e2e4dd"/><path d="m14 36 18 12M22 43l-8 13" stroke="#c6a166" stroke-width="5"/><path d="m11 56 6 4" stroke="#c6a166" stroke-width="4"/>' : item.slot==='armor' ? '<path d="m20 10-10 7 4 17 8-4-3 23q13 9 26 0l-3-23 8 4 4-17-10-7-6 8H26z" fill="#718999" stroke="#d4b57b" stroke-width="2"/><path d="m22 28 10 7 10-7M22 43l10 6 10-6M32 21v34" stroke="#d4b57b" fill="none"/>' : '<path d="M22 8c-12 24 32 24 20 0" fill="none" stroke="#c6a166" stroke-width="3"/><path d="m32 26 15 16-15 20-15-20z" fill="'+color+'" stroke="#ead7a0" stroke-width="2"/><path d="m32 29 6 13-6 16-7-16z" fill="#ecfaff" opacity=".6"/>';
  return `<svg class="item-art" viewBox="0 0 64 68" aria-hidden="true"><circle cx="32" cy="34" r="28" fill="${color}" opacity=".07"/><circle cx="32" cy="34" r="25" fill="none" stroke="${color}" opacity=".22"/>${art}</svg>`;
}
function renderArmory() {
  if(!state.heroes[selectedArmoryHero]) selectedArmoryHero=state.team[0];
  const hero=R.HEROES.find(hero=>hero.id===selectedArmoryHero), stats=R.heroStats(state,hero.id), gear=R.equipmentStats(state,hero.id);
  workspaceEl.innerHTML=`<header><div><span class="eyebrow">KOR DEMİRHANESİ · SEVİYE ${state.buildings.forge}</span><h2>Kahramanların cephaneliği</h2><p>Ekipman üret, sefer ganimetini kuşan ve kahramanının gücünü değiştir.</p></div><button class="secondary" data-close-view>Köye dön</button></header>
    <div class="armory-heroes" aria-label="Ekipman kahramanı">${R.HEROES.filter(hero=>state.heroes[hero.id]).map(hero=>`<button class="armory-hero ${selectedArmoryHero===hero.id?'active':''}" data-armory-hero="${hero.id}" aria-pressed="${selectedArmoryHero===hero.id}">${heroPortrait(hero)}<span>${hero.name}</span></button>`).join('')}</div>
    <section class="loadout-summary"><div><span class="eyebrow">${hero.title}</span><h3>${hero.name}</h3><p>⚔ ${stats.attack} saldırı · ♡ ${stats.maxHp} can · %${gear.armor} zırh · +${gear.healing} şifa</p></div><div class="loadout-slots">${Object.entries(R.SLOTS).map(([slot,label])=>{const item=R.itemById(state.loadouts[hero.id]?.[slot]);return `<div class="loadout-slot"><small>${label}</small>${item?`${itemArt(item)}<strong>${item.name}</strong><button class="text-button" data-unequip="${slot}" ${state.battle?.status==='active'?'disabled':''}>Çıkar</button>`:'<span class="empty-slot">+</span><strong>Boş konum</strong>'}</div>`;}).join('')}</div></section>
    <p class="armory-tip">${state.battle?.status==='active'?'Ekipman değiştirmek ve üretmek için devam eden savaşı tamamla. ':''}İlk sefer zaferleri ekipman kazandırır. Şifa bonusu yalnızca iyileştirme yeteneği olan kahramanlarda etkilidir. Aynı eşyanın bir kopyası tek kahramana takılabilir.</p>
    <div class="item-grid">${R.ITEMS.map(item=>{
      const count=state.inventory[item.id]||0, equipped=state.loadouts[hero.id]?.[item.slot]===item.id;
      const used=Object.values(state.loadouts).filter(slots=>slots[item.slot]===item.id).length, free=count-used;
      const busy=state.battle?.status==='active', canForge=!busy&&state.buildings.forge>=item.forge&&count<20&&Object.entries(item.cost).every(([id,cost])=>state.res[id]>=cost);
      return `<article class="item-card ${item.rarity}"><div class="item-card-top"><span>${R.RARITIES[item.rarity]} · ${R.SLOTS[item.slot]}</span><small>${count} adet · ${free} boşta</small></div>${itemArt(item)}<h3>${item.name}</h3><p class="item-bonus">${itemStats(item)}</p><p>${item.description}</p><button class="${equipped?'secondary':'primary'} wide" data-equip="${item.id}" ${equipped||free<=0||busy?'disabled':''}>${equipped?'Kuşanıldı':free>0?`${hero.name} · Kuşan`:'Boşta eşya yok'}</button><div class="cost-list">${costHtml(item.cost)}</div><button class="secondary wide" data-forge="${item.id}" ${canForge?'':'disabled'}>${state.buildings.forge<item.forge?`Demirhane seviyesi ${item.forge} gerekli`:'Kaynaklarla üret'}</button></article>`;
    }).join('')}</div>`;
}
function renderShop() {
  workspaceEl.innerHTML=`<header><div><span class="eyebrow">YILDIZ PAZARI</span><h2>Efsanevi yeminler</h2><p>Özel kahramanların yeteneklerini eğitim savaşında keşfet.</p></div><button class="secondary" data-close-view>Köye dön</button></header>
    <div class="shop-status"><strong>Mağaza önizlemesi</strong><span>Gerçek para satışı henüz açık değil. Eğitim denemeleri ücretsizdir ve ilerlemeni değiştirmez.${state.battle?.status==='active'?' Önce devam eden seferini tamamla.':''}</span></div>
    <div class="premium-grid">${R.SPECIAL_HEROES.map(hero=>`<article class="premium-card"><div class="premium-portrait">${heroPortrait(hero)}<span class="premium-seal">EFSANEVİ</span><div class="portrait-title"><small>${hero.title}</small><h3>${hero.name}</h3></div></div><div class="premium-copy"><span class="eyebrow">${ROLES[hero.role]} · ÖZEL KAHRAMAN</span><h3>${hero.name}</h3><p>${hero.description}</p><p class="skill">${R.HERO_ABILITIES[hero.id].name}: ${R.HERO_ABILITIES[hero.id].description}</p><div class="hero-stats"><span>Seviye 1 · ⚔ ${hero.attack} saldırı</span><span>♡ ${hero.hp} can</span></div><p class="trial-note">Denemede takımının ortalama seviyesine uyarlanır.</p><button class="primary wide" data-trial="${hero.id}" ${state.battle?.status==='active'?'disabled':''}>Eğitim savaşında dene</button><button class="secondary wide" disabled>Satış henüz açık değil</button></div></article>`).join('')}</div>
    <div class="shop-armory"><div><span class="eyebrow">KÖY USTALARININ ESERLERİ</span><h3>Gücünü kendin döv</h3><p>9 silah, zırh ve tılsım. Seferlerden kazan veya oyun içi kaynaklarla üret.</p></div><button class="secondary" data-view="armory">Cephaneliğe git →</button></div>`;
}

function renderWorkspace() {
  const open = activeView !== 'keep'; workspaceEl.hidden = !open; inspectorEl.hidden = open; document.querySelector('.app').classList.toggle('panel-open', open); workspaceEl.dataset.view = activeView;
  if (activeView === 'heroes') renderHeroes(); else if (activeView === 'expedition') renderExpedition(); else if (activeView === 'journal') renderJournal(); else if (activeView === 'armory') renderArmory(); else if (activeView === 'shop') renderShop();
}
function renderBattle(fx=null) {
  const dialog=$('#battle-dialog'), battle=(trialState||state).battle;
  if(!battle) return;
  const wasOpen=dialog.open, focused=document.activeElement;
  const focusSelector=focused?.dataset.ability?`[data-ability="${focused.dataset.ability}"]`:focused?.dataset.target?`[data-target="${focused.dataset.target}"]`:focused?.hasAttribute('data-combat-toggle')?'[data-combat-toggle]':focused?.hasAttribute('data-battle-speed')?'[data-battle-speed]':null;
  const markup=battleMarkup({battle,trial:Boolean(trialState),fx,speed:battleSpeed,running:combatRunner.running});
  const previous=$('.combat-shell',dialog);
  if(wasOpen&&previous&&battle.status==='active'&&!$('.combat-outcome',previous)) {
    // Keep interactive targets and skill buttons alive while combat updates around them.
    const template=document.createElement('template');template.innerHTML=markup;
    const next=template.content.firstElementChild;
    previous.className=next.className;
    $('.combat-arena',previous).className=$('.combat-arena',next).className;
    $('.round-pill',previous).innerHTML=$('.round-pill',next).innerHTML;
    for(const fresh of next.querySelectorAll('[data-fighter]')) {
      const actor=$(`[data-fighter="${fresh.dataset.fighter}"]`,previous); if(!actor)continue;
      actor.className=fresh.className;
      if(fresh.tagName==='BUTTON') {
        actor.disabled=fresh.disabled;
        actor.setAttribute('aria-pressed',fresh.getAttribute('aria-pressed'));
        actor.setAttribute('aria-label',fresh.getAttribute('aria-label'));
      }
      for(const selector of ['.enemy-intent','.combat-number','.combat-mark','.interrupted','.fighter-label','.target-caption']) {
        const current=$(selector,actor), replacement=$(selector,fresh);
        if(current&&replacement)current.replaceWith(replacement);
        else if(current)current.remove();
        else if(replacement)actor.append(replacement);
      }
    }
    const callout=$('.action-callout',previous), nextCallout=$('.action-callout',next);
    if(callout)callout.remove();
    if(nextCallout)$('.combat-arena',previous).append(nextCallout);
    $('.tactical-line',previous).replaceWith($('.tactical-line',next));
    $('.live-help',previous).innerHTML=$('.live-help',next).innerHTML;
    $('.combat-history>div',previous).innerHTML=$('.combat-history>div',next).innerHTML;
    for(const selector of ['[data-combat-toggle]','[data-battle-speed]']) {
      const button=$(selector,previous), replacement=$(selector,next);
      button.textContent=replacement.textContent;button.setAttribute('aria-label',replacement.getAttribute('aria-label'));
      if(replacement.hasAttribute('title'))button.title=replacement.title;
    }
  } else $('#battle-content').innerHTML=markup;
  if(!wasOpen) dialog.showModal();
  if(focusSelector) $(focusSelector,dialog)?.focus({preventScroll:true});
  updateLiveHud();
}
function closeBattle() {
  combatRunner.pause();
  if(!trialState)persist();
  $('#battle-dialog').close();
}
function presentBattleEvents(events) {
  const changes=new Map();
  for(const event of events) for(const change of event.changes) {
    const previous=changes.get(change.id)||{id:change.id,delta:0,shieldDelta:0};
    previous.delta+=change.delta; previous.shieldDelta+=change.shieldDelta||0;
    changes.set(change.id,previous);
  }
  const last=events.at(-1);
  battleFxExpires=performance.now()+520/battleSpeed;
  renderBattle({...last,actorIds:events.map(event=>event.actorId),changes:[...changes.values()]});
  setTimeout(updateLiveHud,540/battleSpeed);
}
function updateLiveHud() {
  const battle=(trialState||state).battle;
  if(!battle?.live||!$('#battle-dialog').open)return;
  const seconds=Math.floor(battle.live.elapsedMs/1000), clock=$('.battle-clock');
  if(clock) clock.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  for(const enemy of battle.enemies) {
    const el=$(`[data-intent="${enemy.id}"]`); if(!el)continue;
    const intent=R.liveEnemyIntent(battle,enemy);
    const marked=$(`[data-fighter="${enemy.id}"] .combat-mark`);
    if(marked)marked.hidden=battle.live.enemies[enemy.id].markedUntil<=battle.live.elapsedMs;
    el.firstChild.nodeValue=intent.label+(intent.remaining?` · ${(intent.remaining/1000).toFixed(1)}s`:'');
    const bar=$('i',el); if(bar){bar.style.width=`${Math.max(0,intent.progress||0)*100}%`;bar.hidden=!intent.danger;}
  }
  for(const hero of battle.allies) {
    const actor=$(`[data-fighter="${hero.id}"]`), shield=battle.live.allies[hero.id].shield;
    actor?.classList.toggle('shielded',shield>0);
    const shieldLabel=actor&&$('.fighter-label em',actor);
    if(shieldLabel){shieldLabel.textContent=`⬡ ${shield}`;shieldLabel.hidden=shield<=0;}
    const button=$(`[data-ability="${hero.id}"]`); if(!button)continue;
    const skill=R.abilityState(battle,hero.id);
    button.disabled=!skill.ready; button.classList.toggle('skill-ready',skill.ready);
    button.classList.toggle('skill-fallen',hero.hp<=0);
    $('.ability-energy i',button).style.width=`${skill.energy}%`;
    $('.ability-status',button).textContent=hero.hp<=0?'Savaş dışı':skill.cooldown>0?`${Math.ceil(skill.cooldown/1000)} sn yenileniyor`:skill.ready?'HAZIR · KULLAN':`Enerji %${Math.floor(skill.energy)}`;
  }
  if(battleFxExpires&&performance.now()>=battleFxExpires) {
    $('#battle-content').querySelectorAll('.acting,.struck,.healed').forEach(el=>el.classList.remove('acting','struck','healed'));
    $('#battle-content').querySelectorAll('.combat-number,.action-callout').forEach(el=>el.remove());
    $('.combat-shell')?.classList.remove('star-burst','guard-burst'); battleFxExpires=0;
  }
}
function tickCombat(deltaMs) {
  const combatState=trialState||state, result=R.advanceCombat(combatState,deltaMs);
  if(!result.ok){combatRunner.pause();return;}
  if(result.events.length) {
    if(!trialState)persist();
    if(combatState.battle.status!=='active')render();
    presentBattleEvents(result.events);
  }
  updateLiveHud();
}
function castHeroSkill(heroId) {
  const used=R.useHeroAbility(trialState||state,heroId);
  if(!used.ok)return notify(used.error);
  if(!trialState)persist();
  if((trialState||state).battle.status!=='active'){combatRunner.pause();render();}
  presentBattleEvents(used.events);
}

function render() {
  renderAccount(); renderResources(); renderNav(); renderPicker(); renderInspector(); renderQuest(); renderWorkspace();
  scene?.update(state);
  if ($('#building-dialog').open) renderBuildingDialog();
}
function openBattle(stageId) {
  if (stageId !== undefined) {
    const started = R.startLiveBattle(state, Number(stageId));
    if (!started.ok) return notify(started.error);
  }
  if(state.battle?.status==='active')R.prepareLiveBattle(state);
  persist(); render(); renderBattle();
  combatRunner.resume(); renderBattle();
}
function dispatch(action) {
  const button = action.target.closest('button'); if (!button) return;
  if(button.dataset.cityZoom) { scene?.zoomBy(Number(button.dataset.cityZoom)); return; }
  if(button.hasAttribute('data-city-labels')) { const visible=button.getAttribute('aria-pressed')!=='true'; button.setAttribute('aria-pressed',String(visible)); $('#city-labels').classList.toggle('names-hidden',!visible); return; }
  if(button.hasAttribute('data-battle-speed')) { battleSpeed=battleSpeed===1?2:1; combatRunner.setSpeed(battleSpeed); renderBattle(); return; }
  if(button.hasAttribute('data-combat-toggle')) { if(combatRunner.running)combatRunner.pause();else combatRunner.resume(); renderBattle();return; }
  if(button.dataset.ability) { castHeroSkill(button.dataset.ability);return; }
  if(button.dataset.target) { const selected=R.selectTarget(trialState||state,button.dataset.target); if(selected.ok) { if(!trialState)persist(); renderBattle(); } return; }
  if(button.dataset.armoryHero) { selectedArmoryHero=button.dataset.armoryHero; activeView='armory'; render(); return; }
  if(button.dataset.forge) { result(R.forgeItem(state,button.dataset.forge),'Ekipman üretildi; bir kahramana kuşandırabilirsin.'); return; }
  if(button.dataset.equip) { result(R.equipItem(state,selectedArmoryHero,button.dataset.equip),'Ekipman kuşanıldı. Savaş gücü güncellendi.'); return; }
  if(button.dataset.unequip) { result(R.unequipItem(state,selectedArmoryHero,button.dataset.unequip),'Ekipman çantaya alındı.'); return; }
  if(button.dataset.trial) { if(state.battle?.status==='active') return notify('Önce devam eden savaşı tamamla.'); trialState=R.createHeroTrial(state,button.dataset.trial); renderBattle(); combatRunner.resume(); renderBattle(); return; }
  if (button.dataset.view) { activeView = button.dataset.view; render(); return; }
  if (button.dataset.building) { openBuilding(button.dataset.building); return; }
  if (button.hasAttribute('data-close-building')) { $('#building-dialog').close(); return; }
  if (button.dataset.upgradeBuilding) {
    selectedBuilding = button.dataset.upgradeBuilding;
    const upgraded = R.upgradeBuilding(state, selectedBuilding, Date.now());
    if (upgraded.ok) $('#building-dialog').close();
    const building = R.BUILDINGS.find(item => item.id === selectedBuilding);
    if (result(upgraded, `${building.name} · Seviye ${state.buildings[selectedBuilding]} — ${BUILDING_EVOLUTION[selectedBuilding][state.buildings[selectedBuilding]-1]}`)) markRaised(selectedBuilding);
    return;
  }
  if (button.dataset.upgradeHero) { result(R.upgradeHero(state, button.dataset.upgradeHero), 'Kahraman güçlendi.'); return; }
  if (button.dataset.selectSlot !== undefined) { selectedSlot = Number(button.dataset.selectSlot); renderHeroes(); return; }
  if (button.dataset.team) {
    const id = button.dataset.team, team = [...state.team], previousIndex = team.indexOf(id);
    if (previousIndex >= 0) [team[selectedSlot], team[previousIndex]] = [team[previousIndex], team[selectedSlot]];
    else team[selectedSlot] = id;
    result(R.setTeam(state, team), 'Savaş dizilimi güncellendi.'); return;
  }
  if (button.hasAttribute('data-collect')) {
    const origin = button.getBoundingClientRect();
    const collected = R.collect(state);
    const summary = Object.entries(collected.gain || {}).filter(([, n]) => n).map(([id, n]) => `+${number(n)} ${resourceName[id]}`).join(' · ');
    if (result(collected, `Üretim toplandı: ${summary || 'Henüz biriken kaynak yok.'}`)) flyLoot(origin, collected.gain);
    return;
  }
  if (button.dataset.action === 'open-expedition') { activeView = 'expedition'; render(); return; }
  if (button.dataset.action === 'resume-battle') { openBattle(); return; }
  if (button.dataset.stage) { openBattle(button.dataset.stage); return; }
  if (button.dataset.closeView !== undefined) { activeView = 'keep'; render(); return; }
  if (button.dataset.closeBattle !== undefined) { closeBattle(); render(); return; }
  if (button.dataset.retryStage) { openBattle(button.dataset.retryStage); return; }
}

document.addEventListener('click', dispatch);
$('#recenter').innerHTML = svg('keepMenu');
let buildingBackdropDown = false;
$('#building-dialog').addEventListener('pointerdown', event => { buildingBackdropDown = event.target === $('#building-dialog'); });
$('#building-dialog').addEventListener('click', event => { if (buildingBackdropDown && event.target === $('#building-dialog')) $('#building-dialog').close(); buildingBackdropDown = false; });
$('#battle-dialog').addEventListener('click', event => { if (event.target === $('#battle-dialog')) closeBattle(); });
$('#battle-dialog').addEventListener('cancel', () => { combatRunner.pause(); if(!trialState)persist(); });
$('#battle-dialog').addEventListener('close', () => { combatRunner.pause(); if(trialState) { trialState=null; activeView='shop'; render(); } else persist(); });
try {
  scene = createCity2D($('#city-stage'), { onSelect: openBuilding });
} catch (error) {
  console.warn('Starfort city unavailable:', error);
  $('#city-labels').hidden = true; $('.city-controls').hidden = true; $('#world-fallback').hidden = false;
}
$('#recenter').addEventListener('click', () => { activeView = 'keep'; scene?.overview(); render(); });
if (state.battle?.status === 'active') { R.prepareLiveBattle(state); persist(); renderBattle(); }
render();
setInterval(() => { const pending = $('#production-gain'); if (pending) pending.innerHTML = costHtml(R.production(state), true); renderCityProduction(); renderNav(); }, 3000);
document.addEventListener('visibilitychange', () => { if(document.hidden){combatRunner.pause();persist();} });
window.addEventListener('pagehide', () => {combatRunner.pause();persist();});
