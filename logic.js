// ===== Son Fener — saf oyun mantığı (DOM / THREE yok). Tüm durum tek, JSON'a çevrilebilir nesnede (S).
// Çevrimiçi sürümde bu modül sunucuda da çalıştırılabilir: aksiyon(S, args) -> sonuç / olay listesi.
export const RES=['fish','wood','crys'];
export const RIC={fish:'🐟',wood:'🪵',crys:'🔮',gems:'💎',ticket:'🎟️',ush:'✨'};
export const RNAME={fish:'Balık',wood:'Kereste',crys:'Işık Kristali',gems:'Elmas',ticket:'Çağrı Bileti'};
export const GR=4; // ızgara yarıçapı (−4..4)
export const tileOK=(i,j)=>Math.abs(i)<=GR&&Math.abs(j)<=GR&&!(Math.abs(i)===GR&&Math.abs(j)===GR)&&!(i===0&&j===0);
export const key=(i,j)=>i+','+j;export const unkey=k=>k.split(',').map(Number);
export const ring=k=>{const[i,j]=unkey(k);return Math.max(Math.abs(i),Math.abs(j))};
export const KINDS={
 hut:{n:'Barınak',ic:'🛖',req:1,cost:{wood:20},d:'Kurtulanlar burada yaşar. Her seviye +2 kişilik yer.'},
 fisher:{n:'Balıkçı İskelesi',ic:'🎣',req:1,res:'fish',perW:3,cost:{wood:25},d:'Balıkçılar herkesi doyurur.'},
 wood:{n:'Oduncu',ic:'🪓',req:1,res:'wood',perW:3,cost:{fish:20},d:'Oduncular ada ağaçlarından kereste keser.'},
 mine:{n:'Kristal Madeni',ic:'🔮',req:1,res:'crys',perW:1.6,cost:{wood:30,fish:10},d:'Madenciler Feneri besleyen ışık kristalini çıkarır.'},
 yard:{n:'Tersane',ic:'⚓',req:2,cost:{wood:80,fish:40},d:'Filo tayfası eğitilir, gemi donanımı yapılır. Gemi ustaları eğitimi hızlandırır.',job:'Gemi ustası'},
 pearl:{n:'İnci Çiftliği',ic:'🦪',req:1,res:'gems',perW:.012,cost:{wood:220,fish:160},only:'mercan',d:'Yalnızca Mercan Atolü. Dalgıçlar istiridyeden inci çıkarır — inciler elmasa dönüşür.',job:'İnci dalgıcı'},
 forge:{n:'Kor Ocağı',ic:'🌋',req:1,res:'crys',perW:3.4,cost:{wood:320,crys:90},only:'volkan',d:'Yalnızca Kül Adası. Lavdan kristal döker; her seviye filoya +%3 güç verir.',job:'Dökümcü'},
 lab:{n:'Gözlemevi',ic:'🔭',req:3,cost:{wood:150,crys:60},d:'Araştırma ağacı: ekonomi, fener ve donanma.'},
 tower:{n:'Gözcü Kulesi',ic:'🗼',job:'Gözcü',req:4,cost:{wood:260,crys:90},d:'Korsan konvoylarını uzaktan görür. Her seviye filo saldırısı +%3, konvoy ganimeti +%8.'},
};
export const JOB={fisher:'Balıkçı',wood:'Oduncu',mine:'Madenci',yard:'Gemi ustası',pearl:'İnci dalgıcı',forge:'Dökümcü'};
export const FENER_MAX=7;
// ---------- adalar ----------
export const ISLANDS={
 home:{n:'Fener Adası',ic:'🗼',d:'Ana üs. Büyük Fener burada.',kinds:Object.keys(KINDS).filter(k=>!KINDS[k].only)},
 mercan:{n:'Mercan Atolü',ic:'🪸',d:'Sığ, bereketli sular. Balık +50%, kereste +20%.',kinds:['hut','fisher','pearl','wood'],bonus:{fish:1.5,wood:1.2},unlock:4,cost:{wood:300,fish:200}},
 volkan:{n:'Kül Adası',ic:'🌋',d:'Sönmüş volkan, kristal damarları. Kristal +60%.',kinds:['hut','forge','mine','wood'],bonus:{crys:1.6},unlock:8,cost:{wood:800,crys:300}},
};
export const gridOf=(S,id)=>id===S.cur?S.g:(S.isl[id]&&S.isl[id].g)||{};
export const owned=S=>Object.keys(ISLANDS).filter(id=>id==='home'||S.isl[id]?.own);
export const grids=S=>owned(S).map(id=>[id,gridOf(S,id)]);
export const allB=S=>grids(S).flatMap(([,g])=>Object.values(g));
export const homeG=S=>gridOf(S,'home');
export const postCost=lv=>({wood:250*lv*lv,crys:90*lv*lv});
export function claimIsland(S,id){const I=ISLANDS[id];if(!I||id==='home')return'Yok';if(S.isl[id]?.own)return'Zaten senin';if(S.stage-1<I.unlock)return`${I.unlock} ada kurtar`;if(!canAfford(S,I.cost))return'RES';
 pay(S,I.cost);S.isl[id]={own:1,lv:1,g:{[key(1,0)]:{k:'hut',lv:1,w:0,stored:0},[key(0,1)]:{k:I.kinds[1],lv:1,w:0,stored:0}}};S.st.claims++;return null}
export function switchIsland(S,id){if(id===S.cur)return null;if(id!=='home'&&!S.isl[id]?.own)return'Sahip değilsin';
 S.isl[S.cur].g=S.g;S.g=S.isl[id].g||{};S.isl[id].g=null;S.cur=id;return null}
export function upPost(S){const I=S.isl[S.cur];if(S.cur==='home'||!I)return'Yok';if(I.lv>=3)return'En üst seviye';const c=postCost(I.lv);if(!canAfford(S,c))return'RES';pay(S,c);I.lv++;return null}
export const safeR=S=>S.cur==='home'?Math.min(GR,S.fener.lv+1):Math.min(GR,1+S.isl[S.cur].lv);
export const maxLv=S=>S.cur==='home'?S.fener.lv+1:Math.min(S.fener.lv+1,S.isl[S.cur].lv+2);
export const isSafe=(S,k)=>ring(k)<=safeR(S);
// ---------- birlikler, kaptanlar, donanım ----------
export const TROOPS={tayfa:{n:'Tayfa',ic:'⚓',atk:10,hp:40,cost:{fish:8,wood:4},t:2},zipkin:{n:'Zıpkıncı',ic:'🔱',atk:14,hp:28,cost:{fish:10,wood:6},t:3},topcu:{n:'Topçu',ic:'💣',atk:19,hp:18,cost:{fish:12,wood:8,crys:1},t:4}};
// sk.t: atk/hp/loot -> takımda (ilk 3) iken; fish/train/night -> sahipken çalışır
export const HEROES=[
 {id:'kaan',n:'Kara Kaan',ic:'🏴‍☠️',img:'kaan',r:3,role:'Topçu',p:120,sk:{n:'Top Yağmuru',t:'atk',v:.15,d:'Filo saldırısı'}},
 {id:'mei',n:'Mei Rüzgar',ic:'🔭',img:'mei',r:3,role:'Gözcü',p:115,sk:{n:'Keskin Dürbün',t:'hp',v:.18,d:'Filo dayanıklılığı'}},
 {id:'tunc',n:'Tunç Zıpkın',ic:'🔱',img:'tunc',r:2,role:'Zıpkıncı',p:72,sk:{n:'İlk Darbe',t:'atk',v:.08,d:'Filo saldırısı'}},
 {id:'deniz',n:'Deniz Al',ic:'🎣',img:'deniz',r:2,role:'Tayfa',p:66,sk:{n:'Bereketli Ağ',t:'fish',v:.12,d:'Balık üretimi'}},
 {id:'nene',n:'Pusula Nene',ic:'🧭',img:'nene',r:2,role:'Rotacı',p:60,sk:{n:'Eski Haritalar',t:'loot',v:.15,d:'Savaş ganimeti'}},
 {id:'ela',n:'Ela Çark',ic:'⚙️',img:'ela',r:1,role:'Usta',p:42,sk:{n:'Hızlı Kızak',t:'train',v:.12,d:'Eğitim hızı'}},
 {id:'ali',n:'Fenerli Ali',ic:'🏮',img:'ali',r:1,role:'Tayfa',p:40,sk:{n:'Fener Işığı',t:'night',v:.10,d:'Sis Gecesi kristal ihtiyacı (azalma)'}},
 {id:'sisnur',n:'Sis Kraliçesi Nur',ic:'🌫️',img:'sisnur',r:3,season:1,role:'Sis Kaptanı',p:125,sk:{n:'Sis Perdesi',t:'hp',v:.2,d:'Filo dayanıklılığı'}},
 {id:'selin',n:'Mercan Selin',ic:'🪸',img:'selin',r:3,role:'Dalgıç Savaşçı',p:118,sk:{n:'Mercan Damarı',t:'crys',v:.18,d:'Kristal üretimi'}},
 {id:'lale',n:'Fırtına Lale',ic:'🌩️',img:'lale',r:2,role:'Fırtınacı',p:70,sk:{n:'Fırtına Çağrısı',t:'atk',v:.1,d:'Filo saldırısı'}},
 {id:'baris',n:'Enkazcı Barış',ic:'🪝',img:'baris',r:1,role:'Enkaz Avcısı',p:41,sk:{n:'Sağlam Kanca',t:'wood',v:.1,d:'Kereste üretimi'}}];
