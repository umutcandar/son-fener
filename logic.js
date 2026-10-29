// ===== Son Fener — saf oyun mantığı (DOM / THREE yok). Tüm durum tek, JSON'a çevrilebilir nesnede (S).
// Çevrimiçi sürümde bu modül sunucuda da çalıştırılabilir: aksiyon(S, args) -> sonuç / olay listesi.
export const RES=['fish','wood','crys'];
export const RIC={fish:'🐟',wood:'🪵',crys:'🔮',gems:'💎'};
export const RNAME={fish:'Balık',wood:'Kereste',crys:'Işık Kristali'};
export const GR=4; // ızgara yarıçapı (−4..4)
export const tileOK=(i,j)=>Math.abs(i)<=GR&&Math.abs(j)<=GR&&!(Math.abs(i)===GR&&Math.abs(j)===GR)&&!(i===0&&j===0);
export const key=(i,j)=>i+','+j;export const unkey=k=>k.split(',').map(Number);
export const ring=k=>{const[i,j]=unkey(k);return Math.max(Math.abs(i),Math.abs(j))};
export const KINDS={
 hut:{n:'Barınak',ic:'🛖',req:1,cost:{wood:20},d:'Kurtulanlar burada yaşar. Her seviye +2 kişilik yer.'},
 fisher:{n:'Balıkçı İskelesi',ic:'🎣',req:1,res:'fish',perW:3,cost:{wood:25},d:'Balıkçılar herkesi doyurur.'},
 wood:{n:'Oduncu',ic:'🪓',req:1,res:'wood',perW:3,cost:{fish:20},d:'Oduncular ada ağaçlarından kereste keser.'},
 mine:{n:'Kristal Madeni',ic:'🔮',req:1,res:'crys',perW:1.6,cost:{wood:30,fish:10},d:'Madenciler Feneri besleyen ışık kristalini çıkarır.'},
 yard:{n:'Tersane',ic:'⚓',req:2,cost:{wood:80,fish:40},d:'Filo tayfası eğitilir. Gemi ustaları eğitimi hızlandırır.',job:'Gemi ustası'},
 lab:{n:'Gözlemevi',ic:'🔭',req:3,cost:{wood:150,crys:60},d:'Araştırma ağacı: ekonomi, fener ve donanma.'},
};
export const JOB={fisher:'Balıkçı',wood:'Oduncu',mine:'Madenci',yard:'Gemi ustası'};
export const FENER_MAX=7;
export const safeR=S=>Math.min(GR,S.fener.lv+1);
export const maxLv=S=>S.fener.lv+1;
export const isSafe=(S,k)=>ring(k)<=safeR(S);
export const TROOPS={tayfa:{n:'Tayfa',ic:'⚓',atk:10,hp:40,cost:{fish:8,wood:4},t:2},zipkin:{n:'Zıpkıncı',ic:'🔱',atk:14,hp:28,cost:{fish:10,wood:6},t:3},topcu:{n:'Topçu',ic:'💣',atk:19,hp:18,cost:{fish:12,wood:8,crys:1},t:4}};
export const HEROES=[
 {id:'reis',n:'Kaptan Reis',ic:'🧔',r:3,role:'Topçu',p:120},{id:'derya',n:'Derya Ana',ic:'👩‍✈️',r:3,role:'Zıpkıncı',p:120},
 {id:'poyraz',n:'Poyraz',ic:'🧑‍✈️',r:2,role:'Tayfa',p:70},{id:'mercan',n:'Mercan',ic:'👩‍🦰',r:2,role:'Topçu',p:70},
 {id:'lodos',n:'Lodos',ic:'👨‍🦲',r:1,role:'Tayfa',p:40},{id:'kumru',n:'Kumru',ic:'👧',r:1,role:'Zıpkıncı',p:40}];
