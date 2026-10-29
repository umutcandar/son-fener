// ===== Starfort — Kılavuz Işığı mini oyunu (2B tuval). Kural/ödül logic.js'te (claimGuide); burası sadece oynanış + çizim.
// Sisin içinde yolunu kaybetmiş bir gemi var. Dönen fener huzmesi gemiye değdiği anda dokun: gemi bir sonraki işarete ilerler.
// 3 isabet = liman. Boşa dokunuş gemiyi kayalıklara iter (3 hata = gemi kaybolur). Huzmenin tam ortası = "tam isabet".
const css=`#guide{position:fixed;inset:0;z-index:60;background:#04121c;display:flex;flex-direction:column;align-items:center;touch-action:none;user-select:none;-webkit-user-select:none;font-family:inherit;color:#eaf6fa;opacity:0;transition:opacity .25s}
#guide.on{opacity:1}#guide canvas{position:absolute;inset:0;width:100%;height:100%}
#guide .gtop{position:relative;z-index:2;width:100%;box-sizing:border-box;padding:calc(env(safe-area-inset-top) + 12px) 14px 0;display:flex;align-items:center;gap:10px}
#guide .gtt{flex:1;background:linear-gradient(#22566f,#1b4a5e);border:2px solid #d8a84a;border-radius:14px;padding:7px 12px;box-shadow:0 3px 0 #6e4425,0 6px 14px #0008}
#guide .gtt b{display:block;font-size:17px;color:#ffd27a;letter-spacing:.3px}#guide .gtt span{font-size:12px;opacity:.85}
#guide .gx{width:40px;height:40px;border-radius:12px;border:2px solid #d8a84a;background:#6e4425;color:#fff;font-size:20px;font-weight:700;box-shadow:0 3px 0 #3d2412}
#guide .gst{position:relative;z-index:2;display:flex;gap:14px;margin-top:10px;font-size:14px;font-weight:600}
#guide .gst>div{background:#0e2838cc;border:1.5px solid #7fd8e855;border-radius:20px;padding:4px 12px;display:flex;gap:6px;align-items:center}
#guide .pip{width:14px;height:14px;border-radius:50%;background:#33474f;border:1.5px solid #7fd8e8;display:inline-block}#guide .pip.on{background:#ffd27a;box-shadow:0 0 8px #ffd27a;border-color:#fff3c4}#guide .pip.bad{background:#d8433a;border-color:#ff9a8a}
#guide .gcard{position:absolute;z-index:3;left:50%;top:50%;transform:translate(-50%,-50%);width:min(330px,86vw);text-align:center;background:linear-gradient(#22566f,#173f52);border:3px solid #d8a84a;border-radius:18px;padding:18px 16px 16px;box-shadow:0 5px 0 #6e4425,0 14px 40px #000a}
#guide .gcard h3{margin:0 0 6px;font-size:21px;color:#ffd27a}#guide .gcard p{margin:6px 0 12px;font-size:14px;line-height:1.35;opacity:.92}
#guide .gcard .grw{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0 14px;font-size:16px;font-weight:700}#guide .gcard .grw>span{background:#0e2838;border:1.5px solid #7fd8e866;border-radius:12px;padding:5px 10px}
#guide .gbtn{min-width:150px;padding:11px 18px;border-radius:14px;border:0;font:inherit;font-size:17px;font-weight:700;color:#fff;background:linear-gradient(#ffb347,#e8772c);box-shadow:inset 0 2px 0 #ffffff55,0 4px 0 #9a4a14}
#guide .gpop{position:absolute;z-index:2;left:50%;transform:translate(-50%,0);font-size:24px;font-weight:700;pointer-events:none;text-shadow:0 2px 0 #0009,0 0 12px #000;transition:transform .7s,opacity .7s}
#guide .ghint{position:absolute;z-index:2;bottom:calc(env(safe-area-inset-bottom) + 26px);left:0;right:0;text-align:center;font-size:15px;font-weight:600;opacity:.9;text-shadow:0 2px 4px #000}`;
const TAU=Math.PI*2,HALF=.24,PERF=.075,TIME=30,MAXMISS=3,HITS=3;
const hex=c=>'#'+c.toString(16).padStart(6,'0');
const rnd=(a,b)=>a+Math.random()*(b-a);
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return Math.abs(d)};
export function openGuide(o){
 const {tx,SFX,vib,skin,onEnd,rwStr}=o;
 if(!document.getElementById('guideCss')){const s=document.createElement('style');s.id='guideCss';s.textContent=css;document.head.appendChild(s)}
 const root=document.createElement('div');root.id='guide';root.innerHTML=`<canvas></canvas>
  <div class="gtop"><div class="gtt"><b>🔦 ${tx('ui.gd_t')}</b><span>${tx('ui.gd_sub')}</span></div><button class="gx" aria-label="x">✕</button></div>
  <div class="gst"><div>⚓ <i class="pip"></i><i class="pip"></i><i class="pip"></i></div><div>🪨 <i class="pip"></i><i class="pip"></i><i class="pip"></i></div><div>⏳ <b class="gtm">${TIME}</b></div></div>
  <div class="ghint" style="display:none">${tx('ui.gd_hint')}</div>`;
 document.body.appendChild(root);requestAnimationFrame(()=>root.classList.add('on'));
 const cv=root.querySelector('canvas'),x=cv.getContext('2d');const dpr=Math.min(2,devicePixelRatio||1);let W=0,H=0,cx=0,cy=0,R=0;
 const fit=()=>{W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;x.setTransform(dpr,0,0,dpr,0,0);cx=W/2;cy=H*.56;R=Math.min(W*.47,H*.36)};fit();addEventListener('resize',fit);
 const pips=root.querySelectorAll('.pip'),tm=root.querySelector('.gtm'),hint=root.querySelector('.ghint');
 // dünya: kayalıklar, sis bulutları, köpük halkaları (tamamı kutupsal; R'ye göre ölçeklenir)
 const rocks=[];for(let i=0;i<11;i++)rocks.push({a:rnd(0,TAU),r:rnd(.5,.96),s:rnd(.035,.07),k:Math.random()});
 const fogs=[];for(let i=0;i<16;i++)fogs.push({a:rnd(0,TAU),r:rnd(.25,1.15),s:rnd(.22,.42),v:rnd(.02,.06)*(Math.random()<.5?-1:1),o:rnd(.35,.65)});
 const RINGS=[.9,.66,.43,.18];
 const st={phase:'intro',th:rnd(0,TAU),w:1.75,hits:0,perf:0,miss:0,t:TIME,ship:{a:rnd(0,TAU),r:RINGS[0],ta:0,tr:0,fa:0,fr:0,mv:0,heading:0},lit:0,flash:0,shake:0,trail:[],done:false,last:performance.now()};
 st.ship.heading=st.ship.a+Math.PI;
 const bd=a=>Math.min(angDiff(st.th,a),angDiff(st.th+Math.PI,a));// iki huzme (fener iki yöne yanar)
 const pop=(txt,col)=>{const d=document.createElement('div');d.className='gpop';d.textContent=txt;d.style.color=col;d.style.top=(cy-R*.25)+'px';root.appendChild(d);requestAnimationFrame(()=>{d.style.transform='translate(-50%,-46px)';d.style.opacity='0'});setTimeout(()=>d.remove(),800)};
 const pipUpd=()=>{pips.forEach((p,i)=>{p.className='pip'+(i<3?(i<st.hits?' on':''):(i-3<st.miss?' bad':''))})};
 const card=(h,btn,cb)=>{const c=document.createElement('div');c.className='gcard';c.innerHTML=h+`<button class="gbtn">${btn}</button>`;root.appendChild(c);c.querySelector('.gbtn').onclick=e=>{e.stopPropagation();SFX.tap&&SFX.tap();c.remove();cb()};return c};
 const close=()=>{root.classList.remove('on');removeEventListener('resize',fit);setTimeout(()=>root.remove(),260)};
 const finish=quit=>{if(st.done)return;st.done=true;st.phase='end';const r=onEnd(st.hits,st.perf);if(quit||!r){close();return}
  const win=st.hits>=HITS;if(win){SFX.done&&SFX.done();vib([20,40,20,40,80])}else{SFX.err&&SFX.err();vib(60)}
  const rw=Object.entries(r.rw||{}).map(([k,v])=>`<span>${rwStr({[k]:v})}</span>`).join('')+(r.surv?`<span>🧑 +1</span>`:'');
  card(`<h3>${win?tx('ui.gd_win'):tx('ui.gd_lost')}</h3><p>${win?(st.perf>=HITS?tx('ui.gd_win_perf'):tx('ui.gd_win_d')):tx('ui.gd_lost_d')}</p><div class="grw">${rw}</div>`,tx('ui.tamam'),close)};
 root.querySelector('.gx').onclick=e=>{e.stopPropagation();if(st.phase==='play')finish(true);else if(st.phase==='intro')close();else close()};
 card(`<h3>🔦 ${tx('ui.gd_t')}</h3><p>${tx('ui.gd_intro')}</p>`,tx('ui.gd_go'),()=>{st.phase='play';st.last=performance.now();hint.style.display='block'});
 const tapAt=()=>{if(st.phase!=='play'||st.ship.mv>0)return;const d=bd(st.ship.a);
  if(d<HALF){const perf=d<PERF;st.hits++;if(perf)st.perf++;pop(perf?tx('ui.gd_perfect'):tx('ui.gd_hit'),perf?'#ffd27a':'#9ff8ff');SFX.coin&&SFX.coin();vib(perf?[15,30,15]:20);st.flash=perf?1:.6;hint.style.display='none';
   const s=st.ship;s.fa=s.a;s.fr=s.r;s.tr=RINGS[st.hits];s.ta=st.hits>=HITS?s.a+rnd(-.3,.3):s.a+(Math.random()<.5?-1:1)*rnd(1.1,2.2);s.mv=1;st.w*=1.16}
  else{st.miss++;st.shake=1;SFX.err&&SFX.err();vib(50);pop(tx('ui.gd_miss'),'#ff8a7a');const s=st.ship;s.r=Math.min(1.02,s.r+.05);if(st.miss>=MAXMISS)setTimeout(()=>finish(false),450)}
  pipUpd()};
 root.addEventListener('pointerdown',e=>{if(e.target.closest('.gcard,.gx'))return;tapAt()});
 // --- çizim
 const fogTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(200,220,228,.9)');r.addColorStop(.55,'rgba(170,196,206,.4)');r.addColorStop(1,'rgba(150,180,190,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return c})();
 const P=(a,r)=>[cx+Math.cos(a)*r*R,cy+Math.sin(a)*r*R*.78];// hafif perspektif (elips)
 const bc=hex(skin.b);
 function draw(T){const s=st.ship,sh=st.shake*6;x.save();if(sh)x.translate(rnd(-sh,sh),rnd(-sh,sh));
  // deniz
  let g=x.createRadialGradient(cx,cy,R*.1,cx,cy,Math.max(W,H)*.8);g.addColorStop(0,'#1d4e66');g.addColorStop(.45,'#0f3046');g.addColorStop(1,'#04121c');x.fillStyle=g;x.fillRect(-10,-10,W+20,H+20);
  x.strokeStyle='rgba(127,216,232,.09)';x.lineWidth=1.2;for(let i=0;i<9;i++){const rr=(.2+i*.12+(T*.03)%.12);x.beginPath();x.ellipse(cx,cy,rr*R,rr*R*.78,0,0,TAU);x.stroke()}
  // rota işaretleri (şamandıralar)
  for(let i=1;i<RINGS.length;i++){x.setLineDash([3,7]);x.strokeStyle=i<=st.hits?'rgba(255,210,122,.35)':'rgba(234,246,250,.12)';x.beginPath();x.ellipse(cx,cy,RINGS[i]*R,RINGS[i]*R*.78,0,0,TAU);x.stroke()}x.setLineDash([]);
  // kayalıklar
  for(const k of rocks){const[px,py]=P(k.a,k.r),rs=k.s*R;x.fillStyle='rgba(255,255,255,.12)';x.beginPath();x.ellipse(px,py+rs*.25,rs*1.35,rs*.6,0,0,TAU);x.fill();x.fillStyle=k.k<.5?'#3c4a52':'#4b5a60';x.beginPath();x.moveTo(px-rs,py+rs*.3);x.lineTo(px-rs*.35,py-rs*.9);x.lineTo(px+rs*.2,py-rs*.55);x.lineTo(px+rs*.9,py+rs*.3);x.closePath();x.fill();x.fillStyle='#6d7f86';x.beginPath();x.moveTo(px-rs*.35,py-rs*.9);x.lineTo(px+rs*.2,py-rs*.55);x.lineTo(px,py);x.closePath();x.fill()}
  // dümen izi
  x.fillStyle='rgba(234,246,250,.5)';for(const p of st.trail){x.globalAlpha=p.l*.5;x.beginPath();x.arc(p.x,p.y,2+2*(1-p.l),0,TAU);x.fill()}x.globalAlpha=1;
  // sis (huzmede aydınlanır)
  for(const f of fogs){const[px,py]=P(f.a,f.r),r2=f.s*R*2;const inB=bd(f.a)<HALF*1.2;x.globalAlpha=f.o*(inB?.35:1);x.drawImage(fogTex,px-r2,py-r2*.78,r2*2,r2*1.56)}x.globalAlpha=1;
  // gemi
  const[sx,sy]=P(s.a,s.r);const litNow=bd(s.a)<HALF;st.lit+=((litNow?1:0)-st.lit)*.25;
  x.save();x.translate(sx,sy);x.rotate(s.heading+Math.PI/2);const z=Math.max(1,R/165);x.scale(z,z);
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(2,3,11,20,0,0,TAU);x.fill();
  x.globalAlpha=.8+st.lit*.2;x.strokeStyle='rgba(234,246,250,.55)';x.lineWidth=1.5;x.beginPath();x.moveTo(0,-20);x.quadraticCurveTo(11,-6,9,16);x.lineTo(-9,16);x.quadraticCurveTo(-11,-6,0,-20);x.stroke();x.fillStyle=st.lit>.5?'#8a5a32':'#4a505c';x.beginPath();x.moveTo(0,-20);x.quadraticCurveTo(11,-6,9,16);x.lineTo(-9,16);x.quadraticCurveTo(-11,-6,0,-20);x.fill();
  x.fillStyle=st.lit>.5?'#c08a4a':'#5d6470';x.fillRect(-6,-4,12,14);
  x.fillStyle=st.lit>.5?'#f6f2ea':'#8b96a0';x.beginPath();x.moveTo(-1,-14);x.lineTo(11,2);x.lineTo(-1,6);x.closePath();x.fill();x.globalAlpha=1;
  x.restore();
  if(st.lit>.3){x.strokeStyle=`rgba(255,226,140,${st.lit*.9})`;x.lineWidth=2.5;x.beginPath();x.arc(sx,sy,24*z,0,TAU);x.stroke()}
  if(st.phase!=='end'&&!litNow&&s.mv<=0){const b=(Math.sin(T*8)+1)/2;x.fillStyle=`rgba(255,80,60,${.4+b*.6})`;x.beginPath();x.arc(sx,sy-26*z,(3.5+b*2)*z,0,TAU);x.fill();x.fillStyle=`rgba(255,120,90,${.12+.2*b})`;x.beginPath();x.arc(sx,sy-26*z,18*z,0,TAU);x.fill()}
  // huzme
  x.save();x.translate(cx,cy);x.scale(1,.78);g=x.createRadialGradient(0,0,8,0,0,R*1.25);const rgb=skin.h;g.addColorStop(0,`rgba(${rgb},.85)`);g.addColorStop(.6,`rgba(${rgb},.32)`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.globalCompositeOperation='lighter';
  for(const off of[0,Math.PI]){x.beginPath();x.moveTo(0,0);x.arc(0,0,R*1.25,st.th+off-HALF,st.th+off+HALF);x.closePath();x.fill()}
  x.fillStyle=`rgba(${rgb},.22)`;x.beginPath();x.moveTo(0,0);x.arc(0,0,R*1.25,st.th-PERF,st.th+PERF);x.closePath();x.fill();x.globalCompositeOperation='source-over';x.restore();
  // fener (üstten): taş kaide, şeritli kule, lamba
  const lr=Math.max(16,R*.075);x.fillStyle='#7d756a';x.beginPath();x.ellipse(cx,cy+lr*.3,lr*2,lr*1.5,0,0,TAU);x.fill();x.fillStyle='#9a9286';x.beginPath();x.ellipse(cx,cy,lr*1.7,lr*1.3,0,0,TAU);x.fill();
  x.fillStyle='#6e4425';x.fillRect(cx+lr*.8,cy+lr*.6,lr*1.6,lr*.35);// iskele
  for(let i=0;i<4;i++){x.fillStyle=hex(skin.s[i%2]);x.beginPath();x.arc(cx,cy-i*lr*.28,lr*(1-i*.12),0,TAU);x.fill()}
  x.fillStyle=hex(skin.d);x.beginPath();x.arc(cx,cy-lr*1.15,lr*.5,0,TAU);x.fill();
  g=x.createRadialGradient(cx,cy-lr*1.15,0,cx,cy-lr*1.15,lr*2.4);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,`rgba(${rgb},.6)`);g.addColorStop(1,`rgba(${rgb},0)`);x.fillStyle=g;x.beginPath();x.arc(cx,cy-lr*1.15,lr*2.4,0,TAU);x.fill();
  if(st.flash>0){x.fillStyle=`rgba(${rgb},${st.flash*.25})`;x.fillRect(0,0,W,H)}
  if(st.shake>0){x.fillStyle=`rgba(216,67,58,${st.shake*.18})`;x.fillRect(0,0,W,H)}
  x.restore()}
 function loop(){if(!root.isConnected)return;const tn=performance.now(),dt=Math.min(.05,(tn-st.last)/1000);st.last=tn;const T=tn/1000;
  const play=st.phase==='play';st.th=(st.th+dt*(play?st.w:.9))%TAU;
  for(const f of fogs)f.a+=f.v*dt;
  const s=st.ship;if(s.mv>0){s.mv=Math.max(0,s.mv-dt/1.05);const k=1-s.mv,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;const pa=s.a,pr=s.r;s.a=s.fa+(s.ta-s.fa)*e;s.r=s.fr+(s.tr-s.fr)*e;
   const[x0,y0]=P(pa,pr),[x1,y1]=P(s.a,s.r);if(Math.hypot(x1-x0,y1-y0)>.1)s.heading=Math.atan2(y1-y0,x1-x0);st.trail.push({x:x1,y:y1,l:1});
   if(s.mv===0){s.a=((s.a%TAU)+TAU)%TAU;if(st.hits>=HITS)setTimeout(()=>finish(false),350)}}
  else if(play){s.heading+=Math.sin(T*1.3)*.002;s.a+=Math.sin(T*.7)*.0015}
  for(let i=st.trail.length-1;i>=0;i--){st.trail[i].l-=dt*.8;if(st.trail[i].l<=0)st.trail.splice(i,1)}
  st.flash=Math.max(0,st.flash-dt*2.5);st.shake=Math.max(0,st.shake-dt*3);
  if(play&&s.mv<=0&&st.hits<HITS){st.t-=dt;tm.textContent=Math.ceil(Math.max(0,st.t));if(st.t<=0)finish(false)}
  draw(T);requestAnimationFrame(loop)}
 pipUpd();requestAnimationFrame(loop);
 return {tap:tapAt,st}}