export const NPC={n:'Fenerci Yusuf',img:'yusuf'};
export const RARITY={3:{n:'Efsanevi',odds:5},2:{n:'Epik',odds:25},1:{n:'Nadir',odds:70}};
export const PITY=40,PITY2=80;
export const GEAR={cannon:{n:'Bronz Top',ic:'💣',st:'atk',v:.06,d:'Filo saldırısı +6%/sv'},plate:{n:'Demir Kaplama',ic:'🛡️',st:'hp',v:.06,d:'Filo dayanıklılığı +6%/sv'},sail:{n:'Fırtına Yelkeni',ic:'⛵',st:'hp',v:.04,d:'Dayanıklılık +4%/sv, ganimet +3%/sv'}};
export const GEAR_MAX=10;
export const gearCost=lv=>({wood:Math.round(120*Math.pow(lv+1,1.6)),crys:Math.round(30*Math.pow(lv+1,1.6))});
export const gearReq=lv=>Math.ceil((lv+1)/2);
export function upGear(S,id){const lv=S.gear[id]||0;if(lv>=GEAR_MAX)return'En üst seviye';if(yardLv(S)<gearReq(lv))return`Tersane Sv${gearReq(lv)} gerekli`;const c=gearCost(lv);if(!canAfford(S,c))return'RES';pay(S,c);S.gear[id]=lv+1;return null}
export const gearSum=S=>Object.values(S.gear).reduce((a,b)=>a+b,0);
// ---------- araştırma ağacı (3 dal, 15 düğüm) ----------
export const TECH=[
 {id:'net',br:'Ekonomi',n:'Sağlam Ağlar',ic:'🕸️',d:'Balık ve kereste +15%/sv',max:5},
 {id:'cut',br:'Ekonomi',n:'Kristal Kesme',ic:'💠',d:'Kristal üretimi +15%/sv',max:5,req:{net:1}},
 {id:'store',br:'Ekonomi',n:'Geniş Ambar',ic:'📦',d:'Bina depolama +25%/sv',max:3,req:{net:2}},
 {id:'raft',br:'Ekonomi',n:'Sal Rotaları',ic:'🛶',d:'Sallar −10%/sv daha sık gelir',max:3,req:{cut:2}},
 {id:'offl',br:'Ekonomi',n:'Gece Vardiyası',ic:'🌙',d:'Çevrimdışı kazanç +10%/sv',max:3,req:{store:1}},
 {id:'lens',br:'Fener',n:'Büyük Mercek',ic:'🔆',d:'Fener tüketimi −10%/sv',max:5},
 {id:'ward',br:'Fener',n:'Sis Kalkanı',ic:'🛡️',d:'Sis Gecesi kristal ihtiyacı −8%/sv',max:5,req:{lens:1}},
 {id:'beam',br:'Fener',n:'Arındırıcı Hüzme',ic:'✨',d:'Sisten arındırma −15%/sv',max:3,req:{lens:2}},
 {id:'build',br:'Fener',n:'Hızlı İskele',ic:'🏗️',d:'Yükseltme süresi −8%/sv',max:5,req:{ward:1}},
 {id:'glow',br:'Fener',n:'Parlak Gece',ic:'🌟',d:'Sis Gecesini püskürtünce +5💎/sv',max:3,req:{ward:3}},
 {id:'harp',br:'Donanma',n:'Çelik Zıpkın',ic:'🔱',d:'Filo saldırısı +10%/sv',max:5},
 {id:'hull',br:'Donanma',n:'Meşe Gövde',ic:'🪵',d:'Filo dayanıklılığı +10%/sv',max:5,req:{harp:1}},
 {id:'drill',br:'Donanma',n:'Talim',ic:'🥁',d:'Eğitim süresi −10%/sv',max:3,req:{hull:1}},
 {id:'loot',br:'Donanma',n:'Ganimet Ağları',ic:'🪙',d:'Savaş ganimeti +10%/sv',max:3,req:{harp:2}},
 {id:'krak',br:'Donanma',n:'Kraken Avcısı',ic:'🦑',d:'Kraken Avı hasarı +10%/sv',max:5,req:{hull:3}}];
const T_=(S,id)=>S.tech[id]||0;
export const techReqOK=(S,T)=>!T.req||Object.entries(T.req).every(([id,l])=>T_(S,id)>=l);
export const FOES={ghost:{n:'Sis Hayaletleri',ic:'👻',img:'ghost'},octo:{n:'Sis Ahtapotu',ic:'🐙',img:'octo'},crab:{n:'Kabuklu Dev',ic:'🦀',img:'crab'},reef:{n:'Mercan Muhafızı',ic:'🪸',img:'reef'},kraken:{n:'Derin Kraken',ic:'🦑',img:'kraken'}};
export const ISL=['Martı Kayası','Tuz Adası','Batık Liman','Mercan Koyu','Kurukafa Burnu','Fırtına Tepesi','Yosun Adası','Sessiz Körfez','Kırık Direk','Eski Fener'];
export const islandName=n=>ISL[(n-1)%ISL.length]+(n>ISL.length?' '+(Math.floor((n-1)/ISL.length)+1):'');
export const stageFoe=n=>n%5===0?'kraken':n%3===0?'crab':n%2?'ghost':'octo';
export const stagePower=n=>Math.round(260*Math.pow(1.32,n-1));

// ---------- Canlı etkinlikler: haftalık dönen takvim (İstanbul saati, UTC+3 sabit) ----------
const IST=3*36e5;
export const BONUS=[{id:'kraken',ic:'🦑',days:[6,0],h:[0,24],mul:1.5},{id:'convoy',ic:'🏴‍☠️',days:[3],h:[0,24],mul:2},{id:'fog',ic:'🌫️',days:[0,1,2,3,4,5,6],h:[20,23],mul:.5}];
// t anında (ms) aktif etkinlik id kümesi
export function bonusOn(t=Date.now()){const d=new Date(t+IST),w=d.getUTCDay(),h=d.getUTCHours();const o={};for(const e of BONUS)if(e.days.includes(w)&&h>=e.h[0]&&h<e.h[1])o[e.id]=1;return o}
// önümüzdeki n gün için oturumlar [{id,ic,start,end}] (ms, gerçek UTC zaman damgası)
export function bonusSched(t=Date.now(),n=7){const d0=new Date(t+IST);const day0=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth(),d0.getUTCDate())-IST;const out=[];
 for(let i=0;i<n;i++){const ds=day0+i*864e5,w=new Date(ds+IST).getUTCDay();for(const e of BONUS)if(e.days.includes(w)){const st=ds+e.h[0]*36e5,en=ds+e.h[1]*36e5;if(en>t)out.push({id:e.id,ic:e.ic,start:st,end:en,day:i})}}
 // ardışık günleri birleştir (Kraken hafta sonu)
 const m=[];for(const x of out.sort((a,b)=>a.start-b.start)){const p=m.find(y=>y.id===x.id&&y.end===x.start);if(p)p.end=x.end;else m.push({...x})}return m.sort((a,b)=>a.start-b.start)}
