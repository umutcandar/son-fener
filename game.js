// ===== Son Fener — görüntü + arayüz katmanı. Kurallar logic.js'te (saf). Durum: tek nesne S.
import * as THREE from './lib/three.module.js';
import * as L from './logic.js';
import {t as tx,tl,lang,LANGS,setLang,localizeData,applyDom,locale,RTL} from './i18n.js';
localizeData(L);applyDom();for(const id of ['bClan','bChat']){const e=document.getElementById(id);if(!e)continue;const m=e.textContent.trim().match(/^([\p{Extended_Pictographic}\uFE0F\u200D]+)\s*(.+)$/u);if(m){e.title=m[2];e.innerHTML=m[1]+'<span class="lb"> '+m[2]+'</span>'}}const LV=tx('ui.lv'),DEC=(1.5).toLocaleString(locale)[1];
const {KINDS,RIC,TROOPS,HEROES,TECH,FOES,RARITY,GR}=L;
const $=id=>document.getElementById(id);const now=()=>Date.now();
const KEY='sonfener1',TS=1.3;
let S;try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){}const isNew=!S||!S.v;if(isNew)S=L.newState(now());else S=L.migrate(S,now());
const save=()=>{if(window.__noSave)return;S.saved=now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}};
const tpos=k=>{const[i,j]=L.unkey(k);return new THREE.Vector3(i*TS,0,j*TS)};
// ---------- RENDER ----------
const canvas=$('c');const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();
const gradTex=(stops)=>{const cv=document.createElement('canvas');cv.width=2;cv.height=256;const x=cv.getContext('2d');const g=x.createLinearGradient(0,0,0,256);stops.forEach(([o,c])=>g.addColorStop(o,c));x.fillStyle=g;x.fillRect(0,0,2,256);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return t};
const skyU={uT:{value:.6},uN:{value:0}};
const sky=new THREE.Mesh(new THREE.SphereGeometry(190,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:skyU,
 vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float uT,uN;varying vec3 vP;void main(){float h=clamp(vP.y*1.6+.12,0.,1.);vec3 day=mix(vec3(.86,.94,.98),vec3(.33,.6,.88),h);vec3 dusk=mix(vec3(1.,.72,.45),vec3(.27,.2,.4),h);vec3 nt=mix(vec3(.2,.15,.33),vec3(.03,.04,.12),h);gl_FragColor=vec4(mix(mix(day,dusk,uT),nt,uN),1.);}'}));
sky.renderOrder=-1;scene.add(sky);
const stars=(()=>{const n=320,p=new Float32Array(n*3);for(let i=0;i<n;i++){const a=Math.random()*6.28,e=.15+Math.random()*1.3;p.set([Math.cos(a)*Math.cos(e)*150,Math.sin(e)*150,Math.sin(a)*Math.cos(e)*150],i*3)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.4,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(m);return m})();
scene.fog=new THREE.Fog(0xd99a86,34,80);
const camera=new THREE.PerspectiveCamera(36,1,.1,220);
const hemi=new THREE.HemisphereLight(0xffe0c0,0x3f6a78,1.35);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffb27a,1.9);sun.position.set(-6,10,7);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});sun.shadow.bias=-.0015;sun.shadow.normalBias=.02;scene.add(sun);
const lamp=new THREE.PointLight(0xffd27a,10,9,1.3);scene.add(lamp);
const UT={value:0};const NOISE=`float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}float fbm(vec2 p){return vn(p)*.55+vn(p*2.1)*.3+vn(p*4.3)*.15;}`;
// toon bant + kenar ışığı (rim) + yumuşak AO: tüm Lambert malzemelere
const toon=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`{vec3 nn=normalize(normal);float nv=max(dot(normalize(vViewPosition),nn),0.);float rim=pow(1.-nv,3.);outgoingLight+=vec3(1.,.93,.78)*rim*.28*(.4+.6*max(nn.y,0.));float ao=.82+.18*clamp(nn.y*.5+.5,0.,1.);outgoingLight*=ao;float lum=dot(outgoingLight,vec3(.299,.587,.114));outgoingLight*=mix(1.,(floor(lum*4.+.5)/4.+.04)/(lum+.04),.22);}
#include <opaque_fragment>`)};m.customProgramCacheKey=()=>'toon';return m};
const MATS={};const mat=(c,e)=>MATS[c+(e||'')]||(MATS[c+(e||'')]=e?new THREE.MeshBasicMaterial({color:c}):toon(new THREE.MeshLambertMaterial({color:c})));
const G={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,10),tcyl:new THREE.CylinderGeometry(.38,.5,1,10),cone:new THREE.ConeGeometry(.5,1,8),pyr:new THREE.ConeGeometry(.5,1,4).rotateY(Math.PI/4),
 dod:new THREE.DodecahedronGeometry(.5,0),sph:new THREE.SphereGeometry(.5,10,8),ico:new THREE.IcosahedronGeometry(.5,0),oct:new THREE.OctahedronGeometry(.5,0)};
{const sh=new THREE.Shape();sh.moveTo(-.5,0);sh.lineTo(.5,0);sh.lineTo(0,1);sh.lineTo(-.5,0);G.prism=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false}).translate(0,0,-.5);}
function P(par,geo,c,sx,sy,sz,x,y,z,ry=0,rx=0,rz=0,sh=true,e){const m=new THREE.Mesh(G[geo],mat(c,e));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=sh;m.receiveShadow=!e;par.add(m);return m}
const E={out:t=>1-Math.pow(1-t,3),el:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*2.094)+1};
const tweens=[];const tween=(dur,fn,done)=>tweens.push({t0:performance.now(),dur,fn,done});
const rnd=k=>{const x=Math.sin(k*12.9898)*43758.5453;return x-Math.floor(x)};
const isl=(x,z)=>Math.pow(Math.pow(Math.abs(x),3)+Math.pow(Math.abs(z),3),1/3);
// ada
const PAL={home:[0x7cc46a,0x5fae5a,0xb9cf7a,0xf2d9a0,0xe6c88a,0xd9b97a],mercan:[0x9fdc8a,0x7cc87a,0xf6d2b8,0xffc9c2,0xf7b6a8,0xe8b0a0],volkan:[0x7a6e66,0x5e5450,0x8a6a52,0x4a403c,0x3a3432,0x2e2a28]};
const islandGeo=new THREE.PlaneGeometry(22,22,48,48).rotateX(-Math.PI/2);
{const p=islandGeo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);const r=isl(x,z);let y=Math.sin(x*1.9)*Math.cos(z*1.6)*.05;if(r>=6.3&&r<7.5)y=-(r-6.3)*.35;else if(r>=7.5)y=-.42-(r-7.5)*.8;p.setY(i,y)}
 islandGeo.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(p.count*3),3));islandGeo.computeVertexNormals();const m=new THREE.Mesh(islandGeo,toon(new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true})));m.receiveShadow=true;scene.add(m);}
function paintIsland(id){const P_=PAL[id]||PAL.home,p=islandGeo.attributes.position,c=islandGeo.attributes.color,C=new THREE.Color(),D=new THREE.Color();
 for(let i=0;i<p.count;i++){const r=isl(p.getX(i),p.getZ(i));if(r<6.3)C.set(P_[0]).lerp(D.set(P_[1]),rnd(i)*.6);else if(r<7.5)C.set(r<6.6?P_[2]:P_[3]).lerp(D.set(P_[4]),rnd(i)*.5);else C.set(P_[5]);c.setXYZ(i,C.r,C.g,C.b)}c.needsUpdate=true}
// okyanus: derinlik rengi (sığ turkuaz → derin lacivert) + güneş parıltısı
function waterMat(){const m=new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true,transparent:true,opacity:.94});m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vW;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvW=(modelMatrix*vec4(transformed,1.)).xyz;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vW;uniform float uT;'+NOISE).replace('vec4 diffuseColor = vec4( diffuse, opacity );',`float dd=length(vW.xz);float sh0=smoothstep(14.,8.2,dd);float n=fbm(vW.xz*.35+uT*.05);vec3 deep=vec3(.05,.33,.5),mid=vec3(.09,.58,.66),shal=vec3(.3,.86,.8);vec3 wc=mix(mix(deep,mid,smoothstep(60.,16.,dd)),shal,sh0);wc+=(n-.5)*.08;vec4 diffuseColor=vec4(wc,opacity);`).replace('#include <opaque_fragment>',`{float sp=fbm(vW.xz*2.6+vec2(uT*.4,-uT*.3));sp=smoothstep(.8,.86,sp)*smoothstep(70.,10.,dd);outgoingLight+=vec3(1.,.97,.85)*sp*.7;float ring=smoothstep(.9,1.,sin(dd*3.-uT*1.6)*.5+.5)*smoothstep(11.5,8.4,dd)*.35;outgoingLight+=vec3(ring);}
#include <opaque_fragment>`)};m.customProgramCacheKey=()=>'water';return m}
const OC=new THREE.PlaneGeometry(150,150,56,56).rotateX(-Math.PI/2);const ocB=OC.attributes.position.array.slice();
const ocean=new THREE.Mesh(OC,waterMat());ocean.position.y=-.28;scene.add(ocean);
const foam2=new THREE.Mesh(new THREE.RingGeometry(8.3,8.6,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,depthWrite:false}));foam2.position.y=-.22;scene.add(foam2);
const foam=new THREE.Mesh(new THREE.RingGeometry(7.5,8.1,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35,depthWrite:false}));foam.position.y=-.2;scene.add(foam);
// palmiyeler + kayalar (instanced)
{const pos=[];for(let k=0;k<30;k++){const a=k/30*Math.PI*2+rnd(k)*.15,r=6.35+rnd(k+9)*.7;pos.push([Math.cos(a)*r,Math.sin(a)*r,a])}
 const trunk=new THREE.InstancedMesh(G.cyl,mat(0x9a6a42),pos.length),leaf=new THREE.InstancedMesh(G.oct,mat(0x3f9a4a),pos.length*3),rock=new THREE.InstancedMesh(G.dod,mat(0xb8aea0),14);
 [trunk,leaf,rock].forEach(m=>{m.castShadow=true;scene.add(m)});window.__palms=[trunk,leaf];const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
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
function fogMat(o){const m=new THREE.SpriteMaterial({map:fogTex,transparent:true,depthWrite:false,opacity:o,color:0xffffff});const ph=Math.random()*50;m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.uniforms.uP={value:ph};sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT,uP;'+NOISE).replace('#include <alphatest_fragment>',`float fn=fbm(vMapUv*3.+vec2(uT*.06+uP,uT*.035));float fn2=fbm(vMapUv*6.-vec2(uT*.09,uP));diffuseColor.a*=.45+.85*fn*fn2*1.6;diffuseColor.rgb*=.9+.18*fn;
#include <alphatest_fragment>`)};m.customProgramCacheKey=()=>'fogn';return m}
function buildFog(){fogs.forEach(f=>scene.remove(f.m));fogs=[];const R=L.safeR(S);const add=(x,z,s,o,y=.6)=>{const m=new THREE.Sprite(fogMat(o));m.position.set(x,y,z);m.scale.set(s,s*.6,1);scene.add(m);fogs.push({m,b:new THREE.Vector3(x,y,z),o,ph:Math.random()*6})};
 for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++){if(Math.max(Math.abs(i),Math.abs(j))>R)add(i*TS+(rnd(i*9+j)-.5)*.5,j*TS+(rnd(i+j*7)-.5)*.5,2.8,.55)}
 for(let k=0;k<34;k++){const a=k/34*6.28,r=8.6+rnd(k)*2.2;add(Math.cos(a)*r,Math.sin(a)*r,5+rnd(k+5)*2,.6,.9)}}
// ---------- MODELLER ----------
function hut(g,w,h,d,wall,roof=0xc0533a){P(g,'box',wall,w,h,d,0,h/2,0);P(g,'prism',roof,w*1.18,h*.6,d*1.12,0,h,0);P(g,'box',0x4a2e1c,w*.22,h*.55,.02,0,h*.27,d/2+.01);}
const win=(g,x,y,z)=>P(g,'box',0xffd27a,.12,.12,.02,x,y,z,0,0,0,false,1);
function mkFener(g,lv){P(g,'dod',0x8f897e,2,.55,2,0,.05,0);P(g,'cyl',0xcfc6b4,1.55,.32,1.55,0,.38,0);P(g,'cyl',0x9a8f7c,1.62,.06,1.62,0,.56,0);
 const h=2.5+lv*.2,n=6,hs=h/n;let y=.56;for(let i=0;i<n;i++){const r0=.5-i/n*.17,r1=.5-(i+1)/n*.17;const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,hs+.005,18),mat(i%2?0xd8433a:0xf6f2ea));m.position.y=y+hs/2;m.castShadow=true;g.add(m);
  if(i%2===0&&i>0)for(const a of[.4,3.5])P(g,'box',0xffd27a,.09,.13,.03,Math.sin(a)*(r0-.01),y+hs/2,Math.cos(a)*(r0-.01),a,0,0,false,1);y+=hs}
 P(g,'cyl',0x2e3440,.86,.08,.86,0,y+.04,0);const top=y+.08;
 for(let k=0;k<14;k++){const a=k/14*6.28;P(g,'box',0x2e3440,.025,.2,.025,Math.cos(a)*.41,top+.1,Math.sin(a)*.41)}
 const rail=new THREE.Mesh(new THREE.TorusGeometry(.41,.016,4,24).rotateX(Math.PI/2),mat(0x2e3440));rail.position.y=top+.2;g.add(rail);
 P(g,'cyl',0xfff1b0,.5,.46,.5,0,top+.25,0,0,0,0,false,1);for(let k=0;k<8;k++){const a=k/8*6.28;P(g,'box',0x2e3440,.03,.48,.03,Math.cos(a)*.26,top+.25,Math.sin(a)*.26)}
 const dome=new THREE.Mesh(new THREE.SphereGeometry(.31,14,8,0,6.29,0,Math.PI/2),mat(0xc0392b));dome.position.y=top+.48;dome.castShadow=true;g.add(dome);
 P(g,'sph',0xffd84a,.1,.1,.1,0,top+.82,0,0,0,0,false,1);P(g,'box',0x2e3440,.02,.22,.02,0,top+.95,0);P(g,'box',0xffd84a,.16,.05,.01,.07,top+1.03,0);
 P(g,'box',0x5a3a22,.24,.38,.06,0,.75,.49);P(g,'cyl',0x5a3a22,.24,.06,.06,0,.94,.49,0,Math.PI/2);
 if(lv>=2){P(g,'box',0xf0e2c4,.65,.42,.55,.85,.21+.3,.25);P(g,'prism',0x3a7ac0,.75,.32,.62,.85,.72,.25);P(g,'box',0xffd27a,.12,.12,.02,.85,.5,.53,0,0,0,false,1)}
 if(lv>=4)for(const s of[-1,1]){P(g,'cyl',0x6b4a30,.03,.9,.03,s*.85,.75,-.6);P(g,'box',s>0?0xffb347:0x3fa7c0,.3,.18,.01,s*.85+.15,1.08,-.6)}
 if(lv>=6){P(g,'cyl',0xffd84a,.92,.05,.92,0,.56+h*.5,0,0,0,0,false,1)}
 g.userData.lampY=top+.25}
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
const SMOKE=new THREE.MeshBasicMaterial({color:0xe9eef2,transparent:true,opacity:.55,depthWrite:false});
function deco(g,lv){if(lv>=2){P(g,'cyl',0x8a5a32,.16,.2,.16,-.42,.1,.42);P(g,'cyl',0x444,.17,.02,.17,-.42,.15,.42)}
 if(lv>=3){const fc=lv>=7?0xffd84a:lv>=5?0xb98cff:0x3fa7e0;P(g,'cyl',0x6b4a30,.025,.9,.025,.46,.45,-.42);const fl=P(g,'box',fc,.22,.13,.01,.11,0,0);const pv=new THREE.Group();pv.position.set(.46,.82,-.42);g.add(pv);pv.add(fl);g.userData.flag=pv}
 if(lv>=4){P(g,'box',0x8a6a5a,.12,.32,.12,-.3,.62,-.25);P(g,'box',0x5a4038,.15,.04,.15,-.3,.79,-.25);const sm=[];for(let k=0;k<3;k++){const m=new THREE.Mesh(G.sph,SMOKE);m.position.set(-.3,.85,-.25);m.castShadow=false;g.add(m);sm.push(m)}g.userData.smoke=sm}
 if(lv>=6){P(g,'cyl',0x9a8f84,1.12,.08,1.12,0,.02,0);P(g,'cyl',0xe8b84a,1.15,.025,1.15,0,.07,0,0,0,0,false)}
 if(lv>=8){const l=P(g,'sph',0xffe08a,.14,.14,.14,.46,1.0,-.42,0,0,0,false,1);g.userData.glow=l}
 if(lv>=4){P(g,'cyl',0x333,.03,.5,.03,-.47,.25,-.4);P(g,'sph',0xffd27a,.09,.09,.09,-.47,.52,-.4,0,0,0,false,1)}
 if(lv>=5){P(g,'cyl',0xcfc6b4,1.18,.06,1.18,0,.01,0,0,0,0,false);P(g,'cyl',0xffd84a,1.2,.02,1.2,0,.045,0,0,0,0,false,1)}}
function mkPearl(g,lv){P(g,'cyl',0x5fd3d0,1,.08,.9,0,.04,0);P(g,'cyl',0x2fa8b8,.86,.04,.76,0,.09,0,0,0,0,false);for(let k=0;k<4;k++)P(g,'cyl',0x9a6a42,.06,.32,.06,(k%2?.45:-.45),.16,(k<2?.4:-.4));
 for(let k=0;k<2+Math.min(lv,4);k++){const a=k*1.9,x=Math.cos(a)*.3,z=Math.sin(a)*.25;P(g,'sph',0xf2c6d0,.22,.08,.18,x,.14,z,a);P(g,'sph',0xfff8f0,.08,.08,.08,x,.2,z,0,0,0,false,1)}
 hut(g,.42,.36,.36,0xf6e6d0,0xff8f8f);g.children.slice(-4).forEach(m=>{m.position.x+=.28;m.position.z-=.25});P(g,'cone',0xff9fb0,.12,.3,.12,-.38,.22,-.3);P(g,'cone',0xffb070,.1,.24,.1,-.28,.18,-.38)}
function mkForge(g,lv){P(g,'dod',0x4a403c,.95,.55,.85,0,.22,-.05);P(g,'cyl',0x2e2a28,.22,.7+lv*.05,.22,.22,.6,-.15);P(g,'box',0x1a1210,.36,.28,.1,0,.2,.36);P(g,'box',0xff6a2a,.26,.18,.11,0,.18,.37,0,0,0,false,1);
 P(g,'cyl',0xff8a3a,.34,.04,.34,-.3,.06,.35,0,0,0,false,1);P(g,'cyl',0x3a3432,.38,.12,.38,-.3,.05,.35);for(let k=0;k<Math.min(lv,4);k++)P(g,'oct',0xffa040,.12,.2,.12,.38-k*.1,.1,.4,k,0,.2,false,1);g.userData.ember=1}