export const RARITY={3:{n:'Efsanevi',odds:5},2:{n:'Epik',odds:25},1:{n:'Nadir',odds:70}};
export const TECH=[
 {id:'net',br:'Ekonomi',n:'Sağlam Ağlar',ic:'🕸️',d:'Balık ve kereste +15%/sv',max:5},
 {id:'cut',br:'Ekonomi',n:'Kristal Kesme',ic:'💠',d:'Kristal üretimi +15%/sv',max:5},
 {id:'lens',br:'Fener',n:'Büyük Mercek',ic:'🔆',d:'Fener tüketimi −10%/sv',max:5},
 {id:'ward',br:'Fener',n:'Sis Kalkanı',ic:'🛡️',d:'Sis Gecesi kristal ihtiyacı −10%/sv',max:5},
 {id:'harp',br:'Donanma',n:'Çelik Zıpkın',ic:'🔱',d:'Filo saldırısı +10%/sv',max:5},
 {id:'hull',br:'Donanma',n:'Meşe Gövde',ic:'🛶',d:'Filo dayanıklılığı +10%/sv',max:5}];
export const FOES={ghost:{n:'Sis Hayaletleri',ic:'👻'},octo:{n:'Sis Ahtapotu',ic:'🐙'},kraken:{n:'Derin Kraken',ic:'🦑'}};
const ISL=['Martı Kayası','Tuz Adası','Batık Liman','Mercan Koyu','Kurukafa Burnu','Fırtına Tepesi','Yosun Adası','Sessiz Körfez','Kırık Direk','Eski Fener'];
export const islandName=n=>ISL[(n-1)%ISL.length]+(n>ISL.length?' '+(Math.floor((n-1)/ISL.length)+1):'');
export const stageFoe=n=>n%5===0?'kraken':n%2?'ghost':'octo';
export const stagePower=n=>Math.round(260*Math.pow(1.32,n-1));
export const stageReward=n=>({fish:40*n,wood:40*n,crys:12*n,gems:n%5===0?30:5});
export const stageRescue=n=>1+Math.floor(n/3);
export const QUESTS=[
 {t:'Feneri yak',f:S=>S.fener.on?1:0,n:1,r:{wood:30}},
 {t:'Madene 2 işçi ata',f:S=>maxW_of(S,'mine'),n:2,r:{fish:30}},
 {t:'Kaynak topla',f:S=>S.st.collect,n:1,r:{wood:40}},
 {t:'2 binayı birleştir',f:S=>S.st.merge,n:1,r:{crys:20}},
 {t:'Balıkçıya 2 işçi ata',f:S=>maxW_of(S,'fisher'),n:2,r:{wood:50}},
 {t:'Feneri Sv2 yap',f:S=>S.fener.lv,n:2,r:{gems:20}},
 {t:'Tersane kur',f:S=>count(S,'yard'),n:1,r:{fish:80}},
 {t:'10 tayfa eğit',f:S=>S.st.trained,n:10,r:{wood:100}},
 {t:'İlk adayı sisten kurtar',f:S=>S.stage-1,n:1,r:{gems:20}},
 {t:'Sv3 bir bina yap',f:S=>Math.max(0,...Object.values(S.g).map(b=>b.lv)),n:3,r:{crys:60}},
 {t:'Bir kaptan çağır',f:S=>S.st.recruit,n:1,r:{gems:30}},
 {t:'Feneri Sv3 yap',f:S=>S.fener.lv,n:3,r:{gems:30}},
 {t:'Gözlemevi kur',f:S=>count(S,'lab'),n:1,r:{crys:80}},
 {t:'5 ada kurtar',f:S=>S.stage-1,n:5,r:{gems:50}},
 {t:'İlk araştırmayı bitir',f:S=>Object.values(S.tech).reduce((a,b)=>a+b,0),n:1,r:{gems:40}},
 {t:'Feneri Sv5 yap',f:S=>S.fener.lv,n:5,r:{gems:80}},
 {t:'15 ada kurtar',f:S=>S.stage-1,n:15,r:{gems:150}},
];
export const DAILY=[{id:'collect',t:'5 kez kaynak topla',n:5,g:10},{id:'merge',t:'3 birleştirme yap',n:3,g:10},{id:'train',t:'10 tayfa eğit',n:10,g:10},{id:'battle',t:'1 deniz savaşı kazan',n:1,g:15},{id:'recruit',t:'1 kaptan çağır',n:1,g:15}];
export const NIGHT_EVERY=240,NIGHT_LEN=45,RAFT_EVERY=45;
function maxW_of(S,k){return Math.max(0,...Object.values(S.g).filter(b=>b.k===k).map(b=>b.w||0))}
export const count=(S,k)=>Object.values(S.g).filter(b=>b.k===k).length;
// ---------- durum ----------
export function newState(now){
 const g={};const put=(i,j,k,lv=1)=>g[key(i,j)]={k,lv,w:0,stored:0};
 put(1,0,'mine');put(0,1,'fisher');put(-1,0,'wood');put(-1,1,'hut');
 return {v:1,res:{fish:60,wood:60,crys:30},gems:60,g,fener:{lv:1,on:false,end:0,dur:0},surv:4,troops:{tayfa:0,zipkin:0,topcu:0},train:null,tech:{},research:null,
  heroes:{lodos:{star:1,sh:0}},stage:1,vipPts:0,monthly:0,monthlyClaim:'',builders:1,q:0,tut:0,st:{collect:0,trained:0,recruit:0,wins:0,merge:0},
  daily:{date:'',p:{},c:{}},freeCall:'',t0:now,saved:now,raftT:0,rescueT:0,nightN:0,buy:{}};
}
export const day=now=>new Date(now).toISOString().slice(0,10);
export const vipLv=S=>[0,100,300,700,1500,3000,6000].filter(x=>S.vipPts>=x).length-1;
export const builderCount=S=>S.builders+(vipLv(S)>=3?1:0);
export const cap=S=>Object.values(S.g).filter(b=>b.k==='hut').reduce((a,b)=>a+b.lv*2,0)+2;
export const workers=S=>Object.values(S.g).reduce((a,b)=>a+(b.w||0),0);
export const idle=S=>S.surv-workers(S);
export const maxW=lv=>1+lv;
export const hasJob=k=>!!JOB[k];
export const islandBonus=S=>Math.min(.3,(S.stage-1)*.03);
// Sis Gecesi döngüsü (eğitim bitince başlar)
const nt=(S,now)=>S.tut<9?0:((now-S.t0)/1000);
export const night=(S,now)=>S.tut>=9&&nt(S,now)%NIGHT_EVERY>NIGHT_EVERY-NIGHT_LEN;
export const nightIn=(S,now)=>{const t=nt(S,now)%NIGHT_EVERY;return night(S,now)?-(NIGHT_EVERY-t):NIGHT_EVERY-NIGHT_LEN-t};
export const nightNeed=S=>Math.round(12*S.fener.lv*(1-(S.tech.ward||0)*.1));
export const lit=S=>S.fener.on&&S.res.crys>0;
export const crysUse=S=>S.fener.on?(.8+S.fener.lv*.5)*(1-(S.tech.lens||0)*.1):0; // /dk
export const fishUse=S=>S.surv*.5;
export function rate(S,k){const b=S.g[k];if(!b||!KINDS[b.k].res||b.fog)return 0;const r=KINDS[b.k].res;
 let m=1+(S.tech.net||0)*.15*(r!=='crys')+(S.tech.cut||0)*.15*(r==='crys');
 return (b.w||0)*KINDS[b.k].perW*(1+.5*(b.lv-1))*m*(1+vipLv(S)*.05+islandBonus(S))*(lit(S)?1:.5)*(S.res.fish<=0&&r!=='fish'?.5:1)}
