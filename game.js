// ===== Son Fener — görüntü + arayüz katmanı. Kurallar logic.js'te (saf). Durum: tek nesne S.
import * as THREE from './lib/three.module.js';
import * as L from './logic.js';
const {KINDS,RIC,TROOPS,HEROES,TECH,FOES,RARITY,GR}=L;
const $=id=>document.getElementById(id);const now=()=>Date.now();
const KEY='sonfener1',TS=1.3;
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}const isNew=!S||S.v!==1;if(isNew)S=L.newState(now());
const save=()=>{S.saved=now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const tpos=k=>{const[i,j]=L.unkey(k);return new THREE.Vector3(i*TS,0,j*TS)};
// ---------- RENDER ----------
const canvas=$('c');const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const gradTex=(stops)=>{const cv=document.createElement('canvas');cv.width=2;cv.height=256;const x=cv.getContext('2d');const g=x.createLinearGradient(0,0,0,256);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,2,256);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t};
scene.background=gradTex([[0,'#3a2d5c'],[.35,'#b65f6e'],[.7,'#f39a5b'],[1,'#ffd08a']]);
scene.fog=new THREE.Fog(0xd99a86,34,80);
const camera=new THREE.PerspectiveCamera(36,1,.1,220);
const hemi=new THREE.HemisphereLight(0xffe0c0,0x3f6a78,1.35);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffb27a,1.9);sun.position.set(-6,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});sun.shadow.bias=-.0015;sun.shadow.normalBias=.02;scene.add(sun);
const lamp=new THREE.PointLight(0xffd27a,10,9,1.3);scene.add(lamp);
const MATS={};const mat=(c,e)=>MATS[c+(e||'')]||(MATS[c+(e||'')]=e?new THREE.MeshBasicMaterial({color:c}):new THREE.MeshLambertMaterial({color:c}));
const G={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,10),tcyl:new THREE.CylinderGeometry(.38,.5,1,10),cone:new THREE.ConeGeometry(.5,1,8),pyr:new THREE.ConeGeometry(.5,1,4).rotateY(Math.PI/4),
 dod:new THREE.DodecahedronGeometry(.5,0),sph:new THREE.SphereGeometry(.5,10,8),ico:new THREE.IcosahedronGeometry(.5,0),oct:new THREE.OctahedronGeometry(.5,0)};
{const sh=new THREE.Shape();sh.moveTo(-.5,0);sh.lineTo(.5,0);sh.lineTo(0,1);sh.lineTo(-.5,0);G.prism=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false}).translate(0,0,-.5);}
function P(par,geo,c,sx,sy,sz,x,y,z,ry=0,rx=0,rz=0,sh=true,e){const m=new THREE.Mesh(G[geo],mat(c,e));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=sh;m.receiveShadow=!e;par.add(m);return m}
const E={out:t=>1-Math.pow(1-t,3),el:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*2.094)+1};
const tweens=[];const tween=(dur,fn,done)=>tweens.push({t0:performance.now(),dur,fn,done});
const rnd=k=>{const x=Math.sin(k*12.9898)*43758.5453;return x-Math.floor(x)};
const isl=(x,z)=>Math.pow(Math.pow(Math.abs(x),3)+Math.pow(Math.abs(z),3),1/3);
// ada
{const g=new THREE.PlaneGeometry(22,22,48,48).rotateX(-Math.PI/2);const p=g.attributes.position;const cols=[];
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const r=isl(x,z);let y=Math.sin(x*1.9)*Math.cos(z*1.6)*.05;let c;
  if(r<6.3)c=new THREE.Color(0x7cc46a).lerp(new THREE.Color(0x5fae5a),rnd(i)*.6);else if(r<7.5){y=-(r-6.3)*.35;c=new THREE.Color(r<6.6?0xb9cf7a:0xf2d9a0).lerp(new THREE.Color(0xe6c88a),rnd(i)*.5)}else{y=-.42-(r-7.5)*.8;c=new THREE.Color(0xd9b97a)}
  p.setY(i,y);cols.push(c.r,c.g,c.b)}
 g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));m.receiveShadow=true;scene.add(m);}
// okyanus
const OC=new THREE.PlaneGeometry(150,150,56,56).rotateX(-Math.PI/2);const ocB=OC.attributes.position.array.slice();
const ocean=new THREE.Mesh(OC,new THREE.MeshLambertMaterial({color:0x1fa5b0,flatShading:true,transparent:true,opacity:.93}));ocean.position.y=-.28;scene.add(ocean);
const foam=new THREE.Mesh(new THREE.RingGeometry(7.5,8.1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false}));foam.position.y=-.2;scene.add(foam);
// palmiyeler + kayalar (instanced)
{const pos=[];for(let k=0;k<30;k++){const a=k/30*Math.PI*2+rnd(k)*.15,r=6.35+rnd(k+9)*.7;pos.push([Math.cos(a)*r,Math.sin(a)*r,a])}
 const trunk=new THREE.InstancedMesh(G.cyl,mat(0x9a6a42),pos.length),leaf=new THREE.InstancedMesh(G.oct,mat(0x3f9a4a),pos.length*3),rock=new THREE.InstancedMesh(G.dod,mat(0xb8aea0),14);
 [trunk,leaf,rock].forEach(m=>{m.castShadow=true;scene.add(m)});const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 pos.forEach(([x,z,a],i)=>{const s=.8+rnd(i)*.4,y=-(isl(x,z)-6.3)*.35;e.set(0,0,(rnd(i+3)-.5)*.4);q.setFromEuler(e);m4.compose(new THREE.Vector3(x,y+.6*s,z),q,new THREE.Vector3(.12,1.2*s,.12));trunk.setMatrixAt(i,m4);
  for(let l=0;l<3;l++){e.set(.5,l*2.1+a,0);q.setFromEuler(e);m4.compose(new THREE.Vector3(x+Math.cos(l*2.1+a)*.25,y+1.25*s,z+Math.sin(l*2.1+a)*.25),q,new THREE.Vector3(.75*s,.12,.32*s));leaf.setMatrixAt(i*3+l,m4)}});
 for(let k=0;k<14;k++){const a=k/14*6.28+.2,r=7.4+rnd(k+40)*.6,s=.4+rnd(k)*.6;m4.compose(new THREE.Vector3(Math.cos(a)*r,-.3,Math.sin(a)*r),q.identity(),new THREE.Vector3(s,s*.7,s));rock.setMatrixAt(k,m4)}}
// ızgara karoları
let tilesMesh=null;const tcol=new THREE.Color();
function buildTiles(){if(tilesMesh)scene.remove(tilesMesh);const ks=[];for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++)if(L.tileOK(i,j))ks.push(L.key(i,j));
 tilesMesh=new THREE.InstancedMesh(G.box,new THREE.MeshLambertMaterial(),ks.length);tilesMesh.receiveShadow=true;const m4=new THREE.Matrix4();
 ks.forEach((k,n)=>{const p=tpos(k);m4.compose(new THREE.Vector3(p.x,.02,p.z),new THREE.Quaternion(),new THREE.Vector3(TS*.92,.04,TS*.92));tilesMesh.setMatrixAt(n,m4);tilesMesh.setColorAt(n,tcol.set(L.isSafe(S,k)?0x9fdc86:0x6e6684))});scene.add(tilesMesh)}
// sis
const fogTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(150,120,170,.95)');g.addColorStop(.6,'rgba(120,100,140,.45)');g.addColorStop(1,'rgba(110,90,130,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)})();
let fogs=[];
function buildFog(){fogs.forEach(f=>scene.remove(f.m));fogs=[];const R=L.safeR(S);const add=(x,z,s,o,y=.6)=>{const m=new THREE.Sprite(new THREE.SpriteMaterial({map:fogTex,transparent:true,depthWrite:false,opacity:o,color:0xffffff}));m.position.set(x,y,z);m.scale.set(s,s*.6,1);scene.add(m);fogs.push({m,b:new THREE.Vector3(x,y,z),o,ph:Math.random()*6})};
 for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++){if(Math.max(Math.abs(i),Math.abs(j))>R)add(i*TS+(rnd(i*9+j)-.5)*.5,j*TS+(rnd(i+j*7)-.5)*.5,2.8,.55)}
 for(let k=0;k<34;k++){const a=k/34*6.28,r=8.6+rnd(k)*2.2;add(Math.cos(a)*r,Math.sin(a)*r,5+rnd(k+5)*2,.6,.9)}}
// ---------- MODELLER ----------
function hut(g,w,h,d,wall,roof=0xc0533a){P(g,'box',wall,w,h,d,0,h/2,0);P(g,'prism',roof,w*1.18,h*.6,d*1.12,0,h,0);P(g,'box',0x4a2e1c,w*.22,h*.55,.02,0,h*.27,d/2+.01);}
const win=(g,x,y,z)=>P(g,'box',0xffd27a,.12,.12,.02,x,y,z,0,0,0,false,1);
function mkFener(g,lv){const h=2.4+lv*.18;P(g,'cyl',0xb8b0a0,1.5,.35,1.5,0,.17,0);const n=5;for(let i=0;i<n;i++){const t=i/n;P(g,'tcyl',i%2?0xd8433a:0xf6f2ea,.95-t*.35,h/n+.01,.95-t*.35,0,.35+h/n*(i+.5),0)}
 P(g,'cyl',0x3a3a44,.95,.08,.95,0,.37+h,0);const top=.41+h;P(g,'cyl',0xfff1b0,.5,.5,.5,0,top+.25,0,0,0,0,false,1);P(g,'cone',0xd8433a,.65,.45,.65,0,top+.72,0);P(g,'sph',0xffd84a,.12,.12,.12,0,top+1,0,0,0,0,false,1);
 for(let k=0;k<6;k++){const a=k/6*Math.PI*2;P(g,'box',0x3a3a44,.03,.5,.03,Math.cos(a)*.28,top+.25,Math.sin(a)*.28)}
 P(g,'box',0x4a2e1c,.25,.4,.05,0,.55,.46);if(lv>=3)P(g,'box',0xb8b0a0,.6,.4,.6,.75,.2,.1);if(lv>=5)P(g,'box',0xb8b0a0,.5,.35,.5,-.7,.18,-.2);g.userData.lampY=top+.25}
