import * as R from './rules.js';
import { storyFor } from './content.js';

const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
// Atlas windows follow the actual painted silhouettes, including capes and weapons.
const sprites = {
  aldren:[1,0,560], lyra:[1,560,525], rovan:[1,1085,451],
  mira:[2,0,575], doran:[2,575,565], vesper:[2,1140,396],
  eira:[3,0,505], aurelion:[3,505,540], nyxara:[3,1045,491],
  raider:['enemies',0,512], caster:['enemies',512,528], boss:['enemies',1040,496],
};
function spriteStyle(id) {
  const [sheet,x,width]=sprites[id]||sprites.raider;
  return `--sheet:url('assets/battle-${sheet==='enemies'?'enemies':`heroes-${sheet}`}.webp');--atlas-size:${1536/width*100}%;--atlas-x:${x/(1536-width)*100}%;--sprite-ratio:${width/1024}`;
}
const health=unit=>`<span class="fighter-health"><i style="width:${Math.max(0,unit.hp)/unit.maxHp*100}%"></i></span>`;

function fighter(unit,index,side,battle,fx) {
  const enemy=side==='enemy', dead=unit.hp<=0, change=fx?.changes.find(change=>change.id===unit.id);
  const selected=enemy&&battle.targetId===unit.id&&!dead;
  const intent=enemy?R.liveEnemyIntent(battle,unit):null;
  const shield=battle.live?.allies[unit.id]?.shield||0;
  const marked=enemy&&(battle.live?.enemies[unit.id]?.markedUntil||0)>(battle.live?.elapsedMs||0);
  const acting=fx?.actorId===unit.id||fx?.actorIds?.includes(unit.id);
  const tag=enemy?'button':'div';
  const shortName=enemy?(unit.role==='boss'?unit.name:`${unit.role==='caster'?'Büyücü':'Akıncı'} ${index+1}`):unit.name;
  return `<${tag} data-fighter="${unit.id}" class="fighter ${shield>0?'shielded':''} ${side} fighter-${index} ${dead?'defeated':''} ${selected?'targeted':''} ${acting?'acting':''} ${change?.delta<0?'struck':''} ${change?.delta>0?'healed':''} ${unit.role==='boss'?'boss':''}" style="${spriteStyle(enemy?unit.role:unit.id)}" ${enemy?`data-target="${unit.id}" aria-pressed="${selected}" aria-label="${esc(unit.name)}, ${unit.hp} / ${unit.maxHp} can. ${esc(intent.label)}. Hedef seç." ${dead||battle.status!=='active'?'disabled':''}`:''}>
    ${enemy&&!dead&&battle.status==='active'?`<span class="enemy-intent ${intent.danger?'danger-intent':''}" data-intent="${unit.id}">${intent.label}${intent.remaining?` · ${(intent.remaining/1000).toFixed(1)}s`:''}${intent.danger?`<i style="width:${intent.progress*100}%"></i>`:''}</span>`:''}
    ${marked?'<span class="combat-mark" title="İşaretli: %25 fazla hasar alır" aria-hidden="true">◎</span>':''}<span class="fighter-ground"></span><span class="battle-sprite" aria-hidden="true"></span>
    ${change&&(change.delta||change.shieldDelta)?`<span class="combat-number ${change.delta>0?'healing-number':!change.delta?'shield-number':''}" aria-hidden="true">${change.delta?`${change.delta>0?'+':''}${change.delta}`:`⬡ ${Math.abs(change.shieldDelta)}`}</span>`:''}
    ${acting&&fx.kind==='interrupt'?'<span class="interrupted">ENGELLENDİ</span>':''}
    <span class="fighter-label"><strong>${esc(shortName)}</strong>${health(unit)}<small>${Math.max(0,unit.hp)} / ${unit.maxHp}${shield?` <em>⬡ ${shield}</em>`:''}</small></span>
    ${selected?'<span class="target-caption">HEDEF</span>':''}
  </${tag}>`;
}

