export const SLOTS = { weapon: 'Silah', armor: 'Zırh', relic: 'Tılsım' };
export const RARITIES = { common: 'Nadir', epic: 'Destansı', legendary: 'Efsanevi' };
export const ITEMS = [
  { id:'iron_sword', name:'Yemin Kılıcı', slot:'weapon', rarity:'common', forge:1, stats:{attack:4}, cost:{gold:90,wood:25}, description:'Hisarın ilk muhafızlarına verilen dengeli çelik kılıç.' },
  { id:'ward_mail', name:'Muhafız Zırhı', slot:'armor', rarity:'common', forge:1, stats:{hp:30,armor:3}, cost:{gold:110,stone:35}, description:'Hafif levhaları darbeleri karşılar; taşıyanı savaşta tutar.' },
  { id:'lunar_charm', name:'Ay Mührü', slot:'relic', rarity:'common', forge:1, stats:{healing:6,hp:8}, cost:{gold:100,aether:15}, description:'İyileştirme yeteneği olan kahramanların verdiği şifayı güçlendirir.' },
  { id:'ember_blade', name:'Kor Kılıcı', slot:'weapon', rarity:'epic', forge:2, stats:{attack:10}, cost:{gold:260,aether:30}, description:'Demirhanenin yıldız ateşinde dövülmüş keskin bir silah.' },
  { id:'warden_plate', name:'Hisar Levhası', slot:'armor', rarity:'epic', forge:2, stats:{hp:65,armor:7}, cost:{gold:280,stone:100}, description:'Ön saftaki muhafızlar için ağır ve dayanıklı koruma.' },
  { id:'star_lens', name:'Yıldız Merceği', slot:'relic', rarity:'epic', forge:2, stats:{attack:5,healing:8}, cost:{gold:230,aether:45}, description:'Yıldız ışığını hem saldırıya hem iyileştirmeye yönlendirir.' },
  { id:'royal_blade', name:'Şafak Yaran', slot:'weapon', rarity:'legendary', forge:4, stats:{attack:17}, cost:{gold:650,aether:80}, description:'Krallığın kayıp ustalarının imzasını taşıyan bir şaheser.' },
  { id:'aegis', name:'Son Siper', slot:'armor', rarity:'legendary', forge:4, stats:{hp:110,armor:12}, cost:{gold:700,stone:220}, description:'Hisarın en güçlü savunma zırhı; gelen hasarı azaltır.' },
  { id:'moonheart', name:'Ayın Kalbi', slot:'relic', rarity:'legendary', forge:4, stats:{healing:14,hp:35}, cost:{gold:650,aether:100}, description:'Şifacıların taşıdığı kadim kristal, can ve iyileştirme sağlar.' },
];
export const FIRST_CLEAR_LOOT = { 1:'lunar_charm', 2:'ember_blade', 3:'warden_plate', 4:'star_lens', 6:'royal_blade', 8:'moonheart' };
const fail=error=>({ok:false,error});
export const itemById=id=>ITEMS.find(item=>item.id===id);
export function createGearState() { return {inventory:{iron_sword:1,ward_mail:1},loadouts:{}}; }
export function restoreGear(state,saved) {
  if(saved.inventory && typeof saved.inventory==='object' && !Array.isArray(saved.inventory)) {
    state.inventory={};
    for(const item of ITEMS) { const count=saved.inventory[item.id]; if(Number.isInteger(count)&&count>0) state.inventory[item.id]=Math.min(20,count); }
  } else {
    // Older saves already earned these chapter rewards before equipment existed.
    for(const stageId of state.cleared) awardFirstClearItem(state,stageId);
  }
  state.loadouts={};
  const used={};
  for(const heroId of Object.keys(state.heroes)) for(const slot of Object.keys(SLOTS)) {
    const id=saved.loadouts?.[heroId]?.[slot], item=itemById(id);
    if(!item || item.slot!==slot || (used[id]||0)>=(state.inventory[id]||0)) continue;
    (state.loadouts[heroId] ||= {})[slot]=id; used[id]=(used[id]||0)+1;
  }
}
export function equipmentStats(state,heroId) {
  const stats={attack:0,hp:0,armor:0,healing:0};
  for(const id of Object.values(state.loadouts?.[heroId]||{})) {
    const item=itemById(id); if(item) for(const [key,value] of Object.entries(item.stats)) stats[key]+=value;
  }
  stats.armor=Math.min(35,stats.armor); return stats;
}
export function forgeItem(state,id) {
  const item=itemById(id);
  if(!item) return fail('Bilinmeyen ekipman.');
  if(state.battle?.status==='active') return fail('Önce devam eden savaşı tamamla.');
  if(state.buildings.forge<item.forge) return fail(`Demirhane seviyesi ${item.forge} gerekli.`);
  if((state.inventory[id]||0)>=20) return fail('Bu ekipmandan en fazla 20 adet tutulabilir.');
  if(Object.entries(item.cost).some(([key,value])=>state.res[key]<value)) return fail('Yeterli kaynak yok.');
  for(const [key,value] of Object.entries(item.cost)) state.res[key]-=value;
  state.inventory[id]=(state.inventory[id]||0)+1;
  return {ok:true};
}
export function equipItem(state,heroId,id) {
  const item=itemById(id);
  if(!item || !state.heroes[heroId]) return fail('Kahraman veya ekipman bulunamadı.');
  if(state.battle?.status==='active') return fail('Savaş sırasında ekipman değiştirilemez.');
  if(state.loadouts[heroId]?.[item.slot]===id) return {ok:true};
  const used=Object.entries(state.loadouts).filter(([hero,slots])=>hero!==heroId && slots[item.slot]===id).length;
  if(used>=(state.inventory[id]||0)) return fail('Boşta ekipman yok. Diğer kahramandan çıkarabilir veya bir tane üretebilirsin.');
  (state.loadouts[heroId] ||= {})[item.slot]=id;
  return {ok:true};
}
export function unequipItem(state,heroId,slot) {
  if(!state.heroes[heroId] || !SLOTS[slot]) return fail('Geçersiz ekipman konumu.');
  if(state.battle?.status==='active') return fail('Savaş sırasında ekipman değiştirilemez.');
  if(state.loadouts[heroId]) delete state.loadouts[heroId][slot];
  return {ok:true};
}
export function awardFirstClearItem(state,stageId) {
  const id=FIRST_CLEAR_LOOT[stageId];
  if(!id || (state.inventory[id]||0)>=20) return null;
  state.inventory[id]=(state.inventory[id]||0)+1;
  return itemById(id);
}