function mkTower(g,lv){P(g,'cyl',0x8a7a66,.42,.3,.42,0,.15,0);P(g,'cyl',0xb59a76,.28,.75+lv*.08,.28,0,.6+lv*.04,0);const top=.98+lv*.08;P(g,'cyl',0x6b4a30,.4,.06,.4,0,top,0);for(let k=0;k<6;k++){const a=k/6*6.283;P(g,'box',0x6b4a30,.06,.14,.06,Math.cos(a)*.36,top+.1,Math.sin(a)*.36)}P(g,'cone',0xc0392b,.42,.32,.42,0,top+.34,0);P(g,'cyl',0x3a2a1a,.03,.32,.03,.12,top+.2,.12,0,0,.9);win(g,0,.55,.28);const f=P(g,'box',0xffd27a,.02,.12,.2,0,top+.62,.1,0,0,0,false);g.userData.flag=f}
const MK={tower:mkTower,hut:mkHut,fisher:mkFisher,wood:mkWood,mine:mkMine,yard:mkYard,lab:mkLab,pearl:mkPearl,forge:mkForge};
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
const bubC={};function bubTex(r){if(bubC[r])return bubC[r];const c=document.createElement('canvas');c.width=c.height=96;const x=c.getContext('2d');x.fillStyle='#fff8e8';x.beginPath();x.arc(48,46,40,0,7);x.fill();x.lineWidth=6;x.strokeStyle='#ffb347';x.stroke();
 x.beginPath();x.moveTo(40,84);x.lineTo(56,84);x.lineTo(48,95);x.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const im=new Image();im.onload=()=>{x.drawImage(im,18,16,60,60);t.needsUpdate=true};im.src='img/i_'+r+'.webp';return bubC[r]=t}
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
 const g=new THREE.Group();g.position.copy(tpos(k));const inner=new THREE.Group();inner.scale.setScalar(.8+Math.min(b.lv,8)*.05);g.add(inner);MK[b.k](inner,b.lv);deco(inner,b.lv);if(b.end)mkScaf(g);
 const bd=sprite(String(b.lv),'#1f6f8b',.3,true,'#ffe08a');bd.position.set(.5,.15,.5);g.add(bd);
 if(b.fog){const f=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:0x6a4a8a,transparent:true,opacity:.45,depthWrite:false}));f.scale.set(1.3,1,1.3);f.position.y=.4;g.add(f);const gh=sprite('👻','#4a2a6acc',.45,false,'#b98cff');gh.position.y=1.2;g.add(gh);g.userData.gh=gh}
 if(KINDS[b.k].res&&!b.fog){const bub=new THREE.Sprite(new THREE.SpriteMaterial({map:bubTex(KINDS[b.k].res),depthTest:false}));bub.scale.set(.36,.36,1);bub.renderOrder=10;bub.position.y=1.3;bub.visible=false;g.add(bub);g.userData.bub=bub}
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
function mkBoat(g,sc){P(g,'box',0x8a5a32,1.1,.22,.42,0,0,0);P(g,'box',0x6b4a30,1.14,.05,.46,0,.12,0);P(g,'prism',0x8a5a32,.42,.35,.22,.62,-.02,0,-Math.PI/2,0,Math.PI/2);
 P(g,'cyl',0x5a3a22,.04,1.1,.04,-.05,.6,0);P(g,'prism',sc,.02,.85,.7,.12,.25,0,Math.PI/2);P(g,'box',0xf6f2ea,.02,.25,.02,-.05,1.2,0);P(g,'box',0xd8433a,.18,.08,.01,.04,1.2,0)}
const boats=[0xf6f2ea,0xf2cc8f,0xe07a5f].map((c,i)=>{const g=new THREE.Group();mkBoat(g,c);g.scale.setScalar(.9+i*.15);scene.add(g);return{g,r:10.5+i*2.2,sp:.05+i*.015,ph:i*2.1}});
const sailer=boats[0].g;
const gulls=[];for(let i=0;i<7;i++){const g=new THREE.Group();P(g,'sph',0xffffff,.12,.08,.22,0,0,0,0,0,0,false);const w1=new THREE.Group(),w2=new THREE.Group();g.add(w1,w2);P(w1,'box',0xf0f0f0,.32,.015,.1,.16,0,0,0,0,0,false);P(w2,'box',0xf0f0f0,.32,.015,.1,-.16,0,0,0,0,0,false);
 P(g,'box',0xffb347,.04,.03,.06,0,0,.13,0,0,0,false);scene.add(g);gulls.push({g,w1,w2,r:3+Math.random()*6,h:3+Math.random()*2.5,sp:.25+Math.random()*.25,ph:Math.random()*6})}
const islDeco=new THREE.Group();scene.add(islDeco);
function buildIslDeco(id){islDeco.clear();window.__palms.forEach(m=>m.visible=id!=='volkan');
 if(id==='mercan')for(let k=0;k<26;k++){const a=k/26*6.28+rnd(k)*.2,r=7.9+rnd(k+3)*1.2;P(islDeco,k%3?'dod':'ico',[0xff7f7f,0xffa06b,0xff6fae,0xffd06b][k%4],.3+rnd(k)*.3,.3+rnd(k+1)*.4,.3,Math.cos(a)*r,-.35,Math.sin(a)*r,a)}
 if(id==='volkan'){const v=new THREE.Mesh(new THREE.ConeGeometry(4,4.5,9,1,true),mat(0x4a403c));v.position.set(-9,1,-9);islDeco.add(v);P(islDeco,'cyl',0xff6a2a,1.2,.2,1.2,-9,3.2,-9,0,0,0,false,1);
  for(let k=0;k<5;k++){const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:fogTex,transparent:true,depthWrite:false,opacity:.6,color:0x555555}));sm.position.set(-9+k*.3,4+k*1.1,-9-k*.2);sm.scale.set(2+k,1.5+k*.6,1);islDeco.add(sm)}
  for(let k=0;k<16;k++){const a=k/16*6.28,r=6.6+rnd(k)*1.2;P(islDeco,'dod',0x3a3432,.4+rnd(k)*.4,.35+rnd(k)*.5,.4,Math.cos(a)*r,-.1,Math.sin(a)*r)}}}
let beacon=null;function syncBeacon(){if(beacon)scene.remove(beacon);beacon=null;if(S.cur==='home')return;beacon=new THREE.Group();const lv=S.isl[S.cur].lv;P(beacon,'dod',0x7a7268,.9,.4,.9,0,.1,0);
 P(beacon,'cyl',0xf6f2ea,.32,.9+lv*.25,.32,0,.5+(lv*.25)/2,0);P(beacon,'sph',0xfff1b0,.3,.3,.3,0,1.05+lv*.25,0,0,0,0,false,1);P(beacon,'cone',0xc0392b,.36,.26,.36,0,1.3+lv*.25,0);scene.add(beacon)}
// ---------- KAMERA ----------
const cam={target:new THREE.Vector3(0,0,.4),dist:24,az:Math.PI/4,pol:.9,shake:0};
let FIT=24,bubN=0;const minD=8,maxD=()=>FIT*1.25;
function updCam(){const o=new THREE.Vector3(Math.sin(cam.pol)*Math.sin(cam.az),Math.cos(cam.pol),Math.sin(cam.pol)*Math.cos(cam.az)).multiplyScalar(cam.dist);camera.position.copy(cam.target).add(o);
 if(cam.shake>0){camera.position.x+=(Math.random()-.5)*cam.shake;camera.position.y+=(Math.random()-.5)*cam.shake;cam.shake*=.88;if(cam.shake<.01)cam.shake=0}camera.lookAt(cam.target)}
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();FIT=fitDist();cam.dist=FIT}addEventListener('resize',resize);
function fitDist(){const pts=[];for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++){if(!L.tileOK(i,j)||(Math.abs(i)<GR&&Math.abs(j)<GR))continue;for(const a of[-.45,.45])for(const b of[-.45,.45])pts.push(new THREE.Vector3((i+a)*TS,0,(j+b)*TS));pts.push(new THREE.Vector3(i*TS,.9,j*TS))}pts.push(new THREE.Vector3(0,3.6,0));
 const top=Math.min(170,innerHeight*.22),bot=Math.min(100,innerHeight*.13),sv=cam.dist;let lo=6,hi=90;
 for(let it=0;it<24;it++){const m=(lo+hi)/2;cam.dist=m;updCam();camera.updateMatrixWorld();const ok=pts.every(p=>{const q=p.clone().project(camera);const x=(q.x+1)/2*innerWidth,y=(1-q.y)/2*innerHeight;return x>=4&&x<=innerWidth-4&&y>=top&&y<=innerHeight-bot});ok?hi=m:lo=m}
 cam.dist=sv;return hi}
const ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const ndc=(x,y)=>new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1);
function ground(x,y){ray.setFromCamera(ndc(x,y),camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(plane,p)?p:null}
const scr=v=>{const p=v.clone().project(camera);return{x:(p.x+1)/2*innerWidth,y:(1-p.y)/2*innerHeight}};
const tileScr=(k,y=.4)=>scr(tpos(k).setY(y));
function tileAt(x,y){const p=ground(x,y);if(!p)return null;const i=Math.round(p.x/TS),j=Math.round(p.z/TS);if(Math.abs(i)>GR||Math.abs(j)>GR)return null;return L.key(i,j)}
function pick(x,y){ray.setFromCamera(ndc(x,y),camera);
 for(const c of CAMPS){if(c.g.visible&&ray.ray.distanceToPoint(new THREE.Vector3(c.x,.4,c.z))<1.1)return{camp:c}}
 if(S.cur!=='home'){if(ray.ray.distanceToPoint(new THREE.Vector3(0,1,0))<.8)return{post:1}}else if(ray.ray.distanceToPoint(new THREE.Vector3(0,1.6,0))<.75||ray.ray.distanceToPoint(new THREE.Vector3(0,.6,0))<.7)return{fener:1};
 // binaya yukarıdan dokunma: önce yükseklikteki merkeze göre
 let best=null,bd=.62;for(const k in S.g){const d=ray.ray.distanceToPoint(tpos(k).setY(.45));if(d<bd){bd=d;best=k}}if(best)return{k:best};
 const k=tileAt(x,y);return k?{tile:k}:null}
// ---------- SES ----------
let AC;const ac=()=>{if(!AC)try{AC=new(window.AudioContext||window.webkitAudioContext)()}catch(e){}if(AC&&AC.state==='suspended')AC.resume();return AC};
let sfxBus,musBus,musOn=false;function buses(){if(!AC||sfxBus)return;const c=AC.createDynamicsCompressor();c.connect(AC.destination);sfxBus=AC.createGain();musBus=AC.createGain();sfxBus.connect(c);musBus.connect(c);
 const dl=AC.createDelay(),fb=AC.createGain(),wet=AC.createGain();dl.delayTime.value=.23;fb.gain.value=.28;wet.gain.value=.18;sfxBus.connect(dl);dl.connect(fb).connect(dl);dl.connect(wet).connect(c);setVol()}
function setVol(){if(!sfxBus)return;sfxBus.gain.value=S.set.snd?1:0;musBus.gain.setTargetAtTime(S.set.mus?.5:0,AC.currentTime,.4)}
function tone(f,d,type='sine',v=.12,f2,delay=0,bus){const a=AC;if(!a)return;buses();const t=a.currentTime+delay,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(v,t+Math.min(.012,d/4));g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(bus||sfxBus);o.start(t);o.stop(t+d+.02)}
function noise(d,v=.2,f=1200){const a=AC;if(!a)return;buses();const b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),c=b.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=(Math.random()*2-1)*(1-i/c.length);const s=a.createBufferSource(),g=a.createGain(),fl=a.createBiquadFilter();fl.type='lowpass';fl.frequency.value=f;s.buffer=b;g.gain.value=v;s.connect(fl).connect(g).connect(sfxBus);s.start()}
// ambiyans müziği: üretken pentatonik + dalga sesi; gece minöre kayar
const SCL=[0,2,4,7,9],SCLN=[0,3,5,7,10];function startMusic(){if(musOn||!AC)return;buses();musOn=true;const a=AC;
 {const len=a.sampleRate*4,b=a.createBuffer(1,len,a.sampleRate),c=b.getChannelData(0);let l=0;for(let i=0;i<len;i++){l=l*.985+(Math.random()*2-1)*.015;c[i]=l*6}const src=a.createBufferSource();src.buffer=b;src.loop=true;const f=a.createBiquadFilter();f.type='lowpass';f.frequency.value=500;const g=a.createGain();g.gain.value=.18;const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=.12;lg.gain.value=.12;lfo.connect(lg).connect(g.gain);lfo.start();src.connect(f).connect(g).connect(musBus);src.start()}
 const pad=(root,t,minor)=>{[0,minor?3:4,7].forEach((iv,k)=>{for(const dt of[-4,4]){const o=a.createOscillator(),g=a.createGain(),f=a.createBiquadFilter();o.type=k?'sine':'triangle';o.frequency.value=110*Math.pow(2,(root+iv)/12);o.detune.value=dt;f.type='lowpass';f.frequency.value=minor?600:900;
  g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.035,t+2);g.gain.linearRampToValueAtTime(.0001,t+8.5);o.connect(f).connect(g).connect(musBus);o.start(t);o.stop(t+8.6)}})};
 const roots=[0,-3,5,-5];let bar=0,nx=a.currentTime+.2;
 setInterval(()=>{if(!S.set.mus||document.hidden)return;const minor=nf>.5||eveK>.5||S.cur==='volkan',tr={home:0,mercan:2,volkan:-5}[S.cur]||0;while(nx<a.currentTime+1.5){const r=roots[bar%4]+tr;pad(r,nx,minor);const sc=minor?SCLN:SCL;
  for(let k=0;k<6;k++)if(Math.random()<.55){const n=sc[Math.floor(Math.random()*5)]+12*(1+Math.floor(Math.random()*2))+r;tone(220*Math.pow(2,n/12),1.4,'sine',.035,null,nx-a.currentTime+k*1.33+Math.random()*.1,musBus)}if(bar%3===1)bell(nx+4,musBus);if(minor&&bar%4===2)foghorn(nx+1,musBus);nx+=8;bar++}},700)}
const SFX={coin:()=>{tone(1319,.07,'triangle',.07);tone(1760,.18,'triangle',.06,null,.06);tone(2637,.12,'sine',.025,null,.1)},boss:()=>{noise(.9,.35,220);tone(70,1,'sawtooth',.09,40);tone(55,1.2,'sine',.15,35,.2)},wave:()=>noise(.6,.12,700),build:()=>{tone(300,.08,'triangle',.12);tone(400,.1,'triangle',.12,null,.1);noise(.08,.15)},
 merge:lv=>[523,659,784,1047,1319].slice(0,2+Math.min(lv,3)).forEach((f,i)=>tone(f*(1+lv*.05),.18,'triangle',.12,null,i*.07)),pop:()=>tone(500,.06,'sine',.1,800),
 done:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',.1,null,i*.08)),err:()=>tone(200,.15,'sawtooth',.06,140),light:()=>{tone(440,.6,'sine',.1,880);tone(660,.8,'triangle',.06,1320,.1)},
 hit:()=>{noise(.1,.3,2000);tone(160,.1,'square',.07,80)},roar:()=>{noise(.5,.3,300);tone(90,.5,'sawtooth',.08,50)},horn:()=>{tone(147,.6,'sawtooth',.06);tone(220,.6,'sawtooth',.04)},gacha:r=>[440,554,659,880,1109].slice(0,2+r).forEach((f,i)=>tone(f,.25,'triangle',.1,null,i*.1)),tap:()=>tone(700,.05,'sine',.08)};
SFX.claim=()=>[784,988,1175,1568].forEach((f,i)=>tone(f,.3,'sine',.07,null,i*.06));SFX.sheet=()=>{noise(.18,.05,900);tone(320,.12,'sine',.04,520)};SFX.toggle=on=>tone(on?660:440,.08,'triangle',.08,on?990:300);
// fener çanı ve sis düdüğü: özgün sentez, telifsiz
function bell(t,bus){const a=AC;[1,2.76,5.4].forEach((m,i)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=392*m;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05/(i+1),t+.01);g.gain.exponentialRampToValueAtTime(.0005,t+3.5/(i+1));o.connect(g).connect(bus);o.start(t);o.stop(t+3.6)})}
function foghorn(t,bus){const a=AC;for(const f of[98,98.6,147]){const o=a.createOscillator(),g=a.createGain(),fl=a.createBiquadFilter();o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=380;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.03,t+.4);g.gain.setValueAtTime(.03,t+1.8);g.gain.exponentialRampToValueAtTime(.0005,t+3);o.connect(fl).connect(g).connect(bus);o.start(t);o.stop(t+3.1)}}
function toggleMute(){const on=!(S.set.snd||S.set.mus);S.set.snd=S.set.mus=on?1:0;ac();if(on)startMusic();setVol();SFX.toggle(on);muteLbl();save()}
function muteLbl(){const b=$('sMute');if(b)b.innerHTML=`${S.set.snd||S.set.mus?'🔊':'🔇'}<small>${tx(S.set.snd||S.set.mus?'ui.ses_acik':'ui.ses_kapali')}</small>`}
const vib=p=>{if(!S.set.vib)return;try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const parts=[];const pgeo=new THREE.BoxGeometry(.07,.07,.07);
function burst(pos,c,n=10,sp=2.5,e){for(let k=0;k<n;k++){const m=new THREE.Mesh(pgeo,mat(c,e));m.position.copy(pos);scene.add(m);parts.push({m,v:new THREE.Vector3((Math.random()-.5)*sp,Math.random()*sp+1.5,(Math.random()-.5)*sp),life:.8+Math.random()*.4})}}
// ---------- UI YARDIMCI ----------
const fmt=n=>{n=Math.floor(n);const d=(v,s)=>(v>=100?Math.floor(v):v.toFixed(1)).toString().replace('.',DEC).replace(DEC+'0','')+s;return n>=1e9?d(n/1e9,tx('ui.u_b')):n>=1e6?d(n/1e6,tx('ui.u_m')):n>=1e4?d(n/1e3,tx('ui.u_k')):n.toLocaleString(locale)};
const fmtT=s=>{s=Math.max(0,Math.ceil(s));const m=Math.floor(s/60),h=Math.floor(m/60);return h?`${tx('ui.sa_dk',[h,m%60])}`:m?`${m}:${String(s%60).padStart(2,'0')}`:tx('ui.sec_s',[s])};
const IMGR={fish:1,wood:1,crys:1,gems:1};const RI=r=>IMGR[r]?`<img class="ri" src="img/i_${r}.webp" alt="">`:RIC[r];
const have=r=>r==='gems'?S.gems:r==='ticket'?S.tickets:S.res[r];
const costStr=c=>Object.entries(c).filter(([r,v])=>v).map(([r,v])=>`<span class="cs" style="color:${have(r)>=v?'#fff':'#ff8a8a'}">${RI(r)}${fmt(v)}</span>`).join(' ');
const rwStr=c=>Object.entries(c).filter(([r,v])=>v).map(([r,v])=>`<span class="cs">${RI(r)}${fmt(v)}</span>`).join(' ');
function floatTxt(x,y,t,c='#fff'){const d=document.createElement('div');d.className='float';d.textContent=t;d.style.left=x+'px';d.style.top=y+'px';d.style.color=c;$('fx').appendChild(d);setTimeout(()=>d.remove(),1000)}
function fly(res,x,y,n=4){const el=$('r_'+res);if(!el)return;const r=el.getBoundingClientRect();for(let k=0;k<n;k++){const d=document.createElement('div');d.className='fly';d.innerHTML=RI(res);d.style.left=x+(Math.random()-.5)*40+'px';d.style.top=y+(Math.random()-.5)*40+'px';$('fx').appendChild(d);
 setTimeout(()=>{d.style.left=r.left+'px';d.style.top=r.top+8+'px';d.style.transform='translate(-50%,-50%) scale(.6)'},30+k*45);setTimeout(()=>d.remove(),720+k*45)}}
let toastT;function toast(t){const d=$('toast');d.innerHTML=tl(t);d.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>d.style.opacity=0,2200)}
function modal(html,acts){clearTimeout(mT);$('modal').classList.remove('out');$('mbox').innerHTML=html+'<div class="acts"></div>';const a=$('mbox').querySelector('.acts');for(const[t,cls,fn]of acts){const b=document.createElement('button');b.className='btn '+(cls||'');b.innerHTML=t;b.onclick=()=>{closeModal();fn&&fn()};a.appendChild(b)}$('modal').classList.add('on')}
let mT=0;const closeModal=()=>{const m=$('modal');if(!m.classList.contains('on'))return;m.classList.add('out');clearTimeout(mT);mT=setTimeout(()=>{m.classList.remove('on','out')},170)};
const DEMO=`<div class="demo">${tx('ui.demo_gercek_odeme_alinmaz')}</div>`;
function confirmBuy(t,d,p,fn,item=''){const z=L.spendOf(S,now()),pr=L.priceNum(p);
 if(z.on&&z.sum+pr>z.lim){modal(`<h2>🛑 ${tx('m.lim_block_t')}</h2><p>${tx('m.lim_block',[fmtTL(z.sum),fmtTL(z.lim),p])}</p>${DEMO}`,[[tx('ui.kapat'),'x'],[tx('m.lim_set'),'',openLimit]]);return}
 modal(`<h2>${t}</h2><p>${d}</p><p class="sub">${z.on?tx('m.lim_info',[fmtTL(z.sum),fmtTL(z.lim)]):tx('m.lim_off_info')}</p>${DEMO}`,[[tx('ui.vazgec'),'x'],[`${tx('ui.satin_al',[p])}`,'g',()=>{const M=window.__monet;
 if(M&&M.ok()){M.purchase(pr,item).then(st=>{L.applyMonet(S,st);fn();save()}).catch(e=>{if(/sınır/i.test(e.message||''))M.me().then(st=>{L.applyMonet(S,st);save();confirmBuy(t,d,p,fn,item)});else toast('⚠️ '+tx('m.srv_err'))});return}
 z.sum=Math.round((z.sum+pr)*100)/100;(z.q=z.q||[]).push({p:pr,i:item});fn();save()}]])}
