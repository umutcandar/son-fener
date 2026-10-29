// ===== Son Fener Kalesi — ilk 60 saniye: kuşatma sineması (2B tuval, sadece sunum; kurala dokunmaz)
// Gece, yanan kale, sis orduları surlara saldırır → efsanevi kaptan iner (kesme sahnesi) → tek dokunuş: Fener Öfkesi
// → dev Leviathan çıkar, kaptan düşer → harap üs: dokun, sur onarılsın → rakip kalelerle dünya görünümü → oyuna dön.
export function playSiege(o){const tx=o.tx,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ov=document.createElement('div');ov.id='siege';ov.innerHTML='<canvas></canvas><div id="sgTxt"></div><div id="sgCut"><img src="img/cap_yusuf.webp" alt=""><b></b><small></small></div><div id="sgTap"></div><button id="sgSkip">⏭ '+tx('ui.sg_skip')+'</button>';
 document.body.appendChild(ov);document.body.classList.add('intro');
 const cv=ov.querySelector('canvas'),x=cv.getContext('2d'),dpr=Math.min(1.5,devicePixelRatio||1),q=s=>ov.querySelector(s);let W,H;
 const rs=()=>{W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;cv.style.width=W+'px';cv.style.height=H+'px'};rs();addEventListener('resize',rs);
 // ---- ses: kendi küçük sentezleyicisi (Oyna dokunuşundan sonra başlar)
 let A=null;try{A=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}const mute=o.mute&&o.mute();
 const tone=(f,d,ty,g,f2,dl=0)=>{if(!A||mute)return;const t=A.currentTime+dl,os=A.createOscillator(),gn=A.createGain();os.type=ty;os.frequency.setValueAtTime(f,t);if(f2)os.frequency.exponentialRampToValueAtTime(f2,t+d);gn.gain.setValueAtTime(0,t);gn.gain.linearRampToValueAtTime(g,t+.03);gn.gain.exponentialRampToValueAtTime(.0001,t+d);os.connect(gn).connect(A.destination);os.start(t);os.stop(t+d+.05)};
 const noise=(d,g,lp,dl=0)=>{if(!A||mute)return;const t=A.currentTime+dl,b=A.createBuffer(1,A.sampleRate*d,A.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=A.createBufferSource(),f=A.createBiquadFilter(),gn=A.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=lp;gn.gain.value=g;s.connect(f).connect(gn).connect(A.destination);s.start(t)};
 const horn=dl=>{tone(110,1.6,'sawtooth',.07,98,dl);tone(165,1.6,'sawtooth',.04,147,dl)},boom=(g=.5)=>{noise(.8,g,300);tone(60,.7,'sine',.25,30)},roar=()=>{noise(2.2,.5,500);tone(55,2.2,'sawtooth',.12,38);tone(82,2,'square',.04,50)};
 // ---- durum
 let ph=0,pt=0,T=0,shake=0,flash=0,slow=1,done=false,tapReady=null,last=performance.now();const P=[],N=[],M=[];
 const say=(k,a)=>{const e=q('#sgTxt');e.classList.remove('on');void e.offsetWidth;e.innerHTML=tx(k,a);e.classList.add('on')};
 const tapP=(k,fn,auto)=>{window.__sgTap=k;const e=q('#sgTap');e.textContent=tx(k);e.classList.add('on');tapReady=fn;if(auto)setTimeout(()=>tapReady===fn&&fire(),auto)};
 const fire=()=>{const f=tapReady;if(!f)return;tapReady=null;window.__sgTap=0;q('#sgTap').classList.remove('on');f()};
 const go=n=>{window.__sgPh=n;ph=n;pt=0;N.length=0;P.length=0};const vib=n=>{try{!RM&&navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
 const sh=v=>{if(!RM)shake=Math.max(shake,v)};
 for(let i=0;i<22;i++)M.push({x:.08+Math.random()*.84,y:.74+Math.random()*.2,v:.02+Math.random()*.03,s:.7+Math.random()*.6,dead:0,ph:Math.random()*6});
 const capt={y:-1,on:0,down:0};let lev=0,wall=0,cheer=0,cam=0;
 const burst=(px,py,n,col,sp=1)=>{for(let i=0;i<n&&P.length<320;i++){const a=Math.random()*6.28,v=(60+Math.random()*260)*sp;P.push({x:px,y:py,vx:Math.cos(a)*v,vy:Math.sin(a)*v-80,l:.6+Math.random()*.8,c:col,s:2+Math.random()*4})}};
 const num=(px,py,v,crit)=>N.push({x:px,y:py,v,crit,l:1.6});
 // ---- akış
 const seq=[
  ()=>{horn(0);horn(1.8);boom(.3);say('ui.sg_l0');sh(6)},
  ()=>{capt.on=1;capt.y=-1;noise(.4,.3,2000);tone(880,.25,'triangle',.06,1320);setTimeout(()=>{boom(.6);sh(14);vib(60);burst(W/2,H*.72,40,'#ffd27a')},450);
   const c=q('#sgCut');c.querySelector('b').textContent=tx('ui.sg_cap');c.querySelector('small').textContent=tx('ui.sg_cap_d');c.classList.add('on');setTimeout(()=>c.classList.remove('on'),1900);
   setTimeout(()=>tapP('ui.sg_tap_ult',ult,7000),2000)},
 ];
 function ult(){go(2);say('ui.sg_ult');slow=.25;flash=.45;sh(22);vib([40,30,90]);tone(1320,.6,'sawtooth',.06,220);noise(1.2,.6,4000);boom(.7);
  let tot=0;M.forEach((m,i)=>{if(m.dead)return;m.dead=1;const px=m.x*W,py=m.y*H,d=900+Math.floor(Math.random()*2400),cr=Math.random()<.35;tot+=d*(cr?2:1);setTimeout(()=>{burst(px,py,10,cr?'#fff3a0':'#ff8a3a');num(px,py-20,d*(cr?2:1),cr)},i*35)});
  setTimeout(()=>{num(W/2,H*.42,tot,2);slow=1},1100);const fd=setInterval(()=>{hordeA=Math.max(0,hordeA-.08);if(!hordeA)clearInterval(fd)},60);setTimeout(()=>go(3),3200)}
 function leviathan(){say('ui.sg_lev');roar();sh(18);vib([100,50,200]);setTimeout(()=>{boom(.9);sh(30);flash=.3;capt.down=1;burst(W/2,H*.72,60,'#ff4a2a');say('ui.sg_fall')},2600);setTimeout(()=>go(4),5600)}
 function ruins(){say('ui.sg_rb');tapP('ui.sg_tap_wall',()=>{wall=1;cheer=1;sh(6);vib(30);for(let i=0;i<5;i++)setTimeout(()=>{tone(523+i*130,.18,'triangle',.07);burst(W*(.25+i*.125),H*.66,14,'#ffd27a',.6)},i*110);setTimeout(()=>{tone(660,.5,'triangle',.06);tone(990,.6,'triangle',.05,null,.12);noise(1.2,.12,1600)},600);say('ui.sg_rb_ok');setTimeout(()=>go(5),2600)},9000)}
 function world(){say('ui.sg_world');horn(0);setTimeout(end,4200)}
 function end(){if(done)return;done=true;tapReady=null;ov.classList.add('out');document.body.classList.remove('intro');removeEventListener('resize',rs);setTimeout(()=>{ov.remove();try{A&&A.close()}catch(e){}},500);o.done&&o.done()}
 q('#sgSkip').onclick=e=>{e.stopPropagation();end()};ov.addEventListener('pointerdown',e=>{if(e.target.id!=='sgSkip')fire()});
 // ---- çizim: boyalı katmanlar (img/sg/*.webp) + kamera, paralaks, ışık titremesi
const IM={};['citadel','lev','ruins','rebuilt','world','captain','horde'].forEach(k=>{const i=new Image();i.decoding='async';i.src='img/sg/'+k+'.webp';IM[k]=i});
const ok=i=>i&&i.complete&&i.naturalWidth;
// kapak çizimi: z yakınlaştırma, fx/fy odak (0..1), ox/oy ekran kayması
const cover=(k,z,fx,fy,al=1,ox=0,oy=0)=>{const i=IM[k];if(!ok(i)||al<=0)return;const r=Math.max(W/i.naturalWidth,H/i.naturalHeight)*z,w=i.naturalWidth*r,h=i.naturalHeight*r;let px=W/2-fx*w+w/2-w/2,py=H/2-fy*h;px=Math.min(0,Math.max(W-w,W/2-fx*w));py=Math.min(0,Math.max(H-h,H/2-fy*h));x.globalAlpha=al;x.drawImage(i,px+ox,py+oy,w,h);x.globalAlpha=1};
const glow=(px,py,r,c,a)=>{x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,c.replace('A',a));g.addColorStop(1,c.replace('A',0));x.fillStyle=g;x.beginPath();x.arc(px,py,r,0,7);x.fill();x.restore()};
const fogs=[];for(let i=0;i<9;i++)fogs.push({x:Math.random(),y:.35+Math.random()*.65,s:.5+Math.random()*.7,v:(Math.random()<.5?-1:1)*(.008+Math.random()*.02)});
function fog(t,dt,tint){for(const f of fogs){f.x+=f.v*dt;if(f.x<-.4)f.x=1.4;if(f.x>1.4)f.x=-.4;const r=W*f.s,px=f.x*W,py=f.y*H;const g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,tint);g.addColorStop(1,'rgba(60,20,90,0)');x.fillStyle=g;x.beginPath();x.ellipse(px,py,r,r*.35,0,0,7);x.fill()}}
let hordeA=1,hordeY=0,capX=0,rb=0;
function horde(t,dt){if(!ok(IM.horde)||hordeA<=0)return;const i=IM.horde,w=W*1.35,h=w*i.naturalHeight/i.naturalWidth;if(ph<=1)hordeY=Math.min(1,hordeY+dt*.25);
 for(let r=0;r<2;r++){const sc=r?1:1.25,ww=w*sc,hh=h*sc,py=H-hh*(r?.62:.48)-hordeY*H*(r?.05:.08)+Math.sin(t*5+r)*3,px=(W-ww)/2+Math.sin(t*.7+r*2)*W*.03;x.globalAlpha=hordeA*(r?.8:1);if(r){x.filter='brightness(.6)'}x.drawImage(i,px,py,ww,hh);x.filter='none'}x.globalAlpha=1}
function captain(t){if(!capt.on||!ok(IM.captain))return;const i=IM.captain,h=H*.62,w=h*i.naturalWidth/i.naturalHeight;capt.y+=((capt.down?H*1.3:0)-capt.y)*(capt.down?.025:.16);if(capt.y<-H*.9)capt.y=-H*.9;
 const px=W*.5-w*.5+capX,py=H-h*.98+capt.y+Math.sin(t*2)*3;glow(W*.5,py+h*.35,h*.6,'rgba(255,150,50,A)',.35);x.save();if(capt.down){x.translate(W/2,py+h);x.rotate(.35);x.translate(-W/2,-py-h);x.filter='brightness(.55) saturate(.6)'}x.drawImage(i,px,py,w,h);x.restore();x.filter='none'}
function frame(nw){if(done)return;const rdt=Math.min(.05,(nw-last)/1e3);last=nw;const dt=rdt*slow;T+=dt;pt+=rdt;const t=RM?T*.3:T;
 if(ph===0&&pt>3.6){go(1);seq[1]()}if(ph===3&&pt<rdt*1.5)leviathan();if(ph===4&&pt<rdt*1.5)ruins();if(ph===5&&pt<rdt*1.5)world();
 shake*=.9;flash*=.9;const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;x.setTransform(dpr,0,0,dpr,sx*dpr,sy*dpr);
 x.fillStyle='#07050b';x.fillRect(-30,-30,W+60,H+60);const pr=RM?0:1;
 if(ph<=2){// kamera yavaşça kaleye itilir; hafif paralaks salınımı
  const z=1.04+Math.min(1,T/10)*.16*pr;cover('citadel',z,.5,.42,1,Math.sin(t*.3)*6*pr,0);
  const fl=.55+.25*Math.sin(t*9)+.15*Math.sin(t*23);glow(W*.5,H*(.15-.03*(z-1)),W*.45,'rgba(255,170,70,A)',fl*.45);
  fog(t,dt,'rgba(110,50,160,.22)');horde(t,dt);captain(t)}
 if(ph===3){lev=Math.min(1,lev+rdt*.32);const e=1-Math.pow(1-lev,3);cover('citadel',1.2,.5,.42,1-e);
  // leviathan: alttan yükselir, yakından uzaklaşır → devasa ve okunaklı
  cover('lev',1.5-e*.45,.5,.32,Math.min(1,e*1.6),0,(1-e)*H*.5);const eg=.5+.5*Math.sin(t*4);glow(W*.32,H*.2,W*.25,'rgba(255,30,20,A)',e*eg*.6);
  fog(t,dt,'rgba(120,30,90,.2)');hordeA=0;captain(t)}
 if(ph===4){rb=Math.min(1,rb+(wall?rdt*.7:0));const z=1.12-rb*.06;cover('ruins',z,.5,.45,1);cover('rebuilt',z,.5,.45,rb);
  if(rb>0&&rb<1)glow(W*.5,H*.48,W*.8,'rgba(255,200,110,A)',Math.sin(rb*3.14)*.5);if(rb>.6){const fl=.5+.3*Math.sin(t*8);glow(W*.58,H*.12,W*.3,'rgba(255,170,70,A)',fl*.5)}
  fog(t,dt,wall?'rgba(140,70,150,.12)':'rgba(90,90,110,.2)')}
 if(ph===5){cam=Math.min(1,cam+rdt*.35);const ce=1-Math.pow(1-cam,3);cover('rebuilt',1.06-ce*.3,.5,.45,1-Math.min(1,ce*1.4));
  cover('world',2.2-ce*1.2,.5,.78,Math.min(1,ce*1.4));fog(t,dt,'rgba(110,60,170,.16)')}
 // ult ışını (yumuşatılmış: turuncu, düşük opaklık)
 if(ph===2&&pt<1.4){const k=pt/1.4,bx=W/2;x.save();x.globalCompositeOperation='lighter';const bw=W*(.08+k*.5);const bg=x.createLinearGradient(bx-bw,0,bx+bw,0);bg.addColorStop(0,'rgba(255,140,40,0)');bg.addColorStop(.5,`rgba(255,190,110,${.42*(1-k)})`);bg.addColorStop(1,'rgba(255,140,40,0)');x.fillStyle=bg;x.fillRect(bx-bw,0,bw*2,H);x.restore()}
 for(let i=P.length-1;i>=0;i--){const p=P[i];p.l-=dt;if(p.l<=0){P.splice(i,1);continue}p.vy+=300*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;x.globalAlpha=Math.min(1,p.l*2);x.fillStyle=p.c;x.beginPath();x.arc(p.x,p.y,p.s*.6,0,7);x.fill()}x.globalAlpha=1;
 if(!RM){x.save();x.globalCompositeOperation='lighter';for(let i=0;i<40;i++){const px=(i*97+t*30+Math.sin(t+i)*20)%W,py=H-((i*53+t*(40+i%5*12))%H);x.fillStyle=`rgba(255,${120+i%4*30},50,${.35+.3*Math.sin(t*3+i)})`;x.beginPath();x.arc(px,py,1+i%3*.6,0,7);x.fill()}x.restore()}
 for(let i=N.length-1;i>=0;i--){const n=N[i];n.l-=rdt;if(n.l<=0){N.splice(i,1);continue}const k=1-n.l/1.6,sc2=n.crit===2?1+Math.max(0,.4-k)*2:1+Math.max(0,.25-k)*3,sz=(n.crit===2?54:n.crit?30:20)*sc2;x.font=`900 ${sz}px system-ui,sans-serif`;x.textAlign='center';x.lineWidth=5;x.strokeStyle='#2a0a00';x.globalAlpha=Math.min(1,n.l*1.5);
  const lb=(n.crit===2?'':'-')+n.v.toLocaleString()+(n.crit===1?'!':'');x.strokeText(lb,n.x,n.y-k*40);x.fillStyle=n.crit===2?'#ffe14a':n.crit?'#ffd23a':'#fff';x.fillText(lb,n.x,n.y-k*40);if(n.crit===2){x.font='900 20px system-ui';x.strokeText(tx('ui.sg_total'),n.x,n.y-k*40-56);x.fillText(tx('ui.sg_total'),n.x,n.y-k*40-56)}x.globalAlpha=1}
 const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,ph===3?'rgba(70,0,10,.6)':'rgba(0,0,0,.55)');x.fillStyle=vg;x.fillRect(0,0,W,H);
 if(flash>.01){x.fillStyle=`rgba(255,220,170,${Math.min(.45,flash)})`;x.fillRect(0,0,W,H)}
 requestAnimationFrame(frame)}
 seq[0]();requestAnimationFrame(frame);return{end}}
