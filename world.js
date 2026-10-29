// ===== Son Fener — Dünya Haritası (2B tuval, sadece görüntü). Veri bir "adaptör"den gelir.
// Toplu akış (batch) sunucu koordinatlarını sağladığında: window.__sfWorld.setAdapter({me(),islands(),marches(),forts(),ruins(),attack?(id)})
// Şekil: island {id,x,y,lv,name,clan,clanColor,shield(bool|ms),me?} · march {id,from:[x,y],to:[x,y],t0,t1,mine?,rally?}
// fort {id,x,y,lv,clan,clanColor,hp(0..1),attacked(bool),r} · ruin {id,x,y,owner?} · koordinatlar 0..1000 dünya birimi.
let AD=null,C=null;
function rng(s){return()=>(s=(s*16807)%2147483647)/2147483647}
// Canlı adaptör: __online.world (world_me + world_view). Hücre → dünya birimi ×10. Kamplar kendi türüyle çizilir.
export function liveAdapter(){const O=window.__online,WA=O.world,CS=10,D={me:null,isl:[],camps:[],mar:[],size:1200};let ok=false;
 const map=(v,me)=>{D.size=(me.n||120)*CS;D.isl=(v.isl||[]).map(i=>({id:i.id,x:i.x*CS+5,y:i.y*CS+5,lv:i.lv||1,name:i.nick||'?',clan:i.tag||'',clanColor:i.me||i.mate?'#4fa3e0':i.cid?`hsl(${(parseInt(String(i.cid).replace(/\D/g,'').slice(0,6)||'0')*47)%360} 70% 55%)`:'#bbb',shield:!!i.sh,me:!!i.me,mate:!!i.mate}));
  D.camps=(v.camps||[]).map(c=>({id:'c'+c.x+'_'+c.y,x:c.x*CS+5,y:c.y*CS+5,lv:c.lvl,kind:c.k,pw:c.pw}));
  const ms=[...(v.marches||[]),...((me.marches||[]).filter(m=>!m.done).map(m=>({fx:me.x,fy:me.y,tx:m.tx,ty:m.ty,t0:m.t0||m.sent||Date.now()-1e3,t1:m.arrive,me:1})))];const seen=new Set();
  D.mar=ms.filter(m=>{const k=[m.fx,m.fy,m.tx,m.ty,m.t1].join();if(seen.has(k))return false;seen.add(k);return true}).map((m,i)=>({id:'m'+i,from:[m.fx*CS+5,m.fy*CS+5],to:[m.tx*CS+5,m.ty*CS+5],t0:m.t0,t1:m.t1,mine:!!m.me}));
  const mi=D.isl.find(i=>i.me);D.me=mi||{id:'me',x:me.x*CS+5,y:me.y*CS+5,lv:1,name:'',me:true};ok=true};
 const load=async()=>{try{const me=await WA.me(),R=15,v=await WA.view(me.x-R,me.y-R,2*R+1,2*R+1);map(v||{},me||{})}catch(e){console.warn('world live',e)}};
 const A={live:true,ready:load(),me:()=>D.me||{x:600,y:600,lv:1,name:'',me:true},islands:()=>D.isl,camps:()=>D.camps,forts:()=>[],ruins:()=>[],marches:()=>D.mar,get size(){return D.size},refresh:load,
  attack:o=>{}};
 WA.on&&WA.on(t=>{if(t==='march'||t==='battle'||t==='view')load()});return A}
