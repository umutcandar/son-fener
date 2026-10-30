import * as THREE from '../lib/three.module.js';

// Each entry corresponds to a real, cumulative architectural addition.
export const BUILDING_EVOLUTION = {
  keep: ['Yıldız Hisarı', 'Çift kapı kulesi', 'Batı kanadı', 'Doğu kanadı', 'Üst gözetleme katı', 'Dış burçlar', 'Yıldız tacı', 'Kraliyet sancağı'],
  farm: ['Hasat avlusu', 'Tahıl silosu', 'Yeni ambar', 'Taş değirmen', 'İkinci silo', 'Pazar sundurması', 'Yüksek tahıl deposu', 'Yıldız hasat serası'],
  lumber: ['Oduncu kulübesi', 'Kütük deposu', 'İşleme sundurması', 'Kaldırma vinci', 'Yükleme iskelesi', 'İkinci atölye katı', 'Büyük testere', 'Usta oduncu kulesi'],
  quarry: ['Maden girişi', 'Taş stok alanı', 'Kaldırma vinci', 'İkinci maden girişi', 'Yük vagonu', 'Kırıcı kulesi', 'Kristal arıtma ocağı', 'Aytaşı anıtı'],
  forge: ['Demirci atölyesi', 'İkinci fırın', 'Çift baca', 'Silah sundurması', 'Üst işleme katı', 'Döküm kazanı', 'Büyük örs', 'Yıldız döküm kulesi'],
  tavern: ['Yemin Hanı', 'Bahçe terası', 'Konuk kanadı', 'Üst konuk katı', 'Saat kulesi', 'Şölen çardağı', 'Kraliyet balkonu', 'Yeminliler kulesi'],
  observatory: ['Yıldız Rasathanesi', 'Gözlem balkonu', 'Mercek kulesi', 'Gök haritası odası', 'İkinci gözlem kulesi', 'Büyük yıldız halkası', 'Kristal mercekler', 'Göksel taç'],
};

