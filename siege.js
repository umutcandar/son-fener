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
 const tapP=(k,fn,auto)=>{const e=q('#sgTap');e.textContent=tx(k);e.classList.add('on');tapReady=fn;if(auto)setTimeout(()=>tapReady===fn&&fire(),auto)};
 const fire=()=>{const f=tapReady;if(!f)return;tapReady=null;q('#sgTap').classList.remove('on');f()};
 const go=n=>{ph=n;pt=0};const vib=n=>{try{!RM&&navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
 const sh=v=>{if(!RM)shake=Math.max(shake,v)};
 for(let i=0;i<26;i++)M.push({x:Math.random(),y:1.05+Math.random()*.25,v:.02+Math.random()*.03,s:.7+Math.random()*.6,dead:0,ph:Math.random()*6});
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
 function ult(){go(2);say('ui.sg_ult');slow=.25;flash=1;sh(22);vib([40,30,90]);tone(1320,.6,'sawtooth',.06,220);noise(1.2,.6,4000);boom(.7);
  let tot=0;M.forEach((m,i)=>{if(m.dead)return;m.dead=1;const px=m.x*W,py=m.y*H,d=900+Math.floor(Math.random()*2400),cr=Math.random()<.35;tot+=d*(cr?2:1);setTimeout(()=>{burst(px,py,10,cr?'#fff3a0':'#ff8a3a');num(px,py-20,d*(cr?2:1),cr)},i*35)});
  setTimeout(()=>{num(W/2,H*.42,tot,2);slow=1},1100);setTimeout(()=>go(3),3200)}
 function leviathan(){say('ui.sg_lev');roar();sh(18);vib([100,50,200]);setTimeout(()=>{boom(.9);sh(30);flash=.6;capt.down=1;burst(W/2,H*.72,60,'#ff4a2a');say('ui.sg_fall')},2600);setTimeout(()=>go(4),5600)}
 function ruins(){say('ui.sg_rb');tapP('ui.sg_tap_wall',()=>{wall=1;cheer=1;sh(6);vib(30);for(let i=0;i<5;i++)setTimeout(()=>{tone(523+i*130,.18,'triangle',.07);burst(W*(.25+i*.125),H*.66,14,'#ffd27a',.6)},i*110);setTimeout(()=>{tone(660,.5,'triangle',.06);tone(990,.6,'triangle',.05,null,.12);noise(1.2,.12,1600)},600);say('ui.sg_rb_ok');setTimeout(()=>go(5),2600)},9000)}
 function world(){say('ui.sg_world');horn(0);setTimeout(end,4200)}
 function end(){if(done)return;done=true;tapReady=null;ov.classList.add('out');document.body.classList.remove('intro');removeEventListener('resize',rs);setTimeout(()=>{ov.remove();try{A&&A.close()}catch(e){}},500);o.done&&o.done()}
 q('#sgSkip').onclick=e=>{e.stopPropagation();end()};ov.addEventListener('pointerdown',e=>{if(e.target.id!=='sgSkip')fire()});
 // ---- çizim
 const fire1=(px,py,s,t)=>{const g=x.createRadialGradient(px,py,0,px,py,s*2.2);g.addColorStop(0,'rgba(255,200,90,.9)');g.addColorStop(.35,'rgba(255,110,30,.55)');g.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=g;x.beginPath();x.arc(px,py,s*2.2,0,7);x.fill();
  x.fillStyle='#ffcf6a';x.beginPath();x.moveTo(px-s*.5,py);x.quadraticCurveTo(px+Math.sin(t*13+px)*s*.3,py-s*(1.4+Math.sin(t*9+py)*.3),px+s*.5,py);x.fill()};
 function citadel(t,cx,base,sc,ruin){const s=sc*Math.min(W,H*0.62)/420;x.save();x.translate(cx,base);x.scale(s,s);
  // kaya
  x.fillStyle='#17121c';x.beginPath();x.moveTo(-260,40);x.lineTo(-200,-40);x.lineTo(-120,-70);x.lineTo(120,-72);x.lineTo(210,-30);x.lineTo(270,40);x.fill();
  x.fillStyle='#231b28';x.beginPath();x.moveTo(-150,-60);x.lineTo(-90,10);x.lineTo(-40,-60);x.fill();
  // dış sur
  const st=(a,b,c,d,col)=>{x.fillStyle=col;x.fillRect(a,b,c,d)};
  st(-190,-150,380,82,'#2e2a33');for(let i=-190;i<190;i+=22)st(i,-164,13,16,'#2e2a33');
  if(ruin&&wall<1){x.fillStyle='#0d0a10';x.beginPath();x.moveTo(-40,-68);x.lineTo(-30,-150);x.lineTo(-10,-130);x.lineTo(10,-158);x.lineTo(35,-140);x.lineTo(45,-68);x.fill()}
  // kuleler
  for(const k of[-190,-95,95,190]){st(k-22,-200,44,132,'#38333e');for(let j=-22;j<22;j+=12)st(k+j,-212,8,14,'#38333e');x.fillStyle='rgba(255,170,60,.85)';x.fillRect(k-4,-180,8,12)}
  // iç kale + kule
  st(-120,-260,240,112,'#3e3844');for(let i=-120;i<120;i+=20)st(i,-274,12,16,'#3e3844');st(-46,-420,92,170,'#46404c');st(-56,-440,112,22,'#544d5a');st(-30,-480,60,44,'#4c4552');
  // pencereler (ısık)
  x.fillStyle='rgba(255,180,70,.9)';for(let r=0;r<3;r++)for(let c=-2;c<=2;c++)if((r+c)%2===0)x.fillRect(c*40-4,-240+r*28,8,13);for(let r=0;r<4;r++)x.fillRect(-4,-405+r*36,8,16);
  // toplar
  x.fillStyle='#15131a';for(const k of[-150,-50,50,150]){x.save();x.translate(k,-160);x.rotate(k<0?-.5:.5-3.14);x.fillRect(0,-4,34,8);x.restore()}
  // fener ateşi (bloom)
  const fy=-500,fl=1+Math.sin(t*7)*.08;if(!ruin||wall){const g=x.createRadialGradient(0,fy,0,0,fy,170*fl);g.addColorStop(0,'rgba(255,240,180,1)');g.addColorStop(.18,'rgba(255,170,60,.85)');g.addColorStop(.5,'rgba(255,90,20,.25)');g.addColorStop(1,'rgba(255,60,0,0)');x.fillStyle=g;x.beginPath();x.arc(0,fy,170*fl,0,7);x.fill();
   x.fillStyle='rgba(255,210,120,.18)';x.beginPath();x.moveTo(-20,fy);x.lineTo(-90,fy-700);x.lineTo(90,fy-700);x.lineTo(20,fy);x.fill()}
  // surlarda yangın
  if(!(ruin&&wall))for(const[a,b]of[[-170,-160],[-60,-268],[130,-160],[80,-268],[-120,-150],[175,-205]])fire1(a,b,11,t);
  x.restore();return s}
 function monster(m,t,lift){if(m.dead)return;const px=m.x*W,py=m.y*H-lift,s=18*m.s*Math.min(1.4,W/400);x.save();x.translate(px,py);
  const g=x.createRadialGradient(0,0,0,0,0,s*2);g.addColorStop(0,'rgba(120,70,170,.55)');g.addColorStop(1,'rgba(80,40,120,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,s*2,0,7);x.fill();
  x.fillStyle='#1d1426';x.beginPath();x.moveTo(-s,s);x.quadraticCurveTo(-s*1.1,-s*.8,0,-s*1.2);x.quadraticCurveTo(s*1.1,-s*.8,s,s);for(let i=0;i<4;i++)x.lineTo(s-(i+.5)*s/2,s*(.7+Math.sin(t*8+i+m.ph)*.25));x.fill();
  x.strokeStyle='#1d1426';x.lineWidth=s*.25;x.lineCap='round';const w=Math.sin(t*6+m.ph);x.beginPath();x.moveTo(-s*.6,-s*.2);x.lineTo(-s*1.3,-s*(.9+w*.3));x.moveTo(s*.6,-s*.2);x.lineTo(s*1.3,-s*(.9-w*.3));x.stroke();
  x.fillStyle='#b8ff6a';x.shadowColor='#b8ff6a';x.shadowBlur=8;x.beginPath();x.arc(-s*.32,-s*.5,s*.13,0,7);x.arc(s*.32,-s*.5,s*.13,0,7);x.fill();x.shadowBlur=0;x.restore()}
 function captain(t){if(!capt.on)return;const tgt=H*.78;capt.y+=((capt.down?H*1.2:tgt)-capt.y)*(capt.down?.03:.18);const px=W/2,py=capt.y,s=Math.min(W,H)/9;x.save();x.translate(px,py);if(capt.down)x.rotate(.9);
  const g=x.createRadialGradient(0,-s,0,0,-s,s*2.4);g.addColorStop(0,'rgba(255,210,120,.5)');g.addColorStop(1,'rgba(255,150,40,0)');x.fillStyle=g;x.beginPath();x.arc(0,-s,s*2.4,0,7);x.fill();
  x.fillStyle='#5a0d12';x.beginPath();x.moveTo(-s*.5,-s*1.5);x.quadraticCurveTo(-s*1.1+Math.sin(t*5)*s*.1,-s*.4,-s*.9,s*.1);x.lineTo(s*.9,s*.1);x.quadraticCurveTo(s*1.1,-s*.4,s*.5,-s*1.5);x.fill();
  x.fillStyle='#5d6470';x.fillRect(-s*.42,-s*1.5,s*.84,s*1.1);x.fillStyle='#7c8594';x.fillRect(-s*.42,-s*1.5,s*.84,s*.25);x.fillStyle='#c9a24a';x.fillRect(-s*.42,-s*.75,s*.84,s*.1);
  x.fillStyle='#3a3f48';x.fillRect(-s*.36,-s*.4,s*.28,s*.5);x.fillRect(s*.08,-s*.4,s*.28,s*.5);
  x.fillStyle='#6c7480';x.beginPath();x.arc(0,-s*1.78,s*.34,0,7);x.fill();x.fillStyle='#111';x.fillRect(-s*.24,-s*1.84,s*.48,s*.08);x.fillStyle='#b01818';x.beginPath();x.moveTo(-s*.06,-s*2.1);x.quadraticCurveTo(s*.5,-s*2.5,s*.6,-s*1.9);x.lineTo(s*.06,-s*2.06);x.fill();
  x.strokeStyle='#e8eef8';x.lineWidth=s*.09;x.shadowColor='#ffe9a0';x.shadowBlur=ph===2?24:8;x.beginPath();x.moveTo(s*.45,-s*1.1);x.lineTo(s*1.25,-s*2.3);x.stroke();x.shadowBlur=0;x.restore()}
 function lev_(t){if(ph<3)return;lev=Math.min(1,lev+.006);const e=1-Math.pow(1-lev,3),s=Math.min(W,H)*1.05,px=W*.5,py=H*1.15-e*H*.75;x.save();x.translate(px,py);
  x.fillStyle='#07080d';x.beginPath();x.moveTo(-s*.7,s*.4);x.quadraticCurveTo(-s*.62,-s*.3,-s*.18,-s*.48);x.quadraticCurveTo(0,-s*.6,s*.18,-s*.48);x.quadraticCurveTo(s*.62,-s*.3,s*.7,s*.4);x.fill();
  for(let i=0;i<9;i++){const a=-.6+i*.15,sx=Math.cos(a-1.57)*s*.42;x.fillStyle='#0c0e15';x.beginPath();x.moveTo(sx-s*.03,-s*.4+Math.abs(sx)*.25);x.lineTo(sx,-s*.56+Math.abs(sx)*.22);x.lineTo(sx+s*.03,-s*.4+Math.abs(sx)*.25);x.fill()}
  x.strokeStyle='#0a0c12';x.lineCap='round';for(let i=0;i<2;i++){const sg=i?1:-1;x.lineWidth=s*.07;x.beginPath();x.moveTo(sg*s*.55,0);x.bezierCurveTo(sg*s*.9,-s*.4,sg*s*(.5+Math.sin(t*2+i)*.1),-s*.8,sg*s*.25,-s*(.75+(ph>=3&&pt>2.4&&pt<3?.0:0)));x.stroke()}
  const eg=.7+.3*Math.sin(t*4);x.fillStyle=`rgba(255,40,20,${eg})`;x.shadowColor='#ff2a10';x.shadowBlur=30;x.beginPath();x.ellipse(-s*.13,-s*.33,s*.05,s*.022,.3,0,7);x.ellipse(s*.13,-s*.33,s*.05,s*.022,-.3,0,7);x.fill();x.shadowBlur=0;
  x.fillStyle='#2a0606';x.beginPath();x.ellipse(0,-s*.2,s*.17,s*.05+.04*s*Math.max(0,Math.sin(t*1.6)),0,0,7);x.fill();x.restore()}
 function soldiers(t){const n=7;for(let i=0;i<n;i++){const px=W*(.15+i*.7/(n-1)),jump=cheer?Math.abs(Math.sin(t*7+i))*14:0,py=H*.84-jump,s=Math.min(W,H)/26;x.fillStyle='#262b33';x.fillRect(px-s*.4,py-s*1.6,s*.8,s*1.3);x.fillStyle='#4a525e';x.beginPath();x.arc(px,py-s*1.9,s*.32,0,7);x.fill();x.fillStyle='#6a1015';x.fillRect(px-s*.42,py-s*1.6,s*.84,s*.3);
  x.strokeStyle='#8a929e';x.lineWidth=2;x.beginPath();x.moveTo(px+s*.5,py-s*.4);x.lineTo(px+s*.5+(cheer?s*.3:0),py-s*(cheer?3:2.6));x.stroke();if(cheer&&i%2){x.fillStyle='#b01818';x.fillRect(px+s*.55,py-s*3,s*.7,s*.45)}}}
 function frame(nw){if(done)return;const rdt=Math.min(.05,(nw-last)/1e3);last=nw;const dt=rdt*slow;T+=dt;pt+=rdt;const t=RM?T*.3:T;
  if(ph===0&&pt>3.6){go(1);seq[1]()}if(ph===3&&pt<rdt*1.5)leviathan();if(ph===4&&pt<rdt*1.5)ruins();if(ph===5&&pt<rdt*1.5)world();
  shake*=.9;flash*=.92;const sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;x.setTransform(dpr,0,0,dpr,sx*dpr,sy*dpr);
  if(ph===5)cam=Math.min(1,cam+rdt*.45);const ce=1-Math.pow(1-cam,3);
  // gökyüzü
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,ph>=3&&ph<4?'#1a0508':'#0c0614');g.addColorStop(.55,ph>=3&&ph<4?'#3a0c0c':'#2a0f2a');g.addColorStop(1,'#120a12');x.fillStyle=g;x.fillRect(-20,-20,W+40,H+40);
  // yıldırım/bulut
  if(!RM&&Math.random()<.008){flash=Math.max(flash,.35);noise(.9,.15,600)}
  x.fillStyle='rgba(90,40,110,.25)';for(let i=0;i<5;i++){const cx=((i*W*.35+t*12*(i%2?1:-1))%(W*1.6))-W*.3;x.beginPath();x.ellipse(cx,H*(.08+i*.07),W*.45,H*.05,0,0,7);x.fill()}
  // dünya (son evre)
  if(ph===5){x.save();x.globalAlpha=ce;const hz=H*.5;x.fillStyle='#0a1622';x.fillRect(0,hz,W,H-hz);for(let i=0;i<7;i++){const px=W*(.08+((i*.37)%1)*.84),py=hz+H*(.08+((i*.53)%1)*.38),s=10+((i*7)%5)*4;x.fillStyle='#1c1820';x.beginPath();x.ellipse(px,py,s*2,s*.6,0,0,7);x.fill();x.fillStyle='#3a3440';x.fillRect(px-s*.7,py-s*1.6,s*1.4,s*1.4);x.fillRect(px-s*.25,py-s*2.6,s*.5,s);
    x.fillStyle=['#e05252','#4fa3e0','#3fbf7f','#e0b040'][i%4];x.fillRect(px,py-s*3.3,s*.7,s*.4);fire1(px,py-s*2.7,4,t+i)}
   x.restore()}
  const base=H*(.66+ce*.06),sc=1-ce*.72,cx=W/2-ce*W*.05;
  citadel(t,cx,base,sc,ph>=4);
  // deniz
  x.fillStyle='rgba(10,8,18,.92)';x.fillRect(0,base+12*sc,W,H);x.strokeStyle='rgba(255,120,50,.18)';x.lineWidth=1.5;for(let i=0;i<9;i++){const yy=base+20+i*H*.03;x.beginPath();for(let xx=0;xx<=W;xx+=24)x.lineTo(xx,yy+Math.sin(xx*.03+t*2+i)*3);x.stroke()}
  // canavarlar sur yukarı tırmanır
  if(ph<=2){for(const m of M){m.y-=m.v*dt*(ph===0?1.3:.4);if(m.y<.62)m.y=.62+Math.random()*.05;monster(m,t,0)}}
  lev_(t);if(ph===4||ph===5&&ce<.5)soldiers(t);if(ph>=1&&ph<4)captain(t);
  if(ph===2&&pt<1.4){const k=pt/1.4,bx=W/2;x.save();x.globalCompositeOperation='lighter';const bw=W*(.15+k*.9);const bg=x.createLinearGradient(bx-bw,0,bx+bw,0);bg.addColorStop(0,'rgba(255,200,80,0)');bg.addColorStop(.5,`rgba(255,240,190,${.9*(1-k*.5)})`);bg.addColorStop(1,'rgba(255,200,80,0)');x.fillStyle=bg;x.fillRect(bx-bw,0,bw*2,H);x.restore()}
  // parçacıklar + sayılar
  for(let i=P.length-1;i>=0;i--){const p=P[i];p.l-=dt;if(p.l<=0){P.splice(i,1);continue}p.vy+=300*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;x.globalAlpha=Math.min(1,p.l*2);x.fillStyle=p.c;x.fillRect(p.x,p.y,p.s,p.s)}x.globalAlpha=1;
  // uçan kıvılcım
  if(!RM)for(let i=0;i<30;i++){const px=(i*97+t*30)%W,py=H-((i*53+t*(40+i%5*12))%H);x.fillStyle=`rgba(255,${140+i%4*25},60,${.4+.3*Math.sin(t*3+i)})`;x.fillRect(px,py,2,2)}
  for(let i=N.length-1;i>=0;i--){const n=N[i];n.l-=rdt;if(n.l<=0){N.splice(i,1);continue}const k=1-n.l/1.6,sc2=n.crit===2?1+Math.max(0,.4-k)*2:1+Math.max(0,.25-k)*3,sz=(n.crit===2?54:n.crit?30:20)*sc2;x.font=`900 ${sz}px system-ui,sans-serif`;x.textAlign='center';x.lineWidth=5;x.strokeStyle='#2a0a00';x.globalAlpha=Math.min(1,n.l*1.5);
   const lb=(n.crit===2?'':'-')+n.v.toLocaleString()+(n.crit===1?'!':'');x.strokeText(lb,n.x,n.y-k*40);x.fillStyle=n.crit===2?'#ffe14a':n.crit?'#ffd23a':'#fff';x.fillText(lb,n.x,n.y-k*40);if(n.crit===2){x.font='900 20px system-ui';x.strokeText(tx('ui.sg_total'),n.x,n.y-k*40-56);x.fillText(tx('ui.sg_total'),n.x,n.y-k*40-56)}x.globalAlpha=1}
  // vinyet + flaş
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,ph===3?'rgba(90,0,0,.7)':'rgba(0,0,0,.65)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  if(flash>.01){x.fillStyle=`rgba(255,245,220,${flash})`;x.fillRect(0,0,W,H)}
  requestAnimationFrame(frame)}
 seq[0]();requestAnimationFrame(frame);return{end}}