const $=i=>document.getElementById(i);
function fmtT(ms){ms=Math.max(0,ms/1e3|0);const m=ms/60|0,s=ms%60;return m+':'+String(s).padStart(2,'0')}
export async function openWorld(ctx){C=ctx;const tx=ctx.tx,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;const O=window.__online;if(!(O&&O.on&&O.world))return null;if(!AD)AD=liveAdapter();if(AD.ready)await AD.ready;let rt=AD.live?setInterval(()=>AD.refresh(),5000):0;
 let el=$('world');if(!el){el=document.createElement('div');el.id='world';el.innerHTML='<canvas id="wcv"></canvas><div id="wtop"><b id="wtt"></b><small id="wmock"></small><button id="wcl">✕</button></div><div id="wcard"></div><button id="whome">🏠</button>';document.body.appendChild(el)}
 $('wtt').textContent='🌊 '+tx('ui.w_title');$('wmock').textContent='';el.classList.add('on');
 const cv=$('wcv'),x=cv.getContext('2d'),dpr=Math.min(1.5,devicePixelRatio||1);let W=0,H=0,alive=true,sel=null;
 const me=AD.me();let cz=1,cx=me.x,cy=me.y,tz=1,tcx=me.x,tcy=me.y;const fit=()=>Math.min(W,H)/1000;
 function rs(){W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px'}rs();addEventListener('resize',rs);
 // açılış: evden dışarı yumuşak uzaklaşma
 cz=RM?3:9;tz=3;
 const w2s=(a,b)=>{const k=fit()*cz;return[W/2+(a-cx)*k,H/2+(b-cy)*k]},s2w=(a,b)=>{const k=fit()*cz;return[cx+(a-W/2)/k,cy+(b-H/2)/k]};
 // girdi: sürükle, tekerlek, iki parmak
 const pts=new Map();let moved=0,pd=0;
 cv.onpointerdown=e=>{cv.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved=0;if(pts.size===2){const[a,b]=[...pts.values()];pd=Math.hypot(a[0]-b[0],a[1]-b[1])}};
 cv.onpointermove=e=>{const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p[0],dy=e.clientY-p[1];moved+=Math.abs(dx)+Math.abs(dy);pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(pts.size===1){const k=fit()*cz;cx-=dx/k;cy-=dy/k;tcx=cx;tcy=cy}else if(pts.size===2){const[a,b]=[...pts.values()],d=Math.hypot(a[0]-b[0],a[1]-b[1]);if(pd){cz=tz=Math.max(.7,Math.min(8,cz*d/pd))}pd=d}};
 cv.onpointerup=cv.onpointercancel=e=>{pts.delete(e.pointerId);pd=0;if(moved<8&&e.type==='pointerup')tap(e.clientX,e.clientY)};
 cv.onwheel=e=>{e.preventDefault();tz=Math.max(.7,Math.min(8,tz*(e.deltaY<0?1.15:.87)))};
 $('wcl').onclick=close;$('whome').onclick=()=>{tcx=me.x;tcy=me.y;tz=3};
 function close(){alive=false;clearInterval(rt);el.classList.remove('on');removeEventListener('resize',rs);ctx.SFX&&ctx.SFX.tap()}
 function hit(a,b){const all=[...AD.forts().map(o=>({...o,k:'f',rr:16+o.lv*2})),...AD.islands().map(o=>({...o,k:'i',rr:10+o.lv*.6})),...AD.ruins().map(o=>({...o,k:'r',rr:12})),...(AD.camps?AD.camps():[]).map(o=>({...o,k:'c',rr:12}))];const[wx,wy]=s2w(a,b),k=fit()*cz;let best=null,bd=1e9;for(const o of all){const d=Math.hypot(o.x-wx,o.y-wy)*k;if(d<Math.max(22,o.rr*k)&&d<bd){bd=d;best=o}}return best}
 function tap(a,b){const o=hit(a,b);sel=o;const cd=$('wcard');if(!o){cd.classList.remove('on');return}ctx.SFX&&ctx.SFX.tap();tcx=o.x;tcy=o.y;tz=Math.max(tz,4);
  let h='';if(o.k==='i')h=`<b>${o.me?'🏠 ':''}${o.name}</b><small>${o.clan?'['+o.clan+'] · ':''}${tx('ui.w_lv',[o.lv])}${o.shield?' · 🛡️ '+tx('ui.w_shield'):''}</small>`+(o.me?'':`<button id="watk" ${o.shield?'disabled':''}>⚔️ ${tx('ui.w_attack')}</button>`);
  else if(o.k==='f')h=`<b>🏰 ${tx('ui.w_fort')} [${o.clan}]</b><small>${tx('ui.w_lv',[o.lv])} · ❤️ ${Math.round(o.hp*100)}%${o.attacked?' · 🔥 '+tx('ui.w_under'):''}</small><button id="watk">⚔️ ${tx('ui.w_rally')}</button>`;
  else if(o.k==='c')h=`<b>${o.kind==='pirate'?'🏴‍☠️':'👾'} ${tx('ui.w_lv',[o.lv])}</b><small>⚔️ ${o.pw||'?'}</small><button id="watk">⛵ ${tx('ui.w_send')}</button>`;
  else h=`<b>🗼 ${tx('ui.w_ruin')}</b><small>${tx('ui.w_ruin_d')}</small><button id="watk">⛵ ${tx('ui.w_send')}</button>`;
  cd.innerHTML=h;cd.classList.add('on');const bt=$('watk');if(bt)bt.onclick=()=>{close();if(O.world.state){const st=O.world.state();st.sel={x:(o.x-5)/10,y:(o.y-5)/10}}ctx.after&&ctx.after()}}
 // çizim yardımcıları
 function keep(px,py,s,o,t){const g=x;const c=o.clanColor||'#999';g.save();g.translate(px,py);
  g.fillStyle='rgba(0,0,0,.18)';g.beginPath();g.ellipse(0,s*.55,s*1.25,s*.42,0,0,7);g.fill();
  g.fillStyle='#e8d29a';g.beginPath();g.ellipse(0,s*.35,s*1.15,s*.5,0,0,7);g.fill();g.fillStyle='#5aa04a';g.beginPath();g.ellipse(0,s*.25,s*.95,s*.38,0,0,7);g.fill();
  const tw=o.lv>=10?3:o.lv>=5?2:1;g.fillStyle='#b8b0a0';g.fillRect(-s*.45,-s*.2,s*.9,s*.5);g.fillStyle='#8a8070';for(let i=-2;i<=2;i++)g.fillRect(i*s*.18-s*.06,-s*.32,s*.12,s*.14);
  g.fillStyle='#d8d0c0';const tws=tw===1?[0]:tw===2?[-.35,.35]:[-.4,0,.4];for(const a of tws){g.fillRect(a*s-s*.13,-s*.75,s*.26,s*.6);g.fillStyle=c;g.beginPath();g.moveTo(a*s-s*.18,-s*.75);g.lineTo(a*s,-s*1.05);g.lineTo(a*s+s*.18,-s*.75);g.fill();g.fillStyle='#d8d0c0'}
  if(o.me){g.fillStyle='#ffe38a';g.globalAlpha=.6+.3*Math.sin(t*3);g.beginPath();g.arc(0,-s*.85,s*.12,0,7);g.fill();g.globalAlpha=1}
  if(o.shield){g.strokeStyle='rgba(140,220,255,.85)';g.fillStyle='rgba(140,220,255,.14)';g.lineWidth=1.5;g.beginPath();g.ellipse(0,-s*.15,s*1.45,s*1.25,0,0,7);g.fill();g.stroke();
   g.globalAlpha=.5;g.beginPath();g.arc(-s*.5,-s*.7,s*.25,3.6,4.6);g.stroke();g.globalAlpha=1}
  g.restore()}
 function banner(px,py,o,k){if(k<.8&&!o.me)return;const lbl=(o.clan?'['+o.clan+'] ':'')+o.name,f=Math.max(9,Math.min(13,9*k/1.6));x.font=`700 ${f}px system-ui,sans-serif`;const w=x.measureText(lbl).width+18;
  x.fillStyle='rgba(20,28,40,.78)';x.beginPath();x.roundRect(px-w/2,py,w,f+8,5);x.fill();x.fillStyle=o.clanColor||'#888';x.fillRect(px-w/2,py,4,f+8);
  x.fillStyle=o.me?'#ffe38a':'#fff';x.textAlign='center';x.textBaseline='middle';x.fillText(lbl,px+2,py+(f+8)/2);
  x.fillStyle='#f5c542';x.font=`800 ${f-1}px system-ui`;const lv=String(o.lv);x.beginPath();x.arc(px-w/2-7,py+(f+8)/2,f*.75,0,7);x.fill();x.fillStyle='#3a2a00';x.fillText(lv,px-w/2-7,py+(f+8)/2+.5)}
 function fort(px,py,s,o,t){x.save();x.translate(px,py);
  x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(0,s*.6,s*1.5,s*.5,0,0,7);x.fill();x.fillStyle='#7d6a52';x.beginPath();x.ellipse(0,s*.4,s*1.4,s*.55,0,0,7);x.fill();
  const lv=o.lv,dm=o.hp<.6;x.fillStyle=dm?'#6e665c':'#a49a88';x.fillRect(-s*1.05,-s*.35,s*2.1,s*.75);x.fillStyle=dm?'#4e463c':'#7a705e';for(let i=-4;i<=4;i++)if(!(dm&&i%3===0))x.fillRect(i*s*.23-s*.07,-s*.48,s*.14,s*.15);
  const tn=Math.min(4,1+Math.floor(lv/2));const ps=[[-.85,0],[.85,0],[-.45,-.2],[.45,-.2]].slice(0,tn);x.fillStyle=dm?'#7a7166':'#c2b8a4';for(const[a,b]of ps){x.fillRect(a*s-s*.16,(b-.8)*s,s*.32,s*.9);x.fillStyle=o.clanColor;x.beginPath();x.moveTo(a*s-s*.21,(b-.8)*s);x.lineTo(a*s,(b-1.15)*s);x.lineTo(a*s+s*.21,(b-.8)*s);x.fill();x.fillStyle=dm?'#7a7166':'#c2b8a4'}
  x.fillStyle=dm?'#857b6e':'#d4cab6';x.fillRect(-s*.28,-s*1.2-lv*s*.04,s*.56,s*1.3+lv*s*.04);x.fillStyle=o.clanColor;x.beginPath();x.moveTo(-s*.34,-s*1.2-lv*s*.04);x.lineTo(0,-s*1.65-lv*s*.05);x.lineTo(s*.34,-s*1.2-lv*s*.04);x.fill();
  if(lv>=5){x.fillStyle='#f5c542';x.fillRect(-s*.3,-s*.75,s*.6,s*.07)}
  // garnizon bayrakları
  const fl=Math.min(6,lv);for(let i=0;i<fl;i++){const fx=(i-(fl-1)/2)*s*.36,fy=-s*.5,w=Math.sin(t*4+i)*s*.05;x.strokeStyle='#3a2a1a';x.lineWidth=1;x.beginPath();x.moveTo(fx,fy);x.lineTo(fx,fy-s*.4);x.stroke();x.fillStyle=o.clanColor;x.beginPath();x.moveTo(fx,fy-s*.4);x.lineTo(fx+s*.2,fy-s*.34+w);x.lineTo(fx,fy-s*.27);x.fill()}
  // hasar: duman + ateş
  if(dm){const n=o.hp<.3?4:2;for(let i=0;i<n;i++){const fx=(i/(n-1||1)-.5)*s*1.4,ph=(t*.6+i*.37)%1;x.fillStyle=`rgba(60,55,50,${.45*(1-ph)})`;x.beginPath();x.arc(fx+ph*s*.3,-s*.6-ph*s*1.3,s*(.15+ph*.35),0,7);x.fill();
   x.fillStyle=`rgba(255,${120+Math.sin(t*12+i)*50|0},30,.9)`;x.beginPath();x.moveTo(fx-s*.12,-s*.35);x.quadraticCurveTo(fx,-s*(.75+Math.sin(t*9+i)*.12),fx+s*.12,-s*.35);x.fill()}}
  // HP çubuğu
  x.fillStyle='rgba(0,0,0,.55)';x.fillRect(-s,s*.75,s*2,5);x.fillStyle=o.hp>.6?'#5c5':o.hp>.3?'#ec4':'#e44';x.fillRect(-s,s*.75,s*2*o.hp,5);
  x.restore()}
 function ruin(px,py,s,t){x.save();x.translate(px,py);x.fillStyle='rgba(0,0,0,.18)';x.beginPath();x.ellipse(0,s*.5,s*1.1,s*.38,0,0,7);x.fill();x.fillStyle='#8e8a80';x.beginPath();x.ellipse(0,s*.35,s,s*.4,0,0,7);x.fill();
  x.fillStyle='#cfc8b8';x.beginPath();x.moveTo(-s*.28,s*.25);x.lineTo(-s*.2,-s*1.1);x.lineTo(s*.05,-s*.9);x.lineTo(s*.12,-s*1.25);x.lineTo(s*.2,-s*.7);x.lineTo(s*.28,s*.25);x.fill();
  x.fillStyle='#b04040';x.fillRect(-s*.24,-s*.45,s*.48,s*.12);x.fillRect(-s*.22,-s*.05,s*.44,s*.1);
  x.fillStyle='#9a9488';x.fillRect(s*.45,s*.1,s*.25,s*.15);x.fillRect(-s*.7,s*.18,s*.2,s*.12);
  const g=x.createRadialGradient(0,-s*1.05,0,0,-s*1.05,s*.9);g.addColorStop(0,`rgba(255,230,140,${.35+.2*Math.sin(t*2)})`);g.addColorStop(1,'rgba(255,230,140,0)');x.fillStyle=g;x.beginPath();x.arc(0,-s*1.05,s*.9,0,7);x.fill();x.restore()}
 function camp(px,py,s,o,t){x.save();x.translate(px,py);x.fillStyle='rgba(0,0,0,.2)';x.beginPath();x.ellipse(0,s*.5,s*1.1,s*.35,0,0,7);x.fill();
  if(o.kind==='pirate'){x.fillStyle='#3a2416';x.beginPath();x.moveTo(s,0);x.lineTo(s*.5,s*.4);x.lineTo(-s,s*.4);x.lineTo(-s*1.1,0);x.fill();x.strokeStyle='#2a1a0e';x.lineWidth=1.2;x.beginPath();x.moveTo(0,s*.1);x.lineTo(0,-s*1.2);x.stroke();x.fillStyle='#111';x.beginPath();x.moveTo(0,-s*1.15);x.lineTo(s*.75,-s*.95+Math.sin(t*4)*s*.06);x.lineTo(0,-s*.7);x.fill();x.fillStyle='#eee';x.beginPath();x.arc(s*.28,-s*.92,s*.1,0,7);x.fill()}
  else{const g=x.createRadialGradient(0,-s*.3,0,0,-s*.3,s*1.2);g.addColorStop(0,'rgba(190,160,255,.75)');g.addColorStop(1,'rgba(120,90,200,0)');x.fillStyle=g;x.beginPath();x.arc(0,-s*.3,s*1.2,0,7);x.fill();x.fillStyle='#dfe';x.globalAlpha=.85;x.beginPath();x.arc(0,-s*.4+Math.sin(t*2)*s*.1,s*.4,3.14,0);x.lineTo(s*.4,s*.1);x.lineTo(-s*.4,s*.1);x.fill();x.globalAlpha=1;x.fillStyle='#226';x.fillRect(-s*.18,-s*.5,s*.1,s*.1);x.fillRect(s*.08,-s*.5,s*.1,s*.1)}
  if(s>8){x.font='800 9px system-ui';x.fillStyle='#ffe38a';x.textAlign='center';x.fillText(tx('ui.w_lv',[o.lv]),0,s*.95)}x.restore()}
 function ship(px,py,s,ang,col,t){x.save();x.translate(px,py+Math.sin(t*3+px)*1);x.rotate(ang);x.fillStyle='rgba(255,255,255,.35)';x.beginPath();x.moveTo(-s*1.6,0);x.lineTo(-s*.4,-s*.35);x.lineTo(-s*.4,s*.35);x.fill();
  x.fillStyle='#6b4423';x.beginPath();x.moveTo(s*.9,0);x.lineTo(s*.3,-s*.38);x.lineTo(-s*.7,-s*.32);x.lineTo(-s*.7,s*.32);x.lineTo(s*.3,s*.38);x.fill();x.fillStyle='#f4ecd8';x.fillRect(-s*.15,-s*.55,s*.3,s*1.1);x.fillStyle=col;x.fillRect(-s*.15,-s*.12,s*.3,s*.24);x.restore()}
 let last=performance.now();
 function frame(nw){if(!alive)return;const dt=Math.min(.05,(nw-last)/1e3);last=nw;const t=RM?0:nw/1e3,k0=1-Math.pow(.02,dt);cz+=(tz-cz)*k0*.9;cx+=(tcx-cx)*k0;cy+=(tcy-cy)*k0;
  x.setTransform(dpr,0,0,dpr,0,0);const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1b5f86');g.addColorStop(1,'#0f3d5e');x.fillStyle=g;x.fillRect(0,0,W,H);const k=fit()*cz;
  // dalga ızgarası (LOD: yakında daha sık)
  x.strokeStyle='rgba(255,255,255,.07)';x.lineWidth=1;const st=cz>3?40:80;const[a0,b0]=s2w(0,0),[a1,b1]=s2w(W,H);for(let wy=Math.floor(b0/st)*st;wy<b1;wy+=st)for(let wx=Math.floor(a0/st)*st;wx<a1;wx+=st){const[p,q]=w2s(wx+((wy/st)%2)*st/2,wy);const o=Math.sin(t+wx*.03+wy*.02)*3;x.beginPath();x.moveTo(p-6,q+o);x.quadraticCurveTo(p,q-3+o,p+6,q+o);x.stroke()}
  // dünya sınırı
  {const[p,q]=w2s(0,0);x.strokeStyle='rgba(255,255,255,.12)';x.setLineDash([6,8]);x.strokeRect(p,q,(AD.size||1000)*k,(AD.size||1000)*k);x.setLineDash([])}
  const fs=AD.forts(),is=AD.islands(),rs_=AD.ruins(),ms=AD.marches(),now=Date.now();
  // klan bölgesi tonu
  for(const f of fs){const[p,q]=w2s(f.x,f.y),r=f.r*k,gr=x.createRadialGradient(p,q,r*.2,p,q,r);gr.addColorStop(0,f.clanColor+'38');gr.addColorStop(.85,f.clanColor+'22');gr.addColorStop(1,f.clanColor+'00');x.fillStyle=gr;x.beginPath();x.arc(p,q,r,0,7);x.fill();
   x.strokeStyle=f.clanColor+'aa';x.lineWidth=1.5;x.setLineDash([8,6]);x.lineDashOffset=-t*8;x.beginPath();x.arc(p,q,r*.92,0,7);x.stroke();x.setLineDash([])}
  // yürüyüş çizgileri + gemiler
  for(const m of ms){const[p0,q0]=w2s(...m.from),[p1,q1]=w2s(...m.to),u=Math.max(0,Math.min(1,(now-m.t0)/(m.t1-m.t0))),col=m.mine?'#5fd0ff':m.rally?'#ff7a4a':'#e8e0c8';
   x.strokeStyle=col+'aa';x.lineWidth=2;x.setLineDash([5,6]);x.lineDashOffset=-t*20;x.beginPath();x.moveTo(p0,q0);x.lineTo(p1,q1);x.stroke();x.setLineDash([]);
   const sx=p0+(p1-p0)*u,sy=q0+(q1-q0)*u,ss=Math.max(8,Math.min(14,5*k));ship(sx,sy,ss,Math.atan2(q1-q0,p1-p0),col,t);
   if(k>.5){const lb='⏱ '+fmtT(m.t1-now);x.font='700 10px system-ui';const w=x.measureText(lb).width+10;x.fillStyle='rgba(10,20,30,.75)';x.beginPath();x.roundRect(sx-w/2,sy-ss-18,w,14,7);x.fill();x.fillStyle=col;x.textAlign='center';x.textBaseline='middle';x.fillText(lb,sx,sy-ss-11)}}
  // varlıklar (y'ye göre sırala)
  const ents=[...fs.map(o=>['f',o]),...is.map(o=>['i',o]),...rs_.map(o=>['r',o]),...(AD.camps?AD.camps():[]).map(o=>['c',o])].sort((a,b)=>a[1].y-b[1].y);
  for(const[ty,o]of ents){const[p,q]=w2s(o.x,o.y);if(p<-80||q<-80||p>W+80||q>H+80)continue;
   if(ty==='i'){const s=Math.max(4,(5+o.lv*.35)*k*1.3);if(k<.45&&!o.me){x.fillStyle=o.clanColor||'#ccc';x.beginPath();x.arc(p,q,3,0,7);x.fill();continue}keep(p,q,s,o,t);banner(p,q+s*.75,o,k)}
   else if(ty==='f'){const s=(9+o.lv*1.3)*k*.9;fort(p,q,s,o,t);if(o.attacked){const ph=(t*1.2)%1;x.strokeStyle=`rgba(255,60,40,${1-ph})`;x.lineWidth=3;x.beginPath();x.arc(p,q,s*(1.4+ph*1.2),0,7);x.stroke();
     x.font='800 12px system-ui';x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='#a00';x.lineWidth=3;const lb='⚠️ '+tx('ui.w_under');x.strokeText(lb,p,q-s*2.1);x.fillText(lb,p,q-s*2.1)}
     if(k>1.1){x.font='800 11px system-ui';x.fillStyle=o.clanColor;x.textAlign='center';x.fillText('🏰 ['+o.clan+'] '+tx('ui.w_lv',[o.lv]),p,q+s*1.15)}}
   else if(ty==='c'){const s=Math.max(8,9*k);camp(p,q,s,o,t)}
   else{const s=8*k*.9;ruin(p,q,s,t);if(k>1.3){x.font='700 10px system-ui';x.fillStyle='#ffe9a8';x.textAlign='center';x.fillText('🗼 '+tx('ui.w_ruin'),p,q+s*.9)}}
   if(sel&&sel.id===o.id){x.strokeStyle='#ffe38a';x.lineWidth=2;x.beginPath();x.arc(p,q,22+3*Math.sin(t*6),0,7);x.stroke()}}
  requestAnimationFrame(frame)}
 requestAnimationFrame(frame);
 return{close}}
window.__sfWorld={setAdapter:a=>{AD=a},get adapter(){return AD},open:()=>C&&openWorld(C)};