const bonusMul=(id,t)=>bonusOn(t)[id]?BONUS.find(e=>e.id===id).mul:1;
export const stageReward=n=>({fish:40*n,wood:40*n,crys:12*n,gems:n%5===0?30:5});
export const stageRescue=n=>1+Math.floor(n/3);
// ---------- Mercan Resifleri: yan bölge (4 aşama + mini boss), gelgit mekaniği ----------
// Gelgit 2 saatte bir döner (İstanbul saati çift saat = alçak). Yüksek gelgitte resif yaratıkları %25 zayıf, alçakta %15 güçlü.
export const REEF={unlock:7,tideH:2,hi:.75,lo:1.15,st:[{foe:'ghost',p:6.5,rw:{fish:500,wood:500,crys:120,gems:15}},{foe:'octo',p:7.5,rw:{fish:700,wood:700,crys:160,gems:15}},{foe:'crab',p:8.5,rw:{fish:900,wood:900,crys:220,gems:20}},{foe:'reef',p:10,boss:1,rw:{crys:400,gems:60,ticket:1,ush:10}}]};
export const reefTide=now=>Math.floor((now+108e5)/(REEF.tideH*36e5))%2?'hi':'lo';
export const reefTideLeft=now=>REEF.tideH*36e5-((now+108e5)%(REEF.tideH*36e5));
export const reefOpen=S=>S.stage-1>=REEF.unlock;
export const reefIdx=S=>(S.reef&&S.reef.n)||0;
export const reefPower=(i,now)=>Math.round(stagePower(REEF.st[i].p)*(reefTide(now)==='hi'?REEF.hi:REEF.lo));
export function reefFight(S,now,rng){if(!reefOpen(S))return{err:'locked'};const i=reefIdx(S);if(i>=REEF.st.length)return{err:'done'};
 const res=simulate(S,S.stage,rng,reefPower(i,now));const lost={};for(const t in TROOPS){lost[t]=Math.floor(S.troops[t]*res.lossFrac*.7);S.troops[t]-=lost[t]}
 let rw=null;if(res.win){rw={...REEF.st[i].rw};const u=rw.ush||0;delete rw.ush;addRes(S,rw);if(u){S.ush=(S.ush||0)+u;rw.ush=u}S.reef={n:i+1};S.st.wins++;dailyInc(S,'battle',1,now);addXP(S,REEF.st[i].boss?80:30)}return{res,rw,lost,i,boss:!!REEF.st[i].boss}}
// ---------- bölümler + hikâye + görevler ----------
export const CHAPTERS=[
 {n:'İlk Işık',say:['Uyan evlat! Sis bu gece yine geldi. Ben Fenerci Yusuf — kırk yıldır bu feneri yakarım.','Feneri yak, kristal çıkar, insanları doyur. Işık sönerse sis her şeyi yutar.']},
 {n:'Tersane',say:['Ada nefes alıyor. Ama ufuktaki adalarda hâlâ insanlar sise hapsolmuş.','Bir tersane kur, tayfa eğit. Kaptanlar ışığın peşinden gelir — onları çağır.']},
 {n:'Gözlemevi',say:['Eski gözlemevi planlarını buldum! Yıldızlar sisin sırrını saklıyor olabilir.','Araştırma ağacını büyüt: ekonomi, fener ve donanma. Her dal bir yol.']},
 {n:'Yeni Ufuklar',say:['Mercan Atolü sisten kurtuldu ve sahipsiz. Bereketli sular orada!','Kendi adan gibi kur, birleştir, büyüt. Bir de… derinlerden bir Kraken sesi geliyor.']},
 {n:'Kül ve Işık',say:['Kül Adası’nın kristal damarları feneri daha da parlatır.','Ama dikkat: sis güçleniyor. Filonu donat, kaptanlarını yükselt.']},
 {n:'Derin Deniz',say:['Son fener sensin evlat. Sisin kalbine giden yol açılıyor.','Feneri en üst seviyeye çıkar — denizin bütün ışığını geri getir.']}];
const mx=(S,k)=>Math.max(0,...allB(S).filter(b=>b.k===k).map(b=>b.w||0));
const topLv=S=>Math.max(0,...allB(S).map(b=>b.lv));
const techSum=S=>Object.values(S.tech).reduce((a,b)=>a+b,0);
const heroMaxLv=S=>Math.max(0,...Object.values(S.heroes).map(h=>h.lv||1));
const heroMaxStar=S=>Math.max(0,...Object.values(S.heroes).map(h=>h.star));
const islB=(S,id)=>Object.keys(gridOf(S,id)).length;
export const QUESTS=[
 // 1
 {c:0,go:'fener',t:'Feneri yak',f:S=>S.fener.on?1:0,n:1,r:{wood:60,gems:5}},
 {c:0,go:'b:mine',t:'Madene 2 işçi ata',f:S=>mx(S,'mine'),n:2,r:{fish:60,gems:5}},
 {c:0,go:'collect',t:'Kaynak topla',f:S=>S.st.collect,n:1,r:{wood:80,gems:5}},
 {c:0,go:'merge',t:'2 binayı birleştir',f:S=>S.st.merge,n:1,r:{crys:40,gems:10}},
 {c:0,go:'b:fisher',t:'Balıkçıya 2 işçi ata',f:S=>mx(S,'fisher'),n:2,r:{wood:120,gems:5}},
 {c:0,go:'build:hut',t:'8 kurtulana ulaş',f:S=>S.surv,n:8,r:{fish:150,ticket:1}},
 {c:0,go:'fener',t:'Feneri Sv2 yap',f:S=>S.fener.lv,n:2,r:{gems:40,crys:60},say:'Işık uzağa vuruyor! Sis bir adım geri çekildi.'},
 // 2
 {c:1,go:'build:yard',t:'Tersane kur',f:S=>count(S,'yard'),n:1,r:{fish:80}},
 {c:1,go:'b:yard',t:'10 tayfa eğit',f:S=>S.st.trained,n:10,r:{wood:100}},
 {c:1,go:'map',t:'İlk adayı sisten kurtar',f:S=>S.stage-1,n:1,r:{gems:20}},
 {c:1,go:'merge',t:'Sv3 bir bina yap',f:topLv,n:3,r:{crys:60}},
 {c:1,go:'heroes',t:'Bir kaptan çağır',f:S=>S.st.recruit,n:1,r:{gems:30}},
 {c:1,go:'gear',t:'Gemiye 1 donanım yap',f:gearSum,n:1,r:{wood:120}},
 {c:1,go:'map',t:'3 ada kurtar',f:S=>S.stage-1,n:3,r:{gems:30},say:'Kurtardığın her ada, kıyımıza yeni insanlar getiriyor.'},
 // 3
 {c:2,go:'fener',t:'Feneri Sv3 yap',f:S=>S.fener.lv,n:3,r:{gems:30}},
 {c:2,go:'build:lab',t:'Gözlemevi kur',f:S=>count(S,'lab'),n:1,r:{crys:80}},
 {c:2,go:'b:lab',t:'İlk araştırmayı bitir',f:techSum,n:1,r:{gems:40}},
 {c:2,go:'heroes',t:'Bir kaptanı Sv5 yap',f:heroMaxLv,n:5,r:{crys:60}},
 {c:2,go:'fener',t:'Sis Gecesini 2 kez püskürt',f:S=>S.st.repel,n:2,r:{gems:30}},
 {c:2,go:'b:yard',t:'Toplam 50 tayfa eğit',f:S=>S.st.trained,n:50,r:{fish:200}},
 {c:2,go:'map',t:'5 ada kurtar',f:S=>S.stage-1,n:5,r:{gems:50},say:'Ufukta bir atol görünüyor… pembe kumlu, sahipsiz.'},
 // 4
 {c:3,go:'islands',t:'Mercan Atolü’nü sahiplen',f:S=>S.isl.mercan?.own?1:0,n:1,r:{gems:50}},
 {c:3,go:'islands',t:'Atolde 4 bina kur',f:S=>islB(S,'mercan'),n:4,r:{wood:200}},
 {c:3,go:'fener',t:'Feneri Sv4 yap',f:S=>S.fener.lv,n:4,r:{gems:40}},
 {c:3,go:'boss',t:'Kraken Avı’na katıl',f:S=>S.st.boss,n:1,r:{gems:30}},
 {c:3,go:'b:lab',t:'5 araştırma seviyesi',f:techSum,n:5,r:{crys:120}},
 {c:3,go:'heroes',t:'2 yıldızlı bir kaptan',f:heroMaxStar,n:2,r:{ticket:1}},
 {c:3,go:'map',t:'8 ada kurtar',f:S=>S.stage-1,n:8,r:{gems:60},say:'Kül Adası’ndan kristal parıltısı geliyor. Oraya da ışık götürelim.'},
 // 5
 {c:4,go:'islands',t:'Kül Adası’nı sahiplen',f:S=>S.isl.volkan?.own?1:0,n:1,r:{gems:60}},
 {c:4,go:'fener',t:'Feneri Sv5 yap',f:S=>S.fener.lv,n:5,r:{gems:80}},
 {c:4,go:'merge',t:'Sv5 bir bina yap',f:topLv,n:5,r:{crys:150}},
 {c:4,go:'b:lab',t:'10 araştırma seviyesi',f:techSum,n:10,r:{gems:60}},
 {c:4,go:'gear',t:'Toplam 10 donanım seviyesi',f:gearSum,n:10,r:{ticket:1}},
 {c:4,go:'heroes',t:'Bir kaptanı Sv15 yap',f:heroMaxLv,n:15,r:{gems:60}},
 {c:4,go:'map',t:'12 ada kurtar',f:S=>S.stage-1,n:12,r:{gems:100},say:'Derinlerden yükselen sis, daha önce görmediğim kadar koyu…'},
 // 6
 {c:5,go:'fener',t:'Feneri Sv6 yap',f:S=>S.fener.lv,n:6,r:{gems:100}},
 {c:5,go:'map',t:'15 ada kurtar',f:S=>S.stage-1,n:15,r:{gems:150}},
 {c:5,go:'merge',t:'Sv7 bir bina yap',f:topLv,n:7,r:{ticket:2}},
 {c:5,go:'map',t:'20 ada kurtar',f:S=>S.stage-1,n:20,r:{gems:200}},
 {c:5,go:'fener',t:'Feneri Sv7 yap',f:S=>S.fener.lv,n:7,r:{gems:300},say:'Başardın evlat. Deniz yeniden ışıl ışıl. Ama ufukta… yeni sisler var. Hikâye sürecek!'}];