export const storeCap=(S,k)=>Math.max(30,rate(S,k)*120);
export function canAfford(S,c){return Object.entries(c).every(([r,v])=>(r==='gems'?S.gems:S.res[r])>=v)}
export function pay(S,c){for(const r in c)r==='gems'?S.gems-=c[r]:S.res[r]-=c[r]}
export function addRes(S,c){for(const r in c){if(r==='gems')S.gems+=c[r];else if(r in S.res)S.res[r]+=c[r]}}
export const busyBuilders=S=>Object.values(S.g).filter(b=>b.end).length+(S.fener.end?1:0);
// --- inşa / birleştir / yükselt
export function checkBuild(S,k,kind){const[i,j]=unkey(k);if(!tileOK(i,j))return'Buraya kurulamaz';if(S.g[k])return'Dolu';if(!isSafe(S,k))return'Sisli bölge — Feneri yükselt';
 if(S.fener.lv<KINDS[kind].req)return`Fener Sv${KINDS[kind].req} gerekli`;if(!canAfford(S,KINDS[kind].cost))return'RES';return null}
export function build(S,k,kind){const e=checkBuild(S,k,kind);if(e)return e;pay(S,KINDS[kind].cost);S.g[k]={k:kind,lv:1,w:0,stored:0};return null}
export function canMerge(S,a,b){const A=S.g[a],B=S.g[b];return !!(A&&B&&a!==b&&A.k===B.k&&A.lv===B.lv&&!A.end&&!B.end&&!A.fog&&!B.fog&&A.lv<maxLv(S)&&isSafe(S,b))}
export function merge(S,a,b,now){if(!canMerge(S,a,b))return'Birleşemez';const A=S.g[a],B=S.g[b];delete S.g[a];B.lv++;B.stored=(B.stored||0)+(A.stored||0);
 B.w=Math.min(maxW(B.lv),(B.w||0)+(A.w||0));S.st.merge++;dailyInc(S,'merge',1,now);return null}