// Fener Görünümleri seçici (Fener paneli) için stil — modül yüklenince bir kez eklenir.
{const s=document.createElement('style');s.id='skinCss';s.textContent=`.skg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}
.sk{position:relative;height:128px;border-radius:13px;border:2px solid #ffffff22;background:radial-gradient(circle at 50% 30%,#22566f,#0e2838 75%);color:#eaf6fa;font:inherit;padding:0;overflow:hidden;cursor:pointer}
.sk.on{border-color:#ffd27a;box-shadow:0 0 0 2px #ffd27a55,0 0 14px #ffd27a55}.sk.lk{filter:saturate(.6) brightness(.8)}
.sk i{position:absolute;left:50%;display:block}
.sk .skb{top:6px;width:120px;height:34px;margin-left:-60px;background:radial-gradient(ellipse at 50% 60%,var(--b),transparent 70%);opacity:.75}
.sk .skt{top:38px;width:26px;height:46px;margin-left:-13px;clip-path:polygon(22% 0,78% 0,100% 100%,0 100%);border-radius:2px}
.sk .skl{top:27px;width:18px;height:12px;margin-left:-9px;border-radius:3px;box-shadow:0 0 10px var(--b,#fff)}
.sk .skd{top:18px;width:20px;height:11px;margin-left:-10px;border-radius:10px 10px 2px 2px}
.sk b{position:absolute;left:4px;right:4px;bottom:20px;font-size:11.5px;line-height:1.1}.sk small{position:absolute;left:3px;right:3px;bottom:5px;font-size:9.5px;opacity:.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sk.on small{color:#ffd27a;opacity:1}`;document.head.appendChild(s)}