function mkHut(g,lv){if(lv<=2){P(g,'cyl',0xe2c48e,.8,.45,.8,0,.22,0);P(g,'cone',0xd9a94a,1.05,.55,1.05,0,.72,0);P(g,'box',0x4a2e1c,.2,.3,.02,0,.15,.4);if(lv===2)P(g,'cyl',0xe2c48e,.4,.3,.4,.42,.15,.3),P(g,'cone',0xd9a94a,.55,.3,.55,.42,.45,.3);return}
 hut(g,.85,.5+(lv>=5?.35:0),.75,lv>=4?0xf0e2c4:0xc9955c,lv>=4?0x3a7ac0:0xc0533a);win(g,-.26,.3,.38);win(g,.26,.3,.38);if(lv>=5)win(g,0,.68,.38)}
function mkFisher(g,lv){for(let k=0;k<4;k++)P(g,'box',0x9a6a42,.9,.05,.16,0,.08,-.1+k*.18);P(g,'cyl',0x7a5030,.07,.3,.07,-.4,.1,.5);P(g,'cyl',0x7a5030,.07,.3,.07,.4,.1,.5);
 hut(g,.5,.38,.4,0x6aa0c0,0xe6e0d0);g.children.slice(-4).forEach(m=>m.position.x-=.2);P(g,'box',0x9a6a42,.04,.4,.04,.35,.25,-.3);P(g,'box',0xf28a5a,.18,.1,.02,.35,.35,-.28);
 if(lv>=2){const b=P(g,'box',0xd8433a,.5,.12,.2,.25,.12,.62);}if(lv>=4)P(g,'cone',0xffffff,.2,.4,.02,.25,.4,.62)}
function mkWood(g,lv){hut(g,.7,.45,.6,0x8a5a3a,0x5a3a25);for(let k=0;k<3+Math.min(lv,4);k++)P(g,'cyl',0xb07a48,.12,.55,.12,-.18+(k%3)*.14,.07+Math.floor(k/3)*.12,.47,0,0,Math.PI/2);P(g,'cyl',0xc29a6a,.25,.18,.25,.42,.09,.2);P(g,'box',0x888,.03,.3,.03,.42,.3,.2,0,0,.4)}
function mkMine(g,lv){P(g,'dod',0x8a7a9a,1,.75,.9,0,.28,-.1);P(g,'box',0x4a2e1c,.45,.42,.1,0,.21,.33);P(g,'box',0x111,.32,.32,.12,0,.18,.34,0,0,0,false,1);
 for(let k=0;k<1+Math.min(lv,5);k++){const a=k*1.7;P(g,'oct',0xb98cff,.16+k*.02,.32+k*.03,.16,Math.cos(a)*.38,.45+(k%2)*.12,Math.sin(a)*.3-.1,a,0,.3,false,1)}g.userData.crys=1}
function mkYard(g,lv){P(g,'box',0x9a6a42,1.05,.06,.5,0,.05,.2);P(g,'box',0x6b4a30,.7,.25,.28,0,.22,.2);P(g,'prism',0x8a5a3a,.28,.2,.7,0,.08,.2,Math.PI/2,Math.PI);P(g,'cyl',0x7a5030,.04,.8,.04,0,.6,.2);
 if(lv>=2)P(g,'box',0xf6f2ea,.02,.45,.35,.02,.7,.2);P(g,'box',0xe0a040,.05,1,.05,-.45,.5,-.25);P(g,'box',0xe0a040,.6,.05,.05,-.2,.98,-.25);P(g,'box',0x6aa0c0,.4,.3,.3,.35,.15,-.25)}
function mkLab(g,lv){P(g,'cyl',0xe6dcc6,.7,.65,.7,0,.32,0);P(g,'sph',0x6a8ab0,.72,.6,.72,0,.66,0);P(g,'cyl',0x444,.08,.5,.08,.15,.85,.1,0,.7);win(g,0,.35,.36);if(lv>=3)P(g,'cyl',0xe6dcc6,.35,.4,.35,.45,.2,-.2)}
const MK={hut:mkHut,fisher:mkFisher,wood:mkWood,mine:mkMine,yard:mkYard,lab:mkLab};
function mkScaf(g){for(const a of[-1,1])for(const b of[-1,1])P(g,'cyl',0xc08a4a,.05,1.1,.05,a*.45,.55,b*.45);P(g,'box',0xf4d03f,.95,.04,.04,0,.9,.45);P(g,'box',0xf4d03f,.95,.04,.04,0,.5,-.45)}
function mkFoe(g,b){if(b==='octo'){P(g,'sph',0x8a5aa8,.8,.7,.8,0,.35,0);P(g,'sph',0xfff36b,.14,.14,.08,-.18,.5,.36,0,0,0,false,1);P(g,'sph',0xfff36b,.14,.14,.08,.18,.5,.36,0,0,0,false,1);
  const ts=[];for(let k=0;k<6;k++){const a=k/6*6.28;const t=P(g,'cone',0x6a3a88,.18,.9,.18,Math.cos(a)*.55,.2,Math.sin(a)*.55,0,Math.cos(a)*.5,-Math.sin(a)*.5);ts.push(t)}g.userData.ts=ts}
 else for(const o of[[0,0],[.6,.3],[-.5,.4]]){const w=new THREE.Group();w.position.set(o[0],0,o[1]);g.add(w);const m=new THREE.MeshLambertMaterial({color:0xe8e0ff,transparent:true,opacity:.75});
  const b1=new THREE.Mesh(G.sph,m);b1.scale.set(.45,.45,.45);b1.position.y=.6;w.add(b1);const t=new THREE.Mesh(G.cone,m);t.scale.set(.42,.6,.42);t.position.y=.25;t.rotation.x=Math.PI;w.add(t);
  P(w,'sph',0x2a1a3a,.08,.1,.05,-.09,.65,.2,0,0,0,false,1);P(w,'sph',0x2a1a3a,.08,.1,.05,.09,.65,.2,0,0,0,false,1)}
 const r=new THREE.Mesh(new THREE.RingGeometry(.9,1.15,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xb98cff,transparent:true,opacity:.5}));r.position.y=.02;g.add(r)}
function mkRaft(g,big){P(g,'box',0x9a6a42,big?1:.7,.1,big?.45:.6,0,0,0);P(g,'cyl',0x6b4a30,.04,.8,.04,0,.4,0);P(g,'prism',0xf6f2ea,.02,.55,.5,0,.2,.08,Math.PI/2);P(g,'cyl',0xf1c9a5,.13,.2,.13,.2,.15,.1)}
// sprite
const texC={};function emojiTex(e,bg,ring='#fff'){const k=e+bg+ring;if(texC[k])return texC[k];const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
 if(bg){x.fillStyle=bg;x.beginPath();x.arc(64,64,56,0,7);x.fill();x.lineWidth=8;x.strokeStyle=ring;x.stroke()}x.font=(/^\d+$/.test(e)?'bold 70px':'66px')+' system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText(e,64,70);
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return texC[k]=t}
function sprite(e,bg,s,dt=false,ring){const m=new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(e,bg,ring),depthTest:dt}));m.scale.set(s,s,1);m.renderOrder=10;return m}
// fener + ışın
let fenerG=null,fenerSig='';const beam=new THREE.Group();scene.add(beam);
{const bg=new THREE.ConeGeometry(1.5,11,20,1,true).translate(0,-5.5,0).rotateZ(Math.PI/2);const bm=new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
 for(const r of[0,Math.PI]){const m=new THREE.Mesh(bg,bm);m.rotation.y=r;m.rotation.z=r?.0:0;beam.add(m)}beam.children.forEach(m=>m.rotateZ(-.08))}
const glowTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,230,140,1)');g.addColorStop(.3,'rgba(255,200,90,.5)');g.addColorStop(1,'rgba(255,180,60,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)})();
const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));scene.add(halo);
function syncFener(){const sig=S.fener.lv+'|'+(S.fener.end?1:0);if(sig===fenerSig)return fenerG;fenerSig=sig;if(fenerG)scene.remove(fenerG);fenerG=new THREE.Group();mkFener(fenerG,S.fener.lv);if(S.fener.end)mkScaf(fenerG);scene.add(fenerG);
 const y=fenerG.userData.lampY;beam.position.y=y;lamp.position.set(0,y,0);halo.position.set(0,y,0);return fenerG}
// bina senkronu
const meshes=new Map();
function syncOne(k){const b=S.g[k];const cur=meshes.get(k);if(!b){if(cur){scene.remove(cur.g);meshes.delete(k)}return null}
 const sig=`${b.k}|${b.lv}|${b.end?1:0}|${b.fog?1:0}`;if(cur&&cur.sig===sig)return cur.g;if(cur)scene.remove(cur.g);
 const g=new THREE.Group();g.position.copy(tpos(k));const inner=new THREE.Group();inner.scale.setScalar(.8+Math.min(b.lv,8)*.05);g.add(inner);MK[b.k](inner,b.lv);if(b.end)mkScaf(g);
 const bd=sprite(String(b.lv),'#1f6f8b',.3,true,'#ffe08a');bd.position.set(.5,.15,.5);g.add(bd);
 if(b.fog){const f=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:0x6a4a8a,transparent:true,opacity:.45,depthWrite:false}));f.scale.set(1.3,1,1.3);f.position.y=.4;g.add(f);const gh=sprite('👻','#4a2a6acc',.45,false,'#b98cff');gh.position.y=1.2;g.add(gh);g.userData.gh=gh}
 if(KINDS[b.k].res&&!b.fog){const bub=sprite(RIC[KINDS[b.k].res],'#fff4dc',.44,false,'#ffb347');bub.position.y=1.3;bub.visible=false;g.add(bub);g.userData.bub=bub}
 scene.add(g);meshes.set(k,{g,sig});return g}