export function move(S,a,b){if(!S.g[a]||S.g[b]||!isSafe(S,b))return'Taşınamaz';const[i,j]=unkey(b);if(!tileOK(i,j))return'Taşınamaz';S.g[b]=S.g[a];delete S.g[a];return null}
export const upCost=(kind,lv)=>{const c={};for(const r in KINDS[kind].cost)c[r]=Math.round(KINDS[kind].cost[r]*1.6*Math.pow(2,lv));return c};
export const upTime=lv=>Math.round(6*Math.pow(2,lv));
export const fenerCost=lv=>{const L=lv+1;return{wood:60*L*L,fish:30*L*L,crys:20*L*L}};
export const fenerTime=lv=>12*(lv+1)**2;
export const speedGems=sec=>Math.max(1,Math.ceil(sec/60));
export function checkUp(S,k){const b=k==='fener'?S.fener:S.g[k];if(!b)return'Yok';if(b.end)return'Zaten inşaatta';
 if(k==='fener'){if(b.lv>=FENER_MAX)return'En üst seviye'}else{if(b.fog)return'Önce sisten arındır';if(b.lv>=maxLv(S))return`Önce Feneri Sv${b.lv} yap`}
 if(busyBuilders(S)>=builderCount(S))return'BUILDERS';if(!canAfford(S,k==='fener'?fenerCost(b.lv):upCost(b.k,b.lv)))return'RES';return null}
export function startUp(S,k,now){const e=checkUp(S,k);if(e)return e;const b=k==='fener'?S.fener:S.g[k];const c=k==='fener'?fenerCost(b.lv):upCost(b.k,b.lv);const t=k==='fener'?fenerTime(b.lv):upTime(b.lv);
 pay(S,c);b.end=now+t*1000;b.dur=t;return null}