export const DAILY=[{id:'collect',t:'5 kez kaynak topla',n:5,g:10},{id:'merge',t:'3 birleştirme yap',n:3,g:10},{id:'train',t:'10 tayfa eğit',n:10,g:10},{id:'battle',t:'1 deniz savaşı kazan',n:1,g:15},{id:'recruit',t:'1 kaptan çağır',n:1,g:15},{id:'boss',t:'Kraken’e 1 kez saldır',n:1,g:15},{id:'raid',t:'1 yağma ya da intikam saldırısı kazan',n:1,g:15,on:1},{id:'arena',t:'1 arena ya da düello maçı kazan',n:1,g:15,on:1},{id:'help',t:'Klan arkadaşlarına 3 yardım et',n:3,g:10,on:1}];
export const WEEKLY=[{id:'battle',t:'25 deniz savaşı kazan',n:25,g:60},{id:'raid',t:'7 yağma saldırısı kazan',n:7,g:80,on:1},{id:'arena',t:'10 arena maçı kazan',n:10,g:80,on:1},{id:'help',t:'Klanına 15 yardım et',n:15,g:60,on:1},{id:'donate',t:'Klan teknolojisine 5 bağış yap',n:5,g:70,on:1},{id:'boss',t:'Kraken’e 7 kez saldır',n:7,g:60}];
export const ACH=[
 {id:'m10',t:'Birleştirme Çırağı',d:'10 birleştirme',f:S=>S.st.merge,n:10,g:20},{id:'m100',t:'Birleştirme Ustası',d:'100 birleştirme',f:S=>S.st.merge,n:100,g:80},
 {id:'c50',t:'Toplayıcı',d:'50 kez kaynak topla',f:S=>S.st.collect,n:50,g:20},{id:'s10',t:'Kalabalık Ada',d:'20 kurtulan',f:S=>S.surv,n:20,g:30},
 {id:'w5',t:'Deniz Kurdu',d:'5 savaş kazan',f:S=>S.st.wins,n:5,g:20},{id:'w30',t:'Amiral',d:'30 savaş kazan',f:S=>S.st.wins,n:30,g:100},
 {id:'h4',t:'Kaptan Koleksiyoncusu',d:'4 farklı kaptan',f:S=>Object.keys(S.heroes).length,n:4,g:40},{id:'h7',t:'Tam Kadro',d:'7 kaptanın hepsi',f:S=>Object.keys(S.heroes).length,n:7,g:150},
 {id:'f5',t:'Parlayan Kule',d:'Fener Sv5',f:S=>S.fener.lv,n:5,g:60},{id:'r5',t:'Sise Meydan Okuyan',d:'5 Sis Gecesi püskürt',f:S=>S.st.repel,n:5,g:40},
 {id:'i2',t:'Ada Beyi',d:'2 ek ada sahiplen',f:S=>S.st.claims,n:2,g:100},{id:'t15',t:'Bilge',d:'15 araştırma seviyesi',f:techSum,n:15,g:80},
 {id:'b3',t:'Kraken Avcısı',d:'Kraken’e 10 saldırı',f:S=>S.st.boss,n:10,g:50},{id:'l7',t:'Sadık Fenerci',d:'7 gün giriş yap',f:S=>S.login.total,n:7,g:50}];
export const LOGIN=[{gems:20},{fish:200,wood:200},{gems:30},{crys:100},{ticket:1},{gems:50},{gems:100,ticket:2}];
// ---------- Fener Bileti (sezonluk ödül yolu) ----------
export const PASS_TIERS=30,PASS_XP=100;
export const passReward=(i,prem)=>prem?(i%5===4?{ticket:1}:i%2?{gems:25}:{crys:60+i*10}):(i%5===4?{gems:30}:i%2?{wood:80+i*20}:{fish:80+i*20});
export const passTier=S=>Math.min(PASS_TIERS,Math.floor(S.pass.xp/PASS_XP));
export function addXP(S,n){S.pass.xp+=n;S.pass.tq=Math.min(600,(S.pass.tq||0)+n)}
export function claimPass(S,i,prem){if(i>=passTier(S))return'Kilitli';if(prem&&!S.pass.prem)return'Premium yok';const c=S.pass.cl[prem?'p':'f'];if(c[i])return'Alındı';c[i]=1;addRes(S,passReward(i,prem));return null}
// ---------- VIP ----------
export const VIPN=[0,100,300,700,1500,3000,6000];
export const VIP_PERKS=['Üretim +5%/VIP seviyesi','VIP 2: Günlük ödüllü reklam 5 → 8','VIP 3: +1 kalıcı inşaatçı','VIP 4: 3 dakikadan kısa hızlandırmalar ücretsiz','VIP 5: Kraken Avı’nda günde +1 saldırı','VIP 6: Kaynak baloncukları otomatik toplanır'];
export const vipLv=S=>VIPN.filter(x=>S.vipPts>=x).length-1;
// ---------- Kraken Avı (haftalık boss, bot sıralaması) ----------
const EPOCH=Date.UTC(2024,0,1); // Pazartesi
export const weekId=now=>Math.floor((now-EPOCH)/(7*864e5));
export const weekFrac=now=>((now-EPOCH)/(7*864e5))%1;
const BOTS=['DenizKurdu','Martı_Ece','KaptanSis','Poyraz34','FenerciKız','Lodos_Reis','MaviYelken','KorsanCan','Yakamoz'];
const srnd=s=>{const x=Math.sin(s*9301.7+49297)*233280;return x-Math.floor(x)};
export function bossBoard(S,now,frac){const w=weekId(now),f=frac??Math.max(.05,weekFrac(now));const ref=Math.max(4000,S.boss.ref||0);
 const rows=BOTS.map((n,i)=>({n,bot:1,d:Math.round(ref*(.4+i*.35+srnd(w*31+i)*.5)*f)}));rows.push({n:'Sen',me:1,d:S.boss.dmg});return rows.sort((a,b)=>b.d-a.d)}
export const bossTries=S=>3+(vipLv(S)>=5?1:0);
export const bossReward=rank=>rank===1?{gems:300,ticket:2}:rank<=3?{gems:200,ticket:1}:rank<=6?{gems:120}:{gems:50};
export function bossWeek(S,now){const w=weekId(now);if(S.boss.w===w)return null;let out=null;
 if(S.boss.w>=0&&S.boss.dmg>0){const w0=S.boss.w,b=bossBoard(S,EPOCH+w0*7*864e5,1);const rank=b.findIndex(r=>r.me)+1;out={rank,rw:bossReward(rank)};addRes(S,out.rw)}
 S.boss={w,dmg:0,day:'',n:0,ref:armyPower(S)*30};return out}
export function bossAttack(S,now,rng,extra){bossWeek(S,now);const d=day(now);if(S.boss.day!==d){S.boss.day=d;S.boss.n=0}if(!extra&&S.boss.n>=bossTries(S))return{err:'Bugünkü saldırı hakkın bitti'};
 if(!extra)S.boss.n++;const dmg=Math.round(armyPower(S)*(9+rng()*3)*(1+T_(S,'krak')*.1));S.boss.dmg+=dmg;S.st.boss++;dailyInc(S,'boss',1,now);addXP(S,15);
 const rw={fish:Math.round(dmg*.01),wood:Math.round(dmg*.01)};addRes(S,rw);return{dmg,rw}}