function syncAll(){for(const k of [...meshes.keys()])if(!S.g[k])syncOne(k);for(const k in S.g)syncOne(k);syncFener()}
// canavar kampları (denizde)
const CAMPS=[{id:'c1',x:7.2,z:-4.6,b:'ghost'},{id:'c2',x:-4.4,z:7.4,b:'octo'}];
for(const c of CAMPS){const g=new THREE.Group();g.position.set(c.x,-.25,c.z);mkFoe(g,c.b);const sp=sprite('⚔️','#b3261ecc',.5);sp.position.y=1.6;g.add(sp);g.userData.sp=sp;scene.add(g);c.g=g}
// insanlar + sallar
const people=[];function mkPerson(i){const g=new THREE.Group();const shirt=[0xe07a5f,0x3d8ab0,0xf2cc8f,0x81b29a,0xd8433a][i%5];
 P(g,'cyl',shirt,.16,.24,.14,0,.2,0);P(g,'sph',0xf1c9a5,.13,.13,.13,0,.39,0);if(i%2)P(g,'cyl',0xe8c860,.24,.03,.24,0,.46,0);
 const l1=P(g,'box',0x3a4a5a,.05,.12,.05,-.04,.06,0),l2=P(g,'box',0x3a4a5a,.05,.12,.05,.04,.06,0);g.userData={l1,l2,t:null,sp:.6+Math.random()*.3,ph:Math.random()*6};scene.add(g);return g}
function syncPeople(){const n=Math.min(S.surv,16);while(people.length<n){const p=mkPerson(people.length);const a=Math.random()*6.28;p.position.set(Math.cos(a)*1.4,0,Math.sin(a)*1.4);people.push(p)}while(people.length>n)scene.remove(people.pop())}
function pickTarget(p){const ks=Object.keys(S.g);const k=ks[Math.floor(Math.random()*ks.length)];const c=Math.random()<.3||!k?new THREE.Vector3():tpos(k);const a=Math.random()*6.28;p.userData.t=new THREE.Vector3(c.x+Math.cos(a)*.75,0,c.z+Math.sin(a)*.75)}
const rafts=[];function sendRaft(big){const a=Math.random()*6.28;const g=new THREE.Group();mkRaft(g,big);g.position.set(Math.cos(a)*22,-.2,Math.sin(a)*22);g.rotation.y=-a+Math.PI;scene.add(g);
 rafts.push({g,from:g.position.clone(),to:new THREE.Vector3(Math.cos(a)*7.6,-.2,Math.sin(a)*7.6),t:0,dur:6})}
const sailer=new THREE.Group();mkRaft(sailer,true);sailer.scale.setScalar(1.4);scene.add(sailer);
// ---------- KAMERA ----------
const cam={target:new THREE.Vector3(0,0,.4),dist:24,az:Math.PI/4,pol:.9,shake:0};
const minD=8,maxD=()=>camera.aspect<.7?30:22;
function updCam(){const o=new THREE.Vector3(Math.sin(cam.pol)*Math.sin(cam.az),Math.cos(cam.pol),Math.sin(cam.pol)*Math.cos(cam.az)).multiplyScalar(cam.dist);camera.position.copy(cam.target).add(o);
 if(cam.shake>0){camera.position.x+=(Math.random()-.5)*cam.shake;camera.position.y+=(Math.random()-.5)*cam.shake;cam.shake*=.88;if(cam.shake<.01)cam.shake=0}camera.lookAt(cam.target)}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();cam.dist=Math.min(cam.dist,maxD())}addEventListener('resize',resize);
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const ndc=(x,y)=>new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1);
function ground(x,y){ray.setFromCamera(ndc(x,y),camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(plane,p)?p:null}
const scr=v=>{const p=v.clone().project(camera);return{x:(p.x+1)/2*innerWidth,y:(1-p.y)/2*innerHeight}};
const tileScr=(k,y=.4)=>scr(tpos(k).setY(y));
function tileAt(x,y){const p=ground(x,y);if(!p)return null;const i=Math.round(p.x/TS),j=Math.round(p.z/TS);if(Math.abs(i)>GR||Math.abs(j)>GR)return null;return L.key(i,j)}
function pick(x,y){ray.setFromCamera(ndc(x,y),camera);
 for(const c of CAMPS){if(c.g.visible&&ray.ray.distanceToPoint(new THREE.Vector3(c.x,.4,c.z))<1.1)return{camp:c}}
 if(ray.ray.distanceToPoint(new THREE.Vector3(0,1.6,0))<.75||ray.ray.distanceToPoint(new THREE.Vector3(0,.6,0))<.7)return{fener:1};
 // binaya yukarıdan dokunma: önce yükseklikteki merkeze göre
 let best=null,bd=.62;for(const k in S.g){const d=ray.ray.distanceToPoint(tpos(k).setY(.45));if(d<bd){bd=d;best=k}}if(best)return{k:best};
 const k=tileAt(x,y);return k?{tile:k}:null}
// ---------- SES ----------
let AC;const ac=()=>{if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}if(AC&&AC.state==='suspended')AC.resume();return AC};
function tone(f,d,type='sine',v=.12,f2,delay=0){const a=AC;if(!a)return;const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(a.destination);o.start(t);o.stop(t+d)}
function noise(d,v=.2,f=1200){const a=AC;if(!a)return;const b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=a.createBufferSource(),g=a.createGain(),fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f;s.buffer=b;g.gain.value=v;s.connect(fl).connect(g).connect(a.destination);s.start()}
const SFX={coin:()=>{tone(988,.08,'square',.05);tone(1319,.15,'square',.05,null,.07)},build:()=>{tone(300,.08,'triangle',.12);tone(400,.1,'triangle',.12,null,.1);noise(.08,.15)},
 merge:lv=>[523,659,784,1047,1319].slice(0,2+Math.min(lv,3)).forEach((f,i)=>tone(f*(1+lv*.05),.18,'triangle',.12,null,i*.07)),pop:()=>tone(500,.06,'sine',.1,800),
 done:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',.1,null,i*.08)),err:()=>tone(200,.15,'sawtooth',.06,140),light:()=>{tone(440,.6,'sine',.1,880);tone(660,.8,'triangle',.06,1320,.1)},
 hit:()=>{noise(.1,.3,2000);tone(160,.1,'square',.07,80)},roar:()=>{noise(.5,.3,300);tone(90,.5,'sawtooth',.08,50)},horn:()=>{tone(147,.6,'sawtooth',.06);tone(220,.6,'sawtooth',.04)},gacha:r=>[440,554,659,880,1109].slice(0,2+r).forEach((f,i)=>tone(f,.25,'triangle',.1,null,i*.1)),tap:()=>tone(700,.05,'sine',.08)};
const vib=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const parts=[];const pgeo=new THREE.BoxGeometry(.07,.07,.07);
function burst(pos,c,n=10,sp=2.5,e){for(let k=0;k<n;k++){const m=new THREE.Mesh(pgeo,mat(c,e));m.position.copy(pos);scene.add(m);parts.push({m,v:new THREE.Vector3((Math.random()-.5)*sp,Math.random()*sp+1.5,(Math.random()-.5)*sp),life:.8+Math.random()*.4})}}
// ---------- UI YARDIMCI ----------
const fmt=n=>{n=Math.floor(n);return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'B':String(n)};
const fmtT=s=>{s=Math.max(0,Math.ceil(s));const m=Math.floor(s/60),h=Math.floor(m/60);return h?`${h}sa ${m%60}dk`:m?`${m}:${String(s%60).padStart(2,'0')}`:s+'sn'};
const costStr=c=>Object.entries(c).filter(([r,v])=>v).map(([r,v])=>`<span style="color:${(r==='gems'?S.gems:S.res[r])>=v?'#fff':'#ff8a8a'}">${RIC[r]}${fmt(v)}</span>`).join(' ');
function floatTxt(x,y,t,c='#fff'){const d=document.createElement('div');d.className='float';d.textContent=t;d.style.left=x+'px';d.style.top=y+'px';d.style.color=c;$('fx').appendChild(d);setTimeout(()=>d.remove(),1000)}
function fly(res,x,y,n=4){const el=$('r_'+res);if(!el)return;const r=el.getBoundingClientRect();for(let k=0;k<n;k++){const d=document.createElement('div');d.className='fly';d.textContent=RIC[res];d.style.left=x+(Math.random()-.5)*40+'px';d.style.top=y+(Math.random()-.5)*40+'px';$('fx').appendChild(d);
 setTimeout(()=>{d.style.left=r.left+'px';d.style.top=r.top+8+'px';d.style.transform='translate(-50%,-50%) scale(.6)'},30+k*45);setTimeout(()=>d.remove(),720+k*45)}}
let toastT;function toast(t){const d=$('toast');d.textContent=t;d.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>d.style.opacity=0,2200)}
function modal(html,acts){$('mbox').innerHTML=html+'<div class="acts"></div>';const a=$('mbox').querySelector('.acts');for(const[t,cls,fn]of acts){const b=document.createElement('button');b.className='btn '+(cls||'');b.innerHTML=t;b.onclick=()=>{closeModal();fn&&fn()};a.appendChild(b)}$('modal').classList.add('on')}
const closeModal=()=>$('modal').classList.remove('on');
const DEMO='<div class="demo">🧪 DEMO: Gerçek ödeme alınmaz, kartından para çekilmez. Sadece satın almanın nasıl çalışacağını gösterir.</div>';
function confirmBuy(t,d,p,fn){modal(`<h2>${t}</h2><p>${d}</p>${DEMO}`,[['Vazgeç','x'],[`Satın al · ${p}`,'g',fn]])}
function spendGems(n,what,fn){if(S.gems<n){modal(`<h2>Elmas yetmiyor</h2><p>${what} için ${n}💎 gerekli, sende ${S.gems}💎 var.</p>`,[['Kapat','x'],['Mağaza','g',openShop]]);return}
 modal(`<h2>${what}</h2><p><b>${n} 💎</b> harcansın mı?</p>`,[['Vazgeç','x'],[`${n} 💎 harca`,'g',()=>{S.gems-=n;fn();ui();save()}]])}
