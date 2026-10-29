const L=await import(process.argv[2]||'../logic.js');
const DT=5,DUR=+(process.argv[3]||3600);let now=Date.UTC(2026,9,29,9);const S=L.newState(now);S.tut=0;
let seed=7;const rng=()=>(seed=(seed*16807)%2147483647)/2147483647;
const log=[],qT=[];let lastGoal=0,firstRec=null,firstWin=null,lastBattle=-1e9,stalls=[];
const ev=(t,m)=>log.push(`${(t/60).toFixed(1)}m ${m}`);
const tiles=[];for(let i=-L.GR;i<=L.GR;i++)for(let j=-L.GR;j<=L.GR;j++)if(L.tileOK(i,j))tiles.push(L.key(i,j));
const free=()=>tiles.filter(k=>!S.g[k]&&L.isSafe(S,k)).sort((a,b)=>L.ring(a)-L.ring(b))[0];
const cnt=k=>Object.values(S.g).filter(b=>b.k===k).length;
const tryBuild=k=>{const f=free();if(!f)return false;const e=L.build(S,f,k,now);if(!e)ev(t,'build '+k);return !e};
let t=0;
for(;t<=DUR;t+=DT){now+=DT*1000;
 if(t>=120&&S.tut<9){S.tut=9;S.t0=now}  // tutorial ~2 min
 L.step(S,DT,now,rng);
 if(L.loginReady(S,now))L.claimLogin(S,now);
 for(const k in S.g)if((S.g[k].stored||0)>=1&&t%15===0)L.collect(S,k,now);
 for(const k in S.g)if(S.g[k].fog)L.cleanse(S,k);
 if(!S.fener.on&&S.res.crys>3)L.setLight(S,true);
 // workers: fill producers, fish first if low
 const order=Object.keys(S.g).filter(k=>L.KINDS[S.g[k].k].res||S.g[k].k==='yard').sort((a,b)=>{const p=k=>{const r=L.KINDS[S.g[k].k].res;return r==='fish'&&S.res.fish<100?0:r==='crys'?1:r==='wood'?2:r==='fish'?3:4};return p(a)-p(b)});
 for(const k of order)while(L.idle(S)>0&&L.assign(S,k,1));
 // quests
 let q;while(q=L.claimQuest(S)){qT.push([S.q-1,t,q.t]);ev(t,'QUEST✓ '+q.t);lastGoal=t}
 for(const d of L.DAILY)if(!L.claimDaily(S,d.id))ev(t,'daily '+d.id);
 const cq=L.QUESTS[S.q];
 // economy
 if(L.cap(S)-S.surv<=1&&S.res.wood>=20)tryBuild('hut');
 for(const k of ['wood','fisher','mine'])if(cnt(k)<(k==='wood'?3:k==='fisher'&&S.res.fish<60?4:2))tryBuild(k);
 if(S.fener.lv>=2&&!cnt('yard'))tryBuild('yard');
 if(S.fener.lv>=3&&!cnt('lab'))tryBuild('lab');
 // merges
 const ks=Object.keys(S.g);for(const a of ks)for(const b of ks)if(S.g[a]&&S.g[b]&&L.canMerge(S,a,b)&&(cq?.go==='merge'||cnt(S.g[a].k)>2||S.g[a].k==='hut')){L.merge(S,a,b,now);ev(t,'merge '+S.g[b].k+' lv'+S.g[b].lv)}
 if(!L.startUp(S,'fener',now))ev(t,'fener up start');
 else if(cq?.go==='merge'||Math.min(S.res.fish,S.res.wood)>350)for(const k of Object.keys(S.g).sort((a,b)=>S.g[a].lv-S.g[b].lv))if(!L.startUp(S,k,now)){ev(t,'up '+S.g[k].k);break}
 if(cnt('yard')&&!S.train&&cq?.go!=='heroes'&&S.res.fish>60){const n=Math.min(20,Math.floor((S.res.fish-20)/8),Math.floor(S.res.wood/4));if(n>=5){const e=L.startTrain(S,"tayfa",n,now);if(e&&t%300==0)ev(t,"trainErr "+e+" "+JSON.stringify(S.train))}}
 if(cnt('lab')&&!S.research&&cq?.go!=='heroes')for(const T of L.TECH)if(!L.startResearch(S,T.id,now)){ev(t,'research '+T.id);break}
 // summon (online server does same rules): daily free, tickets, gems when quest asks
 if(S.tut>=9&&(S.freeCall!==L.day(now)||S.tickets>0||(cq?.go==='heroes'&&S.gems>=30&&cq.t.includes('çağır')))){if(S.freeCall!==L.day(now))S.freeCall=L.day(now);else if(S.tickets>0)S.tickets--;else S.gems-=30;const r=L.recruit(S,rng);L.dailyInc(S,'recruit',1,now);ev(t,'RECRUIT '+r.h.id);firstRec??=t}
 if(cq?.go==='heroes'&&cq.t.includes('Sv')){const id=Object.keys(S.heroes).sort((a,b)=>S.heroes[b].lv-S.heroes[a].lv)[0];if(!L.heroUp(S,id,now))ev(t,'heroUp '+id)}
 if(cq?.go==='gear'||S.st.trained>=50)for(const id of Object.keys(L.GEAR||{hull:1}))if(!L.upGear(S,id)){ev(t,'gear '+id);break}
 // battle when power ≥ stage power*1.1
 if(S.tut>=9&&t-lastBattle>=30&&L.armyPower(S)>=L.stagePower(S.stage)*1.0){lastBattle=t;const r=L.simulate(S,S.stage,rng);const st=S.stage;L.applyBattle(S,r,st,now);ev(t,(r.win?'WIN':'lose')+' stage '+st);if(r.win)firstWin??=t}
 if(t-lastGoal>=240&&t%60===0)stalls.push(`${(t/60).toFixed(0)}m q${S.q} "${cq?.t}" ${cq?cq.f(S)+'/'+cq.n:''} res f${S.res.fish|0} w${S.res.wood|0} c${S.res.crys|0} g${S.gems} fener${S.fener.lv} pow${L.armyPower(S)|0}/${L.stagePower(S.stage)}`);
}
console.log('QUESTS', qT.map(([i,t,n])=>`${(t/60).toFixed(1)}m#${i} ${n}`).join('\n'));
const gaps=qT.map((x,i)=>x[1]-(i?qT[i-1][1]:0));console.log('maxGap(min)',(Math.max(...gaps)/60).toFixed(1),'gaps>3m',gaps.map((g,i)=>g>180?`#${qT[i][0]}:${(g/60).toFixed(1)}`:'').filter(Boolean).join(' '));
console.log('firstRecruit',firstRec&&(firstRec/60).toFixed(1),'firstWin',firstWin&&(firstWin/60).toFixed(1),'stage',S.stage,'heroes',Object.keys(S.heroes).join(','),'gems',S.gems,'fener',S.fener.lv);
console.log('STALLS\n'+stalls.slice(0,12).join('\n'));
if(process.env.V)console.log(log.join('\n'));