// ---------- Klan önizleme (sahte bot klanlar, çevrimiçi değil) ----------
export const CLANS_PREVIEW=[{n:'Işık Muhafızları',tag:'IŞK',m:28,p:'1.2M',ic:'🛡️'},{n:'Mavi Yelkenliler',tag:'MAV',m:24,p:'980B',ic:'⛵'},{n:'Sis Avcıları',tag:'SİS',m:30,p:'870B',ic:'🗡️'},{n:'Martı Yuvası',tag:'MRT',m:17,p:'420B',ic:'🕊️'}];
// ---------- günlük sınırlı teklif (her gün değişir, sahte indirim yok) ----------
export const OFFERS=[{ic:'🔮',n:'Kristal Fıçısı',d:'+600🔮 +100💎',p:'₺39,99',vip:60,g:{crys:600,gems:100}},{ic:'🎟️',n:'Kaptan Demeti',d:'5 Çağrı Bileti +50💎',p:'₺59,99',vip:90,g:{ticket:5,gems:50}},{ic:'🪵',n:'İnşaat Sandığı',d:'+1500🪵 +800🐟',p:'₺29,99',vip:45,g:{wood:1500,fish:800}}];
export const offerOf=now=>OFFERS[Math.floor(now/864e5)%OFFERS.length];
export const NIGHT_EVERY=240,NIGHT_LEN=45,RAFT_EVERY=45;
export const count=(S,k)=>allB(S).filter(b=>b.k===k).length;
// ---------- durum ----------
export const SAVE_V=2;
export function newState(now){
 const g={};const put=(i,j,k,lv=1)=>g[key(i,j)]={k,lv,w:0,stored:0};
 put(1,0,'mine');put(0,1,'fisher');put(-1,0,'wood');put(-1,1,'hut');
 return migrate({v:1,res:{fish:60,wood:60,crys:30},gems:60,g,fener:{lv:1,on:false,end:0,dur:0},surv:4,troops:{tayfa:0,zipkin:0,topcu:0},train:null,tech:{},research:null,
  heroes:{ali:{star:1,sh:0,lv:1}},stage:1,vipPts:0,monthly:0,monthlyClaim:'',builders:1,q:0,tut:0,st:{},
  daily:{date:'',p:{},c:{}},freeCall:'',t0:now,saved:now,raftT:0,rescueT:0,nightN:0,buy:{}},now)}
const OLDH={reis:'kaan',derya:'mei',poyraz:'tunc',mercan:'deniz',lodos:'ali',kumru:'ela'};
export function migrate(S,now){
 if(S.v<2){const h={};for(const id in S.heroes){const n=OLDH[id]||id;if(HEROES.find(x=>x.id===n))h[n]={lv:1,...S.heroes[id]}}S.heroes=h;S.v=2}
 S.st={collect:0,trained:0,recruit:0,wins:0,merge:0,repel:0,boss:0,claims:0,...S.st};
 S.cur=S.cur||'home';S.isl=S.isl||{};if(!S.isl.home)S.isl.home={own:1,lv:1,g:null};
 S.gear=S.gear||{cannon:0,plate:0,sail:0};S.pity=S.pity||0;S.pity2=S.pity2||0;S.selTok=S.selTok||0;S.tickets=S.tickets||0;
 S.boss=S.boss||{w:-1,dmg:0,day:'',n:0,ref:0};S.login=S.login||{n:0,last:'',total:0};
 S.pass=S.pass||{xp:0,prem:0,cl:{f:{},p:{}}};S.ach=S.ach||{};S.seen=S.seen||{};
 S.set={snd:1,mus:1,vib:1,lang:'tr',...S.set};for(const id in S.heroes)S.heroes[id].lv=S.heroes[id].lv||1;
 fixWorkers(S);return S}
export const day=now=>new Date(now).toISOString().slice(0,10);
export const dayIst=now=>new Date(now+108e5).toISOString().slice(0,10); // İstanbul günü (UTC+3, DST yok)
export const builderCount=S=>S.builders+(vipLv(S)>=3?1:0);
export const cap=S=>allB(S).filter(b=>b.k==='hut').reduce((a,b)=>a+b.lv*2,0)+2;
export const workers=S=>allB(S).reduce((a,b)=>a+(b.w||0),0);
export const idle=S=>Math.max(0,S.surv-workers(S));
// İşçi sayısı nüfusu aşarsa (eski kayıt/kayıp) fazla işçileri boşa çıkar -> "Boşta −1" olmaz
export function fixWorkers(S){let over=workers(S)-S.surv;if(over<=0)return;for(const b of allB(S).sort((a,b)=>(a.w||0)-(b.w||0))){while(over>0&&(b.w||0)>0){b.w--;over--}}}
export const maxW=lv=>1+lv;
export const hasJob=k=>!!JOB[k];
export const islandBonus=S=>Math.min(.3,(S.stage-1)*.03);
// --- kaptan yetenekleri
export const heroCap=st=>10*st.star;
export const heroLvCost=lv=>({fish:30*lv,wood:30*lv,crys:8*lv});
export const skillVal=(h,st)=>h.sk.v*(1+.25*(st.star-1));
export function skill(S,t){const pool=['atk','hp','loot'].includes(t)?team(S):HEROES.filter(h=>S.heroes[h.id]);return pool.filter(h=>h.sk.t===t).reduce((a,h)=>a+skillVal(h,S.heroes[h.id]),0)}
export function heroUp(S,id,now=Date.now()){const st=S.heroes[id];if(!st)return'Yok';if(st.lv>=heroCap(st))return`Yıldız sınırı (Sv${heroCap(st)}) — yıldız yükselt`;const c=heroLvCost(st.lv);if(!canAfford(S,c))return'RES';pay(S,c);st.lv++;dailyInc(S,'heroup',1,now);return null}
export function starUp(S,id){const st=S.heroes[id];if(!st||st.star>=5)return'En üst';if(st.sh<st.star*10)return'Parça yetersiz';st.sh-=st.star*10;st.star++;return null}
// Sis Gecesi döngüsü (eğitim bitince başlar)
const nt=(S,now)=>S.tut<9?0:((now-S.t0)/1000);
export const night=(S,now)=>S.tut>=9&&nt(S,now)%NIGHT_EVERY>NIGHT_EVERY-NIGHT_LEN;
export const nightIn=(S,now)=>{const t=nt(S,now)%NIGHT_EVERY;return night(S,now)?-(NIGHT_EVERY-t):NIGHT_EVERY-NIGHT_LEN-t};
export const nightPhase=(S,now)=>S.tut<9?0:(nt(S,now)%NIGHT_EVERY)/NIGHT_EVERY; // 0..1, son NIGHT_LEN kısmı gece
export const nightNeed=S=>Math.max(1,Math.round(12*S.fener.lv*(1-T_(S,'ward')*.08)*(1-Math.min(.4,skill(S,'night')))));
export const lit=S=>S.fener.on&&S.res.crys>0;
export const crysUse=S=>S.fener.on?(.8+S.fener.lv*.5)*(1-T_(S,'lens')*.1):0; // /dk
export const fishUse=S=>S.surv*.5;
export function rate(S,k,id=S.cur){const g=gridOf(S,id),b=g[k];if(!b||!KINDS[b.k].res||b.fog)return 0;const r=KINDS[b.k].res;
 let m=1+T_(S,'net')*.15*(r!=='crys')+T_(S,'cut')*.15*(r==='crys');if(r==='fish'||r==='wood'||r==='crys')m*=1+skill(S,r);m*=(ISLANDS[id].bonus||{})[r]||1;
 return (b.w||0)*KINDS[b.k].perW*(1+.5*(b.lv-1))*m*(1+vipLv(S)*.05+islandBonus(S)+clanB.prod)*(lit(S)?1:.5)*(S.res.fish<=0&&r!=='fish'?.5:1)}