function watchAd(fn){if(S.buy.noads){fn();return}$('ad').classList.add('on');let n=3;const f=()=>$('adt').textContent='Reklam oynatılıyor… '+n;f();const iv=setInterval(()=>{n--;f();if(n<=0){clearInterval(iv);$('ad').classList.remove('on');fn();SFX.coin()}},1000)}
function popAnim(g,a=.5){if(!g)return;tween(550,t=>{const e=E.el(t);const s=1+(1-e)*a*(t<.15?-1:1);g.scale.set(1/Math.sqrt(Math.abs(s)),s,1/Math.sqrt(Math.abs(s)))},()=>g.scale.set(1,1,1))}
const closeSheet=()=>{$('sheet').classList.remove('on');sheetFn=null};let sheetFn=null;
function sheet(fn){sheetFn=fn;renderSheet();$('sheet').classList.add('on')}
function renderSheet(){if(!sheetFn)return;const st=$('sheet').scrollTop;$('sheet').innerHTML=sheetFn();$('sheet').scrollTop=st;$('sheet').querySelectorAll('[data-a]').forEach(b=>b.onclick=ev=>{ac();SFX.tap();ACT[b.dataset.a](b.dataset.v,ev)});const c=$('sheet').querySelector('.close');if(c)c.onclick=closeSheet}
const hdr=t=>`<h3><span>${t}</span><button class="btn x close">✕</button></h3>`;
function resErr(e){if(e==='RES'){SFX.err();toast('Yetersiz kaynak');return true}if(e==='BUILDERS'){SFX.err();modal(`<h2>İnşaatçılar meşgul</h2><p>${L.builderCount(S)} inşaatçının hepsi çalışıyor. Bitmesini bekle, hızlandır ya da ek inşaatçı al.</p>`,[['Tamam','x'],['Mağaza','g',openShop]]);return true}if(e){SFX.err();toast(e);return true}return false}
const kPos=k=>k==='fener'?new THREE.Vector3(0,1,0):tpos(k).setY(.4);
// ---------- AKSİYONLAR ----------
const ACT={
 up:k=>{const e=L.startUp(S,k,now());if(resErr(e))return;SFX.build();vib(20);burst(kPos(k),0xc8a070,10,1.5);k==='fener'?syncFener():syncOne(k);closeSheet();ui();save()},
 speed:k=>{const b=k==='fener'?S.fener:S.g[k];const rem=(b.end-now())/1000;spendGems(L.speedGems(rem),`Hızlandır (${fmtT(rem)} kaldı)`,()=>{b.end=now()})},
 w:v=>{const[i,j,d]=v.split(':');const k=i+','+j;if(!L.assign(S,k,+d)){SFX.err();if(+d>0)toast(L.idle(S)<=0?'Boşta kurtulan yok — barınak kur/birleştir':'Bu bina dolu, birleştir ya da yükselt')}else SFX.tap();renderSheet();ui();tutCheck()},
 light:()=>{const e=L.setLight(S,!S.fener.on);if(resErr(e))return;if(S.fener.on){SFX.light();vib(30);cam.shake=.1;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,24,3,1)}renderSheet();ui();save();tutCheck()},
 build:v=>{const[k,kind]=v.split('|');const e=L.build(S,k,kind);if(resErr(e))return;SFX.build();vib(15);const g=syncOne(k);popAnim(g,.5);burst(tpos(k).setY(.3),0xc8a070,12,1.8);closeSheet();ui();save();tutCheck()},
 cleanse:k=>{const e=L.cleanse(S,k);if(resErr(e))return;SFX.light();burst(tpos(k).setY(.6),0xb98cff,20,2.5,1);syncOne(k);closeSheet();ui();save()},
 train:v=>{const[t,n]=v.split(':');const e=L.startTrain(S,t,+n,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 trainSpeed:()=>{const rem=(S.train.end-now())/1000;spendGems(L.speedGems(rem),'Eğitimi hızlandır',()=>{S.train.end=now()})},
 tech:id=>{const e=L.startResearch(S,id,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 techSpeed:()=>{const rem=(S.research.end-now())/1000;spendGems(L.speedGems(rem),'Araştırmayı hızlandır',()=>{S.research.end=now()})},
 call:v=>recruitN(+v),fight:()=>battle(S.stage),
 daily:id=>{const d=L.DAILY.find(x=>x.id===id);S.gems+=d.g;S.daily.c[id]=1;SFX.coin();fly('gems',innerWidth/2,innerHeight/2);renderSheet();ui();save()},
 quest:()=>claimQuest(),tab:v=>{taskTab=v;renderSheet()},
 buy:id=>{const it=SHOP.find(x=>x.id===id);confirmBuy(it.ic+' '+it.n,it.d,it.p,()=>{it.f();S.vipPts+=it.vip||0;if(it.once)S.buy[id]=1;SFX.done();vib([20,30,20]);toast('Demo satın alma tamamlandı ✓');renderSheet();ui();save()})},
 gemItem:i=>{const g=GEMSHOP[+i];spendGems(g.c,g.n,()=>{g.f();SFX.coin();renderSheet()})},
 ad:()=>watchAd(()=>{S.gems+=10;const d=L.day(now()),a=S.buy.adDay||'';S.buy.adDay=d+':'+(a.startsWith(d)?+a.split(':')[1]+1:1);ui();renderSheet();save()}),
 monthly:()=>{S.gems+=100;S.monthlyClaim=L.day(now());SFX.coin();renderSheet();ui();save()},
 open:k=>{const ks=Object.keys(S.g).filter(x=>S.g[x].k===k);if(ks.length)openB(ks[0]);else toast(KINDS[k].n+' yok — boş bir karoya dokunup kur')},
};
// ---------- PANELLER ----------
const timerCard=(k,b)=>{const rem=(b.end-now())/1000;return `<div class="card"><div class="ic">🏗️</div><div class="mid"><div class="nm">Yükseltiliyor · ${fmtT(rem)}</div><div class="pbar"><i style="width:${(1-rem/b.dur)*100}%"></i></div></div><button class="btn g" data-a="speed" data-v="${k}" id="speedBtn">⚡ ${L.speedGems(rem)}💎</button></div>`};
function openFener(){sheet(()=>{const f=S.fener,R=L.safeR(S);let h=hdr(`🗼 Büyük Fener · Sv${f.lv}`)+`<div class="sub" style="margin:-4px 0 10px">Işık hüzmesi sisi geri iter. Fener seviyesi = güvenli alan ve diğer binaların en yüksek seviyesi.</div>`;
 h+=`<div class="card"><div class="ic">${L.lit(S)?'💡':'🌑'}</div><div class="mid"><div class="nm">${L.lit(S)?'Işık yanıyor':'Işık sönük'}</div><div class="sub">Tüketim ${L.crysUse(S).toFixed(1)||(.8+f.lv*.5).toFixed(1)} 🔮/dk · Sis Gecesi ihtiyacı ${L.nightNeed(S)} 🔮${L.lit(S)?'':' · Karanlıkta üretim −50%'}</div></div><button class="btn ${f.on?'x':'o'}" data-a="light" id="lightBtn">${f.on?'Söndür':'💡 Yak'}</button></div>`;
 h+=`<div class="card"><div class="ic">🧭</div><div class="mid"><div class="nm">Güvenli alan ${R*2+1}×${R*2+1}</div><div class="sub">Bina seviye sınırı: Sv${L.maxLv(S)}${R<GR?' · Sonraki seviyede alan genişler':''}</div></div></div>`;
 if(f.end)h+=timerCard('fener',f);else if(f.lv<L.FENER_MAX){const e=L.checkUp(S,'fener');h+=`<div class="sec">Sv${f.lv+1}'e yükselt</div><div class="card"><div class="mid"><div>${costStr(L.fenerCost(f.lv))}</div><div class="sub">⏱ ${fmtT(L.fenerTime(f.lv))} · Alan ${Math.min(GR,f.lv+2)*2+1}×${Math.min(GR,f.lv+2)*2+1} · Sınır Sv${f.lv+2}</div></div><button class="btn o" data-a="up" data-v="fener" id="upBtn">Yükselt</button></div>`}
 return h})}
function openB(k){sheet(()=>{const b=S.g[k];if(!b)return hdr('—');const T=KINDS[b.k];let h=hdr(`${T.ic} ${T.n} · Sv${b.lv}`)+`<div class="sub" style="margin:-4px 0 10px">${T.d}</div>`;
 if(b.fog){return h+`<div class="card" style="background:#4a2a6a88"><div class="ic">👻</div><div class="mid"><div class="nm">Sis bu binayı ele geçirdi</div><div class="sub">Üretmez, işçi alamaz. Işık kristaliyle arındır.</div></div><button class="btn g" data-a="cleanse" data-v="${k}" id="cleanseBtn">${costStr(L.cleanseCost(b))}</button></div>`}
 if(L.hasJob(b.k)){const w=b.w||0;const[i,j]=L.unkey(k);h+=`<div class="card"><div class="ic">👷</div><div class="mid"><div class="nm">${L.JOB[b.k]} ${w}/${L.maxW(b.lv)}</div><div class="sub">${T.res?`Üretim: ${L.rate(S,k).toFixed(1)} ${RIC[T.res]}/dk`:'Eğitim hızı +'+(w*25)+'%'} · Boşta: ${L.idle(S)}</div></div><button class="btn sm r" data-a="w" data-v="${i}:${j}:-1">−</button><button class="btn sm" data-a="w" data-v="${i}:${j}:1" id="wplus">+</button></div>`}
 if(b.k==='hut')h+=`<div class="sub">+${b.lv*2} kişilik yer · Toplam ${S.surv}/${L.cap(S)}</div>`;
 if(b.k==='yard')h+=yardHtml();if(b.k==='lab')h+=labHtml();
 h+=`<div class="card" style="background:#1f6f8b44"><div class="ic">🔀</div><div class="mid"><div class="nm">Birleştir (ücretsiz, anında)</div><div class="sub">Aynı seviyedeki iki ${T.n} binasını sürükleyip üst üste bırak → Sv${b.lv+1}</div></div></div>`;
 if(b.end)h+=timerCard(k,b);else{const e=L.checkUp(S,k);const lock=e&&e!=='RES'&&e!=='BUILDERS';h+=`<div class="sec">ya da Sv${b.lv+1}'e yükselt (süreli)</div><div class="card"><div class="mid"><div>${costStr(L.upCost(b.k,b.lv))}</div><div class="sub">⏱ ${fmtT(L.upTime(b.lv))}${lock?' · <span style="color:#ff8a8a">'+e+'</span>':''}</div></div><button class="btn o" data-a="up" data-v="${k}" id="upBtn" ${lock?'disabled':''}>Yükselt</button></div>`}
 return h})}
function openBuild(k){sheet(()=>{let h=hdr('🔨 Boş karo — ne kuralım?')+'<div class="sub" style="margin:-4px 0 10px">Yeni binalar Sv1 başlar. Aynılarını birleştirerek büyüt!</div>';
 for(const kind in KINDS){const T=KINDS[kind],e=L.checkBuild(S,k,kind),lock=e&&e!=='RES';h+=`<div class="card" style="${lock?'opacity:.5':''}"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} <span class="sub">(${L.count(S,kind)})</span></div><div class="sub">${lock?'🔒 '+e:T.d}</div></div><button class="btn" data-a="build" data-v="${k}|${kind}" id="bk_${kind}" ${lock?'disabled':''}>${costStr(T.cost)}</button></div>`}return h})}
function yardHtml(){let h='<div class="sec">Filo tayfası eğit</div>';if(S.train){const rem=(S.train.end-now())/1000;h+=`<div class="card"><div class="ic">${TROOPS[S.train.t].ic}</div><div class="mid"><div class="nm">${S.train.n} ${TROOPS[S.train.t].n} · ${fmtT(rem)}</div><div class="pbar"><i style="width:${(1-rem/S.train.dur)*100}%"></i></div></div><button class="btn g" data-a="trainSpeed">⚡ ${L.speedGems(rem)}💎</button></div>`}
 for(const t in TROOPS){const T=TROOPS[t];h+=`<div class="card"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} <span class="sub">(${S.troops[t]})</span></div><div class="sub">⚔️${T.atk} ❤️${T.hp} · 10 adet: ${costStr(L.trainCost(t,10))} · ⏱${fmtT(L.trainTime(S,t,10))}</div></div><button class="btn" data-a="train" data-v="${t}:10" ${S.train?'disabled':''}>+10</button></div>`}return h}
function labHtml(){let h='';if(S.research){const rem=(S.research.end-now())/1000,T=TECH.find(x=>x.id===S.research.id);h+=`<div class="card"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} · ${fmtT(rem)}</div><div class="pbar"><i style="width:${(1-rem/S.research.dur)*100}%"></i></div></div><button class="btn g" data-a="techSpeed">⚡ ${L.speedGems(rem)}💎</button></div>`}
 let br='';for(const T of TECH){if(T.br!==br){br=T.br;h+=`<div class="sec">${br}</div>`}const lv=S.tech[T.id]||0;h+=`<div class="card"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} ${lv}/${T.max}</div><div class="sub">${T.d} · ${costStr(L.techCost(T.id,lv))} · ⏱${fmtT(L.techTime(lv))}</div></div><button class="btn" data-a="tech" data-v="${T.id}" ${S.research||lv>=T.max?'disabled':''}>Araştır</button></div>`}return h}
function openWork(){sheet(()=>{let h=hdr('👷 İşçi Ataması')+`<div class="card"><div class="ic">👥</div><div class="mid"><div class="nm">Kurtulanlar ${S.surv}/${L.cap(S)} · Boşta ${L.idle(S)}</div><div class="sub">Sallar ve batıklarla yeni kurtulanlar gelir (barınakta yer varsa). Tüketim ${L.fishUse(S).toFixed(1)} 🐟/dk</div></div></div>`;
 const ks=Object.keys(S.g).filter(k=>L.hasJob(S.g[k].k)).sort((a,b)=>S.g[a].k.localeCompare(S.g[b].k));
 for(const k of ks){const b=S.g[k],T=KINDS[b.k];const[i,j]=L.unkey(k);h+=`<div class="card" ${b.fog?'style="opacity:.5"':''}><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} Sv${b.lv} · ${L.JOB[b.k]} ${b.w||0}/${L.maxW(b.lv)}</div><div class="sub">${b.fog?'👻 Sisli':T.res?L.rate(S,k).toFixed(1)+' '+RIC[T.res]+'/dk':'Eğitim +'+((b.w||0)*25)+'%'}</div></div><button class="btn sm r" data-a="w" data-v="${i}:${j}:-1">−</button><button class="btn sm" data-a="w" data-v="${i}:${j}:1">+</button></div>`}
 return h})}
const port=(h,st,big)=>`<div class="port r${h.r}" style="${big?'width:80px;height:80px;font-size:46px':''}">${h.ic}<small>${'★'.repeat(st?st.star:0)}</small></div>`;
function openHeroes(){sheet(()=>{const free=S.freeCall!==L.day(now());let h=hdr('🧑‍✈️ Kaptanlar')+`<div class="sub" style="margin-bottom:8px">En güçlü 3 kaptan filonu yönetir. Aynı kaptanı tekrar çağırmak yıldız parçası verir.</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px 6px;margin-bottom:12px">`;
 for(const H of HEROES){const st=S.heroes[H.id];h+=`<div style="text-align:center;${st?'':'opacity:.35;filter:grayscale(.8)'}"><div style="display:flex;justify-content:center">${port(H,st)}</div><div class="nm" style="font-size:12px;margin-top:9px">${H.n}</div><div class="sub" style="font-size:10px">${RARITY[H.r].n} · ${H.role}${st?' · ⚔️'+L.heroPower(H,st):''}</div></div>`}
 h+=`</div><div class="sec">Kaptan Çağır</div><div class="card" style="flex-wrap:wrap"><div class="mid" style="min-width:100%"><div class="sub">Gerçek oranlar: 🟨 Efsanevi %5 · 🟪 Epik %25 · 🟦 Nadir %70 (her çağrı bağımsız, garanti yok)</div></div>
 <button class="btn o" data-a="call" data-v="0" ${free?'':'disabled'} id="freeCall">${free?'Ücretsiz (günlük)':'Yarın ücretsiz'}</button><button class="btn g" data-a="call" data-v="1">1× · 30💎</button><button class="btn g" data-a="call" data-v="10">10× · 270💎</button></div>`;return h})}
function recruitN(n){const go=k=>{const out=[];for(let i=0;i<k;i++)out.push(L.recruit(S,Math.random));L.dailyInc(S,'recruit',k,now());showGacha(out);ui();save();renderSheet()};
 if(n===0){S.freeCall=L.day(now());go(1)}else spendGems(n===1?30:270,`${n}× Kaptan Çağır`,()=>go(n))}
function showGacha(out){const best=Math.max(...out.map(o=>o.h.r));SFX.gacha(best);vib(best===3?[50,40,80]:30);if(best===3)cam.shake=.2;
 modal(`<h2>${best===3?'✨ EFSANEVİ KAPTAN! ✨':'Çağrı sonucu'}</h2><div style="display:flex;flex-wrap:wrap;gap:12px 8px;justify-content:center;margin:12px 0 18px">${out.map((o,i)=>`<div class="flip" style="animation-delay:${i*.08}s;animation-fill-mode:backwards;text-align:center;width:${out.length>1?58:120}px">${port(o.h,S.heroes[o.h.id],out.length===1)}<div style="font-size:11px;font-weight:800;margin-top:8px">${o.h.n}</div><div style="font-size:10px;color:${o.isNew?'#7dff8a':'#a9d8e8'}">${o.isNew?'YENİ!':'+10 parça'}</div></div>`).join('')}</div>`,[['Tamam','']])}
function seaMap(){const st=S.stage;let h='<div class="sea">';const n0=Math.max(1,st-3);for(let n=n0;n<n0+7;n++){const i=n-n0;const x=12+i*13.5,y=50+Math.sin(n*1.7)*28;const c=n<st?'won':n===st?'cur':'fog';
 h+=`<div class="node ${c}" style="left:${x}%;top:${y}%">${n<st?'🏝️':n===st?FOES[L.stageFoe(n)].ic:'<i class="fd"></i>'}<small>${n}</small></div>`}return h+'<div class="ship" style="left:'+(12+(st-n0)*13.5-6)+'%;top:'+(50+Math.sin(st*1.7)*28+12)+'%">⛵</div></div>'}
function openMap(){sheet(()=>{const st=S.stage,B=FOES[L.stageFoe(st)],my=L.armyPower(S),need=L.stagePower(st);const tr=Object.values(S.troops).reduce((a,b)=>a+b,0);
 let h=hdr('🗺️ Sisli Deniz')+seaMap()+`<div class="card" style="flex-direction:column;align-items:stretch;background:linear-gradient(135deg,#1f6f8b,#14304a)"><div style="display:flex;align-items:center;gap:10px"><div style="font-size:50px">${B.ic}</div><div class="mid"><div class="nm">Ada ${st}: ${L.islandName(st)}</div><div class="sub">${B.n} · Güç ⚔️ ${fmt(need)} · Filon <b style="color:${my>=need?'#7dff8a':'#ff8a8a'}">⚔️ ${fmt(my)}</b></div><div class="sub">Ganimet: ${costStr(L.stageReward(st))} · 👤+${L.stageRescue(st)} kurtulan</div></div></div>
 <button class="btn o" data-a="fight" style="margin-top:8px;font-size:16px" id="fightBtn" ${tr+Object.keys(S.heroes).length?'':'disabled'}>⛵ Filoyu gönder</button></div>
 <div class="card"><div class="mid">${Object.entries(TROOPS).map(([t,T])=>`${T.ic} ${T.n}: <b>${S.troops[t]}</b>`).join(' · ')}<div class="sub">Kaptanlar: ${L.team(S).map(x=>x.ic+' '+x.n).join(', ')||'—'} · Kurtarılan ada: ${st-1} (üretim +${Math.round(L.islandBonus(S)*100)}%)</div></div><button class="btn" data-a="open" data-v="yard">Tersane</button></div>
 <div class="sub">İpucu: Adanın açıklarındaki ⚔️ işaretli sis yaratıklarına dokunarak da saldırabilirsin.</div>`;return h})}
let taskTab='d';
function openTasks(){sheet(()=>{L.dailyReset(S,now());let h=hdr('📋 Görevler')+`<div class="tabs"><button class="btn ${taskTab==='d'?'o':'x'}" data-a="tab" data-v="d">Günlük</button><button class="btn ${taskTab==='c'?'o':'x'}" data-a="tab" data-v="c">Bölüm</button></div>`;
 if(taskTab==='d'){for(const d of L.DAILY){const p=Math.min(S.daily.p[d.id]||0,d.n),c=S.daily.c[d.id];h+=`<div class="card"><div class="ic">${c?'✅':'📅'}</div><div class="mid"><div class="nm">${d.t}</div><div class="pbar"><i style="width:${p/d.n*100}%"></i></div><div class="sub">${p}/${d.n} · ${d.g}💎</div></div>${c?'':`<button class="btn o" data-a="daily" data-v="${d.id}" ${p>=d.n?'':'disabled'}>Al</button>`}</div>`}h+='<div class="sub">Günlük görevler her gün 03:00\'te (TSİ) yenilenir.</div>'}
 else{for(let i=Math.max(0,S.q-2);i<Math.min(L.QUESTS.length,S.q+5);i++){const q=L.QUESTS[i],v=Math.min(q.f(S),q.n);h+=`<div class="card"><div class="ic">${i<S.q?'✅':i===S.q?'⭐':'🔒'}</div><div class="mid"><div class="nm">${q.t}</div><div class="sub">${i<S.q?'Tamamlandı':v+'/'+q.n} · ${costStr(q.r)}</div></div>${i===S.q&&v>=q.n?'<button class="btn o" data-a="quest">Al</button>':''}</div>`}}
 return h})}
const SHOP=[
 {id:'starter',ic:'🎁',n:'Başlangıç Paketi',d:'300💎 + 500🪵 + 200🔮 + 1 kalıcı inşaatçı (tek sefer)',p:'₺49,99',once:1,vip:100,f:()=>{S.gems+=300;S.res.wood+=500;S.res.crys+=200;S.builders++},best:1},
 {id:'monthly',ic:'🗓️',n:'Aylık Kart',d:'Hemen 300💎, sonra 30 gün boyunca her gün 100💎 (girip almalısın)',p:'₺89,99',vip:150,f:()=>{S.gems+=300;S.monthly=Math.max(now(),S.monthly)+30*864e5}},
 {id:'g1',ic:'💎',n:'Bir Avuç Elmas',d:'100 💎',p:'₺29,99',vip:30,f:()=>S.gems+=100},
 {id:'g2',ic:'💰',n:'Elmas Kesesi',d:'600 💎',p:'₺149,99',vip:150,f:()=>S.gems+=600},
 {id:'g3',ic:'🏆',n:'Elmas Sandığı',d:'1300 💎',p:'₺299,99',vip:300,f:()=>S.gems+=1300},
 {id:'noads',ic:'🚫',n:'Reklamsız',d:'Ödüllü reklamları izlemeden ödülünü al',p:'₺79,99',once:1,vip:80,f:()=>S.buy.noads=1},
];
const GEMSHOP=[{ic:'👷',n:'Ek inşaatçı (kalıcı)',d:'Aynı anda bir yükseltme daha',c:250,f:()=>S.builders++},{ic:'🔮',n:'Kristal sandığı',d:'+150 🔮',c:30,f:()=>S.res.crys+=150},{ic:'🐟',n:'Balık sandığı',d:'+300 🐟',c:30,f:()=>S.res.fish+=300},{ic:'⭐',n:'VIP puanı',d:'+50 VIP puanı',c:50,f:()=>S.vipPts+=50}];
const VIPN=[0,100,300,700,1500,3000,6000];
function openShop(){sheet(()=>{const v=L.vipLv(S),nx=VIPN[v+1];const ad=S.buy.adDay||'';const adN=ad.startsWith(L.day(now()))?+ad.split(':')[1]:0;const mOn=S.monthly>now();
 let h=hdr('🛒 Mağaza')+DEMO+`<div class="card" style="background:linear-gradient(135deg,#6a4a1a,#2a1d10)"><div class="ic">👑</div><div class="mid"><div class="nm">VIP ${v}</div><div class="sub">Üretim +${v*5}%${v>=3?' · +1 inşaatçı':' · VIP 3: +1 inşaatçı'}</div>${nx?`<div class="pbar"><i style="width:${S.vipPts/nx*100}%"></i></div><div class="sub">${S.vipPts}/${nx} VIP puanı (satın alımlar puan verir)</div>`:''}</div></div>
 <div class="card"><div class="ic">📺</div><div class="mid"><div class="nm">Ödüllü reklam</div><div class="sub">+10 💎 · Bugün ${adN}/5</div></div><button class="btn o" data-a="ad" ${adN>=5?'disabled':''}>İzle</button></div>`;
 if(mOn)h+=`<div class="card"><div class="ic">🗓️</div><div class="mid"><div class="nm">Aylık Kart aktif</div><div class="sub">${Math.ceil((S.monthly-now())/864e5)} gün kaldı</div></div><button class="btn o" data-a="monthly" ${S.monthlyClaim===L.day(now())?'disabled':''}>100💎 Al</button></div>`;
 h+='<div class="sec">Paketler</div>'+SHOP.map(s=>{const own=s.once&&S.buy[s.id];return `<div class="card"><div class="ic">${s.ic}</div><div class="mid"><div class="nm">${s.n}${s.best?'<span class="tag">EN İYİ DEĞER</span>':''}</div><div class="sub">${s.d} · +${s.vip} VIP</div></div><button class="btn" data-a="buy" data-v="${s.id}" ${own?'disabled':''}>${own?'Alındı':s.p}</button></div>`}).join('');
 h+='<div class="sec">Elmasla</div>'+GEMSHOP.map((g,i)=>`<div class="card"><div class="ic">${g.ic}</div><div class="mid"><div class="nm">${g.n}</div><div class="sub">${g.d}</div></div><button class="btn g" data-a="gemItem" data-v="${i}">${g.c}💎</button></div>`).join('');return h})}
function soon(t){SFX.tap();modal(`<div style="font-size:50px">${t==='Klan'?'🛡️':'💬'}</div><h2>${t} — Yakında</h2><p>${t==='Klan'?'Klan kurma, ortak filo seferleri ve oyuncular arası deniz savaşları çevrimiçi sürümle gelecek.':'Dünya ve klan sohbeti çevrimiçi sürümle gelecek.'}</p>`,[['Tamam','']])}
// ---------- SAVAŞ ----------
function battle(stage,camp){closeSheet();const res=L.simulate(S,stage,Math.random);const B=FOES[L.stageFoe(stage)];const tm=L.team(S);const bt=$('battle');
 const icons=Object.entries(S.troops).flatMap(([t,n])=>Array(Math.min(4,Math.ceil(n/10))).fill(TROOPS[t].ic));
 bt.innerHTML=`<div class="top">⛵ Ada ${stage}: ${L.islandName(stage)}</div><div class="side"><div class="units"><span class="u big" id="beast">${B.ic}</span></div><div class="hp e"><i id="ehp" style="width:100%"></i></div><div class="hl">${B.n} · ⚔️ ${fmt(L.stagePower(stage))}</div></div>
 <div class="side"><div class="units" id="army"><span class="u">⛵</span>${icons.map(i=>`<span class="u">${i}</span>`).join('')}<span class="u">⛵</span></div><div style="display:flex;gap:8px">${tm.map(h=>port(h,S.heroes[h.id])).join('')}</div><div class="hp"><i id="mhp" style="width:100%"></i></div><div class="hl">Filon · ⚔️ ${fmt(L.armyPower(S))}</div></div><div class="waves"></div>`;
 bt.classList.add('on');SFX.horn();setTimeout(SFX.roar,500);let i=0;
 const iv=setInterval(()=>{const r=res.rounds[i];if(!r){clearInterval(iv);setTimeout(()=>finish(),500);return}
  const army=$('army'),beast=$('beast');army.animate([{transform:'translateY(0)'},{transform:'translateY(-50px)'},{transform:'translateY(0)'}],{duration:280});
  setTimeout(()=>{beast.animate([{transform:'translateX(0)'},{transform:'translateX(-12px)'},{transform:'translateX(12px)'},{transform:'none'}],{duration:200});SFX.hit();vib(15);const b=beast.getBoundingClientRect();floatTxt(b.left+b.width/2,b.top+b.height/2,'-'+fmt(r.d1),'#ffd84a');$('ehp').style.width=(r.eHp/res.eMax*100)+'%'},150);
  if(r.d2)setTimeout(()=>{beast.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(60px) scale(1.2)'},{transform:'none'}],{duration:260});const a=army.getBoundingClientRect();floatTxt(a.left+a.width/2,a.top+a.height/2,'-'+fmt(r.d2),'#ff6b6b');$('mhp').style.width=(r.hp/res.myMax*100)+'%';bt.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'none'}],{duration:150})},450);
  i++},700);
 function finish(){const out=L.applyBattle(S,res,stage,now());ui();save();syncPeople();const lost=Object.entries(out.lost).filter(([t,n])=>n).map(([t,n])=>`${TROOPS[t].ic}${n}`).join(' ');
  if(res.win){SFX.done();vib([30,40,60]);if(camp)camp.g.visible=false,setTimeout(()=>camp.g.visible=true,90000);for(let k=0;k<Math.min(out.saved,3);k++)setTimeout(()=>sendRaft(true),k*700)}else SFX.err();
  modal(res.win?`<div style="font-size:54px">🏝️</div><h2>Ada sisten kurtuldu!</h2><p>Ganimet:<br><b>${costStr(out.rw)}</b>${out.saved?`<br>👤 ${out.saved} kurtulan filona katıldı`:''}${lost?'<br><span class="sub">Yaralı: '+lost+'</span>':''}</p>`:`<div style="font-size:54px">🌫️</div><h2>Sis galip geldi</h2><p>Yaratıklar çok güçlüydü. Daha fazla tayfa eğit, kaptan çağır ya da Donanma araştırmalarını yap.${lost?'<br><span class="sub">Kayıp: '+lost+'</span>':''}</p>`,[['Devam',res.win?'o':'x',()=>{bt.classList.remove('on');tutCheck()}]])}}
// ---------- HUD ----------
function ui(){for(const r of L.RES)$('r_'+r).textContent=fmt(S.res[r]);$('r_gems').textContent=fmt(S.gems);$('flv').textContent=S.fener.lv;$('pow').textContent=fmt(L.armyPower(S));
 const t=now(),nt=L.night(S,t),ni=L.nightIn(S,t);$('nval').textContent=nt?'🌫️ Sis Gecesi!':L.lit(S)?'💡 Fener yanıyor':'🌑 Fener sönük';
 $('nsub').textContent=S.tut<9?'Eğitim':nt?`Bitişe ${fmtT(-ni)}`:`Sis Gecesine ${fmtT(ni)} · ${L.nightNeed(S)}🔮`;$('night').className=nt?'storm':L.lit(S)?'':'dark';
 $('surv').textContent=`${S.surv}/${L.cap(S)}`+(L.idle(S)>0?` (${L.idle(S)} boşta)`:'');$('bld').textContent=`${L.busyBuilders(S)}/${L.builderCount(S)}`;$('isl').textContent=S.stage-1;
 const w=[];if(!L.lit(S))w.push('🌑 Fener sönük — üretim yarıya düştü');else if(S.res.crys<L.nightNeed(S))w.push(`🔮 Sis Gecesi için ${L.nightNeed(S)} kristal gerek`);if(S.res.fish<=0)w.push('🐟 Balık bitti!');const fg=Object.values(S.g).filter(b=>b.fog).length;if(fg)w.push(`👻 ${fg} bina sisli — arındır`);
 $('warn').style.display=w.length&&S.tut>=9?'block':'none';$('warn').textContent=w.join(' · ');
 const q=L.QUESTS[S.q];if(q){const v=Math.min(q.f(S),q.n),done=v>=q.n;const h=`<div>⭐ ${q.t}</div><div class="bar"><i style="width:${v/q.n*100}%"></i></div><div style="display:flex;justify-content:space-between;margin-top:3px;font-size:11px;color:#a9d8e8"><span>${v}/${q.n}</span><span>${costStr(q.r)}</span></div>${done?'<button class="btn o" id="qclaim" style="margin-top:5px;padding:6px 12px">Ödülü al</button>':''}`;
  if($('quest').dataset.h!==h){$('quest').innerHTML=h;$('quest').dataset.h=h;if(done)$('qclaim').onclick=claimQuest}}else $('quest').innerHTML='🏆 Tüm bölüm görevleri tamam!';
 L.dailyReset(S,t);$('tdot').style.display=L.DAILY.some(d=>!S.daily.c[d.id]&&(S.daily.p[d.id]||0)>=d.n)||(q&&q.f(S)>=q.n)?'block':'none';$('hdot').style.display=S.freeCall!==L.day(t)?'block':'none'}
function claimQuest(){const q=L.QUESTS[S.q];if(!q||q.f(S)<q.n)return;L.addRes(S,q.r);for(const r in q.r)fly(r,innerWidth/2,200,3);SFX.coin();S.q++;ui();renderSheet();save()}
// ---------- EĞİTİM ----------
const hand=$('hand'),tip=$('tip');const TUT_TILE='-2,1';
function tutCheck(){if(S.tut>=9)return;
 if(S.tut===0&&S.fener.on){S.tut=1;closeSheet()}
 if(S.tut===1&&(S.g['1,0']?.w||0)>=2){S.tut=2;closeSheet();S.g['1,0'].stored=Math.max(S.g['1,0'].stored,25)}
 if(S.tut===2&&S.st.collect>=1)S.tut=3;
 if(S.tut===3&&L.count(S,'hut')>=2){S.tut=4;closeSheet()}
 if(S.tut===4&&S.st.merge>=1){S.tut=9;S.t0=now();S.nightN=0;save();setTimeout(()=>modal('<div style="font-size:50px">🗼</div><h2>Fener yanıyor!</h2><p>Kristalle Feneri besle, aynı binaları birleştirerek büyüt, Feneri yükselterek sisi geri it. Sis Gecesi gelince yeterli kristalin olsun. Tersane kurup kaptanlarınla sisli adaları kurtar!</p>',[['Başla!','o']]),400)}}
function tutFrame(T){if(S.tut>=9||$('modal').classList.contains('on')||$('battle').classList.contains('on')){hand.style.display=tip.style.display='none';return}
 const so=$('sheet').classList.contains('on');let txt='',pos=null,el=null;
 if(S.tut===0){txt='🗼 Fenere dokun ve ışığı yak — sis yaklaşıyor!';el=so&&$('lightBtn');if(!so)pos=scr(new THREE.Vector3(0,1.4,0))}
 else if(S.tut===1){txt=`🔮 Kristal madenine 2 madenci ata (${S.g['1,0']?.w||0}/2)`;el=so&&$('wplus');if(!so)pos=tileScr('1,0',.5)}
 else if(S.tut===2){txt='💠 Baloncuğa dokun, kristali topla';if(!so)pos=tileScr('1,0',1.3)}
 else if(S.tut===3){txt='🛖 Boş bir karoya dokun ve Barınak kur';el=so&&$('bk_hut');if(!so)pos=tileScr(TUT_TILE,.1)}
 else if(S.tut===4){txt='🔀 Bir barınağı sürükle, diğerinin üstüne bırak: BİRLEŞTİR!';if(!so){const hs=Object.keys(S.g).filter(k=>S.g[k].k==='hut'&&S.g[k].lv===1);if(hs.length>=2){const a=tileScr(hs[0],.3),b=tileScr(hs[1],.3);const f=(T%1.6)/1.6;pos={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}}}
 if(el){const r=el.getBoundingClientRect();pos={x:r.left+r.width/2,y:r.top+r.height/2}}
 tip.style.display='block';tip.textContent=txt;tip.style.bottom=so?'auto':'104px';tip.style.top=so?'60px':'auto';
 if(pos){hand.style.display='block';hand.style.left=pos.x+'px';hand.style.top=pos.y+'px'}else hand.style.display='none'}
// ---------- GİRDİ (sürükle-birleştir) ----------
const ptrs=new Map();let gest=null,drag=null;
const ringM=new THREE.Mesh(new THREE.RingGeometry(.5,.62,4,1,Math.PI/4).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthTest:false}));ringM.scale.setScalar(1.25);ringM.visible=false;ringM.renderOrder=5;scene.add(ringM);
canvas.addEventListener('pointerdown',ev=>{canvas.setPointerCapture(ev.pointerId);ptrs.set(ev.pointerId,{x:ev.clientX,y:ev.clientY,sx:ev.clientX,sy:ev.clientY});ac();
 if(ptrs.size===1){const p=pick(ev.clientX,ev.clientY);gest={moved:false,k:p&&p.k&&!S.g[p.k].end&&!S.g[p.k].fog?p.k:null}}else{if(gest)gest.moved=true;if(drag)cancelDrag()}});
canvas.addEventListener('pointermove',ev=>{const p=ptrs.get(ev.pointerId);if(!p)return;const px=p.x,py=p.y;p.x=ev.clientX;p.y=ev.clientY;
 if(ptrs.size===2){const[a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const pd=Math.hypot((a===p?px:a.x)-(b===p?px:b.x),(a===p?py:a.y)-(b===p?py:b.y));if(pd>0)cam.dist=Math.min(maxD(),Math.max(minD,cam.dist*pd/d));panBy(px,py,p.x,p.y,.5);return}
 if(!gest)return;if(!gest.moved&&Math.hypot(p.x-p.sx,p.y-p.sy)>8){gest.moved=true;if(gest.k)startDrag(gest.k)}
 if(drag)moveDrag(p.x,p.y);else if(gest.moved)panBy(px,py,p.x,p.y,1)});
function up(ev){const p=ptrs.get(ev.pointerId);ptrs.delete(ev.pointerId);if(!p)return;if(drag){endDrag();gest=null;return}if(gest&&!gest.moved&&ptrs.size===0)tap(p.x,p.y);if(!ptrs.size)gest=null}
canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
canvas.addEventListener('wheel',ev=>{ev.preventDefault();cam.dist=Math.min(maxD(),Math.max(minD,cam.dist*(1+ev.deltaY*.001)))},{passive:false});
function panBy(x0,y0,x1,y1,f){const a=ground(x0,y0),b=ground(x1,y1);if(!a||!b)return;cam.target.addScaledVector(a.sub(b),f);cam.target.x=Math.max(-6,Math.min(6,cam.target.x));cam.target.z=Math.max(-6,Math.min(6,cam.target.z))}
function startDrag(k){const m=meshes.get(k);if(!m)return;closeSheet();drag={k,g:m.g,home:m.g.position.clone(),over:null};SFX.pop();vib(8);tween(150,t=>m.g.position.y=E.out(t)*.6)}
function moveDrag(x,y){const p=ground(x,y);if(!p)return;drag.g.position.x=p.x;drag.g.position.z=p.z;const t=tileAt(x,y);ringM.visible=false;drag.over=null;if(!t||t===drag.k)return;
 const pp=tpos(t);ringM.position.set(pp.x,.08,pp.z);ringM.visible=true;const[i,j]=L.unkey(t);
 if(S.g[t]&&L.canMerge(S,drag.k,t)){ringM.material.color.set(0x3fff6a);drag.over=t;ringM.scale.setScalar(1.25+Math.sin(performance.now()/90)*.08)}
 else if(!S.g[t]&&L.tileOK(i,j)&&L.isSafe(S,t)){ringM.material.color.set(0xffffff);drag.over=t;ringM.scale.setScalar(1.25)}else{ringM.material.color.set(0xff5555);ringM.scale.setScalar(1.25)}}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;ringM.visible=false;const s=d.g.position.clone();tween(220,t=>{d.g.position.lerpVectors(s,d.home,E.out(t))})}
function endDrag(){const d=drag;ringM.visible=false;if(!d.over){if(S.g[d.k]&&S.g[d.k].lv>=L.maxLv(S)&&d.over===null)toast(`Sv${S.g[d.k].lv} sınırında — Feneri yükselt`);cancelDrag();return}drag=null;
 if(S.g[d.over]){const lv=S.g[d.over].lv+1;scene.remove(d.g);meshes.delete(d.k);L.merge(S,d.k,d.over,now());const g=syncOne(d.over);popAnim(g,.7);
  SFX.merge(lv);vib(lv>=4?[40,30,60]:30);if(lv>=4)cam.shake=.15+lv*.03;burst(tpos(d.over).setY(.6),0xffe08a,16+lv*2,2.8,1);const s=tileScr(d.over,1.2);floatTxt(s.x,s.y,`Sv${lv}!`,'#7dff8a')}
 else{L.move(S,d.k,d.over);const m=meshes.get(d.k);meshes.delete(d.k);meshes.set(d.over,m);const to=tpos(d.over);const s=d.g.position.clone();tween(160,t=>d.g.position.lerpVectors(s,to,E.out(t)));SFX.pop()}
 ui();save();tutCheck()}
function tap(x,y){const p=pick(x,y);if(!p){closeSheet();return}SFX.tap();
 if(p.camp){if(S.tut<9){toast('Önce eğitimi bitir');return}battle(S.stage,p.camp);return}
 if(p.fener){popAnim(fenerG,.08);openFener();return}
 if(p.k){const b=S.g[p.k];const r=KINDS[b.k].res;if(r&&!b.fog&&(b.stored||0)>=1&&!$('sheet').classList.contains('on')){const a=L.collect(S,p.k,now());const s=tileScr(p.k,1.2);floatTxt(s.x,s.y,`+${a} ${RIC[r]}`,'#ffd27a');fly(r,s.x,s.y,4);SFX.coin();vib(10);popAnim(meshes.get(p.k).g,.15);ui();save();tutCheck();return}
  if(S.tut===2){toast('Önce baloncuğu topla');return}popAnim(meshes.get(p.k).g,.12);openB(p.k);return}
 if(p.tile){const[i,j]=L.unkey(p.tile);if(!L.tileOK(i,j)){closeSheet();return}if(!L.isSafe(S,p.tile)){SFX.err();toast('🌫️ Sisli bölge — Feneri yükselterek aç');return}if(S.tut<3){toast('Önce eğitimi takip et');return}openBuild(p.tile)}}
$('bWork').onclick=()=>{ac();openWork()};$('bHero').onclick=()=>{ac();openHeroes()};$('bMap').onclick=()=>{ac();openMap()};$('bTask').onclick=()=>{ac();openTasks()};$('bShop').onclick=()=>{ac();openShop()};$('pGem').onclick=()=>openShop();
$('bClan').onclick=()=>soon('Klan');$('bChat').onclick=()=>soon('Sohbet');$('pSurv').onclick=()=>openWork();$('night').onclick=()=>openFener();
$('modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')closeModal()});
// ---------- DÖNGÜ ----------
const lbls={};
function labels(){const t=now();const items=Object.keys(S.g).filter(k=>S.g[k].end).map(k=>[k,S.g[k],tileScr(k,1.4)]);if(S.fener.end)items.push(['fener',S.fener,scr(new THREE.Vector3(0,beam.position.y+1.2,0))]);
 const seen=new Set();for(const[k,b,p]of items){seen.add(k);let d=lbls[k];if(!d){d=lbls[k]=document.createElement('div');d.className='lbl';$('fx').appendChild(d)}const rem=(b.end-t)/1000;d.style.left=p.x+'px';d.style.top=p.y+'px';d.innerHTML=`🔨 ${fmtT(rem)}<div class="pbar"><i style="width:${(1-rem/b.dur)*100}%"></i></div>`}
 for(const k in lbls)if(!seen.has(k)){lbls[k].remove();delete lbls[k]}}
let last=performance.now(),acc=0,uiAcc=0,nf=0,fogR=-1;
function frame(){const tn=performance.now(),dt=Math.min(.1,(tn-last)/1000);last=tn;const T=tn/1000,t=now();
 for(let n=tweens.length-1;n>=0;n--){const w=tweens[n];const k=Math.min(1,(tn-w.t0)/w.dur);w.fn(k);if(k>=1){tweens.splice(n,1);w.done&&w.done()}}
 for(let n=parts.length-1;n>=0;n--){const p=parts[n];p.life-=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(Math.max(.01,p.life));if(p.life<=0){scene.remove(p.m);parts.splice(n,1)}}
 const oa=OC.attributes.position.array;for(let i=0;i<oa.length;i+=3){const x=ocB[i],z=ocB[i+2];oa[i+1]=Math.sin(x*.5+T*1.2)*.12+Math.cos(z*.6+T*.9)*.1}OC.attributes.position.needsUpdate=true;
 foam.material.opacity=.25+Math.sin(T*1.5)*.12;foam.scale.setScalar(1+Math.sin(T*1.5)*.015);
 nf+=((L.night(S,t)?1:0)-nf)*dt*.8;if(fogR!==L.safeR(S)){fogR=L.safeR(S);buildFog();buildTiles()}
 for(const f of fogs){const sh=1-nf*.14;f.m.position.set(f.b.x*sh+Math.sin(T*.3+f.ph)*.3,f.b.y+Math.sin(T*.5+f.ph)*.08,f.b.z*sh+Math.cos(T*.25+f.ph)*.3);f.m.material.opacity=Math.min(.95,f.o+nf*.3);f.m.material.color.setRGB(1-nf*.35,1-nf*.4,1-nf*.2)}
 hemi.intensity=1.35-nf*.55;sun.intensity=1.9-nf*1.1;scene.fog.color.setRGB(.85-nf*.35,.6-nf*.2,.53+nf*.05);
 const on=L.lit(S);beam.visible=on;halo.visible=on;beam.rotation.y=T*.9;lamp.intensity=on?10+S.fener.lv+Math.sin(T*6)*.6:0;halo.scale.setScalar(on?2.2+Math.sin(T*4)*.15:0);
 for(const[k,m]of meshes){const b=S.g[k];if(!b)continue;const u=m.g.userData;if(u.bub){u.bub.visible=(b.stored||0)>=Math.max(1,L.rate(S,k)*.2)&&!b.end&&!(drag&&drag.k===k);u.bub.position.y=1.25+Math.sin(T*3+m.g.position.x)*.06}if(u.gh)u.gh.position.y=1.2+Math.sin(T*2)*.1}
 for(const c of CAMPS){c.g.userData.sp.position.y=1.6+Math.sin(T*2.5)*.08;c.g.position.y=-.25+Math.sin(T*1.3+c.x)*.1;if(c.g.userData.ts)c.g.userData.ts.forEach((tt,i)=>tt.rotation.y=Math.sin(T*2+i)*.4)}
 sailer.position.set(Math.cos(T*.05)*15,-.15+Math.sin(T)*.05,Math.sin(T*.05)*15);sailer.rotation.y=-T*.05;sailer.rotation.z=Math.sin(T*1.1)*.06;
 for(let n=rafts.length-1;n>=0;n--){const r=rafts[n];r.t+=dt/r.dur;r.g.position.lerpVectors(r.from,r.to,E.out(Math.min(1,r.t)));r.g.position.y=-.2+Math.sin(T*2+n)*.06;r.g.rotation.z=Math.sin(T*1.7+n)*.08;if(r.t>=1){scene.remove(r.g);rafts.splice(n,1);burst(r.to.clone().setY(0),0xffffff,10,1.5,1);syncPeople()}}
 for(const p of people){const u=p.userData;if(!u.t)pickTarget(p);const d=u.t.clone().sub(p.position);d.y=0;const L2=d.length();if(L2<.08){if(Math.random()<.02)pickTarget(p)}else{const v=Math.min(L2,dt*u.sp);p.position.addScaledVector(d.normalize(),v);p.rotation.y=Math.atan2(d.x,d.z);const ph=T*10+u.ph;u.l1.rotation.x=Math.sin(ph)*.6;u.l2.rotation.x=-Math.sin(ph)*.6;p.position.y=Math.abs(Math.sin(ph))*.03}}
 acc+=dt;if(acc>.25){const ev=L.step(S,acc,t);acc=0;handle(ev)}uiAcc+=dt;if(uiAcc>.5){uiAcc=0;ui();if($('sheet').classList.contains('on')&&$('sheet').querySelector('.pbar'))renderSheet()}
 updCam();renderer.render(scene,camera);labels();tutFrame(T);requestAnimationFrame(frame)}
function handle(evs){for(const e of evs){
 if(e.e==='built'){const g=syncOne(e.k);popAnim(g,.6);SFX.done();vib([20,30,20]);burst(tpos(e.k).setY(.6),0xffd84a,16,2.5,1);toast(`${KINDS[S.g[e.k].k].n} Sv${e.lv} hazır!`);renderSheet()}
 if(e.e==='fener'){syncFener();popAnim(fenerG,.3);SFX.light();vib([30,40,60]);cam.shake=.25;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,30,4,1);toast(`🗼 Fener Sv${e.lv}! Sis geri çekildi`);renderSheet()}
 if(e.e==='dark'){SFX.err();toast('🌑 Kristal bitti, Fener söndü!')}
 if(e.e==='trained'){SFX.done();toast(`${e.n} ${TROOPS[e.t].n} hazır!`)}
 if(e.e==='researched'){SFX.done();toast(`🔭 ${TECH.find(x=>x.id===e.id).n} tamamlandı!`)}
 if(e.e==='raft'){sendRaft(false);toast('🛶 Bir sal kıyıya yanaşıyor — yeni kurtulan!')}
 if(e.e==='repel'){SFX.light();cam.shake=.1;toast(`💡 Sis Gecesi! Fener ${e.need}🔮 yakıp sisi geri püskürttü`)}
 if(e.e==='corrupt'){SFX.roar();vib([60,40,60]);cam.shake=.2;e.ks.forEach(k=>{syncOne(k);burst(tpos(k).setY(.6),0x8a5aa8,16,2,1)});toast(`👻 Sis ${e.ks.length} binayı ele geçirdi! Arındır`)}
 if(e.e==='wreck'&&!$('modal').classList.contains('on')&&!$('battle').classList.contains('on')){const room=L.cap(S)-S.surv;modal(`<div style="font-size:50px">🚢</div><h2>Batık gemi!</h2><p>Kıyıya bir enkaz vurdu, ${e.n} kişi tahtalara tutunuyor.${room<e.n?`<br><span style="color:#ff8a8a">Barınaklarda sadece ${Math.max(0,room)} yer var.</span>`:''}</p>`,[['Bırak','x'],['Kurtar','o',()=>{const k=Math.min(e.n,Math.max(0,room));S.surv+=k;for(let i=0;i<k;i++)setTimeout(()=>sendRaft(false),i*500);toast(`${k} kurtulan katıldı`);ui()}]])}}}
// ---------- BAŞLAT ----------
resize();buildTiles();buildFog();fogR=L.safeR(S);syncAll();syncPeople();ui();
if(!isNew){const o=L.offline(S,now());if(o)setTimeout(()=>modal(`<div style="font-size:50px">🌙</div><h2>Tekrar hoş geldin!</h2><p>Sen yokken (${o.min} dk) işçilerin topladı:<br><b style="font-size:18px">${costStr(o.g)}</b></p>`,[['Al','',()=>{L.addRes(S,o.g);ui();save()}],['📺 x2 Al (reklam)','o',()=>watchAd(()=>{for(const k in o.g)o.g[k]*=2;L.addRes(S,o.g);ui();save()})]]),600)}
$('loading').remove();requestAnimationFrame(frame);setInterval(save,5000);addEventListener('visibilitychange',()=>document.hidden&&save());
window.__g={get S(){return S},L,save,syncAll,syncPeople,ui,battle,openB,openFener,openShop,openHeroes,openWork,openMap,tileScr,scr:v=>scr(new THREE.Vector3(...v)),cam,sendRaft};