const fmtTL=n=>'₺'+n.toLocaleString(locale,{minimumFractionDigits:2,maximumFractionDigits:2});
function openLimit(){sheet(()=>{const z=L.spendOf(S,now());let h=hdr('🛡️ '+tx('m.lim_t'))+DEMO+`<div class="card"><div class="mid"><div class="nm">${z.on?tx('m.lim_on'):tx('m.lim_off')}</div><div class="sub">${tx('m.lim_month',[fmtTL(z.sum),fmtTL(z.lim)])}</div><div class="pbar"><i style="width:${Math.min(100,z.sum/z.lim*100)}%"></i></div><div class="sub">${tx('m.lim_why')}</div></div></div>`;
 if(z.pend)h+=`<div class="card"><div class="mid"><div class="sub">⏳ ${tx('m.lim_pend',[z.pend.on===0?tx('m.lim_off'):fmtTL(z.pend.lim),new Date(z.pend.at).toLocaleString(locale)])}</div></div></div>`;
 h+=`<div class="sec">${tx('m.lim_pick')}</div><div class="card" style="flex-wrap:wrap;gap:6px">${[100,250,500,1000,2500].map(v=>`<button class="btn ${v===z.lim&&z.on?'g':'o'} sm" data-a="lim" data-v="${v}">${fmtTL(v)}</button>`).join('')}<button class="btn x sm" data-a="lim" data-v="0">${tx('m.lim_disable')}</button></div><div class="sub">${tx('m.lim_rule')}</div>`;return h})}
function oddsThen(lbl,fn){const nm=r=>HEROES.filter(h=>h.r===r&&!h.season).map(h=>h.n).join(', ');const z=L.HEROES.find(h=>h.season);
 modal(`<h2>🎲 ${tx('m.odds_t')}</h2><table style="width:100%;font-size:13px;text-align:left;margin:6px 0"><tr><td>${RARITY[3].n}</td><td><b>5%</b></td><td class="sub">${nm(3)}</td></tr><tr><td>${RARITY[2].n}</td><td><b>25%</b></td><td class="sub">${nm(2)}</td></tr><tr><td>${RARITY[1].n}</td><td><b>70%</b></td><td class="sub">${nm(1)}</td></tr></table><p class="sub">${tx('m.odds_pity',[L.PITY,L.PITY-S.pity])}</p><p class="sub">${tx('m.odds_season',[z.n])}</p>${DEMO}`,[[tx('ui.vazgec'),'x'],[lbl,'g',fn]])}
const SEAS_RP='₺59,99';
function seasonCard(){const z=L.seasonOf(S),Z=L.SEASON,H=HEROES.find(h=>h.id===Z.hero),own=S.heroes[Z.hero],left=Math.max(0,Math.ceil((L.seasonEnd()-now())/864e5)),can=z.last!==L.dayIst(now())&&left>0,per=1+(z.route?Z.routeDaily:0),rem=Math.max(0,Z.need-z.marks);
 return `<div class="sec">🌫️ ${tx('m.season_t',[Z.id])}</div><div class="card" style="background:linear-gradient(135deg,#1d4a5a,#2a1a4a);border-color:#7fe0ff;flex-wrap:wrap"><div style="display:flex;gap:10px;align-items:center;min-width:100%">${port(H,own)}<div class="mid"><div class="nm">${H.n} <span class="tag">${tx('m.season_tag')}</span></div><div class="pbar"><i style="width:${Math.min(100,z.marks/Z.need*100)}%"></i></div><div class="sub">${own?tx('m.season_got'):tx('m.season_prog',[z.marks,Z.need,Math.ceil(rem/per)])}</div><div class="sub">${tx('m.season_end',[left,new Date(L.seasonEnd()).toLocaleDateString(locale)])}</div></div></div>
 <div class="sub" style="min-width:100%">${tx('m.season_free',[Z.need,Z.days])}</div><button class="btn o" data-a="mark" ${can?'':'disabled'}>${can?tx('m.mark_claim',[per]):tx('ui.yarin')}</button>${z.route?`<span class="tag" style="background:#3fb950">${tx('m.route_own')}</span>`:`<button class="btn g" data-a="route">🧭 ${tx('m.route')} ${SEAS_RP}</button>`}</div>`}

function spendGems(n,what,fn){if(S.gems<n){modal(`<h2>${tx('ui.elmas_yetmiyor')}</h2><p>${tx('ui.icin_gerekli_sende_var',[what,n,S.gems])}</p>`,[[tx('ui.kapat'),'x'],[tx('ui.magaza'),'g',openShop]]);return}
 modal(`<h2>${what}</h2><p><b>${n} 💎</b> ${tx('ui.harcansin_mi')}</p>`,[[tx('ui.vazgec'),'x'],[`${n} 💎 harca`,'g',()=>{S.gems-=n;fn();ui();save()}]])}