export const storeCap=(S,k,id)=>{const b=gridOf(S,id||S.cur)[k];if(b&&KINDS[b.k].res==='gems')return Math.max(5,rate(S,k,id)*900);return capN(S,k,id)};const capN=(S,k,id)=>Math.max(30,rate(S,k,id)*120*(1+T_(S,'store')*.25+clanB.store));
export function canAfford(S,c){return Object.entries(c).every(([r,v])=>(r==='gems'?S.gems:r==='ticket'?S.tickets:S.res[r])>=v)}
export function pay(S,c){for(const r in c)r==='gems'?S.gems-=c[r]:r==='ticket'?S.tickets-=c[r]:S.res[r]-=c[r]}
export function addRes(S,c){for(const r in c){if(r==='gems')S.gems+=c[r];else if(r==='ticket')S.tickets+=c[r];else if(r in S.res)S.res[r]+=c[r]}}
export const busyBuilders=S=>allB(S).filter(b=>b.end).length+(S.fener.end?1:0);
// --- inşa / birleştir / yükselt
export function checkBuild(S,k,kind){const[i,j]=unkey(k);if(!tileOK(i,j))return'Buraya kurulamaz';if(S.g[k])return'Dolu';if(!isSafe(S,k))return S.cur==='home'?'Sisli bölge — Feneri yükselt':'Işık Direğini yükselt';
 if(!ISLANDS[S.cur].kinds.includes(kind))return'Bu adada kurulamaz';if(S.fener.lv<KINDS[kind].req)return`Fener Sv${KINDS[kind].req} gerekli`;if(!canAfford(S,KINDS[kind].cost))return'RES';return null}
export function build(S,k,kind,now=Date.now()){const e=checkBuild(S,k,kind);if(e)return e;pay(S,KINDS[kind].cost);S.g[k]={k:kind,lv:1,w:0,stored:0};addXP(S,3);dailyInc(S,'build',1,now);return null}
export function canMerge(S,a,b){const A=S.g[a],B=S.g[b];return !!(A&&B&&a!==b&&A.k===B.k&&A.lv===B.lv&&!A.end&&!B.end&&!A.fog&&!B.fog&&A.lv<maxLv(S)&&isSafe(S,b))}
export function merge(S,a,b,now){if(!canMerge(S,a,b))return'Birleşemez';const A=S.g[a],B=S.g[b];delete S.g[a];B.lv++;B.stored=(B.stored||0)+(A.stored||0);
 B.w=Math.min(maxW(B.lv),(B.w||0)+(A.w||0));S.st.merge++;dailyInc(S,'merge',1,now);addXP(S,5);return null}
export function move(S,a,b){if(!S.g[a]||S.g[b]||!isSafe(S,b))return'Taşınamaz';const[i,j]=unkey(b);if(!tileOK(i,j))return'Taşınamaz';S.g[b]=S.g[a];delete S.g[a];return null}
export const upCost=(kind,lv)=>{const c={};for(const r in KINDS[kind].cost)c[r]=Math.round(KINDS[kind].cost[r]*1.6*Math.pow(2,lv));return c};
export const upTime=(lv,S)=>Math.round(6*Math.pow(2,lv)*(1-(S?T_(S,'build'):0)*.08));
export const fenerCost=lv=>{const L=lv+1;return{wood:60*L*L,fish:30*L*L,crys:20*L*L}};
export const fenerTime=(lv,S)=>Math.round(12*(lv+1)**2*(1-(S?T_(S,'build'):0)*.08));
export const speedGems=(sec,S)=>S&&vipLv(S)>=4&&sec<180||sec<=60?0:Math.max(1,Math.ceil(sec/60));
export function checkUp(S,k){const b=k==='fener'?S.fener:S.g[k];if(!b)return'Yok';if(b.end)return'Zaten inşaatta';
 if(k==='fener'){if(b.lv>=FENER_MAX)return'En üst seviye'}else{if(b.fog)return'Önce sisten arındır';if(b.lv>=maxLv(S))return S.cur==='home'?`Önce Feneri Sv${b.lv} yap`:'Işık Direği / Fener sınırı'}
 if(busyBuilders(S)>=builderCount(S))return'BUILDERS';if(!canAfford(S,k==='fener'?fenerCost(b.lv):upCost(b.k,b.lv)))return'RES';return null}
export function startUp(S,k,now){const e=checkUp(S,k);if(e)return e;const b=k==='fener'?S.fener:S.g[k];const c=k==='fener'?fenerCost(b.lv):upCost(b.k,b.lv);const t=k==='fener'?fenerTime(b.lv,S):upTime(b.lv,S);
 pay(S,c);b.end=now+t*1000;b.dur=t;dailyInc(S,'upgrade',1,now);return null}
export const cleanseCost=(b,S)=>({crys:Math.max(1,Math.round(8*b.lv*(1-(S?T_(S,'beam'):0)*.15)*bonusMul('fog')))});
export function cleanse(S,k){const b=S.g[k];if(!b||!b.fog)return'Sis yok';const c=cleanseCost(b,S);if(!canAfford(S,c))return'RES';pay(S,c);b.fog=0;return null}
export function assign(S,k,d){const b=S.g[k];if(!b||!hasJob(b.k)||b.fog)return false;const nw=(b.w||0)+d;if(nw<0||nw>maxW(b.lv)||(d>0&&idle(S)<=0))return false;b.w=nw;return true}
export function collect(S,k,now){const b=S.g[k];const a=Math.floor(b.stored||0);if(a<1)return 0;addRes(S,{[KINDS[b.k].res]:a});b.stored-=a;S.st.collect++;dailyInc(S,'collect',1,now);return a}
export function setLight(S,on){if(on&&S.res.crys<=0)return'Kristal yok';S.fener.on=on;return null}
// --- filo
const hb_=S=>Object.values(homeG(S));
export const yardLv=S=>Math.max(0,...hb_(S).filter(b=>b.k==='yard'&&!b.fog).map(b=>b.lv));
export const yardW=S=>hb_(S).filter(b=>b.k==='yard').reduce((a,b)=>a+(b.w||0),0);
export function trainCost(t,n){const c={};for(const r in TROOPS[t].cost)c[r]=TROOPS[t].cost[r]*n;return c}
export const trainTime=(S,t,n)=>Math.ceil(TROOPS[t].t*n/((1+.15*(yardLv(S)-1))*(1+.25*yardW(S)))*(1-T_(S,'drill')*.1)*(1-Math.min(.5,skill(S,'train'))));
export function startTrain(S,t,n,now){if(!yardLv(S))return'Tersane yok';if(S.train)return'Tersane meşgul';const c=trainCost(t,n);if(!canAfford(S,c))return'RES';
 pay(S,c);const sec=trainTime(S,t,n);S.train={t,n,end:now+sec*1000,dur:sec};return null}
export const labLv=S=>Math.max(0,...hb_(S).filter(b=>b.k==='lab'&&!b.fog).map(b=>b.lv));
export const techCost=(id,lv)=>({wood:60*(lv+1)**2,fish:30*(lv+1)**2,crys:15*(lv+1)**2});
export const techTime=lv=>30*(lv+1)**2;
export function checkTech(S,id){const T=TECH.find(t=>t.id===id),lv=T_(S,id);if(!labLv(S))return'Gözlemevi yok';if(lv>=T.max)return'En üst seviye';if(!techReqOK(S,T))return'Önceki düğüm gerekli';if(lv>=labLv(S))return`Gözlemevi Sv${lv+1} gerekli`;return null}
export function startResearch(S,id,now){if(S.research)return'Zaten araştırılıyor';const e=checkTech(S,id);if(e)return e;const lv=T_(S,id);const c=techCost(id,lv);if(!canAfford(S,c))return'RES';
 pay(S,c);S.research={id,end:now+techTime(lv)*1000,dur:techTime(lv)};dailyInc(S,'research',1,now);return null}