export function addBuildingEvolution(group, id, level, kit) {
  const { box, part, house, tower, palette: p } = kit;
  const post = (g, x, z, h) => box(g, p.wood, [.12, h, .12], [x, h / 2, z]);
  const canopy = (g, x, z, w, d, h, roof = p.roof) => {
    for (const dx of [-1,1]) for (const dz of [-1,1]) post(g, x+dx*w*.43, z+dz*d*.42, h);
    part(g, 'roof', roof, [w, .38, d], [x,h,z]);
  };
  const silo = (g,x,z,h) => {
    part(g,'cylinder',p.plaster,[.66,h,.66],[x,h/2,z]);
    for (const y of [.15,h*.5,h-.08]) part(g,'cylinder',p.gold,[.69,.06,.69],[x,y,z]);
    part(g,'cone',p.roof,[.86,.5,.86],[x,h+.24,z]);
  };
  const crane = (g,x,z,h) => {
    post(g,x,z,h); box(g,p.wood,[1.1,.12,.14],[x+.35,h,z]);
    box(g,p.gold,[.035,h*.55,.035],[x+.85,h*.72,z]);
    part(g,'cylinder',p.gold,[.25,.07,.25],[x,h-.1,z]).rotation.x=Math.PI/2;
    part(g,'box',p.edge,[.32,.3,.32],[x+.85,h*.42,z]);
  };
  const room = (g,x,z,w,h,d) => house(g,x,z,w,h,d);
  for (let stage = 2; stage <= Math.min(8,level); stage++) {
    const g = new THREE.Group(); g.name = `${id}-level-${stage}`; g.userData.evolutionLevel = stage;
    group.add(g);
    switch (id) {
      case 'keep':
        if(stage===2) { for(const x of [-.62,.62]) tower(g,x,1.48,1.5,.52); box(g,p.edge,[1.15,.2,.35],[0,1.15,1.48]); }
        if(stage===3) room(g,-1.55,-.15,.8,1.35,1.4);
        if(stage===4) room(g,1.55,-.15,.8,1.6,1.4);
        if(stage===5) { box(g,p.stone,[1.05,.95,.9],[0,3.15,-.5]); part(g,'roof',p.roof,[1.3,.8,1.12],[0,3.63,-.5]); }
        if(stage===6) for(const x of [-1.8,1.8]) tower(g,x,1.1,2.2,.65);
        if(stage===7) { const ring=part(g,'ring',p.gold,[2.25,2.25,2.25],[0,4.42,-.5]); ring.rotation.x=Math.PI/2; for(const x of [-.8,.8]) part(g,'crystal',p.cyan,[.3,.7,.3],[x,4.6,-.5],0,.6); }
        if(stage===8) { box(g,p.gold,[.08,1.8,.08],[0,4.8,-1.1]); box(g,'#6e3045',[.85,.62,.06],[.43,5.28,-1.1]); part(g,'crystal',p.gold,[.2,.26,.04],[.4,5.28,-1.05]); }
        break;
      case 'farm':
        if(stage===2) silo(g,1.15,-.95,1.35);
        if(stage===3) room(g,-1.15,-.6,.8,.95,1.1);
        if(stage===4) { part(g,'cylinder',p.stone,[.6,1.5,.6],[1,.75,-.5]); part(g,'cone',p.roof,[.78,.65,.78],[1,1.8,-.5]); }
        if(stage===5) silo(g,.38,-1.35,1.7);
        if(stage===6) canopy(g,-.65,1.15,1.3,.7,.75,'#977545');
        if(stage===7) silo(g,-1.4,.65,2.05);
        if(stage===8) { box(g,p.edge,[1.3,.12,.8],[.65,.13,1.25]); part(g,'roof','#7eb8ad',[1.4,.8,.9],[.65,.25,1.25]); }
        break;
      case 'lumber':
        if(stage===2) { for(let i=0;i<8;i++){const log=part(g,'cylinder','#98734d',[.25,.95,.25],[-1.05+(i%2)*.26,.2+Math.floor(i/2)*.23,.1]); log.rotation.x=Math.PI/2;} }
        if(stage===3) canopy(g,-1.0,.2,.9,1.25,1.25,'#425746');
        if(stage===4) crane(g,.9,-.95,2.0);
        if(stage===5) { box(g,p.wood,[1.65,.22,.7],[0,.15,1.2]); for(const x of [-.6,0,.6]) box(g,p.gold,[.06,.06,.72],[x,.29,1.2]); }
        if(stage===6) { box(g,p.wood,[1.15,.75,.85],[-.15,1.25,-.25]); part(g,'roof','#425746',[1.45,.65,1.12],[-.15,1.63,-.25]); }
        if(stage===7) { const saw=part(g,'cylinder',p.edge,[.85,.09,.85],[1.15,1.1,.8]); saw.rotation.x=Math.PI/2; box(g,p.wood,[.2,1.1,.3],[1.15,.55,.8]); }
        if(stage===8) tower(g,-1.15,-1.1,2.7,.8);
        break;
      case 'quarry':
        if(stage===2) for(let i=0;i<5;i++) box(g,p.edge,[.45,.35,.42],[-1.1+(i%2)*.43,.18+Math.floor(i/2)*.35,.6]);
        if(stage===3) crane(g,-.95,-.55,2.2);
        if(stage===4) { box(g,p.dark,[.72,.85,.12],[.95,.43,.3]); for(const x of [.55,1.35]) box(g,p.stone,[.18,1.0,.25],[x,.5,.4]); box(g,p.edge,[1,.2,.25],[.95,1,.4]); }
        if(stage===5) { box(g,p.wood,[.7,.4,.65],[.05,.38,1.25]); for(const x of [-.34,.34]) for(const z of [1.03,1.48]) part(g,'cylinder',p.dark,[.22,.08,.22],[x,.18,z]).rotation.z=Math.PI/2; }
        if(stage===6) { tower(g,1,-.85,2.2,.65); box(g,p.wood,[.2,1.4,.2],[.75,.7,-.5]); }
        if(stage===7) { part(g,'cylinder',p.dark,[.8,.9,.8],[-.95,.45,-1]); part(g,'crystal',p.cyan,[.6,.85,.6],[-.95,1.15,-1],0,.6); }
        if(stage===8) { part(g,'cylinder',p.edge,[1.1,.35,1.1],[0,.18,-.5]); part(g,'crystal',p.cyan,[.8,2.6,.8],[0,2.1,-.5],0,.5); }
        break;
      case 'forge':
        if(stage===2) { box(g,p.dark,[.65,.95,.75],[-1.15,.48,-.1]); part(g,'box',p.ember,[.42,.4,.06],[-1.15,.42,.3],0,.9); }
        if(stage===3) { box(g,p.stone,[.38,2.5,.4],[-1.15,1.25,-.35]); box(g,p.edge,[.51,.18,.55],[-1.15,2.5,-.35]); }
        if(stage===4) canopy(g,.65,1.15,1.35,.75,1.05,'#4b4852');
        if(stage===5) { box(g,p.stone,[1.3,.75,.95],[-.2,1.35,-.2]); part(g,'roof','#4b4852',[1.6,.6,1.2],[-.2,1.73,-.2]); }
        if(stage===6) { part(g,'cylinder',p.dark,[.8,.7,.8],[1.2,.4,-.6]); part(g,'cylinder',p.ember,[.68,.08,.68],[1.2,.78,-.6],0,.9); }
        if(stage===7) { box(g,p.dark,[.45,.75,.4],[-.9,.4,1.1]); box(g,p.edge,[1.2,.25,.55],[-.9,.92,1.1]); }
        if(stage===8) { tower(g,.6,-1.05,2.8,.7); part(g,'crystal',p.ember,[.35,.75,.35],[.6,3.65,-1.05],0,.8); }
        break;
      case 'tavern':
        if(stage===2) { box(g,p.wood,[1.4,.16,1],[-.7,.16,1.1]); for(const x of [-1.3,-.1]) box(g,p.wood,[.06,.7,.06],[x,.5,1.5]); box(g,p.wood,[1.3,.08,.08],[-.7,.83,1.5]); }
        if(stage===3) room(g,-1.25,-.25,.8,1.25,1.0);
        if(stage===4) { box(g,p.plaster,[1.55,.95,1.1],[0,1.8,-.15]); part(g,'roof','#6c3d50',[1.85,.65,1.35],[0,2.28,-.15]); }
        if(stage===5) { tower(g,1.18,-.65,2.7,.75); part(g,'cylinder',p.gold,[.38,.06,.38],[1.18,2,.4-.65]).rotation.x=Math.PI/2; }
        if(stage===6) canopy(g,1.15,.9,1,.95,1.2,'#6c3d50');
        if(stage===7) { box(g,p.wood,[1.45,.12,.62],[0,1.7,.75]); for(const x of [-.65,-.3,0,.3,.65]) box(g,p.gold,[.055,.4,.06],[x,1.95,1.0]); box(g,p.gold,[1.45,.06,.06],[0,2.15,1]); }
        if(stage===8) tower(g,-1.25,-1,3.2,.8);
        break;
      case 'observatory':
        if(stage===2) { part(g,'cylinder',p.edge,[2.25,.14,2.25],[0,1.15,0]); for(let i=0;i<8;i++){const a=i*Math.PI/4; box(g,p.gold,[.055,.38,.055],[Math.cos(a)*1.02,1.38,Math.sin(a)*1.02]);} }
        if(stage===3) tower(g,1.15,-.15,1.7,.65);
        if(stage===4) room(g,-1.1,-.2,.85,1.25,1.1);
        if(stage===5) tower(g,.65,-1.2,2.5,.7);
        if(stage===6) { const ring=part(g,'ring',p.gold,[2,2,2],[0,3.15,0]); ring.rotation.x=.9; }
        if(stage===7) for(const x of [-1.2,1.2]) { part(g,'cylinder',p.stone,[.3,1.65,.3],[x,.82,.75]); part(g,'crystal',p.cyan,[.4,.85,.4],[x,2.0,.75],0,.6); }
        if(stage===8) { part(g,'crystal',p.cyan,[.6,1.1,.6],[0,3.9,0],0,.6); const ring=part(g,'ring',p.gold,[1.6,1.6,1.6],[0,3.9,0]); ring.rotation.x=Math.PI/2; }
        break;
    }
  }
}