function watchAd(fn){if(S.buy.noads){fn();return}$('ad').classList.add('on');let n=3;const f=()=>$('adt').textContent=tx('ui.reklam_oynatiliyor')+n;f();const iv=setInterval(()=>{n--;f();if(n<=0){clearInterval(iv);$('ad').classList.remove('on');fn();SFX.coin()}},1000)}
function popAnim(g,a=.5){if(!g)return;tween(550,t=>{const e=E.el(t);const s=1+(1-e)*a*(t<.15?-1:1);g.scale.set(1/Math.sqrt(Math.abs(s)),s,1/Math.sqrt(Math.abs(s)))},()=>g.scale.set(1,1,1))}
const closeSheet=()=>{$('sheet').classList.remove('on');sheetFn=null};let sheetFn=null;
function sheet(fn){if(!$('sheet').classList.contains('on'))SFX.sheet();sheetFn=fn;renderSheet();$('sheet').classList.add('on')}
function renderSheet(){if(!sheetFn)return;const st=$('sheet').scrollTop;$('sheet').innerHTML=sheetFn();$('sheet').scrollTop=st;$('sheet').querySelectorAll('[data-a]').forEach(b=>b.onclick=ev=>{ac();SFX.tap();ACT[b.dataset.a](b.dataset.v,ev)});const c=$('sheet').querySelector('.close');if(c)c.onclick=closeSheet}
const hdr=t=>`<h3><span>${t}</span><button class="btn x close">✕</button></h3>`;
function resErr(e){if(e==='RES'){SFX.err();toast(tx('ui.yetersiz_kaynak'));return true}if(e==='BUILDERS'){SFX.err();modal(`<h2>${tx('ui.insaatcilar_mesgul')}</h2><p>${tx('ui.insaatcinin_hepsi_calisiyor_bitmesini',[L.builderCount(S)])}</p>`,[[tx('ui.tamam'),'x'],[tx('ui.magaza'),'g',openShop]]);return true}if(e){SFX.err();toast(e);return true}return false}
const kPos=k=>k==='fener'?new THREE.Vector3(0,1,0):tpos(k).setY(.4);
// ---------- AKSİYONLAR ----------
const ACT={
 up:k=>{const e=L.startUp(S,k,now());if(resErr(e))return;SFX.build();vib(20);burst(kPos(k),0xc8a070,10,1.5);k==='fener'?syncFener():syncOne(k);closeSheet();ui();save()},
 speed:k=>{const b=k==='fener'?S.fener:S.g[k];const rem=(b.end-now())/1000;{const c=L.speedGems(rem,S);if(!c){b.end=now();SFX.coin();vib(15);return}spendGems(c,`${tx('ui.hizlandir_kaldi',[fmtT(rem)])}`,()=>{b.end=now()})}},
 w:v=>{const[i,j,d]=v.split(':');const k=i+','+j;if(!L.assign(S,k,+d)){SFX.err();if(+d>0)toast(L.idle(S)<=0?tx('ui.bosta_kurtulan_yok_barinak'):tx('ui.bu_bina_dolu_birlestir'))}else SFX.tap();renderSheet();ui();tutCheck()},
 light:()=>{const e=L.setLight(S,!S.fener.on);if(resErr(e))return;if(S.fener.on){SFX.light();vib(30);cam.shake=.1;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,24,3,1)}renderSheet();ui();save();tutCheck()},
 build:v=>{const[k,kind]=v.split('|');const e=L.build(S,k,kind);if(resErr(e))return;SFX.build();vib(15);const g=syncOne(k);popAnim(g,.5);burst(tpos(k).setY(.3),0xc8a070,12,1.8);closeSheet();ui();save();tutCheck()},
 cleanse:k=>{const e=L.cleanse(S,k);if(resErr(e))return;SFX.light();burst(tpos(k).setY(.6),0xb98cff,20,2.5,1);syncOne(k);closeSheet();ui();save()},
 train:v=>{const[t,n]=v.split(':');const e=L.startTrain(S,t,+n,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 trainSpeed:()=>{const rem=(S.train.end-now())/1000;spendGems(L.speedGems(rem,S),tx('ui.egitimi_hizlandir'),()=>{S.train.end=now()})},
 tech:id=>{const e=L.startResearch(S,id,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 techSpeed:()=>{const rem=(S.research.end-now())/1000;spendGems(L.speedGems(rem,S),tx('ui.arastirmayi_hizlandir'),()=>{S.research.end=now()})},
 call:v=>recruitN(v),fight:()=>battle(S.stage),convoy:()=>{const r=L.convoyFight(S,now(),Math.random);if(r.rw)pveCheck('convoy',S.stage,r.rw,false);if(r.err){toast(r.err==='Ada 3 gerekli'?tx('ui.cv_locked'):tx('ui.cv_wait'));return}battle(S.stage,null,r)},
 daily:id=>{if(resErr(L.claimDaily(S,id)))return;SFX.claim();fly('gems',innerWidth/2,innerHeight/2);renderSheet();ui();save()},
 quest:()=>claimQuest(),tab:v=>{taskTab=v;renderSheet()},
 weekly:id=>{if(resErr(L.claimWeekly(S,id,now())))return;SFX.done();fly('gems',innerWidth/2,innerHeight/2,3);renderSheet();ui();save()},
 ach:id=>{if(resErr(L.claimAch(S,id)))return;SFX.done();fly('gems',innerWidth/2,innerHeight/2,3);renderSheet();ui();save()},
 hero:id=>openHero(id),heroes:()=>openHeroes(),
 hlv:id=>{const e=L.heroUp(S,id);if(resErr(e))return;SFX.merge(2);vib(15);renderSheet();ui();save()},
 ushBuy:()=>{const e=L.ushBuy(S,Date.now());if(e==='MAX'){toast(tx('ui.ush_max'));return}if(resErr(e)||e)return;SFX.merge(1);renderSheet();ui();save()},
ushGive:id=>{if(L.ushGive(S,id,1))return;SFX.merge(1);renderSheet();save()},
htal:id=>{const e=L.talUp(S,id);if(e==='SH'){SFX.err();toast(tx('ui.need_shards'));return}if(resErr(e)||e)return;SFX.gacha(2);vib(20);toast('🌟 '+tx('ui.talent_up'));renderSheet();ui();save()},
 heq:v=>{const[id,k]=v.split(':');const e=L.eqUp(S,id,k);if(resErr(e)||e)return;SFX.merge(2);vib(15);renderSheet();ui();save()},
 hstar:id=>{const e=L.starUp(S,id);if(resErr(e))return;SFX.gacha(3);vib([30,30,60]);toast(tx('ui.yildiz_yukseldi'));renderSheet();ui();save()},
 gear:id=>{const e=L.upGear(S,id);if(resErr(e))return;SFX.build();vib(15);renderSheet();ui();save()},
 boss:()=>bossFight(),pass:v=>{const[i,p]=v.split(':');if(resErr(L.claimPass(S,+i,+p)))return;SFX.coin();renderSheet();ui();save()},
 passBuy:()=>confirmBuy(tx('ui.fener_bileti_premium'),tx('ui.bu_sezonun_premium_odul'),'₺119,99',()=>{S.pass.prem=1;S.vipPts+=120;SFX.done();toast(tx('ui.demo_premium_acildi'));renderSheet();ui();save()},'pass'),
 offer:()=>{const o=L.offerOf(now()),d=L.day(now());if(S.buy['of'+d])return;confirmBuy(o.ic+' '+o.n,o.d+tx('ui.bugunun_teklifi_yarin_degisir'),o.p,()=>{L.addRes(S,o.g);S.vipPts+=o.vip;S.buy['of'+d]=1;SFX.done();toast(tx('ui.demo_satin_alma_tamamlandi'));renderSheet();ui();save()},'offer')},
 isl:id=>{const e=L.claimIsland(S,id);if(resErr(e))return;SFX.done();toast(`${tx('ui.artik_senin',[L.ISLANDS[id].n])}`);goIsland(id)},go:id=>goIsland(id),post:()=>{if(resErr(L.upPost(S)))return;SFX.build();syncBeacon();renderSheet();ui();save()},
 set:k=>{S.set[k]=S.set[k]?0:1;SFX.toggle(S.set[k]);setTimeout(muteLbl);if(k==='mus'&&S.set.mus){ac();startMusic()}setVol();renderSheet();save()},
 reset:()=>modal(`<h2>${tx('ui.sifirla')}</h2><p>${tx('ui.tum_ilerleme_silinir_emin')}</p>`,[[tx('ui.vazgec'),'x'],[tx('ui.sil_ve_bastan_basla'),'r',()=>{window.__noSave=1;localStorage.removeItem(KEY);location.reload()}]]),
 lang:()=>{SFX.tap();modal(`<h2>${tx('ui.dil')}</h2><div class="langs">${Object.entries(LANGS).map(([c,n])=>`<button class="btn ${c===lang?'o':'x'}" data-l="${c}">${n}</button>`).join('')}</div>`,[[tx('ui.kapat'),'']]);$('mbox').querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{if(b.dataset.l!==lang)setLang(b.dataset.l)})},
 buy:id=>{const it=SHOP.find(x=>x.id===id);confirmBuy(it.ic+' '+it.n,it.d,it.p,()=>{it.f();S.vipPts+=it.vip||0;if(it.once)S.buy[id]=1;SFX.done();vib([20,30,20]);toast(tx('ui.demo_satin_alma_tamamlandi'));renderSheet();ui();save()},id)},
 gemItem:i=>{const g=GEMSHOP[+i];spendGems(g.c,g.n,()=>{g.f();SFX.coin();renderSheet()})},
 ad:()=>watchAd(()=>{S.gems+=10;const d=L.day(now()),a=S.buy.adDay||'';S.buy.adDay=d+':'+(a.startsWith(d)?+a.split(':')[1]+1:1);ui();renderSheet();save()}),
 mark:()=>{const M=window.__monet,had=!!S.heroes[L.SEASON.hero];if(M&&M.ok()){const b=L.seasonOf(S).marks;M.claimMark().then(st=>{L.applyMonet(S,st);const n=L.seasonOf(S).marks-b;SFX.coin();toast(tx('m.mark_got',[n]));if(!had&&S.heroes[L.SEASON.hero])toast('🌫️ '+tx('m.season_got'));renderSheet();ui();save()}).catch(()=>toast('⚠️ '+tx('m.srv_err')));return}
  const n=L.claimMark(S,now());if(!n)return;SFX.coin();toast(tx('m.mark_got',[n]));if(S.heroes[L.SEASON.hero]&&L.seasonOf(S).marks>=L.SEASON.need&&L.seasonOf(S).marks-n<L.SEASON.need)toast('🌫️ '+tx('m.season_got'));renderSheet();ui();save()},
 route:()=>{const z=L.seasonOf(S);if(z.route)return;confirmBuy('🧭 '+tx('m.route'),tx('m.route_d',[L.SEASON.routeDaily,L.SEASON.need]),SEAS_RP,()=>{z.route=1;S.gems+=300;S.vipPts+=60;SFX.done();toast(tx('ui.demo_satin_alma_tamamlandi'));renderSheet();ui();save()},'route')},
 limOpen:()=>openLimit(),
 lim:v=>{const M=window.__monet;if(M&&M.ok()){const on=+v!==0;M.setLimit(on?+v:L.spendOf(S,now()).lim,on).then(st=>{L.applyMonet(S,st);SFX.tap();toast(S.spend.pend?tx('m.lim_wait'):tx('m.lim_saved'));renderSheet();save()}).catch(()=>toast('⚠️ '+tx('m.srv_err')));return}
  const z=L.spendOf(S,now());v=+v;const at=now()+864e5;if(v===0){z.pend={lim:z.lim,on:0,at}}else if(z.on&&v>z.lim){z.pend={lim:v,on:1,at}}else{z.lim=v;z.on=1;delete z.pend}SFX.tap();toast(z.pend?tx('m.lim_wait'):tx('m.lim_saved'));renderSheet();save()},
 monthly:()=>{S.gems+=100;S.monthlyClaim=L.day(now());SFX.coin();renderSheet();ui();save()},
 open:k=>{const ks=Object.keys(S.g).filter(x=>S.g[x].k===k);if(ks.length)openB(ks[0]);else toast(KINDS[k].n+tx('ui.yok_bos_bir_karoya'))},
};
// ---------- PANELLER ----------
const timerCard=(k,b)=>{const rem=(b.end-now())/1000;return `<div class="card"><div class="ic">🏗️</div><div class="mid"><div class="nm">${tx('ui.yukseltiliyor',[fmtT(rem)])}</div><div class="pbar"><i style="width:${(1-rem/b.dur)*100}%"></i></div></div><button class="btn g" data-a="speed" data-v="${k}" id="speedBtn">${L.speedGems(rem,S)?`⚡ ${L.speedGems(rem,S)}💎`:tx('ui.ucretsiz')}</button></div>`};
function openFener(){sheet(()=>{const f=S.fener,R=L.safeR(S);let h=hdr(`${tx('ui.buyuk_fener_sv',[f.lv])}`)+`<div class="sub" style="margin:-4px 0 10px">${tx('ui.isik_huzmesi_sisi_geri')}</div>`;
 h+=`<div class="card"><div class="ic">${L.lit(S)?'💡':'🌑'}</div><div class="mid"><div class="nm">${L.lit(S)?tx('ui.isik_yaniyor'):tx('ui.isik_sonuk')}</div><div class="sub">${tx('ui.tuketim_dk_sis_gecesi',[L.crysUse(S).toFixed(1).replace('.',DEC)||(.8+f.lv*.5).toFixed(1).replace('.',DEC),L.nightNeed(S)])}${L.lit(S)?'':tx('ui.karanlikta_uretim_50')}</div></div><button class="btn ${f.on?'x':'o'}" data-a="light" id="lightBtn">${f.on?tx('ui.sondur'):tx('ui.yak_btn')}</button></div>`;
 h+=`<div class="card"><div class="ic">🧭</div><div class="mid"><div class="nm">${tx('ui.guvenli_alan',[R*2+1,R*2+1])}</div><div class="sub">${tx('ui.bina_seviye_siniri_sv',[L.maxLv(S)])}${R<GR?tx('ui.sonraki_seviyede_alan_genisler'):''}</div></div></div>`;
 if(f.end)h+=timerCard('fener',f);else if(f.lv<L.FENER_MAX){const e=L.checkUp(S,'fener');h+=`<div class="sec">${tx('ui.sv_e_yukselt',[f.lv+1])}</div><div class="card"><div class="mid"><div>${costStr(L.fenerCost(f.lv))}</div><div class="sub">${tx('ui.alan_sinir_sv',[fmtT(L.fenerTime(f.lv,S)),Math.min(GR,f.lv+2)*2+1,Math.min(GR,f.lv+2)*2+1,f.lv+2])}</div></div><button class="btn o" data-a="up" data-v="fener" id="upBtn">${tx('ui.yukselt')}</button></div>`}
 return h})}
function openB(k){sheet(()=>{const b=S.g[k];if(!b)return hdr('—');const T=KINDS[b.k];let h=hdr(`${T.ic} ${T.n} · ${LV}${b.lv}`)+`<div class="sub" style="margin:-4px 0 10px">${T.d}</div>`;
 if(b.fog){return h+`<div class="card" style="background:#4a2a6a88"><div class="ic">👻</div><div class="mid"><div class="nm">${tx('ui.sis_bu_binayi_ele')}</div><div class="sub">${tx('ui.uretmez_isci_alamaz_isik')}</div></div><button class="btn g" data-a="cleanse" data-v="${k}" id="cleanseBtn">${costStr(L.cleanseCost(b,S))}</button></div>`}
 if(L.hasJob(b.k)){const w=b.w||0;const[i,j]=L.unkey(k);h+=`<div class="card"><div class="ic">👷</div><div class="mid"><div class="nm">${L.JOB[b.k]} ${w}/${L.maxW(b.lv)}</div><div class="sub">${T.res?`${tx('ui.uretim_dk',[L.rate(S,k).toFixed(1).replace('.',DEC),RIC[T.res]])}`:tx('ui.egitim_hizi')+(w*25)+'%'} ${tx('ui.bosta',[L.idle(S)])}</div></div><button class="btn sm r" data-a="w" data-v="${i}:${j}:-1">−</button><button class="btn sm" data-a="w" data-v="${i}:${j}:1" id="wplus">+</button></div>`}
 if(b.k==='hut')h+=`<div class="sub">${tx('ui.kisilik_yer_toplam',[b.lv*2,S.surv,L.cap(S)])}</div>`;
 if(b.k==='yard')h+=yardHtml();if(b.k==='lab')h+=labHtml();
 h+=`<div class="card" style="background:#1f6f8b44"><div class="ic">🔀</div><div class="mid"><div class="nm">${tx('ui.birlestir_ucretsiz_aninda')}</div><div class="sub">${tx('ui.ayni_seviyedeki_iki_binasini',[T.n,b.lv+1])}</div></div></div>`;
 if(b.end)h+=timerCard(k,b);else{const e=L.checkUp(S,k);const lock=e&&e!=='RES'&&e!=='BUILDERS';h+=`<div class="sec">${tx('ui.ya_da_sv_e',[b.lv+1])}</div><div class="card"><div class="mid"><div>${costStr(L.upCost(b.k,b.lv))}</div><div class="sub">⏱ ${fmtT(L.upTime(b.lv,S))}${lock?' · <span style="color:#ff8a8a">'+e+'</span>':''}</div></div><button class="btn o" data-a="up" data-v="${k}" id="upBtn" ${lock?'disabled':''}>${tx('ui.yukselt')}</button></div>`}
 return h})}
function openBuild(k){sheet(()=>{let h=hdr(tx('ui.bos_karo_ne_kuralim'))+`<div class="sub" style="margin:-4px 0 10px">${tx('ui.yeni_binalar_sv1_baslar')}</div>`;
 for(const kind of L.ISLANDS[S.cur].kinds){const T=KINDS[kind],e=L.checkBuild(S,k,kind),lock=e&&e!=='RES';h+=`<div class="card" style="${lock?'opacity:.5':''}"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} <span class="sub">(${L.count(S,kind)})</span></div><div class="sub">${lock?'🔒 '+e:T.d}</div></div><button class="btn" data-a="build" data-v="${k}|${kind}" id="bk_${kind}" ${lock?'disabled':''}>${costStr(T.cost)}</button></div>`}return h})}
function gearHtml(){let h=`<div class="sec">${tx('ui.gemi_techizati')}</div>`;for(const id in L.GEAR){const G_=L.GEAR[id],lv=S.gear[id]||0,mx=lv>=L.GEAR_MAX,rq=L.gearReq(lv),lk=L.yardLv(S)<rq;
 h+=`<div class="card"><div class="ic">${G_.ic}</div><div class="mid"><div class="nm">${G_.n} ${lv}/${L.GEAR_MAX}</div><div class="sub">${G_.d}${mx?'':` · ${lk?`<span style="color:#ff8a8a">${tx('ui.tersane_sv',[rq])}</span>`:costStr(L.gearCost(lv))}`}</div></div><button class="btn" data-a="gear" data-v="${id}" ${mx||lk?'disabled':''}>⬆️</button></div>`}return h}
function yardHtml(){let h=gearHtml()+`<div class="sec">${tx('ui.filo_tayfasi_egit')}</div>`;if(S.train){const rem=(S.train.end-now())/1000;h+=`<div class="card"><div class="ic">${TROOPS[S.train.t].ic}</div><div class="mid"><div class="nm">${S.train.n} ${TROOPS[S.train.t].n} · ${fmtT(rem)}</div><div class="pbar"><i style="width:${(1-rem/S.train.dur)*100}%"></i></div></div><button class="btn g" data-a="trainSpeed">⚡ ${L.speedGems(rem,S)}💎</button></div>`}
 for(const t in TROOPS){const T=TROOPS[t];h+=`<div class="card"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} <span class="sub">(${S.troops[t]})</span></div><div class="sub">⚔️${T.atk} ❤️${T.hp} · 10 adet: ${costStr(L.trainCost(t,10))} · ⏱${fmtT(L.trainTime(S,t,10))}</div></div><button class="btn" data-a="train" data-v="${t}:10" ${S.train?'disabled':''}>+10</button></div>`}return h}
function labHtml(){let h='';if(S.research){const rem=(S.research.end-now())/1000,T=TECH.find(x=>x.id===S.research.id);h+=`<div class="card"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} · ${fmtT(rem)}</div><div class="pbar"><i style="width:${(1-rem/S.research.dur)*100}%"></i></div></div><button class="btn g" data-a="techSpeed">⚡ ${L.speedGems(rem,S)}💎</button></div>`}
 let br='';for(const T of TECH){if(T.br!==br){br=T.br;h+=`<div class="sec">🌳 ${br}</div>`}const lv=S.tech[T.id]||0,e=L.checkTech(S,T.id),rq=T.req?Object.entries(T.req).map(([id,l])=>TECH.find(x=>x.id===id).n+' '+l).join(', '):'';const lock=e&&lv<T.max;
 h+=`<div class="card" style="margin-left:${T.req?16:0}px;${lock&&!L.techReqOK(S,T)?'opacity:.5':''}"><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} ${lv}/${T.max}</div><div class="pbar"><i style="width:${lv/T.max*100}%"></i></div><div class="sub">${T.d}${lv<T.max?' · '+costStr(L.techCost(T.id,lv))+' · ⏱'+fmtT(L.techTime(lv)):''}${rq?' · 🔗 '+rq:''}${lock?' · <span style="color:#ff8a8a">'+e+'</span>':''}</div></div><button class="btn" data-a="tech" data-v="${T.id}" ${S.research||e?'disabled':''}>${tx('ui.arastir')}</button></div>`}return h}
function openWork(){sheet(()=>{let h=hdr(tx('ui.isci_atamasi'))+`<div class="card"><div class="ic">👥</div><div class="mid"><div class="nm">${tx('ui.kurtulanlar_bosta',[S.surv,L.cap(S),L.idle(S)])}</div><div class="sub">${tx('ui.sallar_ve_batiklarla_yeni',[L.fishUse(S).toFixed(1).replace('.',DEC)])}</div></div></div>`;
 const ks=Object.keys(S.g).filter(k=>L.hasJob(S.g[k].k)).sort((a,b)=>S.g[a].k.localeCompare(S.g[b].k));
 for(const k of ks){const b=S.g[k],T=KINDS[b.k];const[i,j]=L.unkey(k);h+=`<div class="card" ${b.fog?'style="opacity:.5"':''}><div class="ic">${T.ic}</div><div class="mid"><div class="nm">${T.n} ${LV}${b.lv} · ${L.JOB[b.k]} ${b.w||0}/${L.maxW(b.lv)}</div><div class="sub">${b.fog?tx('ui.sisli'):T.res?L.rate(S,k).toFixed(1).replace('.',DEC)+' '+RIC[T.res]+'/dk':tx('ui.egitim')+((b.w||0)*25)+'%'}</div></div><button class="btn sm r" data-a="w" data-v="${i}:${j}:-1">−</button><button class="btn sm" data-a="w" data-v="${i}:${j}:1">+</button></div>`}
 return h})}
const port=(h,st,big)=>`<div class="port r${h.r}" style="${big?'width:84px;height:84px':''}"><img src="img/cap_${h.img}.webp" loading="lazy" alt="${h.n}">${st?`<b class="lv">${st.lv||1}</b>`:''}<small>${'★'.repeat(st?st.star:0)}</small></div>`;
function openHeroes(){sheet(()=>{const free=S.freeCall!==L.day(now());let h=hdr(tx('ui.h_kaptanlar'))+`<div class="sub" style="margin-bottom:10px">${tx('ui.en_guclu_3_kaptan')}</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px;margin-bottom:12px">`;
 for(const H of HEROES){const st=S.heroes[H.id];h+=`<div data-a="hero" data-v="${H.id}" style="text-align:center;${st?'':'opacity:.4;filter:grayscale(.85)'}"><div style="display:flex;justify-content:center">${port(H,st)}</div><div class="nm" style="font-size:11px;margin-top:9px">${H.n}</div><div class="sub" style="font-size:10px">${st?'⚔️'+L.heroPower(H,st):RARITY[H.r].n}</div></div>`}
 h+=`</div><div class="sec">${tx('ui.kaptan_cagir')}</div><div class="card" style="flex-wrap:wrap"><div class="mid" style="min-width:100%"><div class="sub">${tx('ui.gercek_oranlar_efsanevi_5')} <b>${tx('ui.cagrida_efsanevi_garanti',[L.PITY])}</b> ${tx('ui.kalan_tekrar_cikan_kaptan',[L.PITY-S.pity])}</div></div>
 <button class="btn o" data-a="call" data-v="0" ${free?'':'disabled'} id="freeCall">${free?tx('ui.ucretsiz_2'):tx('ui.yarin')}</button><button class="btn" data-a="call" data-v="t" ${S.tickets?'':'disabled'}>🎟️ ${S.tickets}</button><button class="btn g" data-a="call" data-v="1">1× · 30💎</button><button class="btn g" data-a="call" data-v="10">10× · 270💎</button></div>`;return h})}
function openHero(id){sheet(()=>{const H=HEROES.find(x=>x.id===id),st=S.heroes[id];let h=`<h3><span><button class="btn x sm" data-a="heroes">‹</button> ${H.n}</span><button class="btn x close">✕</button></h3>`;
 h+=`<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${port(H,st,1)}<div class="mid"><div class="nm">${RARITY[H.r].n} · ${H.role}</div><div class="sub">${st?`${tx('ui.sv_guc',[st.lv,L.heroCap(st),L.heroPower(H,st)])}`:tx('ui.henuz_cagrilmadi')}</div><div class="sub">✨ <b>${H.sk.n}</b>: ${H.sk.d} +${Math.round((st?L.skillVal(H,st):H.sk.v)*100)}%</div></div></div>`;
 if(!st)return h+`<div class="sub">${H.season?tx('m.season_hint',[L.SEASON.need]):tx('ui.kaptan_cagir_ile_bulabilirsin')}</div>`;
 const need=st.star*10;h+=`<div class="card"><div class="ic">⬆️</div><div class="mid"><div class="nm">${tx('ui.seviye_atla')}</div><div class="sub">${st.lv>=L.heroCap(st)?tx('ui.yildiz_sinirina_ulasti'):costStr(L.heroLvCost(st.lv))}</div></div><button class="btn" data-a="hlv" data-v="${id}" ${st.lv>=L.heroCap(st)?'disabled':''}>${tx('ui.yukselt')}</button></div>`;
 h+=`<div class="card"><div class="ic">⭐</div><div class="mid"><div class="nm">${tx('ui.yildiz_5',[st.star])}</div><div class="pbar"><i style="width:${Math.min(1,st.sh/need)*100}%"></i></div><div class="sub">${tx('ui.parca_yetenek_25_sinir',[st.sh,need])}</div></div><button class="btn g" data-a="hstar" data-v="${id}" ${st.sh>=need&&st.star<5?'':'disabled'}>${tx('ui.yildizla')}</button></div>`;
 const tc=L.talCost(st),tl=st.tal||0;h+=`<div class="sec">🌟 ${tx('ui.talent')}</div><div class="card"><div class="ic">🌟</div><div class="mid"><div class="nm">${tx('ui.talent_lv',[tl,L.TAL_MAX])}</div><div class="sub">${tx('ui.talent_d',[tl*6,Math.min(L.TAL_MAX,tl+1)*6])}</div><div class="sub">${tl>=L.TAL_MAX?tx('ui.maxed'):`⭐${st.sh} + ✨${L.ushOf(S)} / ${tc.sh} · ${costStr({crys:tc.crys})}`}</div></div><button class="btn g" data-a="htal" data-v="${id}" ${tl<L.TAL_MAX&&st.sh+L.ushOf(S)>=tc.sh&&S.res.crys>=tc.crys?'':'disabled'}>${tx('ui.yukselt')}</button></div>`;
 {const x=S.ushx?.d===L.day(Date.now())?S.ushx.n:0;h+=`<div class="card"><div class="ic">✨</div><div class="mid"><div class="nm">${tx('ui.ush_t',[L.ushOf(S)])}</div><div class="sub">${tx('ui.ush_d')}</div><div class="sub">${tx('ui.ush_x',[L.USH_X.crys,x,L.USH_X.day])}</div></div><div style="display:grid;gap:4px"><button class="btn sm" data-a="ushBuy" ${x<L.USH_X.day&&S.res.crys>=L.USH_X.crys?'':'disabled'}>🔮→✨</button><button class="btn sm g" data-a="ushGive" data-v="${id}" ${L.ushOf(S)>0?'':'disabled'}>✨→⭐</button></div></div>`}
 h+=`<div class="sec">🎒 ${tx('ui.gear_t')} · +${Math.round((L.heroMul(st)-1)*100)}% ⚔️</div>`;for(const G of L.HGEAR){const l=st.eq?.[G.k]||0;h+=`<div class="card"><div class="ic">${G.i}</div><div class="mid"><div class="nm">${tx('ui.gear_'+G.k)} · ${tx('ui.talent_lv',[l,L.EQ_MAX])}</div><div class="sub">${tx('ui.gear_d')} · ${l>=L.EQ_MAX?tx('ui.maxed'):costStr(L.eqCost(st,G))}</div></div><button class="btn" data-a="heq" data-v="${id}:${G.k}" ${l>=L.EQ_MAX?'disabled':''}>${tx('ui.yukselt')}</button></div>`}
 return h})}
function recruitN(n){const go=k=>{const out=[];for(let i=0;i<k;i++)out.push(L.recruit(S,Math.random));L.dailyInc(S,'recruit',k,now());showGacha(out);ui();save();renderSheet()};
 if(n==='t'){if(S.tickets<1)return;oddsThen('🎟️ ×1',()=>{if(S.tickets<1)return;S.tickets--;go(1)})}else if(+n===0){S.freeCall=L.day(now());go(1)}else{const c=+n===1?30:270;oddsThen(`${n}× · ${c}💎`,()=>spendGems(c,`${tx('ui.kaptan_cagir_2',[n])}`,()=>go(+n)))}}
function showGacha(out){const best=Math.max(...out.map(o=>o.h.r)),RC={3:'#ffcf3a',2:'#c79bff',1:'#7fd3ff'},RN={3:tx('ui.efsanevi'),2:tx('ui.epik'),1:tx('ui.nadir')},one=out.length===1,st=one?.5:.32;
 vib(30);out.forEach((o,i)=>setTimeout(()=>{SFX.gacha(o.h.r);if(o.h.r===3){vib([50,40,80]);cam.shake=.25}else vib(12)},(.45+i*st)*1000));
 modal(`<div class="rays ${best===3?'gold':''}"></div><h2>${best===3?tx('ui.efsanevi_kaptan'):tx('ui.kaptan_cagrisi')}</h2><div class="gcs ${one?'one':''}">${out.map((o,i)=>`<div class="gc r${o.h.r}" style="--c:${RC[o.h.r]};--d:${.45+i*st}s"><div class="gb">⚓</div><div class="gf">${port(o.h,S.heroes[o.h.id],one)}<div class="gn">${o.h.n}</div><div class="gr">${RN[o.h.r]}</div><div class="gs" style="color:${o.isNew?'#7dff8a':'#a9d8e8'}">${o.isNew?tx('ui.yeni'):tx('ui.10_parca')}</div></div></div>`).join('')}</div>`,[[tx('ui.tamam'),'o']]);$('mbox').classList.add('rwbox')}
function seaMap(){const st=S.stage;let h='<div class="sea">';const n0=Math.max(1,st-3);for(let n=n0;n<n0+7;n++){const i=n-n0;const x=12+i*13.5,y=50+Math.sin(n*1.7)*28;const c=n<st?'won':n===st?'cur':'fog';
 h+=`<div class="node ${c}" style="left:${x}%;top:${y}%">${n<st?'🏝️':n===st?FOES[L.stageFoe(n)].ic:'<i class="fd"></i>'}<small>${n}</small></div>`}return h+`<div class="ship" style="left:`+(12+(st-n0)*13.5-6)+'%;top:'+(50+Math.sin(st*1.7)*28+12)+'%">⛵</div></div>'}
function openMap(){sheet(()=>{const st=S.stage,B=FOES[L.stageFoe(st)],my=L.armyPower(S),need=L.stagePower(st);const tr=Object.values(S.troops).reduce((a,b)=>a+b,0);
 let h=hdr(tx('ui.sisli_deniz'))+seaMap()+`<div class="card" style="flex-direction:column;align-items:stretch;background:linear-gradient(135deg,#1f6f8b,#14304a)"><div style="display:flex;align-items:center;gap:10px"><img src="img/f_${B.img}.webp" loading="lazy" style="width:64px;height:64px;object-fit:contain"><div class="mid"><div class="nm">${tx('ui.isl_n',[st,L.islandName(st)])}</div><div class="sub">${tx('ui.guc_filon',[B.n,fmt(need)])} <b style="color:${my>=need?'#7dff8a':'#ff8a8a'}">⚔️ ${fmt(my)}</b></div><div class="sub">Ganimet: ${costStr(L.stageReward(st))} · 👤+${L.stageRescue(st)} kurtulan</div></div></div>
 <button class="btn o" data-a="fight" style="margin-top:8px;font-size:16px" id="fightBtn" ${tr+Object.keys(S.heroes).length?'':'disabled'}>${tx('ui.filoyu_gonder')}</button></div>
 <div class="card"><div class="mid">${Object.entries(TROOPS).map(([t,T])=>`${T.ic} ${T.n}: <b>${S.troops[t]}</b>`).join(' · ')}<div class="sub">${tx('ui.kaptanlar_kurtarilan_ada_uretim',[L.team(S).map(x=>x.ic+' '+x.n).join(', ')||'—',st-1,Math.round(L.islandBonus(S)*100)])}</div></div><button class="btn" data-a="open" data-v="yard">${tx('ui.tersane')}</button></div>
 ${convoyCard()}<div class="sub">${tx('ui.ipucu_adanin_aciklarindaki_isaretli')}</div>`;return h})}
function convoyCard(){const c=L.convoyState(S,now());if(!c.open)return `<div class="card" style="opacity:.6"><div class="ic">🏴‍☠️</div><div class="mid"><div class="nm">${tx('ui.cv_t')}</div><div class="sub">${tx('ui.cv_locked')}</div></div></div>`;
 return `<div class="card" style="background:linear-gradient(135deg,#5a2a2a,#22161a)"><div class="ic">🏴‍☠️</div><div class="mid"><div class="nm">${tx('ui.cv_t')}</div><div class="sub">${tx('ui.cv_d')}</div><div class="sub">⚔️ ${fmt(L.convoyPower(S))} · ${costStr(L.convoyReward(S))} · 🎟️25%</div></div>${c.ready?`<button class="btn o" data-a="convoy">${tx('ui.cv_go')}</button>`:`<button class="btn" disabled>⏳ ${fmtT(c.left/1000)}</button>`}</div>`}
let taskTab='c',noSave=0;
function openTasks(){sheet(()=>{L.dailyReset(S,now());const T=(v,n)=>`<button class="btn ${taskTab===v?'o':'x'}" data-a="tab" data-v="${v}">${n}</button>`;let h=hdr(tx('ui.gorevler'))+`<div class="tabs">${T('c',tx('ui.hikaye'))}${T('d',tx('ui.gunluk'))}${T('w',tx('ui.haftalik'))}${T('a',tx('ui.basarim'))}</div>`;L.weeklyReset(S,now());const OB=d=>d.on?` <span class="tag">🌐 ${tx('ui.online_tag')}</span>`:'';
 if(taskTab==='d'){for(const d of L.DAILY){const v=Math.min(S.daily.p[d.id]||0,d.n),c=S.daily.c[d.id];h+=`<div class="card"><div class="ic">${c?'✅':'📌'}</div><div class="mid"><div class="nm">${d.t}${OB(d)}</div><div class="pbar"><i style="width:${v/d.n*100}%"></i></div><div class="sub">${v}/${d.n} · ${RI('gems')}${d.g} · 🎫+30 XP</div></div>${!c&&v>=d.n?`<button class="btn o" data-a="daily" data-v="${d.id}">${tx('ui.al')}</button>`:''}</div>`}h+=`<div class="sub">${tx('ui.gunluk_gorevler_her_gun')}</div>`}
 else if(taskTab==='w'){const left=Math.max(1,Math.ceil((Date.parse(S.weekly.w+'T00:00:00+03:00')+7*864e5-now())/864e5));for(const d of L.WEEKLY){const v=Math.min(S.weekly.p[d.id]||0,d.n),c=S.weekly.c[d.id];h+=`<div class="card"><div class="ic">${c?'✅':'🗓️'}</div><div class="mid"><div class="nm">${d.t}${OB(d)}</div><div class="pbar"><i style="width:${v/d.n*100}%"></i></div><div class="sub">${v}/${d.n} · ${RI('gems')}${d.g} · 🎫+60 XP</div></div>${!c&&v>=d.n?`<button class="btn o" data-a="weekly" data-v="${d.id}">${tx('ui.al')}</button>`:''}</div>`}h+=`<div class="sub">${tx('ui.haftalik_yenilenir',[left])}</div>`}
 else if(taskTab==='a'){const ok=Object.keys(S.ach).length;h+=`<div class="sub" style="margin-bottom:8px">${tx('ui.basarim_2',[ok,L.ACH.length])}</div>`;for(const a of L.ACH){const v=Math.min(a.f(S),a.n),c=S.ach[a.id];h+=`<div class="card" ${c?'style="opacity:.6"':''}><div class="ic">${c?'🏅':'🎖️'}</div><div class="mid"><div class="nm">${a.t}</div><div class="sub">${a.d} · ${RI('gems')}${a.g}</div><div class="pbar"><i style="width:${v/a.n*100}%"></i></div></div>${!c&&v>=a.n?`<button class="btn o" data-a="ach" data-v="${a.id}">${tx('ui.al')}</button>`:''}</div>`}}
 else{const q0=L.QUESTS[S.q],ch=q0?q0.c:L.CHAPTERS.length-1,C=L.CHAPTERS[ch];const inC=L.QUESTS.map((q,i)=>[q,i]).filter(([q])=>q.c===ch),dn=inC.filter(([,i])=>i<S.q).length;
  h+=`<div class="card" style="background:linear-gradient(135deg,#6a4a1a,#2a1d10)"><img src="img/cap_yusuf.webp" loading="lazy" style="width:52px;height:52px;border-radius:12px;border:2px solid #ffd27a"><div class="mid"><div class="sub">${tx('ui.bolum',[ch+1,L.CHAPTERS.length])}</div><div class="nm">${C.n}</div><div class="pbar"><i style="width:${dn/inC.length*100}%"></i></div><div class="sub">${tx('ui.gorev_toplam',[dn,inC.length,S.q,L.QUESTS.length])}</div></div></div>`;
  for(const[q,i]of inC){const v=Math.min(q.f(S),q.n);h+=`<div class="card"><div class="ic">${i<S.q?'✅':i===S.q?'⭐':'🔒'}</div><div class="mid"><div class="nm">${q.t}</div><div class="sub">${i<S.q?tx('ui.tamamlandi'):v+'/'+q.n} · ${rwStr(q.r)}</div></div>${i===S.q&&v>=q.n?`<button class="btn o" data-a="quest">${tx('ui.al')}</button>`:''}</div>`}}
 return h})}
const SHOP=[
 {id:'starter',ic:'🎁',n:tx('ui.baslangic_paketi'),d:tx('ui.300_500_200_1'),p:'₺49,99',once:1,vip:100,f:()=>{S.gems+=300;S.res.wood+=500;S.res.crys+=200;S.builders++},best:1},
 {id:'monthly',ic:'🗓️',n:tx('ui.aylik_kart'),d:tx('ui.hemen_300_sonra_30'),p:'₺89,99',vip:150,f:()=>{S.gems+=300;S.monthly=Math.max(now(),S.monthly)+30*864e5}},
 {id:'g1',ic:'💎',n:tx('ui.bir_avuc_elmas'),d:'100 💎',p:'₺29,99',vip:30,f:()=>S.gems+=100},
 {id:'g2',ic:'💰',n:tx('ui.elmas_kesesi'),d:'600 💎',p:'₺149,99',vip:150,f:()=>S.gems+=600},
 {id:'g3',ic:'🏆',n:tx('ui.elmas_sandigi'),d:'1300 💎',p:'₺299,99',vip:300,f:()=>S.gems+=1300},
 {id:'noads',ic:'🚫',n:tx('ui.reklamsiz'),d:tx('ui.odullu_reklamlari_izlemeden_odulunu'),p:'₺79,99',once:1,vip:80,f:()=>S.buy.noads=1},
];
const GEMSHOP=[{ic:'👷',n:tx('ui.ek_insaatci_kalici'),d:tx('ui.ayni_anda_bir_yukseltme'),c:250,f:()=>S.builders++},{ic:'🔮',n:tx('ui.kristal_sandigi'),d:'+150 🔮',c:30,f:()=>S.res.crys+=150},{ic:'🐟',n:tx('ui.balik_sandigi'),d:'+300 🐟',c:30,f:()=>S.res.fish+=300},{ic:'⭐',n:tx('ui.vip_puani'),d:tx('ui.50_vip_puani'),c:50,f:()=>S.vipPts+=50}];
const VIPN=L.VIPN;
function openShop(){sheet(()=>{const v=L.vipLv(S),nx=VIPN[v+1];const ad=S.buy.adDay||'';const adN=ad.startsWith(L.day(now()))?+ad.split(':')[1]:0;const mOn=S.monthly>now();
 let h=hdr(tx('ui.magaza_2'))+DEMO+`<div class="card" style="background:linear-gradient(135deg,#6a4a1a,#2a1d10)"><div class="ic">👑</div><div class="mid"><div class="nm">VIP ${v}</div><div class="sub">${tx('ui.uretim',[v*5])}${v>=3?tx('ui.1_insaatci'):tx('ui.vip_3_1_insaatci')}</div>${nx?`<div class="pbar"><i style="width:${S.vipPts/nx*100}%"></i></div><div class="sub">${tx('ui.vip_puani_satin_alimlar',[S.vipPts,nx])}</div>`:''}</div></div>
 <details style="margin:-3px 0 8px"><summary class="sub">${tx('ui.vip_ayricaliklari')}</summary>${L.VIP_PERKS.map((p,i)=>`<div class="sub">${i<v?'✅':'▫️'} ${p}</div>`).join('')}</details>
 <div class="card"><div class="ic">📺</div><div class="mid"><div class="nm">${tx('ui.odullu_reklam')}</div><div class="sub">${tx('ui.10_bugun',[adN,adMax()])}</div></div><button class="btn o" data-a="ad" ${adN>=adMax()?'disabled':''}>${tx('ui.izle')}</button></div>`;
 {const o=L.offerOf(now()),got=S.buy['of'+L.day(now())];h+=`<div class="sec">${tx('ui.gunun_teklifi')}</div><div class="card" style="background:linear-gradient(135deg,#7a2a4a,#2a1030);border-color:#ff8ab8"><div class="ic">${o.ic}</div><div class="mid"><div class="nm">${o.n}</div><div class="sub">${tx('ui.vip_yarin_degisir_sahte',[o.d,o.vip])}</div><div class="sub">⏱️ ${tx('m.offer_reset',[new Date((Math.floor(now()/864e5)+1)*864e5).toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})])}</div></div><button class="btn" data-a="offer" ${got?'disabled':''}>${got?tx('ui.alindi'):o.p}</button></div>`}
 h+=seasonCard();h+=`<div class="card"><div class="ic">🎫</div><div class="mid"><div class="nm">${tx('ui.fener_bileti')}</div><div class="sub">${tx('ui.ucretsiz_premium_odul_yolu',[L.passTier(S),L.PASS_TIERS])}</div></div><button class="btn o" id="toPass">${tx('ui.ac')}</button></div>`;
 if(mOn)h+=`<div class="card"><div class="ic">🗓️</div><div class="mid"><div class="nm">${tx('ui.aylik_kart_aktif')}</div><div class="sub">${tx('ui.gun_kaldi',[Math.ceil((S.monthly-now())/864e5)])}</div></div><button class="btn o" data-a="monthly" ${S.monthlyClaim===L.day(now())?'disabled':''}>100💎 Al</button></div>`;
 h+=`<div class="sec">${tx('ui.paketler')}</div>`+SHOP.map(s=>{const own=s.once&&S.buy[s.id];return `<div class="card"><div class="ic">${s.ic}</div><div class="mid"><div class="nm">${s.n}${s.best?`<span class="tag">${tx('ui.en_iyi_deger')}</span>`:''}</div><div class="sub">${s.d} · +${s.vip} VIP</div></div><button class="btn" data-a="buy" data-v="${s.id}" ${own?'disabled':''}>${own?tx('ui.alindi'):s.p}</button></div>`}).join('');
 setTimeout(()=>{const b=$('toPass');if(b)b.onclick=openPass});h+=`<div class="sec">${tx('ui.elmasla')}</div>`+GEMSHOP.map((g,i)=>`<div class="card"><div class="ic">${g.ic}</div><div class="mid"><div class="nm">${g.n}</div><div class="sub">${g.d}</div></div><button class="btn g" data-a="gemItem" data-v="${i}">${g.c}💎</button></div>`).join('');{const z=L.spendOf(S,now());h+=`<div class="sec">${tx('m.lim_t')}</div><div class="card"><div class="ic">🛡️</div><div class="mid"><div class="nm">${z.on?tx('m.lim_on'):tx('m.lim_off')}</div><div class="sub">${tx('m.lim_month',[fmtTL(z.sum),fmtTL(z.lim)])}</div></div><button class="btn o" data-a="limOpen">${tx('ui.ac')}</button></div><div class="sub" style="margin:6px 2px">${tx('m.honest')}</div>`}return h})}
const adMax=()=>L.vipLv(S)>=2?8:5;
function soon(t){SFX.tap();modal(`<div style="font-size:50px">${t===tx('html.klan').replace(/^\S+\s/,'')||t==='Klan'?'🛡️':'💬'}</div><h2>${tx('ui.yakinda',[t])}</h2><p>${t!==tx('ui.sohbet')?tx('ui.klan_kurma_ortak_filo'):tx('ui.dunya_ve_klan_sohbeti')}</p>`,[[tx('ui.tamam'),'']])}
function openPass(){sheet(()=>{const t=L.passTier(S),xp=S.pass.xp%L.PASS_XP;let h=hdr(tx('ui.fener_bileti_2'))+`<div class="card" style="background:linear-gradient(135deg,#6a4a1a,#2a1d10)"><div class="ic">🎫</div><div class="mid"><div class="nm">Kademe ${t}/${L.PASS_TIERS}</div><div class="pbar"><i style="width:${t>=L.PASS_TIERS?100:xp}%"></i></div><div class="sub">${tx('ui.xp_gorev_50_gunluk')}</div></div>${S.pass.prem?'<span class="tag" style="background:#3fb950">PREMIUM</span>':'<button class="btn g" data-a="passBuy">Premium ₺119,99</button>'}</div>`;
 if(!S.pass.prem)h+=DEMO;h+=`<div class="tier"><b></b><div class="sub" style="text-align:center">${tx('ui.ucretsiz_2')}</div><div class="sub" style="text-align:center">Premium 👑</div></div>`;
 for(let i=0;i<L.PASS_TIERS;i++){const cell=p=>{const c=S.pass.cl[p?'p':'f'][i],ok=i<t&&(!p||S.pass.prem);return `<div class="c ${p?'p':''} ${i>=t?'lk':''}"><span>${rwStr(L.passReward(i,p))}</span>${c?'✅':ok?`<button class="btn sm o" data-a="pass" data-v="${i}:${p}">Al</button>`:p&&!S.pass.prem?'🔒':''}</div>`};h+=`<div class="tier"><b>${i+1}</b>${cell(0)}${cell(1)}</div>`}return h})}
function openBoss(){L.bossWeek(S,now());sheet(()=>{const b=L.bossBoard(S,now()),me=b.findIndex(r=>r.me)+1,left=Math.max(0,L.bossTries(S)-(S.boss.day===L.day(now())?S.boss.n:0)),end=(1-L.weekFrac(now()))*7*86400;
 let h=hdr(tx('ui.kraken_avi'))+`<div class="card" style="background:linear-gradient(135deg,#3a1a5a,#0a1a30)"><img src="img/f_kraken.webp" loading="lazy" style="width:84px;height:84px;object-fit:contain"><div class="mid"><div class="nm">${tx('ui.derin_kraken_haftalik')}</div><div class="sub">${tx('ui.bitise_hasarin',[fmtT(end)])} <b>${fmt(S.boss.dmg)}</b> ${tx('ui.siran',[me])}</div><div class="sub">${tx('ui.bugun_kalan_saldiri',[left,L.bossTries(S)])}</div></div></div>
 <button class="btn o" data-a="boss" style="width:100%;font-size:16px;margin-bottom:8px" ${left?'':'disabled'} id="bossBtn">${tx('ui.kraken_e_saldir')}</button>
 ${window.__online?.on?'':`<div class="prev">${tx('ui.onizleme_siralamadaki_diger_kaptanlar')}</div>`}<div class="sec">${tx('ui.oduller_hafta_sonunda')}</div><div class="sub">${tx('ui.1_2_3_4',[rwStr(L.bossReward(1)),rwStr(L.bossReward(2)),rwStr(L.bossReward(4)),rwStr(L.bossReward(9))])}</div>`;const OH=window.__online?.bossHtml?.();if(OH)return h+OH;h+=`<div class="sec">${tx('ui.siralama')}</div><div class="board">`;
 b.forEach((r,i)=>h+=`<div class="card ${r.me?'me':''}"><b style="width:26px">#${i+1}</b><div class="mid">${r.me?'⭐ Sen':r.n}${r.bot?'<span class="bot">BOT</span>':''}</div><b>${fmt(r.d)}</b></div>`);return h+'</div>'})}
function bossFight(){const r=L.bossAttack(S,now(),Math.random);if(r.err){resErr(r.err);return}closeSheet();const bt=$('battle');
 bt.innerHTML=`<div class="top">${tx('ui.kraken_avi')}</div><div class="side"><img class="foeimg" id="beast" src="img/f_kraken.webp" style="width:220px;height:220px"><div class="hl" id="bdmg">${tx('ui.toplam_hasar',[fmt(S.boss.dmg-r.dmg)])}</div></div><div class="side"><div style="display:flex;gap:8px">${L.team(S).map(h=>port(h,S.heroes[h.id])).join('')}</div><div class="hl">Filon · ⚔️ ${fmt(L.armyPower(S))}</div></div><div class="waves"></div>`;
 bt.classList.add('on');SFX.boss();cam.shake=.2;let i=0,acc=0;const hits=[.15,.2,.25,.4];const iv=setInterval(()=>{const be=$('beast');if(i>=hits.length){clearInterval(iv);
  setTimeout(()=>{ui();save();modal(`<img src="img/f_kraken.webp" style="width:90px"><h2>${fmt(r.dmg)} hasar!</h2><p>${tx('ui.haftalik_toplam')} <b>${fmt(S.boss.dmg)}</b><br>Ganimet: ${rwStr(r.rw)}</p>`,[[tx('ui.siralama'),'o',()=>{bt.classList.remove('on');openBoss()}]])},400);return}
  const d=Math.round(r.dmg*hits[i]);acc+=d;be.animate([{transform:'scale(1)'},{transform:'scale(.92) rotate(-3deg)'},{transform:'none'}],{duration:220});SFX.hit();vib(15);const q=be.getBoundingClientRect();floatTxt(q.left+q.width/2+(Math.random()-.5)*80,q.top+q.height/2,'-'+fmt(d),i===3?'#ff6b6b':'#ffd84a');$('bdmg').textContent=tx('ui.toplam_hasar_2')+fmt(S.boss.dmg-r.dmg+acc);i++},550)}
function openLogin(auto){const ready=L.loginReady(S,now()),cur=S.login.n%7;modal(`<h2>${tx('ui.7_gunluk_giris')}</h2><p class="sub">${tx('ui.her_gun_gel_odulu')}</p><p class="sub">🔥 ${tx('ui.login_total',[S.login.total])} · ${tx('ui.login_honest')}</p><div class="cal">${L.LOGIN.map((r,i)=>`<div class="${i<cur?'ok':i===cur&&ready?'now':''} ${i===6?'d7':''}">${tx('ui.gun',[i+1])}<br>${rwStr(r)}${i<cur?'<br>✅':''}</div>`).join('')}</div>`,
 ready?[[tx('ui.odulu_al'),'o',()=>{const o=L.claimLogin(S,now());if(o){ui();save();setTimeout(()=>reward(`${tx('ui.gun_odulu',[o.i+1])}`,o.r,{icon:'📅'}),200)}}]]:[[tx('ui.yarin_gel'),'x']])}
function openSettings(){sheet(()=>{const tg=(k,n,d)=>`<div class="card"><div class="mid"><div class="nm">${n}</div><div class="sub">${d}</div></div><button class="tgl ${S.set[k]?'on':''}" data-a="set" data-v="${k}"></button></div>`;
 return hdr(tx('ui.h_ayarlar'))+tg('snd',tx('ui.ses_efektleri'),tx('ui.dokunma_birlestirme_savas'))+tg('mus',tx('ui.muzik'),tx('ui.ambiyans_muzigi_ve_dalga'))+tg('vib',tx('ui.titresim'),tx('ui.destekleyen_telefonlarda'))+
 `<div class="card"><div class="mid"><div class="nm">${tx('ui.dil')}</div><div class="sub">${LANGS[lang]}</div></div><button class="btn x" data-a="lang">${lang.toUpperCase()} ▾</button></div><div class="card"><div class="mid"><div class="nm">${tx('ui.ilerlemeyi_sifirla')}</div><div class="sub">${tx('ui.kayit_bu_cihazda_tutulur')}</div></div><button class="btn r" data-a="reset">${tx('ui.sifirla_2')}</button></div><div class="sub" style="text-align:center;margin-top:8px">${tx('ui.son_fener_v2_cevrimdisi')}</div>`})}
function openClan(){sheet(()=>`${hdr(tx('ui.h_klanlar'))}<div class="prev">${tx('ui.onizleme_bunlar_ornek_bot')}</div>`+L.CLANS_PREVIEW.map(c=>`<div class="card"><div class="ic">${c.ic}</div><div class="mid"><div class="nm">${c.n} <span class="bot">[${c.tag}] BOT</span></div><div class="sub">👥 ${c.m}/30 · ⚔️ ${c.p}</div></div><button class="btn" disabled>${tx('ui.katil')}</button></div>`).join(''))}
function openIslands(){sheet(()=>{let h=hdr(tx('ui.adalarim'))+`<div class="sub" style="margin-bottom:8px">${tx('ui.sisli_deniz_de_ada')}</div>`;
 for(const id in L.ISLANDS){const I=L.ISLANDS[id],own=id==='home'||S.isl[id]?.own,here=S.cur===id;h+=`<div class="card" ${here?'style="border-color:#ffd27a;background:#ffb34722"':''}><div class="ic">${I.ic}</div><div class="mid"><div class="nm">${I.n}${here?'<span class="tag" style="background:#3fb950">BURADASIN</span>':''}</div><div class="sub">${I.d}${own&&id!=='home'?` ${tx('ui.isik_diregi_sv',[S.isl[id].lv])}`:''}${!own?` ${tx('ui.ada_kurtar',[I.unlock,S.stage-1,I.unlock])}`:''}</div></div>${own?(here?'':`<button class="btn o" data-a="go" data-v="${id}">${tx('ui.git')}</button>`):`<button class="btn" data-a="isl" data-v="${id}" ${S.stage-1>=I.unlock?'':'disabled'}>${costStr(I.cost)}</button>`}</div>`}
 if(S.cur!=='home'){const lv=S.isl[S.cur].lv;h+=`<div class="sec">${tx('ui.isik_diregi')}</div><div class="card"><div class="ic">🗼</div><div class="mid"><div class="nm">${tx('ui.sv_3_guvenli_alan',[lv,L.safeR(S)*2+1,L.safeR(S)*2+1])}</div><div class="sub">${lv<3?costStr(L.postCost(lv)):tx('ui.en_ust_seviye')}</div></div><button class="btn o" data-a="post" ${lv<3?'':'disabled'}>${tx('ui.yukselt')}</button></div>`}return h})}
function goIsland(id){if(resErr(L.switchIsland(S,id)))return;closeSheet();for(const k of [...meshes.keys()]){scene.remove(meshes.get(k).g);meshes.delete(k)}paintIsland(S.cur);buildIslDeco(S.cur);syncBeacon();fogR=-1;syncAll();
 SFX.wave();toast(`${L.ISLANDS[S.cur].ic} ${L.ISLANDS[S.cur].n}`);ui();save()}
// ---------- SAVAŞ ----------
function pveCheck(kind,stage,rw,prog){const O=window.__online;if(!O||!O.on||!O.pve)return;O.pve(kind,stage).then(r=>{if(!r||r.ok)return;
   const neg={};for(const k in rw)neg[k]=-rw[k];L.addRes(S,neg);for(const k in S.res)S.res[k]=Math.max(0,S.res[k]);S.gems=Math.max(0,S.gems);S.tickets=Math.max(0,S.tickets||0);if(prog&&S.stage>1)S.stage--;ui();save();toast('⚠️ '+tx('ui.pve_rej')+' '+tl(r.err||''))}).catch(()=>{})}
function battle(stage,camp,cv){closeSheet();const res=cv?cv.res:L.simulate(S,stage,Math.random);const B=cv?{n:tx('ui.cv_foe'),img:'pirate'}:FOES[L.stageFoe(stage)];const tm=L.team(S);const bt=$('battle');
 const icons=Object.entries(S.troops).flatMap(([t,n])=>Array(Math.min(4,Math.ceil(n/10))).fill(TROOPS[t].ic));
 bt.innerHTML=`<div class="top">${cv?'🏴‍☠️ '+tx('ui.cv_t'):'⛵ '+tx('ui.isl_n',[stage,L.islandName(stage)])}</div><div class="side"><div class="units"><img class="u big foeimg" id="beast" src="img/f_${B.img}.webp" alt="${B.n}"></div><div class="hp e"><i id="ehp" style="width:100%"></i></div><div class="hl">${B.n} · ⚔️ ${fmt(cv?L.convoyPower(S):L.stagePower(stage))}</div></div>
 <div class="side"><div class="units" id="army"><span class="u">⛵</span>${icons.map(i=>`<span class="u">${i}</span>`).join('')}<span class="u">⛵</span></div><div style="display:flex;gap:8px">${tm.map(h=>port(h,S.heroes[h.id])).join('')}</div><div class="hp"><i id="mhp" style="width:100%"></i></div><div class="hl">Filon · ⚔️ ${fmt(L.armyPower(S))}</div></div><div class="waves"></div>`;
 bt.classList.add('on');SFX.horn();setTimeout(SFX.roar,500);let i=0;
 const iv=setInterval(()=>{const r=res.rounds[i];if(!r){clearInterval(iv);setTimeout(()=>finish(),500);return}
  const army=$('army'),beast=$('beast');army.animate([{transform:'translateY(0)'},{transform:'translateY(-50px)'},{transform:'translateY(0)'}],{duration:280});
  setTimeout(()=>{beast.animate([{transform:'translateX(0)'},{transform:'translateX(-12px)'},{transform:'translateX(12px)'},{transform:'none'}],{duration:200});SFX.hit();vib(15);const b=beast.getBoundingClientRect();floatTxt(b.left+b.width/2,b.top+b.height/2,'-'+fmt(r.d1),'#ffd84a');$('ehp').style.width=(r.eHp/res.eMax*100)+'%'},150);
  if(r.d2)setTimeout(()=>{beast.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(60px) scale(1.2)'},{transform:'none'}],{duration:260});const a=army.getBoundingClientRect();floatTxt(a.left+a.width/2,a.top+a.height/2,'-'+fmt(r.d2),'#ff6b6b');$('mhp').style.width=(r.hp/res.myMax*100)+'%';bt.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'none'}],{duration:150})},450);
  i++},700);
 function finish(){if(cv)return cvFinish();const st0=S.stage,out=L.applyBattle(S,res,stage,now());if(out.rw)pveCheck('stage',stage,out.rw,S.stage>st0);ui();save();syncPeople();const lost=Object.entries(out.lost).filter(([t,n])=>n).map(([t,n])=>`${TROOPS[t].ic}${n}`).join(' ');
  if(res.win){SFX.done();vib([30,40,60]);if(camp)camp.g.userData.vis=false,setTimeout(()=>camp.g.userData.vis=true,90000);for(let k=0;k<Math.min(out.saved,3);k++)setTimeout(()=>sendRaft(true),k*700)}else SFX.err();
  modal(res.win?`<div style="font-size:54px">🏝️</div><h2>${tx('ui.ada_sisten_kurtuldu')}</h2><p>Ganimet:<br><b>${costStr(out.rw)}</b>${out.saved?`<br>${tx('ui.kurtulan_filona_katildi',[out.saved])}`:''}${lost?`<br><span class="sub">${tx('ui.yarali')} `+lost+'</span>':''}</p>`:`<div style="font-size:54px">🌫️</div><h2>${tx('ui.sis_galip_geldi')}</h2><p>${tx('ui.yaratiklar_cok_gucluydu_daha')}${lost?`<br><span class="sub">${tx('ui.kayip')} `+lost+'</span>':''}</p>`,[[tx('ui.devam'),res.win?'o':'x',()=>{bt.classList.remove('on');tutCheck()}]])}
 function cvFinish(){ui();save();syncPeople();const lost=Object.entries(cv.lost).filter(([t,n])=>n).map(([t,n])=>`${TROOPS[t].ic}${n}`).join(' ');if(res.win){SFX.done();vib([30,40,60]);cam.shake=.15}else SFX.err();
  modal(res.win?`<div style="font-size:54px">🏴‍☠️</div><h2>${tx('ui.cv_win')}</h2><p><b>${costStr(cv.rw)}</b>${lost?`<br><span class="sub">${tx('ui.yarali')} ${lost}</span>`:''}</p>`:`<div style="font-size:54px">🌊</div><h2>${tx('ui.cv_lose')}</h2><p>${tx('ui.cv_lose_d')}${lost?`<br><span class="sub">${tx('ui.kayip')} ${lost}</span>`:''}</p>`,[[tx('ui.devam'),res.win?'o':'x',()=>{bt.classList.remove('on')}]])}}
// ---------- HUD ----------
function ui(){for(const r of L.RES)$('r_'+r).textContent=fmt(S.res[r]);$('r_gems').textContent=fmt(S.gems);$('flv').textContent=S.fener.lv;$('pow').textContent=fmt(L.armyPower(S));
 const t=now(),nt=L.night(S,t),ni=L.nightIn(S,t);$('nval').textContent=nt?tx('ui.sis_gecesi'):L.lit(S)?tx('ui.fener_yaniyor'):tx('ui.fener_sonuk');
 $('nsub').textContent=S.tut<9?tx('ui.egitim_2'):nt?`${tx('ui.bitise',[fmtT(-ni)])}`:`${tx('ui.sis_gecesine',[fmtT(ni),L.nightNeed(S)])}`;$('night').className=nt?'storm':L.lit(S)?'':'dark';
 {const id=L.idle(S),h=`${S.surv}/${L.cap(S)}`+(id>0?`<b class="idle" title="${tx('ui.bosta_2',[id])}">${id}</b>`:'');if($('surv').dataset.h!==h){$('surv').innerHTML=h;$('surv').dataset.h=h}}$('bld').textContent=`${L.busyBuilders(S)}/${L.builderCount(S)}`;$('isl').textContent=S.stage-1;
 const w=[];if(!L.lit(S))w.push(tx('ui.fener_sonuk_uretim_yariya'));else if(S.res.crys<L.nightNeed(S))w.push(`${tx('ui.sis_gecesi_icin_kristal',[L.nightNeed(S)])}`);if(S.res.fish<=0)w.push(tx('ui.balik_bitti'));const fg=Object.values(S.g).filter(b=>b.fog).length;if(fg)w.push(`${tx('ui.bina_sisli_arindir',[fg])}`);
 $('warn').style.display=w.length&&S.tut>=9?'block':'none';$('warn').textContent=w.join(' · ');
 const q=L.QUESTS[S.q];if(q){const v=Math.min(q.f(S),q.n),done=v>=q.n;const h=`<div>⭐ ${q.t}</div><div class="bar"><i style="width:${v/q.n*100}%"></i></div><div style="display:flex;justify-content:space-between;margin-top:3px;font-size:11px;color:#a9d8e8"><span>${v}/${q.n}</span><span>${costStr(q.r)}</span></div>${done?`<button class="btn o" id="qclaim" style="margin-top:5px;padding:6px 12px">${tx('ui.odulu_al')}</button>`:q.go&&S.tut>=9?`<button class="btn" id="qgo">${tx('ui.quest_go')}</button>`:''}`;
  if($('quest').dataset.h!==h){$('quest').innerHTML=h;$('quest').dataset.h=h;if(done)$('qclaim').onclick=claimQuest;else if($('qgo'))$('qgo').onclick=e=>{e.stopPropagation();SFX.tap();questGo()}}}else $('quest').innerHTML=tx('ui.tum_bolum_gorevleri_tamam');
 L.dailyReset(S,t);L.weeklyReset(S,t);$('tdot').style.display=L.DAILY.some(d=>!S.daily.c[d.id]&&(S.daily.p[d.id]||0)>=d.n)||L.WEEKLY.some(d=>!S.weekly.c[d.id]&&(S.weekly.p[d.id]||0)>=d.n)||(q&&q.f(S)>=q.n)?'block':'none';$('hdot').style.display=S.freeCall!==L.day(t)||Object.keys(S.heroes).some(id=>S.heroes[id].sh>=S.heroes[id].star*10&&S.heroes[id].star<5)?'block':'none';
 const pt=L.passTier(S);let pc=0;for(let i=0;i<pt;i++){if(!S.pass.cl.f[i])pc++;if(S.pass.prem&&!S.pass.cl.p[i])pc++}$('pdot').style.display=pc?'block':'none';$('ldot').style.display=L.loginReady(S,t)?'block':'none';
 $('kdot').style.display=S.tut>=9&&(S.boss.day!==L.day(t)||S.boss.n<L.bossTries(S))?'block':'none';$('side').style.display=S.tut>=9?'flex':'none';
 $('isl').textContent=(S.cur==='home'?'':L.ISLANDS[S.cur].ic+' ')+(S.stage-1);if(L.achReady(S).length)$('tdot').style.display='block';
 {const sp=L.stagePower(S.stage);$('mdot').style.display=S.tut>=9&&L.armyPower(S)>=sp*.9?'block':'none'}
 $('collect').style.display=S.tut>=9&&bubN>=3&&!$('sheet').classList.contains('on')?'block':'none'}
function claimQuest(silent){const q=L.claimQuest(S);if(!q)return;ui();renderSheet();save();if(silent===true){for(const r in q.r)fly(r,innerWidth/2,200,3);SFX.coin();toast(`⭐ ${q.t} ✓ ${rwStr(q.r)}`);return}
 const nq=L.QUESTS[S.q];const lines=[...(q.say?[q.say]:[])];if(nq&&nq.c!==q.c&&!S.seen['ch'+nq.c]){S.seen['ch'+nq.c]=1;lines.push(`${tx('ui.bolum_2',[nq.c+1,L.CHAPTERS[nq.c].n])}`,...L.CHAPTERS[nq.c].say)}const go=()=>{if(lines.length)talk(lines)};closeSheet();reward(tx('ui.gorev_tamam'),q.r,{icon:'⭐',sub:q.t,cb:go})}
let talkQ=[],talkCb=null;function talk(lines,cb){talkQ=[...lines];talkCb=cb;closeSheet();nextTalk()}
function talkPos(){$('talk').classList.toggle('top',localStorage.getItem('sf_talkTop')==='1')}
function nextTalk(){const l=talkQ.shift();if(l===undefined){$('talk').classList.remove('on');const c=talkCb;talkCb=null;c&&c();return}talkPos();$('talkT').innerHTML=`<span class="tc"><button data-t="mv" title="${tx('ui.talk_move')}" aria-label="${tx('ui.talk_move')}">⇅</button><button data-t="x" title="${tx('ui.talk_skip')}" aria-label="${tx('ui.talk_skip')}">✕</button></span><b>${L.NPC.n}</b>${l}<small>${tx('ui.dokun')}${talkQ.length?' · '+(talkQ.length+1):''}</small>`;$('talk').classList.add('on');SFX.tap()}
$('talk').onclick=e=>{const b=e.target.closest('[data-t]');if(b){e.stopPropagation();if(b.dataset.t==='mv'){localStorage.setItem('sf_talkTop',localStorage.getItem('sf_talkTop')==='1'?'0':'1');talkPos()}else{talkQ=[];nextTalk()}return}nextTalk()};

// ---------- KUTLAMA / ÖDÜL ----------
const RNAME={fish:tx('ui.balik'),wood:tx('ui.kereste'),crys:tx('ui.kristal'),gems:tx('ui.elmas'),ticket:tx('ui.cagri_bileti')};
function shock(pos,c=0xffe08a,sz=2.2){const m=new THREE.Mesh(new THREE.RingGeometry(.5,.64,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(pos);m.position.y=.1;scene.add(m);
 tween(700,t=>{m.scale.setScalar(.4+E.out(t)*sz);m.material.opacity=1-t},()=>{scene.remove(m);m.geometry.dispose()})}
function bigTxt(t,sub,c='#ffd84a'){const d=document.createElement('div');d.className='bigtxt';d.innerHTML=`<b style="color:${c}">${t}</b>${sub?`<small>${sub}</small>`:''}`;$('fx').appendChild(d);setTimeout(()=>d.remove(),1500)}
const rwCards=r=>Object.entries(r).filter(([,v])=>v).map(([k,v],i)=>`<div class="rw" style="animation-delay:${.18+i*.14}s"><div class="ri2">${RI(k)}</div><b>+${fmt(v)}</b><small>${RNAME[k]||''}</small></div>`).join('');
function reward(title,r,o={}){const n=Object.keys(r).length;SFX.done();vib([20,30,40]);for(let i=0;i<n;i++)setTimeout(()=>SFX.pop(),180+i*140);
 modal(`<div class="rays"></div><div class="rwh">${o.icon||'🎁'}</div><h2>${title}</h2>${o.sub?`<p>${o.sub}</p>`:''}<div class="rws">${rwCards(r)}</div>`,[[o.btn||tx('ui.topla'),'o',()=>{for(const k in r)fly(k,innerWidth/2,innerHeight/2,4);SFX.coin();o.cb&&o.cb()}]]);$('mbox').classList.add('rwbox')}
function levelUp(lv){const R=L.addRes,g={gems:lv*10,crys:lv*40};R(S,g);const nk=Object.values(KINDS).filter(k=>k.req===lv&&!k.only).map(k=>`${k.ic} ${k.n}`);const isl=Object.values(L.ISLANDS).filter(x=>x.unlock&&false);
 const ul=[`${tx('ui.guvenli_alan_genisledi')}`,`${tx('ui.bina_siniri_sv',[lv+1])}`,...nk.map(x=>`🆕 ${x}`)];SFX.gacha(3);vib([40,40,80]);cam.shake=.3;
 modal(`<div class="rays gold"></div><div class="lvb">${lv}</div><h2 class="lvh">${tx('ui.fener_seviye_atladi')}</h2><div class="ul">${ul.map((u,i)=>`<div style="animation-delay:${.35+i*.12}s">${u}</div>`).join('')}</div><div class="rws">${rwCards(g)}</div>`,[[tx('ui.harika'),'o',()=>{for(const k in g)fly(k,innerWidth/2,innerHeight/2,4);SFX.coin();ui();save()}]]);$('mbox').classList.add('rwbox','lvbox')}
let combo=0,comboT=0;
// ---------- EĞİTİM ----------
const hand=$('hand'),tip=$('tip');const TUT_TILE='-2,1';
function tutCheck(){if(S.tut>=9)return;
 if(S.tut===0&&S.fener.on){S.tut=1;closeSheet()}
 if(S.tut===1&&(S.g['1,0']?.w||0)>=2){S.tut=2;closeSheet();S.g['1,0'].stored=Math.max(S.g['1,0'].stored,25)}
 if(S.tut===2&&S.st.collect>=1)S.tut=3;
 if(S.tut===3&&L.count(S,'hut')>=2){S.tut=4;closeSheet()}
 if(S.tut===4&&S.st.merge>=1){S.tut=9;S.t0=now();S.nightN=0;const g={gems:50,ticket:1,wood:150};L.addRes(S,g);save();setTimeout(()=>reward(tx('ui.egitim_tamamlandi'),g,{icon:'🎓',sub:tx('ui.harika_is_bekci_fener'),btn:tx('ui.devam'),cb:()=>talk([tx('ui.aferin_evlat_isik_yaniyor'),tx('ui.sis_her_gece_yoklar'),tx('ui.gorevleri_takip_et_her')])}),700)}
 while(S.tut<9||S.q<4){const q=L.QUESTS[S.q];if(!q||q.f(S)<q.n||S.q>=4)break;claimQuest(true)}}
// ---------- GÖREV REHBERİ (eğitim sonrası "Göster") ----------
let guide=null;const guideAt=(o,txt)=>{guide={...o,txt,q:S.q,until:performance.now()+8000}};
const findB=kind=>Object.keys(S.g).filter(k=>S.g[k].k===kind&&!S.g[k].fog).sort((a,b)=>S.g[b].lv-S.g[a].lv)[0];
function emptyTile(){let best=null,bd=1e9;for(let i=-L.GR;i<=L.GR;i++)for(let j=-L.GR;j<=L.GR;j++){const k=L.key(i,j);if(S.g[k]||!L.tileOK(i,j)||!L.isSafe(S,k)||(i===0&&j===0))continue;const d=i*i+j*j;if(d<bd){bd=d;best=k}}return best}
function questGo(){const q=L.QUESTS[S.q];if(!q||!q.go)return;const[a,v]=q.go.split(':'),t='👉 '+q.t;closeSheet();
 if(S.cur!=='home'&&a!=='islands'&&a!=='map'&&a!=='heroes'&&a!=='boss'){goIsland('home')}
 const build=kind=>{const k=emptyTile();if(!k){toast(tx('ui.guide_no_tile'));return}const e=L.checkBuild(S,k,kind);if(e&&e!=='RES'){openFener();guideAt({sel:'#upBtn'},'🔒 '+tl(e));return}openBuild(k);guideAt({sel:'#bk_'+kind},t)};
 if(a==='fener'){openFener();guideAt({sel:S.fener.on?'#upBtn':'#lightBtn'},t)}
 else if(a==='b'||a==='gear'){const kd=a==='gear'?'yard':v,k=findB(kd);if(!k)return build(kd);openB(k);guideAt({sel:a==='gear'?'[data-a=gear]:not([disabled])':kd==='yard'?'[data-a=train]':kd==='lab'?'[data-a=tech]:not([disabled])':'#wplus'},t)}
 else if(a==='build')build(v);
 else if(a==='collect'){const k=Object.keys(S.g).find(k=>KINDS[S.g[k].k].res&&(S.g[k].stored||0)>=1);if(k)guideAt({tile:k,y:1.3},t);else toast(tx('ui.guide_collect'))}
 else if(a==='merge'){const ks=Object.keys(S.g).filter(k=>!S.g[k].fog&&!S.g[k].end);let pr=null;for(const x of ks){const y=ks.find(z=>z!==x&&S.g[z].k===S.g[x].k&&S.g[z].lv===S.g[x].lv);if(y){pr=[x,y];break}}
  if(pr)guideAt({drag:pr},tx('ui.guide_drag'));else toast(tx('ui.guide_merge'))}
 else if(a==='map'){openMap();guideAt({sel:'#fightBtn'},t)}
 else if(a==='heroes'){openHeroes();guideAt({sel:'#freeCall,[data-a=call]'},t)}
 else if(a==='islands'){openIslands();guideAt({sel:'[data-a=isl]'},t)}
 else if(a==='boss'){openBoss();guideAt({sel:'[data-a=boss]'},t)}}
function guideFrame(T){const g=guide;if(!g||g.q!==S.q||performance.now()>g.until||$('modal').classList.contains('on')||$('talk').classList.contains('on')||$('battle').classList.contains('on')){if(g&&(g.q!==S.q||performance.now()>g.until))guide=null;hand.style.display=tip.style.display='none';return}
 const so=$('sheet').classList.contains('on');let pos=null;
 if(g.sel){if(!so){guide=null;hand.style.display=tip.style.display='none';return}const e=document.querySelector('#sheet '+g.sel.split(',').join(',#sheet '));if(e){const r=e.getBoundingClientRect();if(r.width&&r.bottom>0&&r.top<innerHeight)pos={x:r.left+r.width/2,y:r.top+r.height/2}}}
 else if(so){hand.style.display=tip.style.display='none';return}
 else if(g.tile&&S.g[g.tile])pos=tileScr(g.tile,g.y||.5);
 else if(g.drag){const a=tileScr(g.drag[0],.3),b=tileScr(g.drag[1],.3),f=(T%1.6)/1.6;pos={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}
 tip.style.display='block';tip.textContent=g.txt;tip.style.bottom=so?'auto':'104px';tip.style.top=so?'60px':'auto';
 if(pos){hand.style.display='block';hand.style.left=pos.x+'px';hand.style.top=pos.y+'px'}else hand.style.display='none'}
function tutFrame(T){if(S.tut>=9)return guideFrame(T);if($('modal').classList.contains('on')||$('talk').classList.contains('on')||$('battle').classList.contains('on')){hand.style.display=tip.style.display='none';return}
 const so=$('sheet').classList.contains('on');let txt='',pos=null,el=null;
 if(S.tut===0){txt=tx('ui.fenere_dokun_ve_isigi');el=so&&$('lightBtn');if(!so)pos=scr(new THREE.Vector3(0,1.4,0))}
 else if(S.tut===1){txt=`${tx('ui.kristal_madenine_2_madenci',[S.g['1,0']?.w||0])}`;el=so&&$('wplus');if(!so)pos=tileScr('1,0',.5)}
 else if(S.tut===2){txt=tx('ui.baloncuga_dokun_kristali_topla');if(!so)pos=tileScr('1,0',1.3)}
 else if(S.tut===3){txt=tx('ui.bos_bir_karoya_dokun');el=so&&$('bk_hut');if(!so)pos=tileScr(TUT_TILE,.1)}
 else if(S.tut===4){txt=tx('ui.bir_barinagi_surukle_digerinin');if(!so){const hs=Object.keys(S.g).filter(k=>S.g[k].k==='hut'&&S.g[k].lv===1);if(hs.length>=2){const a=tileScr(hs[0],.3),b=tileScr(hs[1],.3);const f=(T%1.6)/1.6;pos={x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f}}}}
 if(so&&!el){hand.style.display=tip.style.display='none';return}
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
function endDrag(){const d=drag;ringM.visible=false;if(!d.over){if(S.g[d.k]&&S.g[d.k].lv>=L.maxLv(S)&&d.over===null)toast(`${tx('ui.sv_sinirinda_feneri_yukselt',[S.g[d.k].lv])}`);cancelDrag();return}drag=null;
 if(S.g[d.over]){const lv=S.g[d.over].lv+1;scene.remove(d.g);meshes.delete(d.k);L.merge(S,d.k,d.over,now());const g=syncOne(d.over);popAnim(g,.7);
  SFX.merge(lv);vib(lv>=4?[40,30,60]:30);if(lv>=4)cam.shake=.15+lv*.03;burst(tpos(d.over).setY(.6),0xffe08a,16+lv*2,2.8,1);shock(tpos(d.over),lv>=5?0xffd84a:0x9ff8ff,1.6+lv*.2);const tn_=performance.now();combo=tn_-comboT<4000?combo+1:1;comboT=tn_;const s=tileScr(d.over,1.2);floatTxt(s.x,s.y,`${LV}${lv}!`,'#7dff8a');if(combo>=2){floatTxt(s.x,s.y-34,`KOMBO x${combo}`,'#ffb347');SFX.coin()}if(lv>=3)bigTxt(tx('ui.birlesti'),`${KINDS[S.g[d.over].k].n} · ${LV}${lv}`,lv>=5?'#ffd84a':'#9ff8ff')}
 else{L.move(S,d.k,d.over);const m=meshes.get(d.k);meshes.delete(d.k);meshes.set(d.over,m);const to=tpos(d.over);const s=d.g.position.clone();tween(160,t=>d.g.position.lerpVectors(s,to,E.out(t)));SFX.pop()}
 ui();save();tutCheck()}
function tap(x,y){const p=pick(x,y);if(!p){closeSheet();return}SFX.tap();
 if(p.camp){if(S.tut<9){toast(tx('ui.once_egitimi_bitir'));return}battle(S.stage,p.camp);return}
 if(p.fener){popAnim(fenerG,.08);openFener();return}
 if(p.post){openIslands();return}
 if(p.k){const b=S.g[p.k];const r=KINDS[b.k].res;if(r&&!b.fog&&(b.stored||0)>=1&&!$('sheet').classList.contains('on')){const a=L.collect(S,p.k,now());const s=tileScr(p.k,1.2);floatTxt(s.x,s.y,`+${a} ${RIC[r]}`,'#ffd27a');fly(r,s.x,s.y,4);SFX.coin();vib(10);popAnim(meshes.get(p.k).g,.15);ui();save();tutCheck();return}
  if(S.tut===2){toast(tx('ui.once_baloncugu_topla'));return}popAnim(meshes.get(p.k).g,.12);openB(p.k);return}
 if(p.tile){const[i,j]=L.unkey(p.tile);if(!L.tileOK(i,j)){closeSheet();return}if(!L.isSafe(S,p.tile)){SFX.err();toast(tx('ui.sisli_bolge_feneri_yukselterek'));return}if(S.tut<3){toast(tx('ui.once_egitimi_takip_et'));return}openBuild(p.tile)}}
$('bWork').onclick=()=>{ac();openWork()};$('bHero').onclick=()=>{ac();openHeroes()};$('bMap').onclick=()=>{ac();openMap()};$('bTask').onclick=()=>{ac();openTasks()};$('bShop').onclick=()=>{ac();openShop()};$('pGem').onclick=()=>openShop();
$('bClan').onclick=()=>{ac();openClan()};$('sPass').onclick=()=>{ac();openPass()};$('sBoss').onclick=()=>{ac();openBoss()};$('sLogin').onclick=()=>{ac();openLogin()};$('sSet').onclick=()=>{ac();openSettings()};$('pIsl').onclick=()=>{ac();openIslands()};
$('collect').onclick=()=>{let n=0;const got={};for(const k in S.g){const b=S.g[k],r=KINDS[b.k].res;if(r&&!b.fog&&(b.stored||0)>=1){got[r]=(got[r]||0)+L.collect(S,k,now());n++}}if(!n)return;for(const r in got)fly(r,innerWidth/2,innerHeight-120,3);SFX.coin();vib(15);toast('✋ '+rwStr(got));ui();save();tutCheck()};
$('bChat').onclick=()=>soon(tx('ui.sohbet'));$('pSurv').onclick=()=>openWork();$('night').onclick=()=>openFener();
$('modal').addEventListener('pointerdown',e=>{if(e.target.id==='modal')closeModal()});
// ---------- DÖNGÜ ----------
const lbls={};
function labels(){const t=now();const items=Object.keys(S.g).filter(k=>S.g[k].end).map(k=>[k,S.g[k],tileScr(k,1.4)]);if(S.fener.end)items.push(['fener',S.fener,scr(new THREE.Vector3(0,beam.position.y+1.2,0))]);
 const seen=new Set();for(const[k,b,p]of items){seen.add(k);let d=lbls[k];if(!d){d=lbls[k]=document.createElement('div');d.className='lbl';$('fx').appendChild(d)}const rem=(b.end-t)/1000;d.style.left=p.x+'px';d.style.top=p.y+'px';d.innerHTML=`🔨 ${fmtT(rem)}<div class="pbar"><i style="width:${(1-rem/b.dur)*100}%"></i></div>`}
 for(const k in lbls)if(!seen.has(k)){lbls[k].remove();delete lbls[k]}}
let last=performance.now(),acc=0,uiAcc=0,nf=0,fogR=-1,duskK=.3,eveK=0;
const ISLT={home:{f:[.8,.9,.96],o:[.12,.62,.69]},mercan:{f:[.82,.95,.95],o:[.1,.74,.74]},volkan:{f:[.72,.66,.66],o:[.12,.42,.5]}};
// ada ambiyansı: kor (volkan), ışıltı (mercan), ateşböceği (gece)
const AMB_N=70,ambP=new Float32Array(AMB_N*3),ambS=[];for(let i=0;i<AMB_N;i++){ambS.push({x:0,y:-9,z:0,v:0,ph:Math.random()*9})}
const ambG=new THREE.BufferGeometry();ambG.setAttribute('position',new THREE.BufferAttribute(ambP,3));
const ambM=new THREE.PointsMaterial({size:.16,map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,color:0xffa040});const amb=new THREE.Points(ambG,ambM);amb.frustumCulled=false;scene.add(amb);
function ambFx(T,dt,vN){const id=S.cur,R_=GR*TS;ambM.color.setHex(id==='volkan'?0xff7a2a:id==='mercan'?0xbff8ff:0xfff27a);ambM.size=id==='volkan'?.2:.14;
 const act=id==='volkan'?AMB_N:id==='mercan'?40:Math.round(vN*50);for(let i=0;i<AMB_N;i++){const p=ambS[i];if(i>=act){ambP[i*3+1]=-50;continue}
  if(p.y<-5||p.y>(id==='home'?2.2:6)){p.x=(Math.random()*2-1)*R_*(id==='mercan'?1.5:1);p.z=(Math.random()*2-1)*R_*(id==='mercan'?1.5:1);if(id==='volkan'&&Math.random()<.5){p.x=-9+(Math.random()-.5)*2;p.z=-9+(Math.random()-.5)*2;p.y=3}else p.y=id==='mercan'?-.2:.2+Math.random()*1.5;p.v=id==='volkan'?.6+Math.random()*.8:id==='mercan'?.15+Math.random()*.2:0}
  p.y+=p.v*dt;if(id==='home'){p.x+=Math.sin(T*1.3+p.ph)*dt*.4;p.z+=Math.cos(T*1.1+p.ph)*dt*.4;p.y+=Math.sin(T*2+p.ph)*dt*.15;if(Math.random()<.002)p.y=-9}
  if(id==='mercan'&&p.y>.6)p.y=-9;ambP[i*3]=p.x+(id==='volkan'?Math.sin(T+p.ph)*.3:0);ambP[i*3+1]=p.y+(id==='mercan'?Math.abs(Math.sin(T*3+p.ph))*.05:0);ambP[i*3+2]=p.z}
 ambG.attributes.position.needsUpdate=true;amb.material.opacity=id==='home'?Math.min(1,vN*1.4):id==='mercan'?.55+Math.sin(T*2)*.25:.9}
function frame(){const tn=performance.now(),dt=Math.min(.1,(tn-last)/1000);last=tn;const T=tn/1000,t=now();UT.value=T;
 for(let n=tweens.length-1;n>=0;n--){const w=tweens[n];const k=Math.min(1,(tn-w.t0)/w.dur);w.fn(k);if(k>=1){tweens.splice(n,1);w.done&&w.done()}}
 for(let n=parts.length-1;n>=0;n--){const p=parts[n];p.life-=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(Math.max(.01,p.life));if(p.life<=0){scene.remove(p.m);parts.splice(n,1)}}
 const oa=OC.attributes.position.array;for(let i=0;i<oa.length;i+=3){const x=ocB[i],z=ocB[i+2];oa[i+1]=Math.sin(x*.5+T*1.2)*.12+Math.cos(z*.6+T*.9)*.1}OC.attributes.position.needsUpdate=true;
 foam.material.opacity=.25+Math.sin(T*1.5)*.12;for(const[,o]of meshes){const u=o.g.children[0]&&o.g.children[0].userData;if(!u)continue;const ph=o.g.position.x*1.7+o.g.position.z;if(u.flag)u.flag.rotation.y=Math.sin(T*3+ph)*.35;if(u.smoke)u.smoke.forEach((m,k)=>{const q=(T*.45+k/3+ph*.1)%1;m.position.set(-.3+q*.18,.85+q*.75,-.25-q*.08);m.scale.setScalar(.06+q*.16)});if(u.glow)u.glow.scale.setScalar(.13+Math.sin(T*4+ph)*.02)}foam.scale.setScalar(1+Math.sin(T*1.5)*.015);
 nf+=((L.night(S,t)?1:0)-nf)*dt*.8;if(fogR!==L.safeR(S)){fogR=L.safeR(S);buildFog();buildTiles()}
 for(const f of fogs){const sh=1-nf*.14;f.m.position.set(f.b.x*sh+Math.sin(T*.3+f.ph)*.3,f.b.y+Math.sin(T*.5+f.ph)*.08,f.b.z*sh+Math.cos(T*.25+f.ph)*.3);f.m.material.opacity=Math.min(.95,f.o+nf*.3);f.m.material.color.setRGB(1-nf*.35,1-nf*.4,1-nf*.2)}
 const ph=L.nightPhase(S,t);const dk=S.tut<9?.3:ph<.06?(1-ph/.06)*.7:ph<.28?0:ph<.46?(ph-.28)/.18:ph<.81?1-Math.min(1,(ph-.46)/.12)*.55:.45;duskK+=(dk-duskK)*dt*.6;
 const ev=S.tut<9?0:ph>.5&&ph<.82?Math.min(1,(ph-.5)/.1)*.72:0;eveK+=(ev-eveK)*dt*.6;const vN=Math.max(nf,eveK);
 skyU.uT.value=duskK;skyU.uN.value=vN*.9;stars.material.opacity=vN*.95;ambFx(T,dt,vN);
 hemi.intensity=1.45-vN*.62-duskK*.12;sun.intensity=2.1-vN*1.25-duskK*.25;sun.color.setRGB(1,.92-duskK*.22,.82-duskK*.35);
 const IT=ISLT[S.cur]||ISLT.home;scene.fog.color.setRGB(IT.f[0]+duskK*.05-vN*.6,IT.f[1]-duskK*.3-vN*.6,IT.f[2]-duskK*.43-vN*.45);ocean.material.color.setRGB(IT.o[0]-vN*.04+duskK*.05,IT.o[1]-duskK*.1-vN*.32,IT.o[2]-vN*.25-duskK*.06);
 const home=S.cur==='home';if(fenerG)fenerG.visible=home;const on=L.lit(S)&&home;beam.visible=on;halo.visible=on;beam.rotation.y=T*.9;lamp.intensity=on?10+S.fener.lv+Math.sin(T*6)*.6:0;halo.scale.setScalar(on?2.2+Math.sin(T*4)*.15:0);
 bubN=0;const cand=[];for(const[k,m]of meshes){const b=S.g[k];if(!b)continue;const u=m.g.userData;if(u.bub){u.bub.visible=false;const r=L.rate(S,k);if((b.stored||0)>=Math.max(1,r*.5,L.storeCap(S,k)*.15)&&!b.end&&!(drag&&drag.k===k))cand.push([b.stored/Math.max(1,L.storeCap(S,k)),u,m])}if(u.gh)u.gh.position.y=1.2+Math.sin(T*2)*.1}
 cand.sort((a,b)=>b[0]-a[0]);bubN=cand.length;cand.slice(0,6).forEach(([f,u,m],i)=>{u.bub.visible=true;u.bub.position.y=1.15+(i%2)*.18+Math.sin(T*3+m.g.position.x)*.05;const s=.3+Math.min(1,f)*.12;u.bub.scale.set(s,s,1)});
 foam2.material.opacity=.14+Math.sin(T*1.1+1)*.08;foam2.scale.setScalar(1+Math.sin(T*1.1)*.02);
 for(const b of boats){const a=T*b.sp+b.ph;b.g.position.set(Math.cos(a)*b.r,-.18+Math.sin(T*1.3+b.ph)*.05,Math.sin(a)*b.r);b.g.rotation.y=-a;b.g.rotation.x=Math.sin(T*1.1+b.ph)*.06}
 for(const q of gulls){const a=T*q.sp+q.ph;q.g.position.set(Math.cos(a)*q.r,q.h+Math.sin(T*.8+q.ph)*.3,Math.sin(a)*q.r);q.g.rotation.y=-a;const w=Math.sin(T*9+q.ph)*.6;q.w1.rotation.z=w;q.w2.rotation.z=-w}

 for(const c of CAMPS){c.g.visible=S.cur==='home'&&(c.g.userData.vis!==false);c.g.userData.sp.position.y=1.6+Math.sin(T*2.5)*.08;c.g.position.y=-.25+Math.sin(T*1.3+c.x)*.1;if(c.g.userData.ts)c.g.userData.ts.forEach((tt,i)=>tt.rotation.y=Math.sin(T*2+i)*.4)}
  for(let n=rafts.length-1;n>=0;n--){const r=rafts[n];r.t+=dt/r.dur;r.g.position.lerpVectors(r.from,r.to,E.out(Math.min(1,r.t)));r.g.position.y=-.2+Math.sin(T*2+n)*.06;r.g.rotation.z=Math.sin(T*1.7+n)*.08;if(r.t>=1){scene.remove(r.g);rafts.splice(n,1);burst(r.to.clone().setY(0),0xffffff,10,1.5,1);syncPeople()}}
 for(const p of people){const u=p.userData;if(!u.t)pickTarget(p);const d=u.t.clone().sub(p.position);d.y=0;const L2=d.length();if(L2<.08){if(Math.random()<.02)pickTarget(p)}else{const v=Math.min(L2,dt*u.sp);p.position.addScaledVector(d.normalize(),v);p.rotation.y=Math.atan2(d.x,d.z);const ph=T*10+u.ph;u.l1.rotation.x=Math.sin(ph)*.6;u.l2.rotation.x=-Math.sin(ph)*.6;p.position.y=Math.abs(Math.sin(ph))*.03}}
 acc+=dt;if(acc>.25){const ev=L.step(S,acc,t);acc=0;handle(ev)}uiAcc+=dt;if(uiAcc>.5){uiAcc=0;ui();if($('sheet').classList.contains('on')&&$('sheet').querySelector('.pbar'))renderSheet()}
 fx7(T,dt,nf,vN,on);updCam();renderer.render(scene,camera);labels();tutFrame(T);requestAnimationFrame(frame)}
function handle(evs){for(const e of evs){
 if(e.e==='built'){if(e.isl&&e.isl!==S.cur){toast(`${tx('ui.sv_hazir',[L.ISLANDS[e.isl].n,e.lv])}`);continue}const g=syncOne(e.k);popAnim(g,.6);SFX.done();vib([20,30,20]);burst(tpos(e.k).setY(.6),0xffd84a,16,2.5,1);shock(tpos(e.k),0xffd84a,2);toast(`${tx('ui.sv_hazir_2',[KINDS[S.g[e.k].k].n,e.lv])}`);renderSheet()}
 if(e.e==='fener'){syncFener();popAnim(fenerG,.3);SFX.light();vib([30,40,60]);cam.shake=.25;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,30,4,1);closeSheet();setTimeout(()=>levelUp(e.lv),500)}
 if(e.e==='dark'){SFX.err();toast(tx('ui.kristal_bitti_fener_sondu'))}
 if(e.e==='trained'){SFX.done();toast(`${tx('ui.hazir',[e.n,TROOPS[e.t].n])}`)}
 if(e.e==='researched'){SFX.done();toast(`${tx('ui.tamamlandi_2',[TECH.find(x=>x.id===e.id).n])}`)}
 if(e.e==='raft'){sendRaft(false);toast(tx('ui.bir_sal_kiyiya_yanasiyor'))}
 if(e.e==='repel'){SFX.light();cam.shake=.1;toast(`${tx('ui.sis_gecesi_fener_yakip',[e.need])}`)}
 if(e.e==='corrupt'){SFX.roar();vib([60,40,60]);cam.shake=.2;e.ks.forEach(k=>{syncOne(k);burst(tpos(k).setY(.6),0x8a5aa8,16,2,1)});toast(`${tx('ui.sis_binayi_ele_gecirdi',[e.ks.length])}`)}
 if(e.e==='wreck'&&!$('modal').classList.contains('on')&&!$('battle').classList.contains('on')){const room=L.cap(S)-S.surv;modal(`<div style="font-size:50px">🚢</div><h2>${tx('ui.batik_gemi')}</h2><p>${tx('ui.kiyiya_bir_enkaz_vurdu',[e.n])}${room<e.n?`<br><span style="color:#ff8a8a">${tx('ui.barinaklarda_sadece_yer_var',[Math.max(0,room)])}</span>`:''}</p>`,[[tx('ui.birak'),'x'],[tx('ui.kurtar'),'o',()=>{const k=Math.min(e.n,Math.max(0,room));S.surv+=k;for(let i=0;i<k;i++)setTimeout(()=>sendRaft(false),i*500);toast(`${tx('ui.kurtulan_katildi',[k])}`);ui()}]])}}}
// ---------- BAŞLAT ----------
resize();buildTiles();buildFog();fogR=L.safeR(S);syncAll();syncPeople();ui();
if(!isNew){const o=L.offline(S,now());if(o)setTimeout(()=>modal(`<div style="font-size:50px">🌙</div><h2>${tx('ui.tekrar_hos_geldin')}</h2><p>${tx('ui.sen_yokken_dk_iscilerin',[o.min])}<br><b style="font-size:18px">${costStr(o.g)}</b></p>`,[[tx('ui.take'),'',()=>{L.addRes(S,o.g);ui();save()}],['📺 '+tx('ui.take_x2'),'o',()=>watchAd(()=>{for(const k in o.g)o.g[k]*=2;L.addRes(S,o.g);ui();save()})]]),600)}
paintIsland(S.cur);buildIslDeco(S.cur);syncBeacon();
{const bw=L.bossWeek(S,now());if(bw)setTimeout(()=>modal(`<img src="img/f_kraken.webp" style="width:90px"><h2>${tx('ui.kraken_haftasi_bitti')}</h2><p>${tx('ui.siran_2')} <b>#${bw.rank}</b><br>${tx('ui.odul',[rwStr(bw.rw)])}</p>`,[[tx('ui.harika_2'),'o']]),900)}
{const side=$('side');if(side&&!$('sMute')){const b=document.createElement('button');b.className='sb';b.id='sMute';b.setAttribute('aria-label','mute');b.onclick=e=>{e.stopPropagation();toggleMute()};side.appendChild(b)}muteLbl()}
const sb=$('startBtn');window.__ldp&&window.__ldp(100);{const ld=$('loading'),tp=$('ldTip');setTimeout(()=>ld&&ld.classList.add('ready'),700);if(tp){let ti=Math.floor(Math.random()*6);const sh=()=>{tp.classList.remove('on');setTimeout(()=>{tp.textContent='💡 '+tx(['ui.ltip0','ui.ltip1','ui.ltip2','ui.ltip3','ui.ltip4','ui.ltip5'][ti++%6]);tp.classList.add('on')},350)};sh();const iv=setInterval(()=>{if(!$('ldTip'))clearInterval(iv);else sh()},5000)}}
sb.disabled=false;sb.textContent='▶ '+tx('ui.play');sb.onclick=()=>{ac();if(S.set.mus)startMusic();setVol();{const ld=$('loading');sb.onclick=null;ld.classList.add('out');document.body.classList.add('fadeIn');setTimeout(()=>ld.remove(),620)}
 if(isNew){S.seen.ch0=1;setTimeout(()=>talk(L.CHAPTERS[0].say),300)}else if(S.tut>=9&&L.loginReady(S,now()))setTimeout(()=>openLogin(1),1200)};
if(new URLSearchParams(location.search).has('skip'))sb.onclick();
requestAnimationFrame(frame);setInterval(save,5000);addEventListener('visibilitychange',()=>document.hidden&&save());
// ---------- fx7: kalyon, yağmur/şimşek, fener ışık lekesi ----------
const fx7=(()=>{const gal=new THREE.Group(),lan=[];
 P(gal,'box',0x6b3f22,2.2,.42,.7,0,0,0);P(gal,'box',0x4a2a16,2.26,.08,.76,0,.24,0);P(gal,'prism',0x6b3f22,.7,.42,.4,1.3,0,0,-Math.PI/2,0,Math.PI/2);P(gal,'box',0x7a4a2a,.6,.4,.72,-.85,.38,0);P(gal,'box',0xc9a05a,.62,.05,.74,-.85,.6,0);
 for(const[x,h]of[[.55,1.9],[-.1,2.3],[-.75,1.5]]){P(gal,'cyl',0x4a2a16,.05,h,.05,x,.2+h/2,0);for(const[y,w]of[[.75,.9],[1.35,.7]])if(y<h)P(gal,'box',0xf3ead6,.04,h*.32,w,x+.04,.2+h*(y/2.3),0,0,0,0,false)}
 const fl=P(gal,'box',0xd94a3a,.02,.16,.3,-.1,2.55,.15,0,0,0,false);
 for(const x of[-1.1,1.45]){const m=P(gal,'sph',0xffc860,.08,.08,.08,x,.55,0,0,0,0,false,1);lan.push(m)}
 gal.scale.setScalar(.8);scene.add(gal);
 const RN=260,rp=new Float32Array(RN*6),rv=[];for(let i=0;i<RN;i++)rv.push({x:(Math.random()*2-1)*16,y:Math.random()*14,z:(Math.random()*2-1)*16,s:14+Math.random()*6});
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));const rm=new THREE.LineBasicMaterial({color:0xaac4e8,transparent:true,opacity:0,depthWrite:false,fog:false});const rain=new THREE.LineSegments(rg,rm);rain.frustumCulled=false;scene.add(rain);
 const sm=new THREE.MeshBasicMaterial({color:0xffe08a,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false});const sg=new THREE.CircleGeometry(1.6,20).rotateX(-Math.PI/2);
 const spots=[0,1].map(()=>{const m=new THREE.Mesh(sg,sm);m.renderOrder=2;scene.add(m);return m});let fl_=0,flT=6,fl2=0;const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:5;opacity:0;background:radial-gradient(ellipse at 50% 15%,rgba(235,240,255,.95),rgba(170,190,255,.35) 60%,rgba(120,140,220,.15));mix-blend-mode:screen';document.body.appendChild(ov);
 const bp=new Float32Array(12*3),bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.BufferAttribute(bp,3));const bm=new THREE.LineBasicMaterial({color:0xf4f7ff,transparent:true,opacity:0,fog:false,depthWrite:false});const bolt=new THREE.Line(bg,bm);bolt.frustumCulled=false;bolt.renderOrder=3;scene.add(bolt);
 const strike=()=>{fl_=1;fl2=.18+Math.random()*.12;const a=Math.random()*6.283,r=10+Math.random()*7;let x=Math.cos(a)*r,z=Math.sin(a)*r;for(let i=0;i<12;i++){const y=14-i*1.3;bp[i*3]=x;bp[i*3+1]=y;bp[i*3+2]=z;x+=(Math.random()-.5)*1.4;z+=(Math.random()-.5)*1.4}bg.attributes.position.needsUpdate=true;try{SFX.wave()}catch(e){}};
 return(T,dt,nf,vN,on)=>{const a=-T*.035+1.2;gal.position.set(Math.cos(a)*17,-.15+Math.sin(T*1.1)*.06,Math.sin(a)*17);gal.rotation.y=-a-Math.PI/2+Math.PI;gal.rotation.z=Math.sin(T*.9)*.05;fl.rotation.y=Math.sin(T*3)*.4;
  for(const m of lan)m.visible=vN>.2;
  const rk=Math.min(1,nf*1.2);rm.opacity=rk*.45;rain.visible=rk>.02;if(rain.visible){for(let i=0;i<RN;i++){const r=rv[i];r.y-=r.s*dt;if(r.y<-.3){r.y=12+Math.random()*3;r.x=(Math.random()*2-1)*16;r.z=(Math.random()*2-1)*16}const o=i*6;rp[o]=r.x;rp[o+1]=r.y;rp[o+2]=r.z;rp[o+3]=r.x+.08;rp[o+4]=r.y+.55;rp[o+5]=r.z}rg.attributes.position.needsUpdate=true;
   flT-=dt;if(flT<0){flT=5+Math.random()*9;strike()}}
  if(fl2>0){fl2-=dt;if(fl2<=0)fl_=Math.max(fl_,.85)}
  if(fl_>0){fl_=Math.max(0,fl_-dt*2.6);const fk=fl_*(Math.sin(T*55)>0?1:.55);hemi.intensity+=fk*3.2;ov.style.opacity=RM?0:(fl_*.5).toFixed(3);bm.opacity=Math.min(1,fl_*1.6)}else if(bm.opacity){bm.opacity=0;ov.style.opacity=0}
  window.__strike=strike;
  const th=beam.rotation.y;spots.forEach((m,i)=>{const s=i?-1:1;m.visible=on;m.position.set(Math.cos(th)*9.5*s,.02,-Math.sin(th)*9.5*s);sm.opacity=.22+Math.sin(T*4)*.05})}})();
window.__g={get S(){return S},ushArena:()=>{if(!L.ushArena(S,Date.now())){toast('+1 ✨ '+tx('ui.ush_arena'));ui();save()}},sheet,modal,toast,hdr,closeSheet,renderSheet,fmt,fmtT,rwStr,SFX,KEY,L,save,syncAll,syncPeople,ui,battle,openB,openFener,openShop,openHeroes,openWork,openMap,tileScr,scr:v=>scr(new THREE.Vector3(...v)),cam,sendRaft,goIsland,openPass,openBoss,openLogin,openSettings,openClan,openIslands,openHero,openTasks,talk,bossFight,levelUp,reward,get FIT(){return FIT}};

// çevrimiçi katman (Supabase) — yüklenemezse oyun çevrimdışı devam eder
// PWA: servis çalışanı + ana ekrana ekle
let instEv=null;const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function instBtn(){if(standalone||localStorage.getItem('sf_instNo')==='1')return;let b=$('sInst');if(!b){b=document.createElement('button');b.className='sb';b.id='sInst';b.style.cssText='position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 202px);z-index:6';document.body.appendChild(b);b.onclick=()=>{if(instEv){instEv.prompt();instEv.userChoice.then(c=>{if(c.outcome==='accepted')b.remove();instEv=null})}else modal(`<div style="font-size:48px">📲</div><h2>${tx('ui.inst_t')}</h2><p>${tx('ui.inst_ios')}</p>`,[[tx('ui.tamam'),'o',()=>{}],[tx('ui.inst_no'),'',()=>{localStorage.setItem('sf_instNo','1');b.remove()}]])}}b.innerHTML=`📲<small>${tx('ui.inst')}</small>`}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();instEv=e;instBtn()});addEventListener('appinstalled',()=>$('sInst')?.remove());
if(isIOS&&!standalone)setTimeout(instBtn,1500);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker?.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update?.();setInterval(()=>r.update().catch(()=>{}),30*60e3)}).catch(e=>console.warn('sw',e));let had=!!navigator.serviceWorker?.controller;navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(had)toast('🔄 '+tx('ui.updated'));had=true})}
import('./online.js').then(m=>m.start(window.__g)).catch(e=>console.warn('çevrimdışı mod',e));