export const HGEAR=[{k:'k',i:'🧭',r:'wood'},{k:'s',i:'🔭',r:'fish'},{k:'c',i:'🪬',r:'crys'}],TAL_MAX=5,EQ_MAX=5;
export const eqSum=st=>HGEAR.reduce((a,g)=>a+Math.min(EQ_MAX,st.eq?.[g.k]||0),0);
export const heroMul=st=>(1+.06*Math.min(TAL_MAX,st.tal||0))*(1+.03*eqSum(st));
export const heroPower=(h,st)=>Math.round(h.p*(1+.5*(st.star-1))*(1+.1*((st.lv||1)-1))*heroMul(st));
export const TAL_SH=[5,10,20,30,45],TAL_CR=[20,40,80,120,160],USH_X={crys:50,day:10};
export const talCost=st=>{const t=Math.min(4,st.tal||0);return{sh:TAL_SH[t],crys:TAL_CR[t]}};
export const ushOf=S=>S.ush||0;
export const USH_AR=5;
export function ushArena(S,now){const d=day(now);S.usha=S.usha||{d:'',n:0};if(S.usha.d!==d)S.usha={d,n:0};if(S.usha.n>=USH_AR)return'MAX';S.ush=ushOf(S)+1;S.usha.n++;return null}
export function ushBuy(S,now){const d=day(now);S.ushx=S.ushx||{d:'',n:0};if(S.ushx.d!==d)S.ushx={d,n:0};if(S.ushx.n>=USH_X.day)return'MAX';if(S.res.crys<USH_X.crys)return'RES';S.res.crys-=USH_X.crys;S.ush=ushOf(S)+1;S.ushx.n++;return null}
export function ushGive(S,id,n=1){const st=S.heroes[id];if(!st||ushOf(S)<n)return'SH';S.ush-=n;st.sh+=n;return null}
export const eqCost=(st,g)=>{const l=st.eq?.[g.k]||0,G=HGEAR.find(x=>x.k===g.k);return{[G.r]:(G.r==='crys'?60:250)*(l+1)*(l+1)}};
export function talUp(S,id){const st=S.heroes[id];if(!st)return'NO';if((st.tal||0)>=TAL_MAX)return'MAX';const c=talCost(st);if(st.sh+ushOf(S)<c.sh)return'SH';if(S.res.crys<c.crys)return'RES';const fh=Math.min(st.sh,c.sh);st.sh-=fh;S.ush=ushOf(S)-(c.sh-fh);S.res.crys-=c.crys;st.tal=(st.tal||0)+1;return null}
export function eqUp(S,id,k){const st=S.heroes[id],g=HGEAR.find(x=>x.k===k);if(!st||!g)return'NO';st.eq=st.eq||{};if((st.eq[k]||0)>=EQ_MAX)return'MAX';const c=eqCost(st,g);if(!canAfford(S,c))return'RES';pay(S,c);st.eq[k]=(st.eq[k]||0)+1;return null}
export const team=S=>HEROES.filter(h=>S.heroes[h.id]).sort((a,b)=>heroPower(b,S.heroes[b.id])-heroPower(a,S.heroes[a.id])).slice(0,3);
const gearM=(S,st)=>1+Object.entries(GEAR).filter(([,G])=>G.st===st).reduce((a,[id,G])=>a+(S.gear[id]||0)*G.v,0);
export const towerLv=S=>allB(S).filter(b=>b.k==='tower').reduce((a,b)=>a+b.lv,0);
export const atkM=S=>(1+T_(S,'harp')*.1)*gearM(S,'atk')*(1+skill(S,'atk'))*(1+towerLv(S)*.03);
export const hpM=S=>(1+T_(S,'hull')*.1)*gearM(S,'hp')*(1+skill(S,'hp'));
export function armyPower(S){const ta=atkM(S),th=hpM(S);let p=0;for(const t in TROOPS)p+=S.troops[t]*(TROOPS[t].atk*ta+TROOPS[t].hp*th*.25);
 for(const h of team(S))p+=heroPower(h,S.heroes[h.id])*2;return Math.round(p*(1+forgeLv(S)*.03))}
export const forgeLv=S=>allB(S).filter(b=>b.k==='forge').reduce((a,b)=>a+b.lv,0);
// Dürüst çağrı: oranlar sabit (5/25/70), her 40 çağrıda Efsanevi garanti, her 80 çağrıda seçmeli Efsanevi hakkı (sayaçlar görünür)
export function selPick(S,id){const h=HEROES.find(x=>x.id===id&&x.r===3&&!x.season);if(!h)return'NO';if(!(S.selTok>0))return'TOK';S.selTok--;let isNew=false;if(!S.heroes[id]){S.heroes[id]={star:1,sh:0,lv:1};isNew=true}else S.heroes[id].sh+=10;return{h,isNew}}
export function recruit(S,rng){S.pity++;S.pity2=(S.pity2||0)+1;if(S.pity2>=PITY2){S.pity2=0;S.selTok=(S.selTok||0)+1}const r=rng()*100;let rar=r<5?3:r<30?2:1;if(S.pity>=PITY)rar=3;if(rar===3)S.pity=0;const pool=HEROES.filter(h=>h.r===rar&&!h.season);const h=pool[Math.floor(rng()*pool.length)];
 let isNew=false;if(!S.heroes[h.id]){S.heroes[h.id]={star:1,sh:0,lv:1};isNew=true}else{S.heroes[h.id].sh+=10;S.ush=(S.ush||0)+2}
 S.st.recruit++;addXP(S,5);return{h,isNew}}
export function simulate(S,stage,rng,epo){const ta=atkM(S),th=hpM(S);const hb=team(S).reduce((a,h)=>a+heroPower(h,S.heroes[h.id]),0);
 let atk=0,hp=0;for(const t in TROOPS){atk+=S.troops[t]*TROOPS[t].atk*ta;hp+=S.troops[t]*TROOPS[t].hp*th}atk+=hb*1.2;hp+=hb*2;
 const EP=epo||stagePower(stage);let eAtk=EP*.32,eHp=EP*1.6;const myMax=hp,eMax=eHp;const rounds=[];
 for(let i=0;i<10&&hp>0&&eHp>0;i++){const d1=Math.round(atk*(.85+rng()*.3));eHp=Math.max(0,eHp-d1);let d2=0;if(eHp>0){d2=Math.round(eAtk*(.85+rng()*.3));hp=Math.max(0,hp-d2)}rounds.push({d1,d2,hp,eHp})}
 const win=eHp<=0;const lossFrac=myMax?Math.min(1,(myMax-hp)/myMax)*.5:0;return{win,rounds,myMax,eMax,lossFrac}}
export function applyBattle(S,res,stage,now){const lost={};for(const t in TROOPS){lost[t]=Math.floor(S.troops[t]*res.lossFrac);S.troops[t]-=lost[t]}
 let rw=null,saved=0;if(res.win){const lm=(1+T_(S,'loot')*.1+(S.gear.sail||0)*.03)*(1+skill(S,'loot'));rw=stageReward(stage);const km=stageFoe(stage)==='kraken'?bonusMul('kraken'):1;for(const r in rw)if(r!=='gems')rw[r]=Math.round(rw[r]*lm*km);addRes(S,rw);
  if(stage===S.stage){S.stage++;saved=Math.min(stageRescue(stage),Math.max(0,cap(S)-S.surv));S.surv+=saved}S.st.wins++;dailyInc(S,'battle',1,now);addXP(S,20)}return{lost,rw,saved}}