export const cleanseCost=b=>({crys:8*b.lv});
export function cleanse(S,k){const b=S.g[k];if(!b||!b.fog)return'Sis yok';if(!canAfford(S,cleanseCost(b)))return'RES';pay(S,cleanseCost(b));b.fog=0;return null}
export function assign(S,k,d){const b=S.g[k];if(!b||!hasJob(b.k)||b.fog)return false;const nw=(b.w||0)+d;if(nw<0||nw>maxW(b.lv)||(d>0&&idle(S)<=0))return false;b.w=nw;return true}
export function collect(S,k,now){const b=S.g[k];const a=Math.floor(b.stored||0);if(a<1)return 0;S.res[KINDS[b.k].res]+=a;b.stored-=a;S.st.collect++;dailyInc(S,'collect',1,now);return a}
export function setLight(S,on){if(on&&S.res.crys<=0)return'Kristal yok';S.fener.on=on;return null}
// --- filo
export const yardLv=S=>Math.max(0,...Object.values(S.g).filter(b=>b.k==='yard'&&!b.fog).map(b=>b.lv));
export const yardW=S=>Object.values(S.g).filter(b=>b.k==='yard').reduce((a,b)=>a+(b.w||0),0);
export function trainCost(t,n){const c={};for(const r in TROOPS[t].cost)c[r]=TROOPS[t].cost[r]*n;return c}
export const trainTime=(S,t,n)=>Math.ceil(TROOPS[t].t*n/((1+.15*(yardLv(S)-1))*(1+.25*yardW(S))));
export function startTrain(S,t,n,now){if(!yardLv(S))return'Tersane yok';if(S.train)return'Tersane meşgul';const c=trainCost(t,n);if(!canAfford(S,c))return'RES';
 pay(S,c);const sec=trainTime(S,t,n);S.train={t,n,end:now+sec*1000,dur:sec};return null}
export const labLv=S=>Math.max(0,...Object.values(S.g).filter(b=>b.k==='lab'&&!b.fog).map(b=>b.lv));
export const techCost=(id,lv)=>({wood:60*(lv+1)**2,fish:30*(lv+1)**2,crys:15*(lv+1)**2});
export const techTime=lv=>30*(lv+1)**2;
export function startResearch(S,id,now){if(!labLv(S))return'Gözlemevi yok';if(S.research)return'Zaten araştırılıyor';const lv=S.tech[id]||0;
 if(lv>=TECH.find(t=>t.id===id).max)return'En üst seviye';if(lv>=labLv(S))return`Gözlemevi Sv${lv+1} gerekli`;const c=techCost(id,lv);if(!canAfford(S,c))return'RES';
 pay(S,c);S.research={id,end:now+techTime(lv)*1000,dur:techTime(lv)};return null}
export const heroPower=(h,st)=>Math.round(h.p*(1+.5*(st.star-1)));
export const team=S=>HEROES.filter(h=>S.heroes[h.id]).sort((a,b)=>heroPower(b,S.heroes[b.id])-heroPower(a,S.heroes[a.id])).slice(0,3);
export function armyPower(S){const ta=1+(S.tech.harp||0)*.1,th=1+(S.tech.hull||0)*.1;let p=0;for(const t in TROOPS)p+=S.troops[t]*(TROOPS[t].atk*ta+TROOPS[t].hp*th*.25);
 for(const h of team(S))p+=heroPower(h,S.heroes[h.id])*2;return Math.round(p)}
export function recruit(S,rng){const r=rng()*100,rar=r<5?3:r<30?2:1;const pool=HEROES.filter(h=>h.r===rar);const h=pool[Math.floor(rng()*pool.length)];
 let isNew=false;if(!S.heroes[h.id]){S.heroes[h.id]={star:1,sh:0};isNew=true}else{const st=S.heroes[h.id];st.sh+=10;while(st.star<5&&st.sh>=st.star*10){st.sh-=st.star*10;st.star++}}
 S.st.recruit++;return{h,isNew}}
export function simulate(S,stage,rng){const ta=1+(S.tech.harp||0)*.1,th=1+(S.tech.hull||0)*.1;const hb=team(S).reduce((a,h)=>a+heroPower(h,S.heroes[h.id]),0);
 let atk=0,hp=0;for(const t in TROOPS){atk+=S.troops[t]*TROOPS[t].atk*ta;hp+=S.troops[t]*TROOPS[t].hp*th}atk+=hb*1.2;hp+=hb*2;
 const EP=stagePower(stage);let eAtk=EP*.32,eHp=EP*1.6;const myMax=hp,eMax=eHp;const rounds=[];
 for(let i=0;i<10&&hp>0&&eHp>0;i++){const d1=Math.round(atk*(.85+rng()*.3));eHp=Math.max(0,eHp-d1);let d2=0;if(eHp>0){d2=Math.round(eAtk*(.85+rng()*.3));hp=Math.max(0,hp-d2)}rounds.push({d1,d2,hp,eHp})}
 const win=eHp<=0;const lossFrac=myMax?Math.min(1,(myMax-hp)/myMax)*.5:0;return{win,rounds,myMax,eMax,lossFrac}}
