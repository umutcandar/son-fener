// Son Fener — new-player funnel sim (greedy, goal-following bot). Usage: node tools/sim_funnel.mjs [../logic.js] [seconds] ; V=1 for event log
import * as require_fs from 'node:fs';
const L=await import(process.argv[2]||'../logic.js');
const DT=5,DUR=+(process.argv[3]||7200);let now=Date.UTC(2026,9,29,6);const S=L.newState(now);S.tut=0;
let seed=7;const rng=()=>(seed=(seed*16807)%2147483647)/2147483647;
const mom=[],log=[],qT=[];let lastGoal=0,firstRec=null,firstWin=null,lastBattle=-1e9,stalls=[],gemSpent=0;
const ev=(t,m)=>log.push(`${(t/60).toFixed(1)}m ${m}`);
const tiles=[];for(let i=-L.GR;i<=L.GR;i++)for(let j=-L.GR;j<=L.GR;j++)if(L.tileOK(i,j))tiles.push(L.key(i,j));
const free=()=>tiles.filter(k=>!S.g[k]&&L.isSafe(S,k)).sort((a,b)=>L.ring(a)-L.ring(b))[0];
const cnt=k=>Object.values(S.g).filter(b=>b.k===k).length;
let t=0;const tryBuild=k=>{const f=free();if(!f)return false;const e=L.build(S,f,k,now);if(!e)ev(t,`build ${k}@${S.cur}`);return !e};
const kinds=()=>L.ISLANDS[S.cur].kinds;
let go='';function manage(save){
 for(const k in S.g){if((S.g[k].stored||0)>=1)L.collect(S,k,now);if(S.g[k].fog)L.cleanse(S,k)}
 const order=Object.keys(S.g).filter(k=>L.hasJob(S.g[k].k)).sort((a,b)=>{const p=k=>{const r=L.KINDS[S.g[k].k].res;const pr=/Maden/.test(L.QUESTS[S.q]?.t||'')?'crys':/Balık/.test(L.QUESTS[S.q]?.t||'')?'fish':'';return r===pr?0:r==='fish'&&S.res.fish<100?0:r==='wood'?1:r==='crys'?2:r==='fish'?3:4};return p(a)-p(b)});
 for(const k of order)while(L.idle(S)>0&&L.assign(S,k,1));
 if(L.cap(S)-S.surv<=1)tryBuild('hut');
 const want={wood:3,fisher:S.res.fish<80?4:2,mine:2,pearl:1,forge:1};
 if(!save)for(const k of ['wood','fisher','mine','pearl','forge'])if(kinds().includes(k)&&cnt(k)<want[k])tryBuild(k);
 if(S.cur==='home'){if(S.fener.lv>=2&&!cnt('yard'))tryBuild('yard');if(S.fener.lv>=3&&!cnt('lab'))tryBuild('lab');if(S.fener.lv>=4&&!cnt('tower')&&!save)tryBuild('tower')}
 const ks=Object.keys(S.g);for(const a of ks)for(const b of ks)if(S.g[a]&&S.g[b]&&L.canMerge(S,a,b)){L.merge(S,a,b,now);ev(t,`merge ${S.g[b].k} lv${S.g[b].lv}@${S.cur}`)}
 if(!save)for(const k of Object.keys(S.g).sort((a,b)=>(go==='merge'?-1:1)*(S.g[a].lv-S.g[b].lv)))if(!L.startUp(S,k,now)){ev(t,`up ${S.g[k].k}@${S.cur}`);break}
 if(S.cur!=='home'&&!save&&!L.upPost(S))ev(t,'post up '+S.cur);
}
for(;t<=DUR;t+=DT){now+=DT*1000;
 if(t>=120&&S.tut<9){S.tut=9;S.t0=now}
 L.step(S,DT,now,rng);
 if(L.loginReady(S,now))L.claimLogin(S,now);
 if(!S.fener.on&&S.res.crys>3)L.setLight(S,true);
 for(const a of L.ACH)if(!L.claimAch(S,a.id)){mom.push(t);ev(t,'ACH '+a.id)}
 let q;while(q=L.claimQuest(S)){qT.push([S.q-1,t,q.t]);mom.push(t);ev(t,'QUEST✓ '+q.t);lastGoal=t}
 for(const d of L.DAILY)if(!d.on&&!L.claimDaily(S,d.id))mom.push(t),ev(t,'daily '+d.id);
 const cq=L.QUESTS[S.q];go=cq?.go||'';const saveFener=go==='fener'&&/Sv/.test(cq.t),saveIsl=go==='islands'&&cq.f(S)<1&&cq.t.includes('sahiplen');
 const bk=go.startsWith('build:')&&go.slice(6);if(bk&&!cnt(bk)&&L.fener){L.switchIsland(S,'home');tryBuild(bk)}
 const save=(bk&&!cnt(bk))||saveFener||saveIsl||(go==='gear'&&!S.gearT);
 if(saveIsl){const id=cq.t.includes('Mercan')?'mercan':'volkan';const e=L.claimIsland(S,id);if(!e)ev(t,'CLAIM '+id)}
 for(const id of L.owned(S)){L.switchIsland(S,id);manage(save||(go==='islands'&&id==='home'&&cq.f(S)<cq.n&&false))}
 L.switchIsland(S,go==='islands'?'mercan':'home');L.switchIsland(S,'home');
 if(!L.startUp(S,'fener',now))ev(t,'fener up start '+S.fener.lv);
 if(cnt('yard')&&!S.train&&!save&&go!=='heroes'){const n=Math.min(40+S.stage*15,Math.floor((S.res.fish-40)/8),Math.floor(S.res.wood/4));if(n>=5)L.startTrain(S,'tayfa',n,now)}
 if(cnt('lab')&&!S.research&&!save)for(const T of L.TECH)if(!L.startResearch(S,T.id,now)){ev(t,'research '+T.id);break}
 if(go==='gear'||(!save&&S.res.wood>500))for(const id of Object.keys(L.GEAR))if(!L.upGear(S,id)){ev(t,'gear '+id);break}
 if(S.tut>=9){let pay=null;if(S.freeCall!==L.day(now)){S.freeCall=L.day(now);pay='free'}else if(S.tickets>0){S.tickets--;pay='ticket'}else if(S.gems>=330){S.gems-=30;gemSpent+=30;pay='gems'}
  if(pay){const r=L.recruit(S,rng);L.dailyInc(S,'recruit',1,now);S.st.recruit=(S.st.recruit||0);ev(t,`RECRUIT(${pay}) ${r.h?.id||''}`);firstRec??=t}}
 for(const id in S.heroes)if(!L.starUp(S,id))mom.push(t),ev(t,'star '+id);
 if(!save){const id=Object.keys(S.heroes).sort((a,b)=>S.heroes[b].lv-S.heroes[a].lv)[0];if(!L.heroUp(S,id,now))ev(t,'heroUp '+id+' '+S.heroes[id].lv)}
 if(S.tut>=9&&S.fener.lv>=3){const r=L.bossAttack(S,now,rng);if(r&&!r.err)ev(t,'BOSS hit')}
 if(S.tut>=9&&t-lastBattle>=30&&L.armyPower(S)>=L.stagePower(S.stage)){lastBattle=t;const r=L.simulate(S,S.stage,rng);const st=S.stage;L.applyBattle(S,r,st,now);ev(t,(r.win?'WIN':'lose')+' stage '+st);if(r.win){firstWin??=t;mom.push(t)}}
 if(t-lastGoal>=180&&t%60===0)stalls.push(`${(t/60).toFixed(0)}m q${S.q} "${cq?.t}" ${cq?cq.f(S)+'/'+cq.n:''} f${S.res.fish|0} w${S.res.wood|0} c${S.res.crys|0} g${S.gems} fener${S.fener.lv}${S.fener.end?'*':''} pow${L.armyPower(S)|0}/${L.stagePower(S.stage)|0} surv${S.surv}/${L.cap(S)}`);
}
if(process.env.DUMP)require_fs.writeFileSync(process.env.DUMP,JSON.stringify(S));
console.log('QUESTS\n'+qT.map(([i,t,n])=>`${(t/60).toFixed(1)}m #${i} ${n}`).join('\n'));
const gaps=qT.map((x,i)=>x[1]-(i?qT[i-1][1]:0));console.log('maxGap(min)',(Math.max(...gaps)/60).toFixed(1),'gaps>3m',gaps.map((g,i)=>g>180?`#${qT[i][0]}:${(g/60).toFixed(1)}`:'').filter(Boolean).join(' '));
{const m=[...new Set(mom)].sort((a,b)=>a-b);let mg=0,at=0;m.forEach((x,i)=>{const g=x-(i?m[i-1]:0);if(g>mg){mg=g;at=x}});console.log('rewardMoments',m.length,'maxMomentGap(min)',(mg/60).toFixed(1),'at',(at/60).toFixed(1)+'m','moment gaps>3m',m.map((x,i)=>x-(i?m[i-1]:0)>180?((x/60).toFixed(0)+'m:'+((x-m[i-1])/60).toFixed(1)):'').filter(Boolean).join(' '))}
console.log('firstRecruit',firstRec&&(firstRec/60).toFixed(1),'firstWin',firstWin&&(firstWin/60).toFixed(1),'stage',S.stage,'q',S.q,'fener',S.fener.lv,'heroes',Object.keys(S.heroes).length,'gems',S.gems,'gemSpent',gemSpent,'tail:',(t-lastGoal)/60|0,'min since last goal');
console.log('STALLS\n'+stalls.filter((x,i)=>i%3===0).slice(0,30).join('\n'));
if(process.env.V)console.log(log.join('\n'));