export function dailyReset(S,now){const d=day(now);if(S.daily.date!==d)S.daily={date:d,p:{},c:{}}}
export const weekIst=now=>{const d=new Date(now+108e5);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d.toISOString().slice(0,10)};
export function weeklyReset(S,now){const w=weekIst(now);if(!S.weekly||S.weekly.w!==w)S.weekly={w,p:{},c:{}}}
// Fener Takvimi: haftanın her günü bir tema (İstanbul saati, Pzt=0); temaya uyan eylemler puan verir, 3 günlük sandık
export const EVDAYS=[{id:'build',ic:'🏗️',w:{merge:20,upgrade:30,build:10}},{id:'crew',ic:'⚓',w:{train:2,collect:4}},{id:'capt',ic:'🧑‍✈️',w:{recruit:25,heroup:15}},{id:'lab',ic:'🔬',w:{research:60,upgrade:15,collect:5}},{id:'sea',ic:'⛵',w:{battle:25,train:1,collect:3}},{id:'front',ic:'🌫️',w:{battle:15,raid:40,arena:30,train:1}},{id:'kraken',ic:'🦑',w:{boss:40,battle:10,heroup:15,collect:3}}];
export const EVCH=[{n:120,r:{wood:400,fish:400}},{n:300,r:{crys:250,gems:20}},{n:600,r:{gems:40,ush:5}}];
export const evDow=now=>(Math.floor((now+108e5)/864e5)+3)%7;
export function evReset(S,now){const d=dayIst(now);if(!S.ev||S.ev.d!==d)S.ev={d,p:0,c:[]}}
export function evReady(S,now){evReset(S,now);return EVCH.findIndex((c,i)=>S.ev.p>=c.n&&!S.ev.c.includes(i))}
export function claimEv(S,i,now){evReset(S,now);const c=EVCH[i];if(!c||S.ev.c.includes(i)||S.ev.p<c.n)return'Hazır değil';const r={...c.r},u=r.ush||0;delete r.ush;addRes(S,r);if(u)S.ush=(S.ush||0)+u;S.ev.c.push(i);addXP(S,25);return null}
export function dailyInc(S,id,n,now){evReset(S,now);{const w=EVDAYS[evDow(now)].w[id];if(w)S.ev.p+=w*n}dailyReset(S,now);S.daily.p[id]=(S.daily.p[id]||0)+n;weeklyReset(S,now);S.weekly.p[id]=(S.weekly.p[id]||0)+n}
export function claimWeekly(S,id,now){weeklyReset(S,now);const d=WEEKLY.find(x=>x.id===id);if(!d||S.weekly.c[id]||(S.weekly.p[id]||0)<d.n)return'Hazır değil';S.gems+=d.g;S.ush=(S.ush||0)+10;S.weekly.c[id]=1;addXP(S,60);return null}
export const clanB={prod:0,store:0,help:0};
export function claimDaily(S,id){const d=DAILY.find(x=>x.id===id);if(!d||S.daily.c[id]||(S.daily.p[id]||0)<d.n)return'Hazır değil';S.gems+=d.g;S.ush=(S.ush||0)+2;S.daily.c[id]=1;addXP(S,30);return null}
export const questDone=S=>{const q=QUESTS[S.q];return q&&q.f(S)>=q.n};
export function claimQuest(S){const q=QUESTS[S.q];if(!q||q.f(S)<q.n)return null;addRes(S,q.r);S.q++;addXP(S,50);return q}
export const loginReady=(S,now)=>S.login.last!==day(now);
export function claimLogin(S,now){if(!loginReady(S,now))return null;const i=S.login.n%7,r=LOGIN[i];addRes(S,r);S.login.n++;S.login.total++;S.login.last=day(now);return{i,r}}
export const achReady=S=>ACH.filter(a=>!S.ach[a.id]&&a.f(S)>=a.n);
export function claimAch(S,id){const a=ACH.find(x=>x.id===id);if(!a||S.ach[id]||a.f(S)<a.n)return'Hazır değil';S.ach[id]=1;S.gems+=a.g;return null}
// Zaman adımı: olay listesi döndürür (UI tepki verir).
export function step(S,dt,now,rng=Math.random){const ev=[];const m=dt/60;
 if(S.fener.on){S.res.crys=Math.max(0,S.res.crys-crysUse(S)*m);if(S.res.crys<=0){S.fener.on=false;ev.push({e:'dark'})}}
 S.res.fish=Math.max(0,S.res.fish-fishUse(S)*m);
 if(S.fener.end&&now>=S.fener.end){S.fener.end=0;S.fener.lv++;ev.push({e:'fener',lv:S.fener.lv})}
 const auto=vipLv(S)>=6;
 for(const[id,g]of grids(S))for(const k in g){const b=g[k];if(b.end&&now>=b.end){b.end=0;b.lv++;ev.push({e:'built',k,lv:b.lv,isl:id})}
  if(KINDS[b.k].res){b.stored=Math.min(storeCap(S,k,id),(b.stored||0)+rate(S,k,id)*m);if(auto&&b.stored>=1){const a=Math.floor(b.stored);addRes(S,{[KINDS[b.k].res]:a});b.stored-=a}}}
 if(S.train&&now>=S.train.end){S.troops[S.train.t]+=S.train.n;S.st.trained+=S.train.n;dailyInc(S,'train',S.train.n,now);ev.push({e:'trained',...S.train});S.train=null}
 if(S.research&&now>=S.research.end){S.tech[S.research.id]=(S.tech[S.research.id]||0)+1;ev.push({e:'researched',id:S.research.id});S.research=null}
 S.raftT+=dt;if(S.raftT>=(S.surv<8?25:RAFT_EVERY)*(1-T_(S,'raft')*.1)){S.raftT=0;if(S.surv<cap(S)&&S.res.fish>0){S.surv++;ev.push({e:'raft'})}}
 if(S.tut>=9){S.rescueT+=dt;if(S.rescueT>200){S.rescueT=0;ev.push({e:'wreck',n:2+Math.floor(rng()*3)})}
  const n=Math.floor(((now-S.t0)/1000+NIGHT_LEN)/NIGHT_EVERY);if(n>S.nightN){S.nightN=n;const need=nightNeed(S);
   if(lit(S)&&S.res.crys>=need){S.res.crys-=need;S.st.repel++;const gg=T_(S,'glow')*5;S.gems+=gg;ev.push({e:'repel',need,gg})}
   else{const hg=homeG(S);const edge=Object.keys(hg).filter(k=>!hg[k].fog).sort((a,b)=>ring(b)-ring(a)).slice(0,2);edge.forEach(k=>{hg[k].fog=1;hg[k].w=0});ev.push({e:'corrupt',ks:edge,isl:'home'})}}}
 return ev}
export function offline(S,now){const sec=Math.min(8*3600,(now-S.saved)/1000);if(sec<60)return null;const g={};
 for(const[id,gr]of grids(S))for(const k in gr){const r=KINDS[gr[k].k].res;if(r)g[r]=(g[r]||0)+Math.floor(rate(S,k,id)*sec/60*(.5+T_(S,'offl')*.1))}
 for(const k in g)if(!g[k])delete g[k];return Object.keys(g).length?{g,min:Math.floor(sec/60)}:null}

// DEMO sezon: sezon kaptanı yalnız Sis İzi yolu ile (gacha havuzunda yok)
export const SEASON={id:1,start:Date.UTC(2026,9,26),days:60,need:45,hero:'sisnur',routeDaily:2};
export const seasonEnd=()=>SEASON.start+SEASON.days*864e5;
export function seasonOf(S){if(!S.season||S.season.id!==SEASON.id)S.season={id:SEASON.id,marks:0,last:'',route:0};return S.season}
export function settleSeason(S){const z=seasonOf(S),H=SEASON.hero;let got=0;if(!S.heroes[H]&&z.marks>=SEASON.need){S.heroes[H]={star:1,sh:0,lv:1};got=1}
 const base=Math.max(SEASON.need,z.cr||0);if(S.heroes[H]&&z.marks>base)S.heroes[H].sh+=(z.marks-base)*2;z.cr=Math.max(z.cr||0,z.marks);return got}
export function claimMark(S,now){const z=seasonOf(S),d=dayIst(now);if(z.last===d||now<SEASON.start||now>seasonEnd())return 0;z.last=d;z.offl=d;const n=1+(z.route?SEASON.routeDaily:0);z.marks+=n;settleSeason(S);return n}
// sunucu durumu (monet_me) yerel kayda uygulanır; sunucu esas
export function applyMonet(S,st){if(!st)return;const q=(S.spend&&S.spend.q)||[];S.spend={...st.spend,q:[]};if(q.length)S.spend.q=q;const z=seasonOf(S);
 if(st.season.id===z.id){z.marks=st.season.marks;z.last=st.season.last;z.route=st.season.route;delete z.offl}settleSeason(S)}
export const priceNum=p=>+(String(p).replace(/[^0-9,\.]/g,'').replace(',','.'))||0;
export const monthKey=now=>new Date(now).toISOString().slice(0,7);
export function spendOf(S,now){const m=monthKey(now);if(!S.spend)S.spend={on:1,lim:500,m,sum:0,q:[]};const z=S.spend;if(z.m!==m){z.m=m;z.sum=0}if(z.pend&&now>=z.pend.at){z.lim=z.pend.lim;if(z.pend.on!=null)z.on=z.pend.on;delete z.pend}return z}

// ---------- Korsan Konvoyu (deniz haritası PvE olayı) ----------
export const CONVOY_CD=4*3600e3;
export const convoyPower=S=>Math.round(stagePower(Math.max(1,S.stage-1))*1.15);
export const convoyReward=S=>{const n=Math.max(1,S.stage-1),m=(1+towerLv(S)*.08)*bonusMul('convoy');return{wood:Math.round(70*n*m),crys:Math.round(22*n*m),gems:15}};
export function convoyState(S,now){S.conv=S.conv||{next:0,n:0,w:0};return{ready:S.tut>=9&&S.stage>=3&&now>=S.conv.next,left:Math.max(0,S.conv.next-now),open:S.stage>=3&&S.tut>=9}}
export function convoyFight(S,now,rng){const c=convoyState(S,now);if(!c.open)return{err:'Ada 3 gerekli'};if(!c.ready)return{err:'Konvoy henüz görünmedi'};
 const res=simulate(S,S.stage,rng,convoyPower(S));const lost={};for(const t in TROOPS){lost[t]=Math.floor(S.troops[t]*res.lossFrac*.6);S.troops[t]-=lost[t]}
 S.conv.next=now+CONVOY_CD;S.conv.n++;let rw=null;if(res.win){rw=convoyReward(S);if(rng()<.25)rw.ticket=1;addRes(S,rw);S.conv.w++;S.ush=(S.ush||0)+3;rw.ush=3;dailyInc(S,'battle',1,now);addXP(S,15)}return{res,rw,lost}}