const abilityHints={shield:'Takıma kalkan',star:'Alan hasarı · büyü kesme',mark:'Tek hedef · işaret',heal:'Takıma şifa',stun:'Tek hedef · sersemletme',execute:'Düşük cana infaz',frost:'Alan hasarı · dondurma',sun:'Hasar + takım kalkanı',eclipse:'Alan hasarı + can emme'};
function abilityCard(hero,battle) {
  const skill=R.HERO_ABILITIES[hero.id], status=R.abilityState(battle,hero.id), dead=hero.hp<=0;
  return `<button class="hero-ability ${status.ready?'skill-ready':''} ${dead?'skill-fallen':''}" data-ability="${hero.id}" ${status.ready?'':'disabled'} aria-label="${hero.name}: ${skill.name}. ${skill.description}" title="${skill.description}">
    <img src="assets/${hero.id}.webp" alt="" width="50" height="64"><span class="ability-copy"><small>${hero.name}</small><b>${skill.name}</b><span>${abilityHints[skill.type]}</span></span>
    <span class="ability-energy"><i style="width:${status.energy}%"></i></span><span class="ability-status">${dead?'Savaş dışı':status.cooldown>0?`${Math.ceil(status.cooldown/1000)} sn yenileniyor`:status.ready?'HAZIR · KULLAN':`Enerji %${Math.floor(status.energy)}`}</span>
  </button>`;
}
export function battleMarkup({battle,trial=false,fx=null,speed=1,running=false}) {
  const stage=R.STAGES[battle.stageId-1], done=battle.status!=='active';
  const target=battle.enemies.find(enemy=>enemy.id===battle.targetId&&enemy.hp>0);
  const threats=done?[]:battle.enemies.filter(enemy=>enemy.hp>0&&R.liveEnemyIntent(battle,enemy).danger);
  const heavy=threats.some(enemy=>battle.live.enemies[enemy.id].casting?.kind==='crush');
  const seconds=Math.floor((battle.live?.elapsedMs||0)/1000), clock=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  const label=done?(battle.status==='won'?'ZAFER':'GERİ ÇEKİLME'):running?'ÇATIŞMA SÜRÜYOR':'TAKTİK MOLA';
  return `<section class="combat-shell ${['star','eclipse','sun','frost'].includes(fx?.kind)?'star-burst':''} ${fx?.kind==='shield'?'guard-burst':''}">
    <header class="combat-heading"><div><span class="eyebrow">BÖLGE ${String(stage.id).padStart(2,'0')} · ${trial?'EĞİTİM DENEMESİ':stage.id===8?'SON KUŞATMA':'YILDIZ SEFERİ'}</span><h2 id="battle-title">${stage.name}</h2></div><div class="combat-tools">${!done?`<button class="combat-pause" data-combat-toggle aria-label="${running?'Savaşı duraklat':'Savaşa devam et'}" title="${running?'Taktik mola':'Devam et'}">${running?'Ⅱ':'▶'}</button>`:''}<button class="combat-speed" data-battle-speed aria-label="Savaş hızı: ${speed} kat">${speed}×</button><button class="combat-dismiss" data-close-battle aria-label="Savaşı kapat ve duraklat">×</button></div></header>
    ${trial?'<p class="combat-trial">Ücretsiz deneme · İlerlemen ve kaynakların değişmez.</p>':''}
    <div class="combat-arena ${battle.enemies.length>3?'large-encounter':''} ${!running&&!done?'arena-paused':''}" aria-label="Savaş alanı">
      <div class="arena-vignette"></div><div class="arena-rune" aria-hidden="true">✧</div>
      <div class="round-pill"><b class="battle-clock">${clock}</b><span>${label}</span></div>
      <div class="formation-side allies">${battle.allies.map((hero,index)=>fighter(hero,index,'ally',battle,fx)).join('')}</div>
      <div class="formation-side hostiles">${battle.enemies.map((enemy,index)=>fighter(enemy,index,'enemy',battle,fx)).join('')}</div>
      ${fx?`<div class="action-callout ${['star','eclipse','sun','frost'].includes(fx.kind)?'star-callout':''}" role="status">${esc(fx.label)}</div>`:''}
      ${done?`<div class="combat-outcome ${battle.status}"><span>${battle.status==='won'?'✦':'◇'}</span><h3>${battle.status==='won'?'ZAFER':'YENİDEN DOĞ'}</h3><p>${battle.status==='won'?'Karanlık bir adım geri çekildi.':'Yemin henüz bitmedi.'}</p></div>`:''}
    </div>
    <div class="combat-command live-command">
      ${done?`<div class="combat-rewards"><p>${trial?'Deneme tamamlandı. Kahramanın savaş tarzını gördün.':battle.status==='won'?storyFor(stage).victory:'Kahramanlarını ve ekipmanlarını geliştirerek yeniden deneyebilirsin. Kaynak kaybetmedin.'}</p>${battle.status==='won'&&!trial?`<div class="reward-chips">${Object.entries(battle.reward).map(([id,value])=>`<span>+${value} ${R.RESOURCES[id].name}</span>`).join('')}${battle.loot?`<span class="loot-chip">✧ ${R.itemById(battle.loot).name}</span>`:''}</div>`:''}</div><div class="combat-controls result-controls"><button class="combat-action attack-action" data-close-battle><b>${trial?'Mağazaya dön':'Köye dön'}</b><small>${trial?'Denemeyi bitir':'Kahramanların seni bekliyor'}</small></button>${trial?'':`<button class="combat-action defend-action" data-retry-stage="${stage.id}"><b>Yeniden savaş</b><small>Bu bölgeye tekrar gir</small></button>`}</div>`:
      `<div class="tactical-line ${threats.length?'threat-line':''}"><span>${threats.length?(heavy?'YIKIM HAZIRLANIYOR':'BÜYÜ HAZIRLANIYOR'):running?'OTOMATİK ÇATIŞMA':'TAKTİK MOLA'}</span><p>${threats.length?'Hazır bir kesme yeteneği kullan veya kalkanla takımını koru.':!running?'Savaş duraklatıldı. Hedef veya yetenek seçebilir, ▶ ile devam edebilirsin.':target?`${esc(target.name)} hedefte. Kahramanlar kendileri saldırır; hazır yeteneğe dokun.`:'Kahramanlar kendileri saldırır. Hedefi ve özel yeteneklerin zamanını sen seç.'}</p></div>
      <div class="ability-belt" aria-label="Kahraman yetenekleri">${battle.allies.map(hero=>abilityCard(hero,battle)).join('')}</div>
      <div class="live-help"><span>Enerji saldırı yaptıkça ve darbe aldıkça dolar.</span><span>${target?`Odak: ${esc(target.name)}`:'Odak belirlemek için düşmana dokun.'}</span></div>`}
      <details class="combat-history"><summary>Savaş günlüğü</summary><div>${battle.log.slice(-12).map(line=>`<p>${esc(line)}</p>`).join('')}</div></details>
    </div></section>`;
}