export function applyBattle(S,res,stage,now){const lost={};for(const t in TROOPS){lost[t]=Math.floor(S.troops[t]*res.lossFrac);S.troops[t]-=lost[t]}
 let rw=null,saved=0;if(res.win){rw=stageReward(stage);addRes(S,rw);if(stage===S.stage){S.stage++;saved=Math.min(stageRescue(stage),Math.max(0,cap(S)-S.surv));S.surv+=saved}S.st.wins++;dailyInc(S,'battle',1,now)}return{lost,rw,saved}}
export function dailyReset(S,now){const d=day(now);if(S.daily.date!==d)S.daily={date:d,p:{},c:{}}}
export function dailyInc(S,id,n,now){dailyReset(S,now);S.daily.p[id]=(S.daily.p[id]||0)+n}
// Zaman adımı: olay listesi döndürür (UI tepki verir).
export function step(S,dt,now,rng=Math.random){const ev=[];const m=dt/60;
 if(S.fener.on){S.res.crys=Math.max(0,S.res.crys-crysUse(S)*m);if(S.res.crys<=0){S.fener.on=false;ev.push({e:'dark'})}}
 S.res.fish=Math.max(0,S.res.fish-fishUse(S)*m);
 if(S.fener.end&&now>=S.fener.end){S.fener.end=0;S.fener.lv++;ev.push({e:'fener',lv:S.fener.lv})}
 for(const k in S.g){const b=S.g[k];if(b.end&&now>=b.end){b.end=0;b.lv++;ev.push({e:'built',k,lv:b.lv})}
  if(KINDS[b.k].res)b.stored=Math.min(storeCap(S,k),(b.stored||0)+rate(S,k)*m)}
 if(S.train&&now>=S.train.end){S.troops[S.train.t]+=S.train.n;S.st.trained+=S.train.n;dailyInc(S,'train',S.train.n,now);ev.push({e:'trained',...S.train});S.train=null}
 if(S.research&&now>=S.research.end){S.tech[S.research.id]=(S.tech[S.research.id]||0)+1;ev.push({e:'researched',id:S.research.id});S.research=null}
 S.raftT+=dt;if(S.raftT>=RAFT_EVERY){S.raftT=0;if(S.surv<cap(S)&&S.res.fish>0){S.surv++;ev.push({e:'raft'})}}
 if(S.tut>=9){S.rescueT+=dt;if(S.rescueT>200){S.rescueT=0;ev.push({e:'wreck',n:2+Math.floor(rng()*3)})}
  // Sis Gecesi başlangıcı
  const n=Math.floor(((now-S.t0)/1000+NIGHT_LEN)/NIGHT_EVERY);if(n>S.nightN){S.nightN=n;const need=nightNeed(S);
   if(lit(S)&&S.res.crys>=need){S.res.crys-=need;ev.push({e:'repel',need})}
   else{const edge=Object.keys(S.g).filter(k=>!S.g[k].fog).sort((a,b)=>ring(b)-ring(a)).slice(0,2);edge.forEach(k=>{S.g[k].fog=1;S.g[k].w=0});ev.push({e:'corrupt',ks:edge})}}}
 return ev}
export function offline(S,now){const sec=Math.min(8*3600,(now-S.saved)/1000);if(sec<60)return null;const g={};
 for(const k in S.g){const r=KINDS[S.g[k].k].res;if(r)g[r]=(g[r]||0)+Math.floor(rate(S,k)*sec/60*.5)}
 for(const k in g)if(!g[k])delete g[k];return Object.keys(g).length?{g,min:Math.floor(sec/60)}:null}
