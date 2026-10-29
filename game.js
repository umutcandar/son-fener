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
// Grafik kalitesi: auto (cihaza göre) / low / med / high
const QA=()=>{const m=navigator.deviceMemory||4,c=navigator.hardwareConcurrency||4;return(m<=2||c<=2)?'low':(m<=4||c<=4||Math.min(screen.width,screen.height)*devicePixelRatio<700)?'med':'high'};
let QS=localStorage.getItem('sf_q')||'auto';if(!['auto','low','med','high'].includes(QS))QS='auto';let QL='high';
function applyQ(){QL=QS==='auto'?QA():QS;renderer.setPixelRatio(Math.min(devicePixelRatio,QL==='low'?1:QL==='med'?1.5:2));renderer.shadowMap.enabled=QL!=='low';scene&&scene.traverse&&scene.traverse(o=>{if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(x=>x.needsUpdate=true)}});if(typeof resize==='function')resize()}
function setQ(v){QS=v;localStorage.setItem('sf_q',v);applyQ()}
// three.js kaynaklarını serbest bırak (dokular önbellekte paylaşıldığı için korunur; paylaşılan geometri/malzeme yeniden kullanılırsa three yeniden yükler)
function disposeObj(o){if(!o)return;o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(x=>{if(!x.userData.keep)x.dispose()})})}
window.__sc=()=>scene;window.__rn=()=>renderer;window.__dc2=()=>{const out={};scene.traverseVisible(o=>{if(!(o.isMesh||o.isPoints||o.isSprite||o.isLine))return;const k=o.type+':'+(o.geometry&&o.geometry.type)+':'+(o.material&&o.material.type)+(o.material&&o.material.vertexColors?'VC':'');out[k]=(out[k]||0)+1});return out};window.__dc=()=>{const out={};scene.children.forEach((c,i)=>{if(!c.visible)return;let n=0;c.traverseVisible(o=>{if(o.isMesh||o.isPoints||o.isSprite||o.isLine||o.isLineSegments)n++});const k=c.type+(c.isMesh?':'+(c.geometry.type):'')+':'+(c.isInstancedMesh?'inst':'');out[k]=(out[k]||0)+n});return out};window.__perf=()=>{const i=renderer.info,m=performance.memory;return{q:QS,ql:QL,pr:renderer.getPixelRatio(),calls:i.render.calls,tris:i.render.triangles,geo:i.memory.geometries,tex:i.memory.textures,prog:(i.programs||[]).length,heapMB:m?Math.round(m.usedJSHeapSize/1048576*10)/10:null,objs:(()=>{let n=0;scene.traverse(()=>n++);return n})()}};
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
const sun=new THREE.DirectionalLight(0xffb27a,1.9);sun.position.set(-6,10,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:40});sun.shadow.bias=-.0015;sun.shadow.normalBias=.02;scene.add(sun);
const lamp=new THREE.PointLight(0xffd27a,10,9,1.3);scene.add(lamp);
const UT={value:0};const NOISE=`float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+1.),f.x),f.y);}float fbm(vec2 p){return vn(p)*.55+vn(p*2.1)*.3+vn(p*4.3)*.15;}`;
// toon bant + kenar ışığı (rim) + yumuşak AO: tüm Lambert malzemelere
const toon=m=>{m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <opaque_fragment>',`{vec3 nn=normalize(normal);float nv=max(dot(normalize(vViewPosition),nn),0.);float rim=pow(1.-nv,3.);outgoingLight+=vec3(1.,.93,.78)*rim*.28*(.4+.6*max(nn.y,0.));float ao=.82+.18*clamp(nn.y*.5+.5,0.,1.);outgoingLight*=ao;float lum=dot(outgoingLight,vec3(.299,.587,.114));outgoingLight*=mix(1.,(floor(lum*4.+.5)/4.+.04)/(lum+.04),.22);}
#include <opaque_fragment>`)};m.customProgramCacheKey=()=>'toon';return m};
let _vcm=null;const VCMAT=()=>_vcm||(_vcm=toon(new THREE.MeshLambertMaterial({vertexColors:true,userData:{keep:1}})));let _vcb=null;const VCB=()=>_vcb||(_vcb=new THREE.MeshBasicMaterial({vertexColors:true,userData:{keep:1}}));const MATS={};const mat=(c,e)=>MATS[c+(e||'')]||(MATS[c+(e||'')]=e?new THREE.MeshBasicMaterial({color:c}):toon(new THREE.MeshLambertMaterial({color:c})));
const G={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(.5,.5,1,10),tcyl:new THREE.CylinderGeometry(.38,.5,1,10),cone:new THREE.ConeGeometry(.5,1,8),pyr:new THREE.ConeGeometry(.5,1,4).rotateY(Math.PI/4),
 dod:new THREE.DodecahedronGeometry(.5,0),sph:new THREE.SphereGeometry(.5,10,8),ico:new THREE.IcosahedronGeometry(.5,0),oct:new THREE.OctahedronGeometry(.5,0),oct8:new THREE.CylinderGeometry(.5,.5,1,8)};
{const sh=new THREE.Shape();sh.moveTo(-.5,0);sh.lineTo(.5,0);sh.lineTo(0,1);sh.lineTo(-.5,0);G.prism=new THREE.ExtrudeGeometry(sh,{depth:1,bevelEnabled:false}).translate(0,0,-.5);}
function P(par,geo,c,sx,sy,sz,x,y,z,ry=0,rx=0,rz=0,sh=true,e){const m=new THREE.Mesh(G[geo],mat(c,e));m.scale.set(sx,sy,sz);m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=sh;m.receiveShadow=!e;par.add(m);return m}
const E={out:t=>1-Math.pow(1-t,3),el:t=>t===0||t===1?t:Math.pow(2,-10*t)*Math.sin((t*10-.75)*2.094)+1};
const tweens=[];const tween=(dur,fn,done)=>tweens.push({t0:performance.now(),dur,fn,done});
const rnd=k=>{const x=Math.sin(k*12.9898)*43758.5453;return x-Math.floor(x)};
const isl=(x,z)=>Math.pow(Math.pow(Math.abs(x),3)+Math.pow(Math.abs(z),3),1/3);
// ada
const PAL={home:[0x6fae4e,0x5a9a44,0xb9cf7a,0xf2d9a0,0xe6c88a,0xd9b97a],mercan:[0x9fdc8a,0x7cc87a,0xf6d2b8,0xffc9c2,0xf7b6a8,0xe8b0a0],volkan:[0x6e625a,0x564c48,0x8a6a52,0x4a403c,0x3a3432,0x2e2a28]};
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
{const pos=[];for(let k=0;k<30;k++){const a=k/30*Math.PI*2+rnd(k)*.15,r=6.95+rnd(k+9)*.45;pos.push([Math.cos(a)*r,Math.sin(a)*r,a])}
 const trunk=new THREE.InstancedMesh(G.cyl,mat(0x9a6a42),pos.length),leaf=new THREE.InstancedMesh(G.oct,mat(0x3f9a4a),pos.length*3),rock=new THREE.InstancedMesh(G.dod,mat(0xb8aea0),14);
 [trunk,leaf,rock].forEach(m=>{m.castShadow=true;scene.add(m)});window.__palms=[trunk,leaf];const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler();
 pos.forEach(([x,z,a],i)=>{const s=.8+rnd(i)*.4,y=-(isl(x,z)-6.3)*.35;e.set(0,0,(rnd(i+3)-.5)*.4);q.setFromEuler(e);m4.compose(new THREE.Vector3(x,y+.6*s,z),q,new THREE.Vector3(.12,1.2*s,.12));trunk.setMatrixAt(i,m4);
  for(let l=0;l<3;l++){e.set(.5,l*2.1+a,0);q.setFromEuler(e);m4.compose(new THREE.Vector3(x+Math.cos(l*2.1+a)*.25,y+1.25*s,z+Math.sin(l*2.1+a)*.25),q,new THREE.Vector3(.75*s,.12,.32*s));leaf.setMatrixAt(i*3+l,m4)}});
 for(let k=0;k<14;k++){const a=k/14*6.28+.2,r=7.4+rnd(k+40)*.6,s=.4+rnd(k)*.6;m4.compose(new THREE.Vector3(Math.cos(a)*r,-.3,Math.sin(a)*r),q.identity(),new THREE.Vector3(s,s*.7,s));rock.setMatrixAt(k,m4)}}
// ızgara karoları
let tilesMesh=null;const tcol=new THREE.Color();
function buildTiles(){if(tilesMesh){scene.remove(tilesMesh);tilesMesh.geometry&&tilesMesh.geometry.dispose()}const ks=[];for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++)if(L.tileOK(i,j))ks.push(L.key(i,j));
 tilesMesh=new THREE.InstancedMesh(G.box,toon(new THREE.MeshLambertMaterial()),ks.length*2);tilesMesh.receiveShadow=true;const m4=new THREE.Matrix4(),q0=new THREE.Quaternion();
 ks.forEach((k,n)=>{const p=tpos(k),sf=L.isSafe(S,k),r=rnd(n*3.1);m4.compose(new THREE.Vector3(p.x,.035,p.z),q0,new THREE.Vector3(TS*.88,.07,TS*.88));tilesMesh.setMatrixAt(n*2,m4);tilesMesh.setColorAt(n*2,tcol.set(sf?0x9a8f7e:0x5a5468));
  m4.compose(new THREE.Vector3(p.x,.05,p.z),q0,new THREE.Vector3(TS*.78,.07,TS*.78));tilesMesh.setMatrixAt(n*2+1,m4);tilesMesh.setColorAt(n*2+1,tcol.set(sf?(r<.5?0x8fc865:0x86c060):0x726a8c))});scene.add(tilesMesh)}
// sis
const fogTex=(()=>{const cv=document.createElement('canvas');cv.width=cv.height=128;const x=cv.getContext('2d');const g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(150,120,170,.95)');g.addColorStop(.6,'rgba(120,100,140,.45)');g.addColorStop(1,'rgba(110,90,130,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(cv)})();
let fogs=[];
function fogMat(o){const m=new THREE.SpriteMaterial({map:fogTex,transparent:true,depthWrite:false,opacity:o,color:0xffffff});const ph=Math.random()*50;m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.uniforms.uP={value:ph};sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT,uP;'+NOISE).replace('#include <alphatest_fragment>',`float fn=fbm(vMapUv*3.+vec2(uT*.06+uP,uT*.035));float fn2=fbm(vMapUv*6.-vec2(uT*.09,uP));diffuseColor.a*=.45+.85*fn*fn2*1.6;diffuseColor.rgb*=.9+.18*fn;
#include <alphatest_fragment>`)};m.customProgramCacheKey=()=>'fogn';return m}
// Sis: ~100 ayrı Sprite yerine tek InstancedMesh (kameraya dönük dörtgen, örnek başı faz/opaklık) → tek çizim çağrısı
let fogIM=null,fogIMat=null;const fUN={value:0};
function mkFogIMat(){const m=new THREE.MeshBasicMaterial({map:fogTex,transparent:true,depthWrite:false,color:0xffffff});m.onBeforeCompile=sh=>{sh.uniforms.uT=UT;sh.uniforms.uNf=fUN;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float aO,aP;varying float vO,vP;').replace('#include <project_vertex>','vec4 mvPosition=modelViewMatrix*vec4(instanceMatrix[3].xyz,1.);mvPosition.xy+=position.xy*vec2(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz));gl_Position=projectionMatrix*mvPosition;vO=aO;vP=aP;');
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform float uT,uNf;varying float vO,vP;'+NOISE).replace('#include <alphatest_fragment>',`float fn=fbm(vMapUv*3.+vec2(uT*.06+vP,uT*.035));float fn2=fbm(vMapUv*6.-vec2(uT*.09,vP));diffuseColor.a*=(.45+.85*fn*fn2*1.6)*min(.95,vO+uNf*.3);diffuseColor.rgb*=.9+.18*fn;
#include <alphatest_fragment>`)};m.customProgramCacheKey=()=>'fogi';return m}
const _fm=new THREE.Matrix4(),_fq=new THREE.Quaternion(),_fv=new THREE.Vector3(),_fs=new THREE.Vector3();
function buildFog(){if(fogIM){scene.remove(fogIM);fogIM.geometry.dispose();fogIM.dispose()}fogs=[];const R=L.safeR(S);const add=(x,z,s,o,y=.6)=>{fogs.push({b:new THREE.Vector3(x,y,z),p:new THREE.Vector3(x,y,z),s,o,ph:Math.random()*6,up:Math.random()*50,d:0})};
 for(let i=-GR;i<=GR;i++)for(let j=-GR;j<=GR;j++){if(Math.max(Math.abs(i),Math.abs(j))>R)add(i*TS+(rnd(i*9+j)-.5)*.5,j*TS+(rnd(i+j*7)-.5)*.5,2.8,.55)}
 for(let k=0;k<34;k++){const a=k/34*6.28,r=8.6+rnd(k)*2.2;add(Math.cos(a)*r,Math.sin(a)*r,5+rnd(k+5)*2,.6,.9)}
 const n=fogs.length,geo=new THREE.PlaneGeometry(1,1);geo.setAttribute('aO',new THREE.InstancedBufferAttribute(new Float32Array(n),1));geo.setAttribute('aP',new THREE.InstancedBufferAttribute(new Float32Array(n),1));
 if(!fogIMat)fogIMat=mkFogIMat();fogIM=new THREE.InstancedMesh(geo,fogIMat,Math.max(1,n));fogIM.count=n;fogIM.frustumCulled=false;fogIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(fogIM)}
// ---------- MODELLER ----------
function hut(g,w,h,d,wall,roof=0xc0533a){P(g,'box',wall,w,h,d,0,h/2,0);P(g,'prism',roof,w*1.18,h*.6,d*1.12,0,h,0);P(g,'box',0x4a2e1c,w*.22,h*.55,.02,0,h*.27,d/2+.01);}
const win=(g,x,y,z)=>P(g,'box',0xffd27a,.12,.12,.02,x,y,z,0,0,0,false,1);
const SMOKE=new THREE.MeshBasicMaterial({color:0xe9eef2,transparent:true,opacity:.55,depthWrite:false});
function deco(g,lv){
 if(lv>=3&&!g.userData.flag){const fc=lv>=7?0xffd84a:lv>=5?0xb98cff:0x3fa7e0;P(g,'cyl',0x6b4a30,.025,.9,.025,.46,.45,-.42);const pv=new THREE.Group();pv.position.set(.46,.82,-.42);g.add(pv);pv.userData.cl=[fc,.22,.13,.01,.11];g.userData.flag=pv}
 if((lv>=4||g.userData.so2)&&g.userData.so){g.userData.smoke=1}
 if(lv>=8){const l=P(g,'sph',0xffe08a,.14,.14,.14,.46,1.0,-.42,0,0,0,false,1);g.userData.glow=l}
 if(lv>=4){P(g,'cyl',0x333,.03,.5,.03,-.47,.25,-.4);P(g,'sph',0xffd27a,.09,.09,.09,-.47,.52,-.4,0,0,0,false,1)}
 }
function mkPearl(g,lv){const t=TIER(lv);P(g,'cyl',STONE[0],1.05,.1,.95,0,.05,0);P(g,'cyl',0x2fa8b8,.82,.04,.72,.12,.11,.12,0,0,0,false);P(g,'cyl',0x7fe3dc,.6,.02,.5,.12,.135,.12,0,0,0,false,1);
 house(g,{t,w:.5,h:.42,d:.42,x:-.25,z:-.22,ry:.3,wall:t?undefined:0x9fd8d0,chim:true});
 for(const[x,z,c]of[[.38,.36,0xff7f7f],[-.1,.42,0xffa06b],[.45,-.05,0xff6fae]])P(g,'dod',c,.16,.2,.16,x,.12,z);
 for(let k=0;k<1+t;k++)P(g,'sph',0xfff6e8,.11,.11,.11,.05+k*.14,.16,.1,0,0,0,false,1);
 P(g,'box',0x9a6a42,.08,.05,.5,.42,.13,.15,0,0,0,false);if(t)banner(g,.45,.1,-.4,0x3fc7c0)}
function mkForge(g,lv){const t=TIER(lv);P(g,'box',STONE[0],1.0,.12,.9,0,.06,0);
 house(g,{t:Math.max(1,t),w:.62,h:.46,d:.5,x:-.12,z:-.15,wall:t<2?0x7a6e66:undefined,roof:t<2?0x4a403c:undefined,chim:true});
 P(g,'box',0x2e2a28,.34,.3,.3,.32,.25,.22);P(g,'box',0xff6a2a,.2,.14,.02,.32,.2,.38,0,0,0,false,1);P(g,'box',0x2e2a28,.16,.2,.16,.36,.5,.18);
 P(g,'box',0x3a3432,.22,.1,.12,-.2,.17,.32);P(g,'box',0x55504c,.26,.04,.12,-.2,.24,.32,0,0,0,false);for(let k=0;k<2+t;k++)P(g,'box',0xc9963a,.12,.05,.06,-.42+k*.1,.15,.4,0,0,0,false,1);
 if(t)banner(g,.45,.1,-.4,0xff6a2a);g.userData.so2=[.36,.62,.18]}

// ---------- ART V4: katmanlı, boyalı görünümlü prosedürel binalar ----------
const TIER=lv=>lv>=7?2:lv>=4?1:0;
const PALT=[{wall:0xb9814a,trim:0x6b4426,roof:0xdcae55,base:0x8d8478,glass:0xffd27a},{wall:0xf2e4c6,trim:0x6b4426,roof:0xc85a34,base:0x9c948a,glass:0xffd27a},{wall:0xe6dfd2,trim:0xc9963a,roof:0x2f63a6,base:0xb0a898,glass:0xfff0b0}];
const STONE=[0x9a9286,0xb4ab9c,0xd8d1c4],DARK=0x3a2a1c;
function house(g,o){const t=PALT[o.t],w=o.w,h=o.h,d=o.d,q=new THREE.Group();q.position.set(o.x||0,o.y||0,o.z||0);q.rotation.y=o.ry||0;g.add(q);
 P(q,'box',t.base,w+.12,.1,d+.12,0,.05,0);P(q,'box',o.wall||t.wall,w,h,d,0,.1+h/2,0);
 if(o.t===0)for(let k=1;k<4;k++)P(q,'box',t.trim,w+.02,.022,d+.02,0,.1+h*k/4,0,0,0,0,false);
 else{for(const a of[-1,1])for(const b of[-1,1])P(q,'box',t.trim,.055,h,.055,a*w/2,.1+h/2,b*d/2,0,0,0,false);P(q,'box',t.trim,w+.03,.05,d+.03,0,.1+h*.52,0,0,0,0,false);if(o.t===2)P(q,'box',STONE[1],w+.06,h*.32,d+.06,0,.1+h*.16,0)}
 const rh=h*(o.t===2?.85:.72);P(q,'prism',o.roof||t.roof,w*1.28,rh,d*1.2,0,.1+h,0);P(q,'box',o.t===2?t.trim:DARK,.06,.06,d*1.24,0,.1+h+rh,0,0,0,0,false);
 P(q,'box',0x4a2e1c,w*.26,h*.56,.03,0,.1+h*.28,d/2+.016);P(q,'box',t.trim,w*.34,.05,.04,0,.1+h*.58,d/2+.02,0,0,0,false);
 if(w>.45)for(const s of[-1,1]){P(q,'box',t.glass,.11,.12,.02,s*w*.31,.1+h*.62,d/2+.012,0,0,0,false,1);P(q,'box',t.trim,.15,.025,.03,s*w*.31,.1+h*.62-.07,d/2+.02,0,0,0,false)}
 if(o.t>=1)P(q,'box',t.glass,.1,.1,.02,0,.1+h+rh*.38,d*.6+.01,0,0,0,false,1);
 if(o.chim){const cx=w*.28,cy=.1+h+rh*.45;P(q,'box',STONE[0],.13,rh*.75,.13,cx,cy+rh*.3,-d*.15);P(q,'box',DARK,.16,.04,.16,cx,cy+rh*.68,-d*.15,0,0,0,false);g.userData.so=[cx+(o.x||0),cy+rh*.7,-d*.15+(o.z||0)]}
 return q}
function barrel(g,x,z,c=0x8a5a32){P(g,'cyl',c,.14,.18,.14,x,.09,z);P(g,'cyl',DARK,.15,.02,.15,x,.14,z,0,0,0,false)}
function crate(g,x,z,s=.16){P(g,'box',0xb8874e,s,s,s,x,s/2,z,.3);P(g,'box',0x7a5030,s*1.02,.02,s*1.02,x,s*.5,z,.3,0,0,false)}
function banner(g,x,y,z,c){P(g,'cyl',DARK,.025,.75,.025,x,y+.37,z);const pv=new THREE.Group();pv.position.set(x,y+.68,z);g.add(pv);pv.userData.cl=[c,.24,.15,.012,.12];g.userData.flag=pv;return pv}
function mkHut(g,lv){const t=TIER(lv);
 if(t===0){house(g,{t,w:.66,h:.42,d:.56,z:-.05,chim:lv>=2});if(lv>=2)house(g,{t,w:.36,h:.3,d:.34,x:.42,z:.25,ry:-.4});if(lv>=3){barrel(g,-.4,.35);crate(g,-.42,.12)}}
 else if(t===1){house(g,{t,w:.72,h:.72,d:.58,z:-.08,chim:true});house(g,{t,w:.38,h:.4,d:.38,x:.44,z:.26,ry:-.5});P(g,'box',0x5a9a4a,.62,.12,.06,-.05,.62,.23,0,0,0,false);if(lv>=6)banner(g,-.42,.05,-.38,0x3a7ac0);barrel(g,-.42,.38)}
 else{house(g,{t,w:.74,h:.78,d:.6,z:-.08,chim:true});P(g,'cyl',STONE[2],.34,1.15,.34,-.4,.6,.22);P(g,'cone',PALT[2].roof,.44,.42,.44,-.4,1.38,.22);P(g,'sph',PALT[2].trim,.07,.07,.07,-.4,1.62,.22,0,0,0,false,1);
  P(g,'box',PALT[2].glass,.08,.12,.02,-.4,.85,.4,0,0,0,false,1);house(g,{t,w:.36,h:.4,d:.34,x:.44,z:.28,ry:-.4});banner(g,.48,.05,-.4,0xe8b64a)}}
function mkWood(g,lv){const t=TIER(lv);house(g,{t,w:.55,h:.4+t*.12,d:.45,x:-.2,z:-.22,chim:lv>=4});
 const n=3+Math.min(lv,6);for(let k=0;k<n;k++)P(g,'cyl',k%2?0xb07a48:0xa26c3e,.12,.6,.12,.12+(k%3)*.13-.02*Math.floor(k/3),.07+Math.floor(k/3)*.11,.3,0,0,Math.PI/2);
 for(let k=0;k<Math.min(n,6);k++)P(g,'cyl',0xe9c99a,.09,.012,.09,.12+(k%3)*.13-.02*Math.floor(k/3),.07+Math.floor(k/3)*.11,.605,0,Math.PI/2,0,false);
 P(g,'cyl',0xc29a6a,.26,.16,.26,.38,.08,-.22);P(g,'cyl',0xe0be8a,.24,.01,.24,.38,.165,-.22,0,0,0,false);P(g,'box',0x888888,.03,.3,.03,.38,.3,-.22,0,0,.4);P(g,'box',0xc8ccd2,.12,.08,.02,.43,.42,-.22,0,0,.4);
 if(lv>=3){P(g,'box',0x8a5a32,.5,.04,.12,-.25,.28,.32);for(const s of[-1,1])P(g,'box',0x6b4426,.04,.28,.18,-.25+s*.2,.14,.32,0,0,.3*s)}
 if(t>=1){P(g,'cyl',0x6b4426,.05,.9,.05,.45,.45,.38);P(g,'box',0x6b4426,.45,.05,.05,.28,.88,.38);P(g,'box',0x333333,.01,.3,.01,.1,.72,.38,0,0,0,false)}
 if(t>=2)banner(g,-.48,.05,.1,0xe8b64a)}
function mkMine(g,lv){const t=TIER(lv);P(g,'dod',0x8a8394,1.05,.8,.85,0,.3,-.18);P(g,'dod',0x77707f,.55,.5,.5,.38,.2,-.05,1);P(g,'dod',0x9c95a6,.45,.42,.45,-.4,.18,-.1,2);
 P(g,'box',0x1a1218,.36,.36,.1,0,.2,.24,0,0,0,false,1);const fr=t===2?STONE[1]:0x7a5030;for(const s of[-1,1])P(g,'box',fr,.07,.44,.07,s*.21,.22,.27);P(g,'box',fr,.52,.08,.09,0,.46,.27);
 if(t===2){P(g,'box',PALT[2].trim,.54,.03,.1,0,.51,.27,0,0,0,false);banner(g,.45,.05,.3,0xb98cff)}
 for(const s of[-1,1])P(g,'box',0x6a5a4a,.03,.02,.62,s*.08,.02,.55,0,0,0,false);for(let k=0;k<5;k++)P(g,'box',0x7a5030,.24,.02,.04,0,.015,.3+k*.12,0,0,0,false);
 P(g,'box',0x5a4a3a,.2,.12,.16,0,.1,.62);P(g,'oct',0xb98cff,.09,.12,.09,-.03,.18,.62,0,0,0,false,1);P(g,'oct',0xd6b8ff,.07,.1,.07,.04,.17,.6,1,0,0,false,1);
 for(let k=0;k<1+Math.min(lv,6);k++){const a=k*1.7+.4;P(g,'oct',k%2?0xc9a4ff:0xa77cf5,.13+k*.018,.28+k*.03,.13,Math.cos(a)*.42,.45+(k%2)*.14,Math.sin(a)*.3-.2,a,0,.3,false,1)}
 if(t>=1){P(g,'box',0x7a5030,.05,.9,.05,-.42,.45,.32);P(g,'box',0x7a5030,.05,.9,.05,-.42,.45,.12);P(g,'box',0x7a5030,.06,.06,.3,-.42,.88,.22);P(g,'cyl',0x5a4030,.12,.12,.12,-.42,.88,.22,0,Math.PI/2)}g.userData.crys=1}
function mkFisher(g,lv){const t=TIER(lv);for(let k=0;k<5;k++)P(g,'box',k%2?0xa87448:0x9a6a42,1.0,.05,.16,0,.08,-.32+k*.17);for(const x of[-.45,.45])for(const z of[-.38,.4])P(g,'cyl',0x6b4426,.07,.34,.07,x,.06,z);
 house(g,{t,w:.48,h:.36+t*.1,d:.4,x:-.18,z:-.15,y:.08,chim:lv>=4,wall:t===0?0x7aa8c4:undefined});
 for(const s of[0,1]){P(g,'box',0x6b4426,.03,.42,.03,.2+s*.24,.3,.0);}P(g,'box',0x6b4426,.3,.025,.025,.32,.48,0);for(let k=0;k<3;k++)P(g,'box',0x9ab8c8,.04,.14,.02,.24+k*.08,.4,0,0,0,0,false);
 if(lv>=2){P(g,'box',0xd8433a,.5,.12,.2,.25,.08,.6);P(g,'box',0xf6f2ea,.52,.03,.22,.25,.14,.6,0,0,0,false)}if(lv>=4){P(g,'cyl',DARK,.025,.5,.025,.2,.4,.6);P(g,'prism',0xf6f2ea,.02,.35,.3,.25,.2,.6,Math.PI/2)}
 barrel(g,.38,-.32,0x6a8aa0);if(t>=2)banner(g,-.46,.08,.38,0x3fa7e0)}
function mkYard(g,lv){const t=TIER(lv);P(g,'box',0x9a6a42,1.1,.06,.62,0,.04,.1);for(let k=0;k<6;k++)P(g,'box',0x6b4426,.04,.07,.6,-.5+k*.2,.05,.1,0,0,0,false);
 P(g,'box',0x8a5a32,.78,.22,.3,0,.24,.1);P(g,'prism',0x8a5a32,.3,.26,.3,.48,.13,.1,Math.PI/2,Math.PI);P(g,'box',0x6b4426,.82,.04,.33,0,.36,.1,0,0,0,false);for(let k=0;k<4;k++)P(g,'box',0xc89a62,.03,.18,.33,-.3+k*.2,.18,.1,0,0,0,false);
 P(g,'cyl',DARK,.04,.9,.04,0,.75,.1);if(lv>=2)P(g,'box',0xf6f2ea,.02,.48,.38,.02,.82,.1);
 P(g,'box',0xe0a040,.06,1.1,.06,-.48,.55,-.28);P(g,'box',0xe0a040,.65,.06,.06,-.2,1.08,-.28);P(g,'box',0x333333,.01,.4,.01,.08,.88,-.28,0,0,0,false);crate(g,.1,-.3);crate(g,.3,-.28,.14);
 if(t>=1)house(g,{t,w:.4,h:.36,d:.3,x:.35,z:-.28,ry:0});if(t>=2)banner(g,.52,.05,.4,0xe8b64a)}
function mkLab(g,lv){const t=TIER(lv),st=STONE[t];P(g,'cyl',STONE[0],.82,.1,.82,0,.05,0);P(g,'cyl',st,.64,.7+t*.15,.64,0,.45+t*.07,0);
 const top=.8+t*.15;P(g,'cyl',PALT[t].trim===0x6b4426?0x6b4426:PALT[2].trim,.7,.05,.7,0,top,0,0,0,0,false);P(g,'sph',t===2?0x2f63a6:0x6a8ab0,.66,.56,.66,0,top,0);
 P(g,'box',0x1a2230,.16,.2,.4,0,top+.12,.1,0,-.5,0,false);P(g,'cyl',0x8a6a3a,.07,.5,.07,.08,top+.2,.18,0,.9);P(g,'box',PALT[t].glass,.12,.14,.02,0,.45,.33,0,0,0,false,1);P(g,'box',PALT[t].glass,.1,.12,.02,.3,.5,.15,1.1,0,0,false,1);
 P(g,'box',0x4a2e1c,.16,.26,.02,-.18,.23,.31,-.5);if(lv>=3)house(g,{t,w:.32,h:.3,d:.3,x:.42,z:-.3,ry:-.6});if(t>=1)P(g,'cyl',0x3fa7e0,.05,.3,.05,-.4,.25,.35,0,0,0,false,1);if(t>=2)banner(g,-.45,.05,-.3,0x6a8ab0)}
function mkTower(g,lv){const t=TIER(lv),st=STONE[t],H=.75+lv*.08;P(g,'cyl',STONE[0],.5,.2,.5,0,.1,0);P(g,'tcyl',st,.36,H,.36,0,.2+H/2,0);
 for(let k=0;k<4;k++){const a=k/4*6.283+.78;P(g,'box',STONE[0],.08,H*.5,.08,Math.cos(a)*.17,.2+H*.25,Math.sin(a)*.17,-a)}
 const top=.2+H;P(g,'box',0x7a5030,.5,.06,.5,0,top,0);for(let k=0;k<8;k++){const a=k/8*6.283;P(g,'box',0x7a5030,.07,.16,.07,Math.cos(a)*.24,top+.1,Math.sin(a)*.24)}
 P(g,'pyr',PALT[t].roof===0xdcae55?0xc0392b:PALT[t].roof,.56,.42,.56,0,top+.42,0);P(g,'box',PALT[t].glass,.06,.1,.02,0,.2+H*.6,.15,0,0,0,false,1);const f=P(g,'box',0xffd27a,.02,.12,.2,0,top+.74,.1,0,0,0,false);g.userData.flag=f;if(t>=2)P(g,'cyl',PALT[2].trim,.4,.03,.4,0,top-.06,0,0,0,0,false)}
function mkFener(g,lv){const t=TIER(lv),st=STONE[t],tr=t===2?0xe8b64a:0x6b4426;
 P(g,'oct8',0x7d756a,2.1,.16,2.1,0,.08,0);P(g,'oct8',st,1.9,.1,1.9,0,.2,0);
 const R=.9,seg=2*R*Math.sin(Math.PI/8);for(let k=0;k<8;k++){const a=k*Math.PI/4;if(k===1)continue;const x=Math.cos(a)*R,z=Math.sin(a)*R;
  if(t===0){for(let s=-2;s<=2;s++){const ox=-Math.sin(a)*s*seg/5,oz=Math.cos(a)*s*seg/5;P(g,'cyl',0x8a5a32,.07,.42,.07,x+ox,.45,z+oz);P(g,'cone',0x8a5a32,.075,.08,.075,x+ox,.7,z+oz)}}
  else{P(g,'box',st,seg+.02,.4,.14,x,.45,z,-a+Math.PI/2);for(let s=-1;s<=1;s++){const ox=-Math.sin(a)*s*seg/3,oz=Math.cos(a)*s*seg/3;P(g,'box',st,.1,.1,.16,x+ox,.7,z+oz,-a+Math.PI/2)}}}
 for(let k=0;k<8;k++){const a=k*Math.PI/4+Math.PI/8;if(t===0&&k%2)continue;const x=Math.cos(a)*R*1.0,z=Math.sin(a)*R*1.0;P(g,'cyl',t?st:0x7a5030,.2,.6+t*.12,.2,x,.5+t*.06,z);P(g,t?'cone':'pyr',t===2?0x2f63a6:0xc85a34,.26,.24,.26,x,.92+t*.12,z)}
 {const a=Math.PI/4,x=Math.cos(a)*R,z=Math.sin(a)*R;P(g,'box',0x4a2e1c,.26,.32,.06,x,.41,z,-a+Math.PI/2);P(g,'box',tr,.34,.06,.08,x,.6,z,-a+Math.PI/2,0,0,false);for(const s of[-1,1])P(g,'cyl',0xffb347,.05,.08,.05,x-Math.sin(a)*s*.26,.62,z+Math.cos(a)*s*.26,0,0,0,false,1)}
 const KH=.9+t*.2;P(g,'oct8',st,1.05,KH,1.05,0,.25+KH/2,0);for(let k=0;k<4;k++){const a=k*Math.PI/2+Math.PI/4;P(g,'box',STONE[0],.12,KH*.8,.12,Math.cos(a)*.5,.25+KH*.4,Math.sin(a)*.5,-a)}
 P(g,'oct8',STONE[0],1.12,.08,1.12,0,.25+KH,0);for(let k=0;k<8;k++){const a=k/8*6.283;P(g,'box',st,.12,.12,.12,Math.cos(a)*.52,.25+KH+.1,Math.sin(a)*.52,-a)}
 for(const a of[Math.PI/4,Math.PI/4+Math.PI/2*1.2,-Math.PI/4]){P(g,'box',PALT[t].glass,.1,.15,.02,Math.cos(a)*.5,.25+KH*.62,Math.sin(a)*.5,-a+Math.PI/2,0,0,false,1)}
 if(t>=1)for(const a of[Math.PI/4+.35,Math.PI/4-.35]){const b=P(g,'box',t===2?0xe8b64a:0xc0392b,.18,.42,.015,Math.cos(a)*.535,.25+KH*.55,Math.sin(a)*.535,-a+Math.PI/2,0,0,false)}
 const h=1.6+lv*.12,n=5,hs=h/n;let y=.25+KH;for(let i=0;i<n;i++){const r0=.36-i/n*.08,r1=.36-(i+1)/n*.08;const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r0,hs+.005,16),mat(i%2?0xd8433a:0xf6f2ea));m.position.y=y+hs/2;m.castShadow=true;g.add(m);
  if(i%2===0&&i>0)P(g,'box',PALT[t].glass,.07,.11,.03,Math.sin(.78)*(r0-.01),y+hs/2,Math.cos(.78)*(r0-.01),.78,0,0,false,1);y+=hs}
 P(g,'cyl',0x2e3440,.78,.07,.78,0,y+.035,0);if(t===2)P(g,'cyl',0xe8b64a,.8,.025,.8,0,y+.075,0,0,0,0,false);const top=y+.07;
 for(let k=0;k<12;k++){const a=k/12*6.28;P(g,'box',0x2e3440,.022,.18,.022,Math.cos(a)*.37,top+.09,Math.sin(a)*.37)}
 const rail=new THREE.Mesh(new THREE.TorusGeometry(.37,.015,4,24).rotateX(Math.PI/2),mat(0x2e3440));rail.position.y=top+.18;g.add(rail);
 P(g,'cyl',0xfff1b0,.44,.42,.44,0,top+.23,0,0,0,0,false,1);for(let k=0;k<6;k++){const a=k/6*6.28;P(g,'box',t===2?0xe8b64a:0x2e3440,.03,.44,.03,Math.cos(a)*.23,top+.23,Math.sin(a)*.23)}
 const dome=new THREE.Mesh(new THREE.SphereGeometry(.28,14,8,0,6.29,0,Math.PI/2),mat(t===2?0xe8b64a:0xc0392b));dome.position.y=top+.44;dome.castShadow=true;g.add(dome);
 P(g,'sph',0xffd84a,.09,.09,.09,0,top+.75,0,0,0,0,false,1);P(g,'box',0x2e3440,.02,.22,.02,0,top+.86,0);P(g,'box',0xffd84a,.15,.05,.01,.07,top+.94,0);
 if(lv>=2){barrel(g,-.62,.35);crate(g,-.5,.55)}if(lv>=3)P(g,'box',0x6aa0c0,.18,.16,.16,.6,.33,-.45);
 g.userData.lampY=top+.23}
function mkScaf(g){const s=new THREE.Group();for(const a of[-1,1])for(const b of[-1,1])P(s,'cyl',0xc08a4a,.045,1.15,.045,a*.46,.57,b*.46);
 for(const y of[.38,.78])for(const a of[-1,1]){P(s,'box',0xc08a4a,.94,.035,.035,0,y,a*.46);P(s,'box',0xc08a4a,.035,.035,.94,a*.46,y,0)}
 P(s,'box',0xd9b27a,.94,.03,.2,0,.8,.48);for(const a of[-1,1])P(s,'box',0xa8733e,.03,.03,1.0,a*.47,.58,0,0,.42*a);P(s,'box',0xf4d03f,.9,.05,.02,0,1.0,.47);P(s,'box',0x333333,.9,.05,.02,0,.95,.47);
 crate(s,.55,.55,.14);crate(s,.58,.36,.12);P(s,'box',0x9a9286,.16,.08,.1,-.6,.04,.5);mergeStatic(s);g.add(s)}
// taban: arnavut kaldırımı meydan, palisat duvar, kapılar, meşaleler, iskele
function buildBase(){const B=new THREE.Group();const R=GR*TS+TS/2;
 const pl=new THREE.Mesh((()=>{const sh=new THREE.Shape();for(let i=0;i<=64;i++){const t=i/64*Math.PI*2,c=Math.cos(t),n=Math.sin(t),f=6.15/Math.cbrt(Math.abs(c)**3+Math.abs(n)**3);i?sh.lineTo(c*f,-n*f):sh.moveTo(c*f,-n*f)}return new THREE.ShapeGeometry(sh).rotateX(-Math.PI/2)})(),mat(0xc2b08c));pl.position.y=.055;pl.receiveShadow=true;B.add(pl);
 const stakes=[],tips=[],torch=[];const rr=a=>6.62/isl(Math.cos(a),Math.sin(a));const N=150,gates=[0,Math.PI/2,Math.PI,Math.PI*1.5];
 for(let k=0;k<N;k++){const a=k/N*6.283;if(gates.some(g=>Math.abs(Math.atan2(Math.sin(a-g),Math.cos(a-g)))<.075))continue;const r=rr(a),x=Math.cos(a)*r,z=Math.sin(a)*r;const y=r>6.3?-(r-6.3)*.35:0;const hh=.55+rnd(k)*.12;stakes.push([x,y+hh/2-.05,z,hh]);tips.push([x,y+hh-.02,z]);if(k%15===7)torch.push([x*1.0,y+hh+.12,z])}
 const sI=new THREE.InstancedMesh(G.cyl,mat(0x8a5a32),stakes.length),tI=new THREE.InstancedMesh(G.cone,mat(0x9c6a3c),tips.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3();
 stakes.forEach(([x,y,z,h],i)=>{sI.setMatrixAt(i,m4.compose(v.set(x,y,z),q,new THREE.Vector3(.13,h,.13)))});tips.forEach(([x,y,z],i)=>{tI.setMatrixAt(i,m4.compose(v.set(x,y+.06,z),q,new THREE.Vector3(.14,.14,.14)))});sI.castShadow=tI.castShadow=true;B.add(sI,tI);
 const GT=new THREE.Group();for(const a of gates){const r=rr(a),x=Math.cos(a)*r,z=Math.sin(a)*r,y=r>6.3?-(r-6.3)*.35:0,px=-Math.sin(a),pz=Math.cos(a);
  for(const s of[-1,1]){const tx_=x+px*s*.5,tz=z+pz*s*.5;P(GT,'box',0x7a5030,.32,1.0,.32,tx_,y+.45,tz,-a);P(GT,'box',0x6b4426,.42,.08,.42,tx_,y+.98,tz,-a);P(GT,'pyr',0xc85a34,.5,.36,.5,tx_,y+1.2,tz,-a);torch.push([tx_-Math.cos(a)*.22,y+.82,tz-Math.sin(a)*.22])}
  P(GT,'box',0x6b4426,.12,.12,1.2,x,y+.85,z,-a);P(GT,'box',0xa87448,.1,.2,.7,x,y+.72,z,-a)}
 for(let k=0;k<6;k++){const a=-Math.PI/4,r=6.9+k*.42;P(GT,'box',k%2?0xa87448:0x9a6a42,.7,.06,.42,Math.cos(a)*r,-.18,Math.sin(a)*r,-a);for(const s of[-1,1])P(GT,'cyl',0x6b4426,.08,.6,.08,Math.cos(a)*r-Math.sin(a)*s*.33,-.35,Math.sin(a)*r+Math.cos(a)*s*.33)}
 {const a=-Math.PI/4,r=8.9;P(GT,'cyl',0x6b4426,.12,.8,.12,Math.cos(a)*r,.1,Math.sin(a)*r);barrel(GT,Math.cos(a)*7.3+.2,Math.sin(a)*7.3+.1);}
 mergeStatic(GT);B.add(GT);
 const pI=new THREE.InstancedMesh(G.cyl,mat(0x3a2a1c),torch.length),fI=new THREE.InstancedMesh(G.sph,mat(0xffa83a,1),torch.length);torch.forEach(([x,y,z],i)=>{pI.setMatrixAt(i,m4.compose(v.set(x,y-.14,z),q,new THREE.Vector3(.04,.2,.04)));fI.setMatrixAt(i,m4.compose(v.set(x,y,z),q,new THREE.Vector3(.1,.14,.1)))});B.add(pI,fI);
 const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(torch.flat(),3));const gl=new THREE.Points(gg,new THREE.PointsMaterial({size:.9,map:glowTex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,color:0xffa040,opacity:.4}));B.userData.glow=gl;B.add(gl);
 scene.add(B);return B}
function pillar(pos,c=0xffe08a){const m=new THREE.Mesh(new THREE.CylinderGeometry(.45,.6,6,16,1,true),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.position.copy(pos).setY(3);scene.add(m);
 tween(1100,k=>{m.material.opacity=Math.sin(k*Math.PI)*.55;m.scale.set(1+k*.6,.3+k*.7,1+k*.6)},()=>{scene.remove(m);m.geometry.dispose();m.material.dispose()})}

const MK={tower:mkTower,hut:mkHut,fisher:mkFisher,wood:mkWood,mine:mkMine,yard:mkYard,lab:mkLab,pearl:mkPearl,forge:mkForge};
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
function syncFener(){const sig=S.fener.lv+'|'+(S.fener.end?1:0);if(sig===fenerSig)return fenerG;fenerSig=sig;if(fenerG){scene.remove(fenerG);disposeObj(fenerG)}fenerG=new THREE.Group();mkFener(fenerG,S.fener.lv);mergeStatic(fenerG);if(S.fener.end)mkScaf(fenerG);scene.add(fenerG);
 const y=fenerG.userData.lampY;beam.position.y=y;lamp.position.set(0,y,0);halo.position.set(0,y,0);return fenerG}
// bina senkronu
const meshes=new Map();
// Statik parçaları malzemeye göre tek geometride birleştir (animasyonlu, userData ile referans verilen parçalar hariç) → bina başına çok daha az çizim çağrısı
function mergeStatic(root){const keep=new Set();root.traverse(o=>{for(const v of Object.values(o.userData||{})){(Array.isArray(v)?v:[v]).forEach(x=>{if(x&&x.isObject3D)x.traverse(y=>keep.add(y))})}});
 root.updateMatrixWorld(true);const inv=new THREE.Matrix4().copy(root.matrixWorld).invert(),bk=new Map(),m4=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||keep.has(o)||!o.visible||Array.isArray(o.material)||o.parent!==root&&keep.has(o.parent))return;const mt=o.material,vc=mt.isMeshLambertMaterial&&!mt.map&&!mt.transparent&&!mt.vertexColors,vb=mt.isMeshBasicMaterial&&!mt.map&&!mt.transparent&&!mt.vertexColors;const k=vc?'VC|L':vb?'VC|B':mt.uuid+'|'+o.castShadow+'|'+o.receiveShadow;if(!bk.has(k))bk.set(k,[]);bk.get(k).push(o)});
 for(const[bkk,arr]of bk){const isVC=bkk.startsWith('VC');if(arr.length<2&&!isVC)continue;let nV=0;const gs=arr.map(o=>{const g=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());g.applyMatrix4(m4.multiplyMatrices(inv,o.matrixWorld));nV+=g.attributes.position.count;return g});
  if(!gs.every(g=>g.attributes.normal))continue;const pos=new Float32Array(nV*3),nor=new Float32Array(nV*3),col=isVC?new Float32Array(nV*3):null;let off=0;for(const[gi,g]of gs.entries()){if(col){const c=arr[gi].material.color,n=g.attributes.position.count;for(let j=0;j<n;j++){col[(off+j)*3]=c.r;col[(off+j)*3+1]=c.g;col[(off+j)*3+2]=c.b}}pos.set(g.attributes.position.array,off*3);nor.set(g.attributes.normal.array,off*3);off+=g.attributes.position.count;g.dispose()}
  const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(pos,3));mg.setAttribute('normal',new THREE.BufferAttribute(nor,3));if(col)mg.setAttribute('color',new THREE.BufferAttribute(col,3));mg.computeBoundingSphere();
  const vb=bkk==='VC|B',mm=new THREE.Mesh(mg,isVC?(vb?VCB():VCMAT()):arr[0].material);mm.castShadow=isVC?!vb:arr[0].castShadow;mm.receiveShadow=isVC?!vb:arr[0].receiveShadow;arr.forEach(o=>o.parent.remove(o));root.add(mm)}}
function syncOne(k){const b=S.g[k];const cur=meshes.get(k);if(!b){if(cur){scene.remove(cur.g);disposeObj(cur.g);meshes.delete(k)}return null}
 const sig=`${b.k}|${b.lv}|${b.end?1:0}|${b.fog?1:0}`;if(cur&&cur.sig===sig)return cur.g;if(cur){scene.remove(cur.g);disposeObj(cur.g)}
 const g=new THREE.Group();g.position.copy(tpos(k));const inner=new THREE.Group();inner.scale.setScalar(.8+Math.min(b.lv,8)*.05);g.add(inner);MK[b.k](inner,b.lv);deco(inner,b.lv);mergeStatic(inner);if(b.end)mkScaf(g);
 g.userData.bdl=b.lv;
 if(b.fog){const f=new THREE.Mesh(G.sph,new THREE.MeshBasicMaterial({color:0x6a4a8a,transparent:true,opacity:.45,depthWrite:false}));f.scale.set(1.3,1,1.3);f.position.y=.4;g.add(f);const gh=sprite('👻','#4a2a6acc',.45,false,'#b98cff');gh.position.y=1.2;g.add(gh);g.userData.gh=gh}
 if(KINDS[b.k].res&&!b.fog){const bub=new THREE.Sprite(new THREE.SpriteMaterial({map:bubTex(KINDS[b.k].res),depthTest:false}));bub.scale.set(.36,.36,1);bub.renderOrder=10;bub.position.y=1.3;bub.visible=false;g.add(bub);g.userData.bub=bub}
 scene.add(g);meshes.set(k,{g,sig});return g}

const WALK=(()=>{const N=10,bd=new THREE.InstancedMesh(G.box,mat(0xffffff),N*2),hd=new THREE.InstancedMesh(G.sph,mat(0xf0c8a0),N);bd.castShadow=hd.castShadow=true;
 const cols=[0x3f7fc0,0xc04a3a,0x5a9a44,0xd9a040],tc=new THREE.Color();for(let i=0;i<N*2;i++)bd.setColorAt(i,tc.set(i<N?cols[i%4]:0x9a6a42));
 const w=[];for(let i=0;i<N;i++)w.push({R:i%2?1.95:3.25,s:rnd(i*7.7),v:(.025+rnd(i)*.02)*(i%3?1:-1),cart:i%3===0});
 const g=new THREE.Group();g.add(bd,hd);scene.add(g);const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),p=new THREE.Vector3(),sc=new THREE.Vector3();
 function pt(R,s){s=((s%1)+1)%1;const u=s*4,k=Math.floor(u),f=u-k,c=[[-R,-R],[R,-R],[R,R],[-R,R],[-R,-R]];return[c[k][0]+(c[k+1][0]-c[k][0])*f,c[k][1]+(c[k+1][1]-c[k][1])*f,k]}
 return{g,upd(dt,T){g.visible=S.cur==='home';if(!g.visible)return;w.forEach((o,i)=>{o.s+=o.v*dt/(o.R*.25);let[x,z,k]=pt(o.R,o.s);{const vert=k%2===1,a=vert?x:z,b=vert?z:x,tb=Math.round(b/TS),sg=Math.sign(a),ti=Math.round(a/TS-sg*.5),to=ti+sg,ov=t=>{const kk=vert?t+','+tb:tb+','+t,bb=S.g[kk];return bb?(.8+Math.min(bb.lv,8)*.05)*.56-.58:-.1},d=Math.max(-.2,Math.min(.2,(ov(ti)-ov(to))*.5*sg));if(vert)x+=d;else z+=d}const ry=-(k*Math.PI/2)+(o.v<0?Math.PI:0),bob=Math.abs(Math.sin(T*9+i))*.03;
  e.set(0,ry,0);q.setFromEuler(e);m4.compose(p.set(x,.16+bob,z),q,sc.set(.09,.16,.07));bd.setMatrixAt(i,m4);m4.compose(p.set(x,.28+bob,z),q,sc.set(.09,.09,.09));hd.setMatrixAt(i,m4);
  const ox=Math.cos(ry)*.14,oz=-Math.sin(ry)*.14;m4.compose(p.set(x+ox,o.cart?.13:-5,z+oz),q,sc.set(.18,.1,.13));bd.setMatrixAt(N+i,m4)});bd.instanceMatrix.needsUpdate=hd.instanceMatrix.needsUpdate=true;bd.instanceColor.needsUpdate=true}}})();
const _xm=new THREE.Matrix4(),_xs=new THREE.Matrix4(),_xv=new THREE.Vector3(),_xc=new THREE.Color();let _fx=null;function FXI(){if(_fx)return _fx;const N=64,f=new THREE.InstancedMesh(G.box,mat(0xffffff),N),sm=new THREE.InstancedMesh(G.sph,SMOKE,N*3);f.frustumCulled=sm.frustumCulled=false;f.castShadow=true;f.setColorAt(0,_xc.set(0xffffff));f.count=sm.count=0;scene.add(f,sm);return _fx={N,f,s:sm}}

// Seviye rozetleri: atlas (8x8, 1..64) + tek InstancedMesh kameraya dönük dörtgen → tek çizim çağrısı
let _bg=null;function BDG(){if(_bg)return _bg;const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');x.textAlign='center';x.textBaseline='middle';
 for(let i=0;i<64;i++){const cx=(i%8)*64+32,cy=Math.floor(i/8)*64+32;x.fillStyle='#1f6f8b';x.beginPath();x.arc(cx,cy,28,0,7);x.fill();x.lineWidth=4;x.strokeStyle='#ffe08a';x.stroke();x.fillStyle='#fff';x.font='bold '+(i<9?34:28)+'px system-ui,sans-serif';x.fillText(String(i+1),cx,cy+2)}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const N=96,gm=new THREE.PlaneGeometry(1,1),aC=new THREE.InstancedBufferAttribute(new Float32Array(N),1);gm.setAttribute('aC',aC);
 const m=new THREE.ShaderMaterial({uniforms:{map:{value:t}},transparent:true,depthWrite:false,vertexShader:`attribute float aC;varying vec2 vU;void main(){vec4 w=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);vec4 mv=viewMatrix*w;mv.xy+=position.xy*.3;gl_Position=projectionMatrix*mv;float c=aC;vU=(vec2(mod(c,8.),7.-floor(c/8.))+uv)/8.;}`,fragmentShader:`uniform sampler2D map;varying vec2 vU;void main(){vec4 c=texture2D(map,vU);if(c.a<.05)discard;gl_FragColor=c;
#include <colorspace_fragment>
}`});m.userData.keep=1;const im=new THREE.InstancedMesh(gm,m,N);im.frustumCulled=false;im.renderOrder=10;im.count=0;scene.add(im);return _bg={N,im,aC}}
const _bv=new THREE.Vector3();function fillBDG(){const B=BDG();let n=0;for(const[,o]of meshes){const g=o.g,l=g.userData.bdl;if(!l||!g.visible||n>=B.N)continue;let v=g,ok=true;while(v){if(!v.visible){ok=false;break}v=v.parent}if(!ok)continue;_bv.set(.5,.15,.5);g.localToWorld(_bv);_xm.makeTranslation(_bv.x,_bv.y,_bv.z);B.im.setMatrixAt(n,_xm);B.aC.array[n]=Math.min(l,64)-1;n++}B.im.count=n;B.im.instanceMatrix.needsUpdate=true;B.aC.needsUpdate=true}
function mkTufts(){const g=new THREE.Group(),pos=[];for(let i=-4;i<4;i++)for(let j=-4;j<4;j++){const x=(i+.5)*TS,z=(j+.5)*TS;if(isl(x,z)>6||Math.abs(i+.5)<1&&Math.abs(j+.5)<1)continue;for(let n=0;n<2;n++)pos.push([x+(rnd(i*9+j+n)-.5)*.14,z+(rnd(j*7+i-n)-.5)*.14,n])}
 for(let k=0;k<50;k++){const a=rnd(k*3.3)*6.28,r=5.4+rnd(k*1.7)*.8;pos.push([Math.cos(a)*r,Math.sin(a)*r,k%2])}
 const tf=new THREE.InstancedMesh(G.cone,mat(0xffffff),pos.length),fl=new THREE.InstancedMesh(G.oct,mat(0xffffff),pos.length),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color(),FC=[0xfff1b0,0xff8fa8,0xb98cff,0xffffff,0xffb347];
 pos.forEach(([x,z,n],i)=>{m4.compose(v.set(x,.1,z),q,sc.set(.07,.14+rnd(i)*.08,.07));tf.setMatrixAt(i,m4);tf.setColorAt(i,c.set(rnd(i*2)<.5?0x4f9a3a:0x6fb84a));m4.compose(v.set(x+.05,.12,z-.04),q,sc.setScalar(n?.05:0));fl.setMatrixAt(i,m4);fl.setColorAt(i,c.set(FC[i%5]))});
 g.add(tf,fl);return g}
let baseG=null;function syncAll(){if(!baseG){baseG=buildBase();baseG.add(mkTufts())}baseG.visible=S.cur==='home';for(const k of [...meshes.keys()])if(!S.g[k])syncOne(k);for(const k in S.g)syncOne(k);syncFener()}
// canavar kampları (denizde)
const CAMPS=[{id:'c1',x:7.2,z:-4.6,b:'ghost'},{id:'c2',x:-4.4,z:7.4,b:'octo'}];
for(const c of CAMPS){const g=new THREE.Group();g.position.set(c.x,-.25,c.z);mkFoe(g,c.b);const sp=sprite('⚔️','#b3261ecc',.5);sp.position.y=1.6;g.add(sp);g.userData.sp=sp;scene.add(g);c.g=g}
// insanlar + sallar
const PIM={};function PQ(par,geo,c,sx,sy,sz,x,y,z){const o=new THREE.Object3D();o.scale.set(sx,sy,sz);o.position.set(x,y,z);o.userData={pg:geo,pc:new THREE.Color(c)};par.add(o);return o}
function pimUpd(){const n={};for(const k in PIM)n[k]=0;for(const p of people){p.updateMatrixWorld(true);for(const o of p.children){const k=o.userData.pg;if(!k)continue;let im=PIM[k];if(!im){im=PIM[k]=new THREE.InstancedMesh(G[k],mat(0xffffff),64);im.castShadow=true;im.receiveShadow=true;im.frustumCulled=false;scene.add(im);n[k]=0}if(n[k]>=64)continue;im.setMatrixAt(n[k],o.matrixWorld);im.setColorAt(n[k],o.userData.pc);n[k]++}}for(const k in PIM){const im=PIM[k];im.count=n[k];im.instanceMatrix.needsUpdate=true;if(im.instanceColor)im.instanceColor.needsUpdate=true}}
const people=[];function mkPerson(i){const g=new THREE.Group();const shirt=[0xe07a5f,0x3d8ab0,0xf2cc8f,0x81b29a,0xd8433a][i%5];
 PQ(g,'cyl',shirt,.16,.24,.14,0,.2,0);PQ(g,'sph',0xf1c9a5,.13,.13,.13,0,.39,0);if(i%2)PQ(g,'cyl',0xe8c860,.24,.03,.24,0,.46,0);
 const l1=PQ(g,'box',0x3a4a5a,.05,.12,.05,-.04,.06,0),l2=PQ(g,'box',0x3a4a5a,.05,.12,.05,.04,.06,0);g.userData={l1,l2,t:null,sp:.6+Math.random()*.3,ph:Math.random()*6};scene.add(g);return g}
function syncPeople(){const n=Math.min(S.surv,16);while(people.length<n){const p=mkPerson(people.length);const a=Math.random()*6.28;p.position.set(Math.cos(a)*1.4,0,Math.sin(a)*1.4);people.push(p)}while(people.length>n)scene.remove(people.pop())}
function pickTarget(p){const ks=Object.keys(S.g);const k=ks[Math.floor(Math.random()*ks.length)];const c=Math.random()<.3||!k?new THREE.Vector3():tpos(k);const a=Math.random()*6.28;p.userData.t=new THREE.Vector3(c.x+Math.cos(a)*.75,0,c.z+Math.sin(a)*.75)}
const rafts=[];function sendRaft(big){const a=Math.random()*6.28;const g=new THREE.Group();mkRaft(g,big);mergeStatic(g);g.position.set(Math.cos(a)*22,-.2,Math.sin(a)*22);g.rotation.y=-a+Math.PI;scene.add(g);
 rafts.push({g,from:g.position.clone(),to:new THREE.Vector3(Math.cos(a)*7.6,-.2,Math.sin(a)*7.6),t:0,dur:6})}
function mkBoat(g,sc){P(g,'box',0x8a5a32,1.1,.22,.42,0,0,0);P(g,'box',0x6b4a30,1.14,.05,.46,0,.12,0);P(g,'prism',0x8a5a32,.42,.35,.22,.62,-.02,0,-Math.PI/2,0,Math.PI/2);
 P(g,'cyl',0x5a3a22,.04,1.1,.04,-.05,.6,0);P(g,'prism',sc,.02,.85,.7,.12,.25,0,Math.PI/2);P(g,'box',0xf6f2ea,.02,.25,.02,-.05,1.2,0);P(g,'box',0xd8433a,.18,.08,.01,.04,1.2,0)}
const boats=[0xf6f2ea,0xf2cc8f,0xe07a5f].map((c,i)=>{const g=new THREE.Group();mkBoat(g,c);mergeStatic(g);g.scale.setScalar(.9+i*.15);scene.add(g);return{g,r:10.5+i*2.2,sp:.05+i*.015,ph:i*2.1}});
const sailer=boats[0].g;
const gulls=[];for(let i=0;i<7;i++){const g=new THREE.Group();P(g,'sph',0xffffff,.12,.08,.22,0,0,0,0,0,0,false);const w1=new THREE.Group(),w2=new THREE.Group();g.add(w1,w2);P(w1,'box',0xf0f0f0,.32,.015,.1,.16,0,0,0,0,0,false);P(w2,'box',0xf0f0f0,.32,.015,.1,-.16,0,0,0,0,0,false);
 P(g,'box',0xffb347,.04,.03,.06,0,0,.13,0,0,0,false);scene.add(g);gulls.push({g,w1,w2,r:3+Math.random()*6,h:3+Math.random()*2.5,sp:.25+Math.random()*.25,ph:Math.random()*6})}
const islDeco=new THREE.Group();scene.add(islDeco);
function buildIslDeco(id){islDeco.clear();window.__palms.forEach(m=>m.visible=id!=='volkan');
 if(id==='mercan'){const CC=[0xff7f7f,0xffa06b,0xff6fae,0xffd06b,0xb98cff];for(let k=0;k<14;k++){const a=k/14*6.28+rnd(k)*.3,r=7.7+rnd(k+3)*1.4,x=Math.cos(a)*r,z=Math.sin(a)*r,c=CC[k%5];P(islDeco,'dod',0xe8d6b0,.9,.25,.8,x,-.3,z,a);for(let b=0;b<3+(k%3);b++){const h=.35+rnd(k*5+b)*.5;P(islDeco,b%2?'cone':'cyl',c,.09+rnd(b)*.05,h,.09,x+(rnd(k+b)-.5)*.5,-.2+h/2,z+(rnd(k*3+b)-.5)*.5,0,(rnd(b+k)-.5)*.6,(rnd(b*7+k)-.5)*.6)}P(islDeco,'sph',CC[(k+2)%5],.22,.16,.22,x+.2,-.15,z-.15)}
  for(let k=0;k<10;k++){const a=k/10*6.28+.3,r=9.6+rnd(k)*.8;for(let h=0;h<3;h++)P(islDeco,'box',0x3f9a6a,.05,.4,.05,Math.cos(a)*r+h*.08,-.1+h*.05,Math.sin(a)*r,0,0,(h-1)*.25)}
  for(const[x,z,ry]of[[8.6,2.5,.4],[-3,8.8,1.9]]){for(const dx of[-.3,.3])for(const dz of[-.25,.25])P(islDeco,'cyl',0x6b4426,.06,.9,.06,x+dx,-.1,z+dz);P(islDeco,'box',0x9a6a42,.85,.06,.7,x,.35,z,ry);P(islDeco,'box',0xf2e4c6,.6,.36,.5,x,.56,z,ry);P(islDeco,'prism',0xdcae55,.8,.3,.65,x,.74,z,ry)}}
const _bID=buildIslDeco;buildIslDeco=function(id){_bID(id);mergeStatic(islDeco)};
 if(id==='volkan'){const vx=-9,vz=-9;[[4.2,1.4,0x5e5450],[3.2,1.4,0x4a403c],[2.2,1.3,0x3a3432],[1.4,.6,0x2e2a28]].reduce((y,[r,h,c],i)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(r*.72,r,h,10),mat(c));m.position.set(vx,y+h/2,vz);m.rotation.y=i*.4;islDeco.add(m);return y+h},-1.2);
  P(islDeco,'cyl',0xff6a2a,1.1,.12,1.1,vx,3.55,vz,0,0,0,false,1);P(islDeco,'cyl',0xffb347,.6,.14,.6,vx,3.6,vz,0,0,0,false,1);
  for(let k=0;k<3;k++){const a=.6+k*.9;for(let j=0;j<5;j++){const t=j/5,r=1+t*3,y=3.3-t*4.2;P(islDeco,'box',j%2?0xff6a2a:0xff8c3a,.22,.08,.7,vx+Math.cos(a)*r,y,vz+Math.sin(a)*r,-a+Math.PI/2,.6,0,false,1)}}
  for(let k=0;k<5;k++){const sm=new THREE.Sprite(new THREE.SpriteMaterial({map:fogTex,transparent:true,depthWrite:false,opacity:.55,color:0x6a5e58}));sm.position.set(vx+k*.3,4.2+k*1.1,vz-k*.2);sm.scale.set(2+k,1.5+k*.6,1);islDeco.add(sm)}
  for(let k=0;k<18;k++){const a=k/18*6.28,r=6.7+rnd(k)*1.2,h=.4+rnd(k+2)*.9;P(islDeco,k%3?'dod':'cyl',k%3?0x3a3432:0x2e2a28,k%3?.45:.22,h,k%3?.45:.22,Math.cos(a)*r,-.2+h/2,Math.sin(a)*r,a)}
  for(let k=0;k<6;k++){const a=k*1.05+.4,r=8.2;P(islDeco,'cyl',0xff6a2a,.5,.04,.5,Math.cos(a)*r,-.18,Math.sin(a)*r,0,0,0,false,1)}}}
let beacon=null;function syncBeacon(){if(beacon){scene.remove(beacon);disposeObj(beacon)}beacon=null;if(S.cur==='home')return;beacon=new THREE.Group();const lv=S.isl[S.cur].lv;P(beacon,'dod',0x7a7268,.9,.4,.9,0,.1,0);
 P(beacon,'cyl',0xf6f2ea,.32,.9+lv*.25,.32,0,.5+(lv*.25)/2,0);P(beacon,'sph',0xfff1b0,.3,.3,.3,0,1.05+lv*.25,0,0,0,0,false,1);P(beacon,'cone',0xc0392b,.36,.26,.36,0,1.3+lv*.25,0);scene.add(beacon)}
// ---------- KAMERA ----------
const cam={target:new THREE.Vector3(0,0,.4),dist:24,az:Math.PI/4,pol:.84,shake:0,goal:null};
let FIT=24,bubN=0;const minD=8,maxD=()=>FIT*1.25;
function updCam(){if(cam.goal){cam.target.lerp(cam.goal,.08);if(cam.target.distanceToSquared(cam.goal)<.0004)cam.goal=null}const o=new THREE.Vector3(Math.sin(cam.pol)*Math.sin(cam.az),Math.cos(cam.pol),Math.sin(cam.pol)*Math.cos(cam.az)).multiplyScalar(cam.dist);camera.position.copy(cam.target).add(o);
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
let toastT;function toast(t){const d=$('toast');d.classList.toggle('low',$('modal').classList.contains('on'));d.innerHTML=tl(t);d.style.opacity=1;clearTimeout(toastT);toastT=setTimeout(()=>d.style.opacity=0,2200)}
function modal(html,acts){clearTimeout(mT);$('modal').classList.remove('out');$('mbox').innerHTML=html+'<div class="acts"></div>';const a=$('mbox').querySelector('.acts');for(const[t,cls,fn]of acts){const b=document.createElement('button');b.className='btn '+(cls||'');b.innerHTML=t;b.onclick=()=>{closeModal();fn&&fn()};a.appendChild(b)}$('modal').classList.add('on')}
let mT=0;const closeModal=()=>{const m=$('modal');if(!m.classList.contains('on'))return;m.classList.add('out');clearTimeout(mT);mT=setTimeout(()=>{m.classList.remove('on','out')},170)};
const DEMO=`<div class="demo">${tx('ui.demo_gercek_odeme_alinmaz')}</div>`;
function confirmBuy(t,d,p,fn,item=''){const z=L.spendOf(S,now()),pr=L.priceNum(p);
 modal(`<h2>${t}</h2><p>${d}</p>${DEMO}`,[[tx('ui.vazgec'),'x'],[`${tx('ui.satin_al',[p])}`,'g',()=>{const M=window.__monet;
 if(M&&M.ok()){M.purchase(pr,item).then(st=>{L.applyMonet(S,st);fn();save()}).catch(()=>toast('⚠️ '+tx('m.srv_err')));return}
 z.sum=Math.round((z.sum+pr)*100)/100;(z.q=z.q||[]).push({p:pr,i:item});fn();save()}]])}
function oddsThen(lbl,fn){const nm=r=>HEROES.filter(h=>h.r===r&&!h.season).map(h=>h.n).join(', ');const z=L.HEROES.find(h=>h.season);
 modal(`<h2>🎲 ${tx('m.odds_t')}</h2><table style="width:100%;font-size:13px;text-align:left;margin:6px 0"><tr><td>${RARITY[3].n}</td><td><b>5%</b></td><td class="sub">${nm(3)}</td></tr><tr><td>${RARITY[2].n}</td><td><b>25%</b></td><td class="sub">${nm(2)}</td></tr><tr><td>${RARITY[1].n}</td><td><b>70%</b></td><td class="sub">${nm(1)}</td></tr></table><p class="sub">${tx('m.odds_pity',[L.PITY,L.PITY-S.pity])}</p><p class="sub">${tx('m.odds_pity2',[L.PITY2,L.PITY2-(S.pity2||0)])}</p><p class="sub">${tx('m.odds_season',[z.n])}</p>${DEMO}`,[[tx('ui.vazgec'),'x'],[lbl,'g',fn]])}
const SEAS_RP='₺59,99';
function seasonCard(){const z=L.seasonOf(S),Z=L.SEASON,H=HEROES.find(h=>h.id===Z.hero),own=S.heroes[Z.hero],left=Math.max(0,Math.ceil((L.seasonEnd()-now())/864e5)),can=z.last!==L.dayIst(now())&&left>0,per=1+(z.route?Z.routeDaily:0),rem=Math.max(0,Z.need-z.marks);
 return `<div class="sec">🌫️ ${tx('m.season_t',[Z.id])}</div><div class="card" style="background:linear-gradient(135deg,#1d4a5a,#2a1a4a);border-color:#7fe0ff;flex-wrap:wrap"><div style="display:flex;gap:10px;align-items:center;min-width:100%">${port(H,own)}<div class="mid"><div class="nm">${H.n} <span class="tag">${tx('m.season_tag')}</span></div><div class="pbar"><i style="width:${Math.min(100,z.marks/Z.need*100)}%"></i></div><div class="sub">${own?tx('m.season_got'):tx('m.season_prog',[z.marks,Z.need,Math.ceil(rem/per)])}</div><div class="sub">${tx('m.season_end',[left,new Date(L.seasonEnd()).toLocaleDateString(locale)])}</div></div></div>
 <div class="sub" style="min-width:100%">${tx('m.season_free',[Z.need,Z.days])}</div><button class="btn o" data-a="mark" ${can?'':'disabled'}>${can?tx('m.mark_claim',[per]):tx('ui.yarin')}</button>${z.route?`<span class="tag" style="background:#3fb950">${tx('m.route_own')}</span>`:`<button class="btn g" data-a="route">🧭 ${tx('m.route')} ${SEAS_RP}</button>`}</div>`}

function spendGems(n,what,fn){if(S.gems<n){modal(`<h2>${tx('ui.elmas_yetmiyor')}</h2><p>${tx('ui.icin_gerekli_sende_var',[what,n,S.gems])}</p>`,[[tx('ui.kapat'),'x'],[tx('ui.magaza'),'g',openShop]]);return}
 modal(`<h2>${what}</h2><p><b>${n} 💎</b> ${tx('ui.harcansin_mi')}</p>`,[[tx('ui.vazgec'),'x'],[tx('ui.gem_spend',[n]),'g',()=>{S.gems-=n;fn();ui();save()}]])}
let retPend=0;function returnScreen(o){retPend=1;L.dailyReset(S,now());const on=!!window.__online?.on,D=L.DAILY.filter(d=>on||!d.on),done=D.filter(d=>S.daily.c[d.id]).length,ready=D.filter(d=>!S.daily.c[d.id]&&(S.daily.p[d.id]||0)>=d.n).length,q=L.QUESTS[S.q];
 let h=`<div style="font-size:50px">🌙</div><h2>${tx('ui.tekrar_hos_geldin')}</h2><p>${tx('ui.sen_yokken_dk_iscilerin',[o.min])}<br><b style="font-size:18px">${costStr(o.g)}</b></p><p class="sub" style="font-size:11px">${tx('ui.off_cap',[o.pct,L.OFF_CAP_H])}${o.capped?' · ⏳ '+tx('ui.off_capped'):''}</p>`;
 if(o.away>=60){const it=[];it.push(`📋 ${tx('ui.off_daily',[done,D.length,ready])}`);if(L.loginReady(S,now()))it.push('🎁 '+tx('ui.off_login'));if(S.freeCall!==L.day(now()))it.push('🧑‍✈️ '+tx('ui.off_free'));if(q)it.push(`⭐ ${tx('ui.off_next',[q.t])} (${Math.min(q.f(S),q.n)}/${q.n})`);
  h+=`<div style="text-align:start;background:#0003;border-radius:10px;padding:8px 10px;margin:6px 0;font-size:12px;line-height:1.6"><b>${tx('ui.off_today')}</b><br>${it.join('<br>')}</div>`}
 const take=m=>{retPend=0;if(m>1)for(const k in o.g)o.g[k]*=m;L.addRes(S,o.g);ui();save();if(S.tut>=9&&L.loginReady(S,now()))setTimeout(()=>openLogin(1),350);else if(o.away>=60&&ready)setTimeout(()=>{taskTab='d';openTasks()},350)};
 modal(h,[[tx('ui.take'),'',()=>take(1)],['📺 '+tx('ui.off_boost'),'o',()=>watchAd(()=>take(2))]])}
function watchAd(fn){if(S.buy.noads){fn();return}$('ad').classList.add('on');let n=3;const f=()=>$('adt').textContent=tx('ui.reklam_oynatiliyor')+n;f();const iv=setInterval(()=>{n--;f();if(n<=0){clearInterval(iv);$('ad').classList.remove('on');fn();SFX.coin()}},1000)}
function popAnim(g,a=.5){if(!g)return;tween(550,t=>{const e=E.el(t);const s=1+(1-e)*a*(t<.15?-1:1);g.scale.set(1/Math.sqrt(Math.abs(s)),s,1/Math.sqrt(Math.abs(s)))},()=>g.scale.set(1,1,1))}
const closeSheet=()=>{$('sheet').classList.remove('on');sheetFn=null};let sheetFn=null;
function sheet(fn){if(!$('sheet').classList.contains('on'))SFX.sheet();sheetFn=fn;renderSheet();$('sheet').classList.add('on')}
function renderSheet(){if(!sheetFn)return;const st=$('sheet').scrollTop;$('sheet').innerHTML=sheetFn();$('sheet').scrollTop=st;$('sheet').querySelectorAll('[data-a]').forEach(b=>b.onclick=ev=>{ac();SFX.tap();ACT[b.dataset.a](b.dataset.v,ev)});const c=$('sheet').querySelector('.close');if(c)c.onclick=closeSheet;rdMark()}
function rdCss(){if(!document.getElementById('rdcss')){const c=document.createElement('style');c.id='rdcss';c.textContent='.rd{position:relative}.rd::after{content:"";position:absolute;top:-4px;right:-4px;width:11px;height:11px;border-radius:50%;background:#ff3b3b;box-shadow:0 0 0 2px #10202c}.hwl{display:inline-block;margin-top:3px;padding:1px 5px;border-radius:8px;background:#ff3b3b;color:#fff;font-size:9px;font-weight:800}.hbest{outline:2px solid #ffcf3a;outline-offset:3px;border-radius:12px}';document.head.appendChild(c)}}
// b32: every bar dot leads to a visible red marker inside the sheet
function taskRdy(v){const q=L.QUESTS[S.q];return v==='d'?L.DAILY.some(d=>!S.daily.c[d.id]&&(S.daily.p[d.id]||0)>=d.n):v==='w'?L.WEEKLY.some(d=>!S.weekly.c[d.id]&&(S.weekly.p[d.id]||0)>=d.n):v==='a'?L.achReady(S).length>0:!!(q&&q.f(S)>=q.n)}
function rdMark(){const sh=$('sheet');rdCss();sh.querySelectorAll('[data-a=daily],[data-a=weekly],[data-a=ach],[data-a=quest],[data-a=pass],[data-a=evc],[data-a=mile],#bossBtn:not([disabled])').forEach(b=>b.classList.add('rd'));const fb=sh.querySelector('#fightBtn');if(fb&&!fb.disabled&&S.tut>=9&&L.armyPower(S)>=L.stagePower(S.stage)*.9)fb.classList.add('rd')}
const hdr=t=>`<h3><span>${t}</span><button class="btn x close">✕</button></h3>`;
function resErr(e){if(e==='RES'){SFX.err();toast(tx('ui.yetersiz_kaynak'));return true}if(e==='BUILDERS'){SFX.err();modal(`<h2>${tx('ui.insaatcilar_mesgul')}</h2><p>${tx('ui.insaatcinin_hepsi_calisiyor_bitmesini',[L.builderCount(S)])}</p>`,[[tx('ui.tamam'),'x'],[tx('ui.magaza'),'g',openShop]]);return true}if(e){SFX.err();toast(e);return true}return false}
const kPos=k=>k==='fener'?new THREE.Vector3(0,1,0):tpos(k).setY(.4);
// ---------- AKSİYONLAR ----------
const ACT={
 up:k=>{const e=L.startUp(S,k,now());if(resErr(e))return;SFX.build();vib(20);burst(kPos(k),0xc8a070,10,1.5);k==='fener'?syncFener():syncOne(k);closeSheet();ui();save()},
 speed:k=>{const b=k==='fener'?S.fener:S.g[k];const rem=(b.end-now())/1000;{const c=L.speedGems(rem,S);if(!c){b.end=now();SFX.coin();vib(15);return}spendGems(c,`${tx('ui.hizlandir_kaldi',[fmtT(rem)])}`,()=>{b.end=now()})}},
 w:v=>{const[i,j,d]=v.split(':');const k=i+','+j;if(!L.assign(S,k,+d)){SFX.err();if(+d>0)toast(L.idle(S)<=0?tx('ui.bosta_kurtulan_yok_barinak'):tx('ui.bu_bina_dolu_birlestir'))}else SFX.tap();renderSheet();ui();tutCheck()},
 light:()=>{const e=L.setLight(S,!S.fener.on);if(resErr(e))return;if(S.fener.on){SFX.light();vib(30);cam.shake=.1;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,24,3,1)}renderSheet();ui();save();tutCheck()},
 build:v=>{const[k,kind]=v.split('|');const e=L.build(S,k,kind,now());if(resErr(e))return;SFX.build();vib(15);const g=syncOne(k);popAnim(g,.5);burst(tpos(k).setY(.3),0xc8a070,12,1.8);closeSheet();ui();save();tutCheck()},
 cleanse:k=>{const e=L.cleanse(S,k);if(resErr(e))return;SFX.light();burst(tpos(k).setY(.6),0xb98cff,20,2.5,1);syncOne(k);closeSheet();ui();save()},
 train:v=>{const[t,n]=v.split(':');const e=L.startTrain(S,t,+n,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 trainSpeed:()=>{const rem=(S.train.end-now())/1000;spendGems(L.speedGems(rem,S),tx('ui.egitimi_hizlandir'),()=>{S.train.end=now()})},
 tech:id=>{const e=L.startResearch(S,id,now());if(resErr(e))return;SFX.build();renderSheet();ui();save()},
 techSpeed:()=>{const rem=(S.research.end-now())/1000;spendGems(L.speedGems(rem,S),tx('ui.arastirmayi_hizlandir'),()=>{S.research.end=now()})},
 call:v=>recruitN(v),selOpen:()=>selOpen(),qual:v=>{setQ(v);renderSheet()},fight:()=>battle(S.stage),rem:async()=>{if(!REM_OK)return;if(remOn()){localStorage.setItem('sf_rem','0');toast(tx('ui.rem_off'))}else{const p=await Notification.requestPermission().catch(()=>'denied');if(p==='granted'){localStorage.setItem('sf_rem','1');toast(tx('ui.rem_on'))}else toast(tx('ui.rem_denied'))}renderSheet()},mile:v=>{v=+v;const O=window.__online;if(!O||!O.mile){toast(tx('ui.mile_online'));return}O.mile(v).then(r=>{if(r&&r.ok){(S.mile=S.mile||[]).push(v);L.addRes(S,r.r);SFX.tap();toast('🎁 '+tx('ui.mile_got',[v])+' '+costStr(r.r))}else if(r&&/Zaten/.test(r.err||'')){(S.mile=S.mile||[]).push(v)}else toast('⚠️ '+tx('ui.mile_wait'));renderSheet();save();ui()}).catch(()=>toast(tx('ui.mile_online')))},reef:()=>{const i0=L.reefIdx(S),r=L.reefFight(S,now(),Math.random);if(r.err)return;const F=r.boss?{n:FOES.reef.n,img:'reef'}:FOES[L.REEF.st[i0].foe];battle(S.stage,null,{...r,foe:F,reef:1,ttl:'🪸 '+tx('ui.reef_t')+' '+(i0+1)+'/'+L.REEF.st.length,pw:L.reefPower(i0,now()),winT:r.boss?tx('ui.reef_boss_win'):tx('ui.reef_win'),winD:r.boss?tx('ui.reef_boss_d'):''})},convoy:()=>{const r=L.convoyFight(S,now(),Math.random);if(r.rw)pveCheck('convoy',S.stage,r.rw,false);if(r.err){toast(r.err==='Ada 3 gerekli'?tx('ui.cv_locked'):tx('ui.cv_wait'));return}battle(S.stage,null,r)},
 daily:id=>{if(resErr(L.claimDaily(S,id)))return;SFX.claim();fly('gems',innerWidth/2,innerHeight/2);renderSheet();ui();save()},
 quest:()=>claimQuest(),tab:v=>{taskTab=v;renderSheet()},
 weekly:id=>{if(resErr(L.claimWeekly(S,id,now())))return;SFX.done();fly('gems',innerWidth/2,innerHeight/2,3);renderSheet();ui();save()},
 ach:id=>{if(resErr(L.claimAch(S,id)))return;SFX.done();fly('gems',innerWidth/2,innerHeight/2,3);renderSheet();ui();save()},
 hero:id=>openHero(id),heroes:()=>openHeroes(),
 hlv:id=>{const e=L.heroUp(S,id,now());if(resErr(e))return;SFX.merge(2);vib(15);renderSheet();ui();save()},
 ushBuy:()=>{const e=L.ushBuy(S,Date.now());if(e==='MAX'){toast(tx('ui.ush_max'));return}if(resErr(e)||e)return;SFX.merge(1);renderSheet();ui();save()},
ushGive:id=>{if(L.ushGive(S,id,1))return;SFX.merge(1);renderSheet();save()},
htal:id=>{const e=L.talUp(S,id);if(e==='SH'){SFX.err();toast(tx('ui.need_shards'));return}if(resErr(e)||e)return;SFX.gacha(2);vib(20);toast('🌟 '+tx('ui.talent_up'));renderSheet();ui();save()},
 heq:v=>{const[id,k]=v.split(':');const e=L.eqUp(S,id,k);if(resErr(e)||e)return;SFX.merge(2);vib(15);renderSheet();ui();save()},
 hstar:id=>{const e=L.starUp(S,id);if(resErr(e))return;SFX.gacha(3);vib([30,30,60]);toast(tx('ui.yildiz_yukseldi'));renderSheet();ui();save()},
 gear:id=>{const e=L.upGear(S,id);if(resErr(e))return;SFX.build();vib(15);renderSheet();ui();save()},
 boss:()=>bossFight(),pass:v=>{const[i,p]=v.split(':'),O=window.__online;if(O&&O.on){O.pass.claim(+i,+p).then(rw=>{L.addRes(S,rw);S.pass.cl[+p?'p':'f'][+i]=1;SFX.coin();toast('🎫 '+rwStr(rw));renderSheet();ui();save();O.push()}).catch(e=>toast(tx('ui.pve_rej')+tl(e.message)));return}if(resErr(L.claimPass(S,+i,+p)))return;SFX.coin();renderSheet();ui();save()},
 passBuy:()=>confirmBuy(tx('ui.fener_bileti_premium'),tx('ui.bu_sezonun_premium_odul'),'₺119,99',()=>{const O=window.__online;if(O&&O.on)O.pass.prem().then(()=>renderSheet()).catch(e=>toast(tl(e.message)));S.pass.prem=1;S.vipPts+=120;SFX.done();toast(tx('ui.demo_premium_acildi'));renderSheet();ui();save()},'pass'),
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
// kaptan kırmızı noktası: çubuktaki nokta ile sayfa içi işaretler aynı nedenlerden hesaplanır
function heroLvQ(){const q=L.QUESTS[S.q];return q&&q.go==='heroes'&&/Sv\d/.test(q.t)&&q.f(S)<q.n?q.n:0}
function heroBest(){const ids=Object.keys(S.heroes);if(!ids.length)return null;const tm=L.team(S).map(h=>h.id);return ids.filter(id=>S.heroes[id].lv<L.heroCap(S.heroes[id])).sort((a,b)=>S.heroes[b].lv-S.heroes[a].lv||tm.indexOf(b)-tm.indexOf(a))[0]||null}
function heroWhy(id){const st=S.heroes[id];if(!st)return[];const r=[],tm=L.team(S).some(h=>h.id===id),ql=heroLvQ(),best=ql?heroBest():null;
 if(st.sh>=st.star*10&&st.star<5)r.push('star');
 if((tm||id===best)&&st.lv<L.heroCap(st)&&L.canAfford(S,L.heroLvCost(st.lv)))r.push('lv');
 if(tm){const tc=L.talCost(st);if((st.tal||0)<L.TAL_MAX&&st.sh>=tc.sh&&S.res.crys>=tc.crys)r.push('tal')}return r}
function heroFree(t){return S.freeCall!==L.day(t)&&(window.__online?.on?S.srvFree!==false:true)}
function heroDot(t){return heroFree(t)||Object.keys(S.heroes).some(id=>heroWhy(id).length)}
rdCss();
function openHeroes(){sheet(()=>{const free=S.freeCall!==L.day(now())&&(window.__online?.on?S.srvFree!==false:true);let h=hdr(tx('ui.h_kaptanlar'))+`<div class="sub" style="margin-bottom:10px">${tx('ui.en_guclu_3_kaptan')}</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px 6px;margin-bottom:12px">`;
 for(const H of HEROES){const st=S.heroes[H.id];const hw=heroWhy(H.id),hb=heroLvQ()&&H.id===heroBest();h+=`<div data-a="hero" data-v="${H.id}" class="${hb?'hbest':''}" style="text-align:center;${st?'':'opacity:.4;filter:grayscale(.85)'}"><div style="display:flex;justify-content:center"><span class="${hw.length?'rd':''}" style="display:inline-block">${port(H,st)}</span></div><div class="nm" style="font-size:11px;margin-top:9px">${H.n}</div><div class="sub" style="font-size:10px">${st?'⚔️'+L.heroPower(H,st):RARITY[H.r].n}</div>${hw.length?`<div class="hwl">${tx('ui.hw_'+hw[0])}</div>`:''}</div>`}
 h+=`</div><div class="sec">${tx('ui.kaptan_cagir')}</div><div class="card" style="flex-wrap:wrap"><div class="mid" style="min-width:100%"><div class="sub">${tx('ui.gercek_oranlar_efsanevi_5')} <b>${tx('ui.cagrida_efsanevi_garanti',[L.PITY])}</b> ${tx('ui.kalan_tekrar_cikan_kaptan',[L.PITY-S.pity])}</div><div class="pbar" style="margin-top:6px"><i style="width:${(S.pity||0)/L.PITY*100}%"></i></div><div class="sub">⭐ ${tx('ui.sel_ctr',[L.PITY2,L.PITY2-(S.pity2||0)])}</div><div class="pbar"><i style="width:${(S.pity2||0)/L.PITY2*100}%;background:linear-gradient(90deg,#ffcf3a,#ff8a3a)"></i></div>${window.__online?.on?`<div class="sub">🌐 ${tx('ui.sum_srv')}</div>`:''}${S.selTok>0?`<button class="btn o" data-a="selOpen" style="margin-top:6px;width:100%">⭐ ${tx('ui.sel_ready',[S.selTok])}</button>`:''}</div>
 <button class="btn o ${free?'rd':''}" data-a="call" data-v="0" ${free?'':'disabled'} id="freeCall">${free?tx('ui.ucretsiz_2'):tx('ui.yarin')}</button><button class="btn" data-a="call" data-v="t" ${S.tickets?'':'disabled'}>🎟️ ${S.tickets}</button><button class="btn g" data-a="call" data-v="1">1× · 30💎</button><button class="btn g" data-a="call" data-v="10">10× · 270💎</button></div>`;return h})}
function openHero(id){sheet(()=>{const H=HEROES.find(x=>x.id===id),st=S.heroes[id];let h=`<h3><span><button class="btn x sm" data-a="heroes">‹</button> ${H.n}</span><button class="btn x close">✕</button></h3>`;
 h+=`<div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${port(H,st,1)}<div class="mid"><div class="nm">${RARITY[H.r].n} · ${H.role}</div><div class="sub">${st?`${tx('ui.sv_guc',[st.lv,L.heroCap(st),L.heroPower(H,st)])}`:tx('ui.henuz_cagrilmadi')}</div><div class="sub">✨ <b>${H.sk.n}</b>: ${H.sk.d} +${Math.round((st?L.skillVal(H,st):H.sk.v)*100)}%</div></div></div>`;
 if(!st)return h+`<div class="sub">${H.season?tx('m.season_hint',[L.SEASON.need]):tx('ui.kaptan_cagir_ile_bulabilirsin')}</div>`;
 const need=st.star*10,hwy=heroWhy(id);h+=`<div class="card"><div class="ic">⬆️</div><div class="mid"><div class="nm">${tx('ui.seviye_atla')}</div><div class="sub">${st.lv>=L.heroCap(st)?tx('ui.yildiz_sinirina_ulasti'):costStr(L.heroLvCost(st.lv))}</div></div><button class="btn ${hwy.includes('lv')?'rd':''}" data-a="hlv" data-v="${id}" ${st.lv>=L.heroCap(st)?'disabled':''}>${tx('ui.yukselt')}</button></div>`;
 h+=`<div class="card"><div class="ic">⭐</div><div class="mid"><div class="nm">${tx('ui.yildiz_5',[st.star])}</div><div class="pbar"><i style="width:${Math.min(1,st.sh/need)*100}%"></i></div><div class="sub">${tx('ui.parca_yetenek_25_sinir',[st.sh,need])}</div></div><button class="btn g ${hwy.includes('star')?'rd':''}" data-a="hstar" data-v="${id}" ${st.sh>=need&&st.star<5?'':'disabled'}>${tx('ui.yildizla')}</button></div>`;
 const tc=L.talCost(st),tl=st.tal||0;h+=`<div class="sec">🌟 ${tx('ui.talent')}</div><div class="card"><div class="ic">🌟</div><div class="mid"><div class="nm">${tx('ui.talent_lv',[tl,L.TAL_MAX])}</div><div class="sub">${tx('ui.talent_d',[tl*6,Math.min(L.TAL_MAX,tl+1)*6])}</div><div class="sub">${tl>=L.TAL_MAX?tx('ui.maxed'):`⭐${st.sh} + ✨${L.ushOf(S)} / ${tc.sh} · ${costStr({crys:tc.crys})}`}</div></div><button class="btn g ${hwy.includes('tal')?'rd':''}" data-a="htal" data-v="${id}" ${tl<L.TAL_MAX&&st.sh+L.ushOf(S)>=tc.sh&&S.res.crys>=tc.crys?'':'disabled'}>${tx('ui.yukselt')}</button></div>`;
 {const x=S.ushx?.d===L.day(Date.now())?S.ushx.n:0;h+=`<div class="card"><div class="ic">✨</div><div class="mid"><div class="nm">${tx('ui.ush_t',[L.ushOf(S)])}</div><div class="sub">${tx('ui.ush_d')}</div><div class="sub">${tx('ui.ush_x',[L.USH_X.crys,x,L.USH_X.day])}</div></div><div style="display:grid;gap:4px"><button class="btn sm" data-a="ushBuy" ${x<L.USH_X.day&&S.res.crys>=L.USH_X.crys?'':'disabled'}>🔮→✨</button><button class="btn sm g" data-a="ushGive" data-v="${id}" ${L.ushOf(S)>0?'':'disabled'}>✨→⭐</button></div></div>`}
 h+=`<div class="sec">🎒 ${tx('ui.gear_t')} · +${Math.round((L.heroMul(st)-1)*100)}% ⚔️</div>`;for(const G of L.HGEAR){const l=st.eq?.[G.k]||0;h+=`<div class="card"><div class="ic">${G.i}</div><div class="mid"><div class="nm">${tx('ui.gear_'+G.k)} · ${tx('ui.talent_lv',[l,L.EQ_MAX])}</div><div class="sub">${tx('ui.gear_d')} · ${l>=L.EQ_MAX?tx('ui.maxed'):costStr(L.eqCost(st,G))}</div></div><button class="btn" data-a="heq" data-v="${id}:${G.k}" ${l>=L.EQ_MAX?'disabled':''}>${tx('ui.yukselt')}</button></div>`}
 return h})}
function needOnline(){const O=window.__online;modal(`<h2>📡 ${tx('ui.need_online')}</h2><p class="sub">${tx('ui.need_online_d')}</p>`,[[tx('ui.retry'),'o',()=>{if(!O||!O.retry)return toast('⚠️ '+tx('ui.retry_fail'));toast('⏳ …');O.retry().then(ok=>toast(ok?'✅ '+tx('ui.retry_ok'):'⚠️ '+tx('ui.retry_fail')))}],[tx('ui.vazgec'),'x']])}
function selOpen(){{const O=window.__online;if(!(O&&O.on&&O.summon)){needOnline();return}}const L3=HEROES.filter(h=>h.r===3&&!h.season);modal(`<h2>⭐ ${tx('ui.sel_t')}</h2><p class="sub">${tx('ui.sel_d')}</p>`+L3.map(h=>`<div class="card"><div class="mid"><div class="nm">${h.n}</div><div class="sub">${S.heroes[h.id]?tx('ui.sel_have'):tx('ui.sel_new')}</div></div><button class="btn o" data-a="selPick" data-v="${h.id}">${tx('ui.sel_pick')}</button></div>`).join(''),[[tx('ui.vazgec'),'x']]);$('mbox').querySelectorAll('[data-a=selPick]').forEach(b=>b.onclick=()=>{ac();closeModal();const O=window.__online;if(O&&O.on&&O.summon){O.summon.pick(b.dataset.v).then(out=>{showGacha(out);ui();save();renderSheet()}).catch(e=>toast('⚠️ '+e.message));return}needOnline()})}
function recruitN(n){const O=window.__online,srv=!!(O&&O.on&&O.summon);if(!srv){needOnline();return}const fin=(out,k)=>{L.dailyInc(S,'recruit',k,now());showGacha(out);ui();save();renderSheet()};
 const go=(k,pay,refund)=>{if(srv){O.summon.call(k,pay).then(out=>{S.st.recruit=(S.st.recruit||0)+k;L.addXP(S,5*k);if(pay==='free'){S.freeCall=L.day(now());S.srvFree=false}fin(out,k)}).catch(e=>{if(refund)S.gems+=refund;toast('⚠️ '+e.message);ui();renderSheet()});return}const out=[];for(let i=0;i<k;i++)out.push(L.recruit(S,Math.random));fin(out,k)};
 if(n==='t'){if(S.tickets<1)return;oddsThen('🎟️ ×1',()=>{if(S.tickets<1)return;if(!srv)S.tickets--;go(1,'ticket')})}else if(+n===0){if(!srv)S.freeCall=L.day(now());go(1,'free')}else{const c=+n===1?30:270;oddsThen(`${n}× · ${c}💎`,()=>spendGems(c,`${tx('ui.kaptan_cagir_2',[n])}`,()=>go(+n,'gems',c)))}}
function showGacha(out){const best=Math.max(...out.map(o=>o.h.r)),RC={3:'#ffcf3a',2:'#c79bff',1:'#7fd3ff'},RN={3:tx('ui.efsanevi'),2:tx('ui.epik'),1:tx('ui.nadir')},one=out.length===1,st=one?.5:.32;
 vib(30);out.forEach((o,i)=>setTimeout(()=>{SFX.gacha(o.h.r);if(o.h.r===3){vib([50,40,80]);cam.shake=.25}else vib(12)},(.45+i*st)*1000));
 modal(`<div class="rays ${best===3?'gold':''}"></div><h2>${best===3?tx('ui.efsanevi_kaptan'):tx('ui.kaptan_cagrisi')}</h2><div class="gcs ${one?'one':''}">${out.map((o,i)=>`<div class="gc r${o.h.r}" style="--c:${RC[o.h.r]};--d:${.45+i*st}s"><div class="gb">⚓</div><div class="gf">${port(o.h,S.heroes[o.h.id],one)}<div class="gn">${o.h.n}</div><div class="gr">${RN[o.h.r]}</div><div class="gs" style="color:${o.isNew?'#7dff8a':'#a9d8e8'}">${o.isNew?tx('ui.yeni'):tx('ui.10_parca')}</div></div></div>`).join('')}</div>`,[[tx('ui.tamam'),'o']]);$('mbox').classList.add('rwbox')}

// 2D sanat: prosedürel SVG gemi/ada ikonları + darbe efekti (özgün, harici görsel yok)
function shipSvg(c='#c0392b',w=34){return `<svg class="shp" width="${w}" height="${w}" viewBox="0 0 40 40"><path d="M5 26h30l-5 8H10z" fill="#7a4a24" stroke="#3b2410" stroke-width="1.5"/><path d="M8 26h24" stroke="#c8935a" stroke-width="2"/><rect x="19" y="6" width="2" height="20" fill="#4a2e16"/><path d="M21 8q11 7 0 16z" fill="#f4ead2" stroke="#8a7a5a"/><path d="M19 9q-9 7 0 14z" fill="#e8dcc0" stroke="#8a7a5a"/><path d="M21 4l7 2-7 2z" fill="${c}"/></svg>`}
function islSvg(w=30){return `<svg width="${w}" height="${w}" viewBox="0 0 40 40"><ellipse cx="20" cy="30" rx="16" ry="6" fill="#e9d29a" stroke="#b89a5a"/><ellipse cx="20" cy="28" rx="11" ry="4" fill="#5fb85a"/><path d="M21 28q-1-9 2-15" stroke="#7a4a24" stroke-width="2" fill="none"/><path d="M23 13q-8-3-11 3M23 13q7-4 10 2M23 13q-3-6-9-6M23 13q5-5 9-3" stroke="#2f8a3a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M26 30l3-6 3 6z" fill="#e05a3a"/></svg>`}
function impact(x,y,col='#ffd84a',big){const e=document.createElement('div');e.className='imp';e.style.left=x+'px';e.style.top=y+'px';let h=`<i class="fl" style="background:radial-gradient(circle,#fff,${col} 40%,transparent 70%)"></i><i class="rg" style="border-color:${col}"></i>`;const n=big?12:8;for(let k=0;k<n;k++){const a=k/n*6.283+Math.random()*.4,d=(big?70:46)+Math.random()*24;h+=`<b style="--x:${Math.cos(a)*d}px;--y:${Math.sin(a)*d}px;background:${k%2?col:'#fff6c8'}"></b>`}e.innerHTML=h;document.body.appendChild(e);setTimeout(()=>e.remove(),650)}
function shot(a,b){const e=document.createElement('i');e.className='cball';document.body.appendChild(e);e.animate([{left:a.x+'px',top:a.y+'px',transform:'scale(.6)'},{left:(a.x+b.x)/2+'px',top:Math.min(a.y,b.y)-40+'px',transform:'scale(1.2)'},{left:b.x+'px',top:b.y+'px',transform:'scale(.8)'}],{duration:180,easing:'ease-in'}).onfinish=()=>e.remove()}
function seaMap(){const st=S.stage;let h='<div class="sea">';const n0=Math.max(1,st-3);{let d='';for(let n=n0;n<n0+7;n++){const i=n-n0;d+=(i?'L':'M')+(12+i*13.5)+' '+(50+Math.sin(n*1.7)*28)}h+=`<svg class="route" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="${d}" vector-effect="non-scaling-stroke"/></svg>`}for(let n=n0;n<n0+7;n++){const i=n-n0;const x=12+i*13.5,y=50+Math.sin(n*1.7)*28;const c=n<st?'won':n===st?'cur':'fog';
 h+=`<div class="node ${c}" style="left:${x}%;top:${y}%">${n<st?islSvg():n===st?FOES[L.stageFoe(n)].ic:'<i class="fd"></i>'}<small>${n}</small></div>`}return h+`<div class="ship" style="left:`+(12+(st-n0)*13.5-6)+'%;top:'+(50+Math.sin(st*1.7)*28+12)+'%">'+shipSvg('#2f7fd8',30)+'</div></div>'}
function openMap(){sheet(()=>{const st=S.stage,B=FOES[L.stageFoe(st)],my=L.armyPower(S),need=L.stagePower(st);const tr=Object.values(S.troops).reduce((a,b)=>a+b,0);
 let h=hdr(tx('ui.sisli_deniz'))+seaMap()+`<div class="card" style="flex-direction:column;align-items:stretch;background:linear-gradient(135deg,#1f6f8b,#14304a)"><div style="display:flex;align-items:center;gap:10px"><img src="img/f_${B.img}.webp" loading="lazy" style="width:64px;height:64px;object-fit:contain"><div class="mid"><div class="nm">${tx('ui.isl_n',[st,L.islandName(st)])}</div><div class="sub">${tx('ui.guc_filon',[B.n,fmt(need)])} <b style="color:${my>=need?'#7dff8a':'#ff8a8a'}">⚔️ ${fmt(my)}</b></div><div class="sub">${tx('ui.loot')} ${costStr(L.stageReward(st))} · 👤 ${tx('ui.loot_resc',['+'+L.stageRescue(st)])}</div></div></div>
 <button class="btn o" data-a="fight" style="margin-top:8px;font-size:16px" id="fightBtn" ${tr+Object.keys(S.heroes).length?'':'disabled'}>${tx('ui.filoyu_gonder')}</button></div>
 <div class="card"><div class="mid">${Object.entries(TROOPS).map(([t,T])=>`${T.ic} ${T.n}: <b>${S.troops[t]}</b>`).join(' · ')}<div class="sub">${tx('ui.kaptanlar_kurtarilan_ada_uretim',[L.team(S).map(x=>x.ic+' '+x.n).join(', ')||'—',st-1,Math.round(L.islandBonus(S)*100)])}</div></div><button class="btn" data-a="open" data-v="yard">${tx('ui.tersane')}</button></div>
 ${mileCard()}${convoyCard()}${reefCard()}<div class="sub">${tx('ui.ipucu_adanin_aciklarindaki_isaretli')}</div>`;return h})}
function mileCard(){const n=L.mileNext(S),have=S.stage-1;if(!n||have<8)return '';const prev=L.MILES[L.MILES.indexOf(n)-1]||10,ok=have>=n,p=Math.max(0,Math.min(1,(have-Math.min(prev,have))/(n-Math.min(prev,have)||1)));
 return `<div class="card" style="background:linear-gradient(135deg,#3a2a60,#14304a)"><div class="ic">🎁</div><div class="mid"><div class="nm">${tx('ui.mile_t',[n])}</div><div class="sub">${tx('ui.mile_d',[Math.min(have,n),n])}</div><div style="height:6px;border-radius:4px;background:#0006;margin:4px 0"><div style="height:100%;width:${ok?100:Math.round(have/n*100)}%;background:#ffd36b;border-radius:4px"></div></div><div class="sub">${costStr(L.mileReward(n))}</div></div>${ok?`<button class="btn o" data-a="mile" data-v="${n}">${tx('ui.mile_claim')}</button>`:''}</div>`}
function reefCard(){const R=L.REEF,i=L.reefIdx(S),t=now();if(!L.reefOpen(S))return `<div class="card" style="opacity:.6"><div class="ic">🪸</div><div class="mid"><div class="nm">${tx('ui.reef_t')}</div><div class="sub">${tx('ui.reef_locked',[R.unlock])}</div></div></div>`;
 const hi=L.reefTide(t)==='hi',done=i>=R.st.length,tide=`${hi?'🌊 '+tx('ui.reef_hi'):'🏖️ '+tx('ui.reef_lo')} · ${fmtT(L.reefTideLeft(t)/1000)}`;
 return `<div class="card reefC"><div class="ic">🪸</div><div class="mid"><div class="nm">${tx('ui.reef_t')} · ${Math.min(i+1,R.st.length)}/${R.st.length}</div><div class="sub">${tx('ui.reef_d')}</div><div class="sub"><b>${tide}</b></div>${done?`<div class="sub">✅ ${tx('ui.reef_done')}</div>`:`<div class="sub">${R.st[i].boss?'👑 '+FOES.reef.n+' · ':''}⚔️ ${fmt(L.reefPower(i,t))} · ${costStr(R.st[i].rw)}</div>`}</div>${done?'':`<button class="btn o" data-a="reef">${tx('ui.reef_go')}</button>`}</div>`}
function convoyCard(){const c=L.convoyState(S,now());if(!c.open)return `<div class="card" style="opacity:.6"><div class="ic">🏴‍☠️</div><div class="mid"><div class="nm">${tx('ui.cv_t')}</div><div class="sub">${tx('ui.cv_locked')}</div></div></div>`;
 return `<div class="card" style="background:linear-gradient(135deg,#5a2a2a,#22161a)"><div class="ic">🏴‍☠️</div><div class="mid"><div class="nm">${tx('ui.cv_t')}</div><div class="sub">${tx('ui.cv_d')}</div><div class="sub">⚔️ ${fmt(L.convoyPower(S))} · ${costStr(L.convoyReward(S))} · 🎟️25%</div></div>${c.ready?`<button class="btn o" data-a="convoy">${tx('ui.cv_go')}</button>`:`<button class="btn" disabled>⏳ ${fmtT(c.left/1000)}</button>`}</div>`}
let taskTab='c',noSave=0;
function openTasks(){if(!taskRdy(taskTab)){const f=['c','d','w','a'].find(taskRdy);if(f)taskTab=f}sheet(()=>{L.dailyReset(S,now());const T=(v,n)=>`<button class="btn ${taskTab===v?'o':'x'}${taskRdy(v)?' rd':''}" data-a="tab" data-v="${v}">${n}</button>`;let h=hdr(tx('ui.gorevler'))+`<div class="tabs">${T('c',tx('ui.hikaye'))}${T('d',tx('ui.gunluk'))}${T('w',tx('ui.haftalik'))}${T('a',tx('ui.basarim'))}</div>`;L.weeklyReset(S,now());const OB=d=>d.on?` <span class="tag">🌐 ${tx('ui.online_tag')}</span>`:'';
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
 setTimeout(()=>{const b=$('toPass');if(b)b.onclick=openPass});h+=`<div class="sec">${tx('ui.elmasla')}</div>`+GEMSHOP.map((g,i)=>`<div class="card"><div class="ic">${g.ic}</div><div class="mid"><div class="nm">${g.n}</div><div class="sub">${g.d}</div></div><button class="btn g" data-a="gemItem" data-v="${i}">${g.c}💎</button></div>`).join('');h+=`<div class="sub" style="margin:6px 2px">${tx('m.honest')}</div>`;return h})}
const adMax=()=>L.vipLv(S)>=2?8:5;
function soon(t){SFX.tap();modal(`<div style="font-size:50px">${t===tx('html.klan').replace(/^\S+\s/,'')||t==='Klan'?'🛡️':'💬'}</div><h2>${tx('ui.yakinda',[t])}</h2><p>${t!==tx('ui.sohbet')?tx('ui.klan_kurma_ortak_filo'):tx('ui.dunya_ve_klan_sohbeti')}</p>`,[[tx('ui.tamam'),'']])}
function openPass(){const O=window.__online;if(O&&O.on&&!openPass.b){openPass.b=1;O.pass.sync().then(p=>{openPass.b=0;if(p&&sheetFn===passFn)renderSheet()})}sheet(passFn);requestAnimationFrame(()=>{const b=$('sheet').querySelector('[data-a=pass]');if(b)b.scrollIntoView({block:'center'})})}
function passFn(){{const t=L.passTier(S),xp=S.pass.xp%L.PASS_XP;let h=hdr(tx('ui.fener_bileti_2'))+`<div class="card" style="background:linear-gradient(135deg,#6a4a1a,#2a1d10)"><div class="ic">🎫</div><div class="mid"><div class="nm">${tx('ui.pass_tier',[t,L.PASS_TIERS])}</div><div class="pbar"><i style="width:${t>=L.PASS_TIERS?100:xp}%"></i></div>${window.__online?.on?`<div class="sub">🌐 ${tx('ui.pass_srv2')}</div>`:`<div class="sub">${tx('ui.xp_gorev_50_gunluk')}</div>`}</div>${S.pass.prem?'<span class="tag" style="background:#3fb950">PREMIUM</span>':'<button class="btn g" data-a="passBuy">Premium ₺119,99</button>'}</div>`;
 if(!S.pass.prem)h+=DEMO;h+=`<div class="tier"><b></b><div class="sub" style="text-align:center">${tx('ui.ucretsiz_2')}</div><div class="sub" style="text-align:center">Premium 👑</div></div>`;
 for(let i=0;i<L.PASS_TIERS;i++){const cell=p=>{const c=S.pass.cl[p?'p':'f'][i],ok=i<t&&(!p||S.pass.prem);return `<div class="c ${p?'p':''} ${i>=t?'lk':''}"><span>${rwStr(L.passReward(i,p))}</span>${c?'✅':ok?`<button class="btn sm o" data-a="pass" data-v="${i}:${p}">${tx('ui.pass_take')}</button>`:p&&!S.pass.prem?'🔒':''}</div>`};h+=`<div class="tier"><b>${i+1}</b>${cell(0)}${cell(1)}</div>`}return h}}
function openBoss(){L.bossWeek(S,now());sheet(()=>{const b=L.bossBoard(S,now()),me=b.findIndex(r=>r.me)+1,left=Math.max(0,L.bossTries(S)-(S.boss.day===L.day(now())?S.boss.n:0)),end=(1-L.weekFrac(now()))*7*86400;
 let h=hdr(tx('ui.kraken_avi'))+`<div class="card" style="background:linear-gradient(135deg,#3a1a5a,#0a1a30)"><img src="img/f_kraken.webp" loading="lazy" style="width:84px;height:84px;object-fit:contain"><div class="mid"><div class="nm">${tx('ui.derin_kraken_haftalik')}</div><div class="sub">${tx('ui.bitise_hasarin',[fmtT(end)])} <b>${fmt(S.boss.dmg)}</b> ${tx('ui.siran',[me])}</div><div class="sub">${tx('ui.bugun_kalan_saldiri',[left,L.bossTries(S)])}</div></div></div>
 <button class="btn o" data-a="boss" style="width:100%;font-size:16px;margin-bottom:8px" ${left?'':'disabled'} id="bossBtn">${tx('ui.kraken_e_saldir')}</button>
 ${window.__online?.on?'':`<div class="prev">${tx('ui.onizleme_siralamadaki_diger_kaptanlar')}</div>`}<div class="sec">${tx('ui.oduller_hafta_sonunda')}</div><div class="sub">${tx('ui.1_2_3_4',[rwStr(L.bossReward(1)),rwStr(L.bossReward(2)),rwStr(L.bossReward(4)),rwStr(L.bossReward(9))])}</div>`;const OH=window.__online?.bossHtml?.();if(OH)return h+OH;h+=`<div class="sec">${tx('ui.siralama')}</div><div class="board">`;
 b.forEach((r,i)=>h+=`<div class="card ${r.me?'me':''}"><b style="width:26px">#${i+1}</b><div class="mid">${r.me?'⭐ Sen':r.n}${r.bot?'<span class="bot">BOT</span>':''}</div><b>${fmt(r.d)}</b></div>`);return h+'</div>'})}
function bossFight(){const r=L.bossAttack(S,now(),Math.random);if(r.err){resErr(r.err);return}closeSheet();const bt=$('battle');
 bt.innerHTML=`<div class="top">${tx('ui.kraken_avi')}</div><div class="side"><img class="foeimg" id="beast" src="img/f_kraken.webp" style="width:220px;height:220px"><div class="hl" id="bdmg">${tx('ui.toplam_hasar',[fmt(S.boss.dmg-r.dmg)])}</div></div><div class="side"><div style="display:flex;gap:8px">${L.team(S).map(h=>port(h,S.heroes[h.id])).join('')}</div><div class="hl">Filon · ⚔️ ${fmt(L.armyPower(S))}</div></div><div class="waves"></div>`;
 bt.classList.add('on');SFX.boss();cam.shake=.2;let i=0,acc=0;const hits=[.15,.2,.25,.4];const iv=setInterval(()=>{const be=$('beast');if(i>=hits.length){clearInterval(iv);
  setTimeout(()=>{ui();save();modal(`<img src="img/f_kraken.webp" style="width:90px"><h2>${fmt(r.dmg)} hasar!</h2><p>${tx('ui.haftalik_toplam')} <b>${fmt(S.boss.dmg)}</b><br>${tx('ui.loot')} ${rwStr(r.rw)}</p>`,[[tx('ui.siralama'),'o',()=>{bt.classList.remove('on');openBoss()}]])},400);return}
  const d=Math.round(r.dmg*hits[i]);acc+=d;be.animate([{transform:'scale(1)'},{transform:'scale(.92) rotate(-3deg)'},{transform:'none'}],{duration:220});SFX.hit();vib(15);const q=be.getBoundingClientRect();floatTxt(q.left+q.width/2+(Math.random()-.5)*80,q.top+q.height/2,'-'+fmt(d),i===3?'#ff6b6b':'#ffd84a');$('bdmg').textContent=tx('ui.toplam_hasar_2')+fmt(S.boss.dmg-r.dmg+acc);i++},550)}
function openLogin(auto){const ready=L.loginReady(S,now()),cur=S.login.n%7;modal(`<h2>${tx('ui.7_gunluk_giris')}</h2><p class="sub">${tx('ui.her_gun_gel_odulu')}</p><p class="sub">🔥 ${tx('ui.login_total',[S.login.total])} · ${tx('ui.login_honest')}</p><div class="cal">${L.LOGIN.map((r,i)=>`<div class="${i<cur?'ok':i===cur&&ready?'now':''} ${i===6?'d7':''}">${tx('ui.gun',[i+1])}<br>${rwStr(r)}${i<cur?'<br>✅':''}</div>`).join('')}</div>`,
 ready?[[tx('ui.odulu_al'),'o',()=>{const o=L.claimLogin(S,now());if(o){ui();save();setTimeout(()=>reward(`${tx('ui.gun_odulu',[o.i+1])}`,o.r,{icon:'📅'}),200)}}]]:[[tx('ui.yarin_gel'),'x']])}
// Batch 30: opt-in local reminders (no push server). Fired by the service worker; scheduled with Notification Triggers where supported, else while the game runs in the background.
const REM_OK=typeof Notification!=='undefined'&&'serviceWorker' in navigator;let remT=[];
const remOn=()=>REM_OK&&Notification.permission==='granted'&&localStorage.getItem('sf_rem')==='1';
function remCard(){const st=!REM_OK?tx('ui.rem_unsup'):Notification.permission==='denied'?tx('ui.rem_denied'):tx('ui.rem_d');return `<div class="card"><div class="mid"><div class="nm">🔔 ${tx('ui.rem_t')}</div><div class="sub">${st}</div></div><button class="tgl ${remOn()?'on':''}" data-a="rem" ${REM_OK&&Notification.permission!=='denied'?'':'disabled'}></button></div>`}
function remList(){const t=now(),o=[];const add=(at,k)=>{if(at&&at>t+60e3)o.push([at,k])};
 for(const b of Object.values(S.g))if(b.end)add(b.end,'rem_build');if(S.fener?.end)add(S.fener.end,'rem_fener');if(S.research?.end)add(S.research.end,'rem_tech');if(S.train?.end)add(S.train.end,'rem_train');
 add(t+8*36e5,'rem_cap');const m=new Date(t);m.setHours(24,0,30,0);add(+m,'rem_daily');
 const seen=new Set();return o.sort((a,b)=>a[0]-b[0]).filter(([a,k])=>!seen.has(k)&&seen.add(k)).slice(0,6)}
async function remSchedule(){remClear();if(!remOn()||document.visibilityState!=='hidden')return;const reg=await navigator.serviceWorker.ready.catch(()=>null);if(!reg)return;const trig='showTrigger' in Notification.prototype&&typeof TimestampTrigger!=='undefined';
 for(const [at,k] of remList()){const opt={body:tx('ui.'+k),icon:'img/icon-192.png',tag:'sf-'+k,data:{at}};if(trig){try{reg.showNotification(tx('ui.rem_title'),{...opt,showTrigger:new TimestampTrigger(at)})}catch(e){}}else remT.push(setTimeout(()=>{if(document.visibilityState==='hidden')reg.showNotification(tx('ui.rem_title'),opt)},at-now()))}}
function remClear(){remT.forEach(clearTimeout);remT=[];if(REM_OK)navigator.serviceWorker.ready.then(r=>r.getNotifications({includeTriggered:true}).then(ns=>ns.forEach(n=>(n.tag||'').startsWith('sf-')&&n.close()))).catch(()=>{})}
document.addEventListener('visibilitychange',()=>remSchedule());
function openSettings(){sheet(()=>{const tg=(k,n,d)=>`<div class="card"><div class="mid"><div class="nm">${n}</div><div class="sub">${d}</div></div><button class="tgl ${S.set[k]?'on':''}" data-a="set" data-v="${k}"></button></div>`;
 return hdr(tx('ui.h_ayarlar'))+tg('snd',tx('ui.ses_efektleri'),tx('ui.dokunma_birlestirme_savas'))+tg('mus',tx('ui.muzik'),tx('ui.ambiyans_muzigi_ve_dalga'))+tg('vib',tx('ui.titresim'),tx('ui.destekleyen_telefonlarda'))+remCard()+
 `<div class="card"><div class="mid"><div class="nm">${tx('ui.q_t')}</div><div class="sub">${tx('ui.q_d')}${QS==='auto'?' · '+({low:tx('ui.q_low'),med:tx('ui.q_med'),high:tx('ui.q_high')})[QL]:''}</div></div></div><div class="qrow" style="display:flex;gap:6px;margin:-4px 0 10px">${[['auto',tx('ui.q_auto')],['low',tx('ui.q_low')],['med',tx('ui.q_med')],['high',tx('ui.q_high')]].map(([v,n])=>`<button class="btn ${QS===v?'':'x'}" style="flex:1" data-a="qual" data-v="${v}">${n}</button>`).join('')}</div><div class="card"><div class="mid"><div class="nm">${tx('ui.dil')}</div><div class="sub">${LANGS[lang]}</div></div><button class="btn x" data-a="lang">${lang.toUpperCase()} ▾</button></div><div class="card"><div class="mid"><div class="nm">${tx('ui.ilerlemeyi_sifirla')}</div><div class="sub">${tx('ui.kayit_bu_cihazda_tutulur')}</div></div><button class="btn r" data-a="reset">${tx('ui.sifirla_2')}</button></div><div class="sub" style="text-align:center;margin-top:8px">${tx('ui.son_fener_v2_cevrimdisi')}</div>`})}
function openClan(){sheet(()=>`${hdr(tx('ui.h_klanlar'))}<div class="prev">${tx('ui.onizleme_bunlar_ornek_bot')}</div>`+L.CLANS_PREVIEW.map(c=>`<div class="card"><div class="ic">${c.ic}</div><div class="mid"><div class="nm">${c.n} <span class="bot">[${c.tag}] BOT</span></div><div class="sub">👥 ${c.m}/30 · ⚔️ ${c.p}</div></div><button class="btn" disabled>${tx('ui.katil')}</button></div>`).join(''))}
function openIslands(){sheet(()=>{let h=hdr(tx('ui.adalarim'))+`<div class="sub" style="margin-bottom:8px">${tx('ui.sisli_deniz_de_ada')}</div>`;
 for(const id in L.ISLANDS){const I=L.ISLANDS[id],own=id==='home'||S.isl[id]?.own,here=S.cur===id;h+=`<div class="card" ${here?'style="border-color:#ffd27a;background:#ffb34722"':''}><div class="ic">${I.ic}</div><div class="mid"><div class="nm">${I.n}${here?'<span class="tag" style="background:#3fb950">BURADASIN</span>':''}</div><div class="sub">${I.d}${own&&id!=='home'?` ${tx('ui.isik_diregi_sv',[S.isl[id].lv])}`:''}${!own?` ${tx('ui.ada_kurtar',[I.unlock,S.stage-1,I.unlock])}`:''}</div></div>${own?(here?'':`<button class="btn o" data-a="go" data-v="${id}">${tx('ui.git')}</button>`):`<button class="btn" data-a="isl" data-v="${id}" ${S.stage-1>=I.unlock?'':'disabled'}>${costStr(I.cost)}</button>`}</div>`}
 if(S.cur!=='home'){const lv=S.isl[S.cur].lv;h+=`<div class="sec">${tx('ui.isik_diregi')}</div><div class="card"><div class="ic">🗼</div><div class="mid"><div class="nm">${tx('ui.sv_3_guvenli_alan',[lv,L.safeR(S)*2+1,L.safeR(S)*2+1])}</div><div class="sub">${lv<3?costStr(L.postCost(lv)):tx('ui.en_ust_seviye')}</div></div><button class="btn o" data-a="post" ${lv<3?'':'disabled'}>${tx('ui.yukselt')}</button></div>`}return h})}
function goIsland(id){if(resErr(L.switchIsland(S,id)))return;closeSheet();for(const k of [...meshes.keys()]){scene.remove(meshes.get(k).g);disposeObj(meshes.get(k).g);meshes.delete(k)}paintIsland(S.cur);buildIslDeco(S.cur);syncBeacon();fogR=-1;syncAll();
 SFX.wave();toast(`${L.ISLANDS[S.cur].ic} ${L.ISLANDS[S.cur].n}`);ui();save()}
// ---------- SAVAŞ ----------
function pveCheck(kind,stage,rw,prog){const O=window.__online;if(!O||!O.on||!O.pve)return;O.pve(kind,stage).then(r=>{if(!r||r.ok)return;
   const neg={};for(const k in rw)neg[k]=-rw[k];L.addRes(S,neg);for(const k in S.res)S.res[k]=Math.max(0,S.res[k]);S.gems=Math.max(0,S.gems);S.tickets=Math.max(0,S.tickets||0);if(typeof prog==='function')prog();else if(prog&&S.stage>1)S.stage--;ui();save();toast('⚠️ '+tx('ui.pve_rej')+' '+tl(r.err||''))}).catch(()=>{})}
function battle(stage,camp,cv){closeSheet();const res=cv?cv.res:L.simulate(S,stage,Math.random);const B=cv?(cv.foe||{n:tx('ui.cv_foe'),img:'pirate'}):FOES[L.stageFoe(stage)];const tm=L.team(S);const bt=$('battle');
 const icons=Object.entries(S.troops).flatMap(([t,n])=>Array(Math.min(4,Math.ceil(n/10))).fill(TROOPS[t].ic));
 bt.innerHTML=`<div class="top">${cv?(cv.ttl||'🏴‍☠️ '+tx('ui.cv_t')):'⛵ '+tx('ui.isl_n',[stage,L.islandName(stage)])}</div><div class="side"><div class="units"><img class="u big foeimg" id="beast" src="img/f_${B.img}.webp" alt="${B.n}"></div><div class="hp e"><i id="ehp" style="width:100%"></i></div><div class="hl">${B.n} · ⚔️ ${fmt(cv?(cv.pw||L.convoyPower(S)):L.stagePower(stage))}</div></div>
 <div class="side"><div class="units" id="army"><span class="u">${shipSvg('#2f7fd8',40)}</span>${icons.map(i=>`<span class="u ut">${i}</span>`).join('')}<span class="u">${shipSvg('#2f7fd8',40)}</span></div><div style="display:flex;gap:8px">${tm.map(h=>port(h,S.heroes[h.id])).join('')}</div><div class="hp"><i id="mhp" style="width:100%"></i></div><div class="hl">Filon · ⚔️ ${fmt(L.armyPower(S))}</div></div><div class="waves"></div>`;
 bt.classList.toggle('reefB',!!(cv&&cv.reef));bt.classList.add('on');SFX.horn();setTimeout(SFX.roar,500);let i=0;
 const iv=setInterval(()=>{const r=res.rounds[i];if(!r){clearInterval(iv);setTimeout(()=>finish(),500);return}
  const army=$('army'),beast=$('beast');army.animate([{transform:'translateY(0)'},{transform:'translateY(-50px)'},{transform:'translateY(0)'}],{duration:280});{const a=army.getBoundingClientRect(),b=beast.getBoundingClientRect();shot({x:a.left+a.width/2,y:a.top},{x:b.left+b.width/2,y:b.top+b.height/2})}
  setTimeout(()=>{beast.animate([{transform:'translateX(0)'},{transform:'translateX(-12px)'},{transform:'translateX(12px)'},{transform:'none'}],{duration:200});SFX.hit();vib(15);const b=beast.getBoundingClientRect();impact(b.left+b.width/2,b.top+b.height/2,'#ffd84a',r.d1>res.eMax*.12);floatTxt(b.left+b.width/2,b.top+b.height/2,'-'+fmt(r.d1),'#ffd84a');$('ehp').style.width=(r.eHp/res.eMax*100)+'%'},150);
  if(r.d2)setTimeout(()=>{beast.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(60px) scale(1.2)'},{transform:'none'}],{duration:260});const a=army.getBoundingClientRect();impact(a.left+a.width/2,a.top+a.height/2,'#ff6b6b');floatTxt(a.left+a.width/2,a.top+a.height/2,'-'+fmt(r.d2),'#ff6b6b');$('mhp').style.width=(r.hp/res.myMax*100)+'%';bt.animate([{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'none'}],{duration:150})},450);
  i++},700);
 function finish(){if(cv)return cvFinish();const st0=S.stage,out=L.applyBattle(S,res,stage,now());if(out.rw)pveCheck('stage',stage,out.rw,S.stage>st0);ui();save();syncPeople();const lost=Object.entries(out.lost).filter(([t,n])=>n).map(([t,n])=>`${TROOPS[t].ic}${n}`).join(' ');
  if(res.win){SFX.done();vib([30,40,60]);if(camp)camp.g.userData.vis=false,setTimeout(()=>camp.g.userData.vis=true,90000);for(let k=0;k<Math.min(out.saved,3);k++)setTimeout(()=>sendRaft(true),k*700)}else SFX.err();
  modal(res.win?`<div style="font-size:54px">🏝️</div><h2>${tx('ui.ada_sisten_kurtuldu')}</h2><p>${tx('ui.loot')}<br><b>${costStr(out.rw)}</b>${out.saved?`<br>${tx('ui.kurtulan_filona_katildi',[out.saved])}`:''}${lost?`<br><span class="sub">${tx('ui.yarali')} `+lost+'</span>':''}</p>`:`<div style="font-size:54px">🌫️</div><h2>${tx('ui.sis_galip_geldi')}</h2><p>${tx('ui.yaratiklar_cok_gucluydu_daha')}${lost?`<br><span class="sub">${tx('ui.kayip')} `+lost+'</span>':''}</p>`,[[tx('ui.devam'),res.win?'o':'x',()=>{bt.classList.remove('on');tutCheck()}]])}
 function cvFinish(){ui();save();syncPeople();const lost=Object.entries(cv.lost).filter(([t,n])=>n).map(([t,n])=>`${TROOPS[t].ic}${n}`).join(' ');if(res.win){SFX.done();vib([30,40,60]);cam.shake=.15}else SFX.err();
  modal(res.win?`<div style="font-size:54px">${cv.reef?'🪸':'🏴‍☠️'}</div><h2>${cv.winT||tx('ui.cv_win')}</h2><p>${cv.winD?cv.winD+'<br>':''}<b>${costStr(cv.rw)}</b>${lost?`<br><span class="sub">${tx('ui.yarali')} ${lost}</span>`:''}</p>`:`<div style="font-size:54px">🌊</div><h2>${cv.reef?tx('ui.sis_galip_geldi'):tx('ui.cv_lose')}</h2><p>${cv.reef?tx('ui.reef_lose_d'):tx('ui.cv_lose_d')}${lost?`<br><span class="sub">${tx('ui.kayip')} ${lost}</span>`:''}</p>`,[[tx('ui.devam'),res.win?'o':'x',()=>{bt.classList.remove('on')}]])}}
// ---------- HUD ----------
function ui(){for(const r of L.RES)$('r_'+r).textContent=fmt(S.res[r]);$('r_gems').textContent=fmt(S.gems);$('flv').textContent=S.fener.lv;$('pow').textContent=fmt(L.armyPower(S));
 const t=now(),nt=L.night(S,t),ni=L.nightIn(S,t);$('nval').textContent=nt?tx('ui.sis_gecesi'):L.lit(S)?tx('ui.fener_yaniyor'):tx('ui.fener_sonuk');
 $('nsub').textContent=S.tut<9?tx('ui.egitim_2'):nt?`${tx('ui.bitise',[fmtT(-ni)])}`:`${tx('ui.sis_gecesine',[fmtT(ni),L.nightNeed(S)])}`;$('night').className=nt?'storm':L.lit(S)?'':'dark';
 {const id=L.idle(S),h=`${S.surv}/${L.cap(S)}`+(id>0?`<b class="idle" title="${tx('ui.bosta_2',[id])}">${id}</b>`:'');if($('surv').dataset.h!==h){$('surv').innerHTML=h;$('surv').dataset.h=h}}$('bld').textContent=`${L.busyBuilders(S)}/${L.builderCount(S)}`;$('isl').textContent=S.stage-1;
 const w=[];if(!L.lit(S))w.push(tx('ui.fener_sonuk_uretim_yariya'));else if(S.res.crys<L.nightNeed(S))w.push(`${tx('ui.sis_gecesi_icin_kristal',[L.nightNeed(S)])}`);if(S.res.fish<=0)w.push(tx('ui.balik_bitti'));const fg=Object.values(S.g).filter(b=>b.fog).length;if(fg)w.push(`${tx('ui.bina_sisli_arindir',[fg])}`);
 $('warn').style.display=w.length&&S.tut>=9?'block':'none';$('warn').textContent=w.join(' · ');
 const q=L.QUESTS[S.q];if(q){const v=Math.min(q.f(S),q.n),done=v>=q.n;const h=`<div>⭐ ${q.t}</div><div class="bar"><i style="width:${v/q.n*100}%"></i></div><div style="display:flex;justify-content:space-between;margin-top:3px;font-size:11px;color:#a9d8e8"><span>${v}/${q.n}</span><span>${costStr(q.r)}</span></div>${done?`<button class="btn o" id="qclaim" style="margin-top:5px;padding:6px 12px">${tx('ui.odulu_al')}</button>`:q.go&&S.tut>=9?`<button class="btn" id="qgo">${tx('ui.quest_go')}</button>`:''}`;
  if($('quest').dataset.h!==h){$('quest').innerHTML=h;$('quest').dataset.h=h;if(done)$('qclaim').onclick=claimQuest;else if($('qgo'))$('qgo').onclick=e=>{e.stopPropagation();SFX.tap();questGo()}}}else $('quest').innerHTML=tx('ui.tum_bolum_gorevleri_tamam');
 L.dailyReset(S,t);L.weeklyReset(S,t);$('tdot').style.display=L.DAILY.some(d=>!S.daily.c[d.id]&&(S.daily.p[d.id]||0)>=d.n)||L.WEEKLY.some(d=>!S.weekly.c[d.id]&&(S.weekly.p[d.id]||0)>=d.n)||(q&&q.f(S)>=q.n)?'block':'none';$('hdot').style.display=heroDot(t)?'block':'none';
 const pt=L.passTier(S);let pc=0;for(let i=0;i<pt;i++){if(!S.pass.cl.f[i])pc++;if(S.pass.prem&&!S.pass.cl.p[i])pc++}$('pdot').style.display=pc?'block':'none';$('ldot').style.display=L.loginReady(S,t)?'block':'none';
 $('kdot').style.display=S.tut>=9&&(S.boss.day!==L.day(t)||S.boss.n<L.bossTries(S))?'block':'none';$('side').style.display=S.tut>=9?'flex':'none';
 $('isl').textContent=(S.cur==='home'?'':L.ISLANDS[S.cur].ic+' ')+(S.stage-1);if(L.achReady(S).length)$('tdot').style.display='block';
 {const sp=L.stagePower(S.stage);$('mdot').style.display=S.tut>=9&&L.armyPower(S)>=sp*.9?'block':'none'}
 $('collect').style.display=S.tut>=9&&bubN>=3&&!$('sheet').classList.contains('on')?'block':'none';evTick()}
function claimQuest(silent){const q=L.claimQuest(S);if(!q)return;ui();renderSheet();save();if(silent===true){for(const r in q.r)fly(r,innerWidth/2,200,3);SFX.coin();toast(`⭐ ${q.t} ✓ ${rwStr(q.r)}`);return}
 const nq=L.QUESTS[S.q];const lines=[...(q.say?[q.say]:[])];if(nq&&nq.c!==q.c&&!S.seen['ch'+nq.c]){S.seen['ch'+nq.c]=1;lines.push(`${tx('ui.bolum_2',[nq.c+1,L.CHAPTERS[nq.c].n])}`,...L.CHAPTERS[nq.c].say)}const go=()=>{if(lines.length)talk(lines)};closeSheet();reward(tx('ui.gorev_tamam'),q.r,{icon:'⭐',sub:q.t,cb:go})}
let talkQ=[],talkCb=null;function talk(lines,cb){talkQ=[...lines];talkCb=cb;closeSheet();nextTalk()}
function talkPos(){$('talk').classList.toggle('top',localStorage.getItem('sf_talkTop')==='1')}
function nextTalk(){const l=talkQ.shift();if(l===undefined){$('talk').classList.remove('on');const c=talkCb;talkCb=null;c&&c();return}talkPos();$('talkT').innerHTML=`<span class="tc"><button data-t="mv" title="${tx('ui.talk_move')}" aria-label="${tx('ui.talk_move')}">⇅</button><button data-t="x" title="${tx('ui.talk_skip')}" aria-label="${tx('ui.talk_skip')}">✕</button></span><b>${L.NPC.n}</b>${l}<small>${tx('ui.dokun')}${talkQ.length?' · '+(talkQ.length+1):''}</small>`;$('talk').classList.add('on');SFX.tap()}
$('talk').onclick=e=>{const b=e.target.closest('[data-t]');if(b){e.stopPropagation();if(b.dataset.t==='mv'){localStorage.setItem('sf_talkTop',localStorage.getItem('sf_talkTop')==='1'?'0':'1');talkPos()}else{talkQ=[];nextTalk()}return}nextTalk()};

// ---------- KUTLAMA / ÖDÜL ----------
const RNAME={fish:tx('ui.balik'),wood:tx('ui.kereste'),crys:tx('ui.kristal'),gems:tx('ui.elmas'),ticket:tx('ui.cagri_bileti')};
function shock(pos,c=0xffe08a,sz=2.2){const m=new THREE.Mesh(new THREE.RingGeometry(.5,.64,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:c,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.copy(pos);m.position.y=.1;scene.add(m);
 tween(700,t=>{m.scale.setScalar(.4+E.out(t)*sz);m.material.opacity=1-t},()=>{scene.remove(m);m.geometry.dispose();m.material.dispose()})}
function bigTxt(t,sub,c='#ffd84a'){const d=document.createElement('div');d.className='bigtxt';d.innerHTML=`<b style="color:${c}">${t}</b>${sub?`<small>${sub}</small>`:''}`;$('fx').appendChild(d);setTimeout(()=>d.remove(),1500)}
const rwCards=r=>Object.entries(r).filter(([,v])=>v).map(([k,v],i)=>`<div class="rw" style="animation-delay:${.18+i*.14}s"><div class="ri2">${RI(k)}</div><b>+${fmt(v)}</b><small>${RNAME[k]||''}</small></div>`).join('');
function reward(title,r,o={}){const n=Object.keys(r).length;SFX.done();vib([20,30,40]);for(let i=0;i<n;i++)setTimeout(()=>SFX.pop(),180+i*140);
 modal(`<div class="rays"></div><div class="rwh">${o.icon||'🎁'}</div><h2>${title}</h2>${o.sub?`<p>${o.sub}</p>`:''}<div class="rws">${rwCards(r)}</div>`,[[o.btn||tx('ui.topla'),'o',()=>{for(const k in r)fly(k,innerWidth/2,innerHeight/2,4);SFX.coin();o.cb&&o.cb()}]]);$('mbox').classList.add('rwbox')}
function levelUp(lv){const R=L.addRes,g={gems:lv*10,crys:lv*40};R(S,g);const nk=Object.values(KINDS).filter(k=>k.req===lv&&!k.only).map(k=>`${k.ic} ${k.n}`);const isl=Object.values(L.ISLANDS).filter(x=>x.unlock&&false);
 const ul=[`${tx('ui.guvenli_alan_genisledi')}`,`${tx('ui.bina_siniri_sv',[lv+1])}`,...nk.map(x=>`🆕 ${x}`)];SFX.gacha(3);vib([40,40,80]);cam.shake=.3;
 modal(`<div class="rays gold"></div><div class="lvb">${lv}</div><h2 class="lvh">${tx('ui.fener_seviye_atladi')}</h2><div class="ul">${ul.map((u,i)=>`<div style="animation-delay:${.35+i*.12}s">${u}</div>`).join('')}</div><div class="rws">${rwCards(g)}</div>`,[[tx('ui.harika'),'o',()=>{for(const k in g)fly(k,innerWidth/2,innerHeight/2,4);SFX.coin();ui();save()}]]);$('mbox').classList.add('rwbox','lvbox')}
let combo=0,comboT=0;
// İlk savaş daveti: yeni oyuncu ilk kez yeterli filoya ulaştığında haritaya yönlendir (bir kez)
function fbNudge(){if(S.tut<9||S.stage!==1||S.fbN||L.armyPower(S)<L.stagePower(1)||['sheet','modal','battle','talk'].some(id=>$(id)&&$(id).classList.contains('on')))return;S.fbN=1;save();SFX.claim&&SFX.claim();
 modal(`<div style="font-size:54px">⚔️</div><h2>${tx('ui.fb_t')}</h2><p>${tx('ui.fb_d',[fmt(L.armyPower(S)),fmt(L.stagePower(1))])}</p>`,[[tx('ui.fb_go'),'o',()=>openMap()],[tx('ui.fb_later'),'x',()=>{}]])}
setInterval(fbNudge,3000);window.__fbNudge=fbNudge;
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
 else if(a==='heroes'){openHeroes();const hb=heroLvQ()&&heroBest();guideAt({sel:hb?`[data-a=hero][data-v="${hb}"]`:'#freeCall,[data-a=call]'},t)}
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
function panBy(x0,y0,x1,y1,f){cam.goal=null;const a=ground(x0,y0),b=ground(x1,y1);if(!a||!b)return;cam.target.addScaledVector(a.sub(b),f);cam.target.x=Math.max(-6,Math.min(6,cam.target.x));cam.target.z=Math.max(-6,Math.min(6,cam.target.z))}
function startDrag(k){const m=meshes.get(k);if(!m)return;closeSheet();drag={k,g:m.g,home:m.g.position.clone(),over:null};SFX.pop();vib(8);tween(150,t=>m.g.position.y=E.out(t)*.6)}
function moveDrag(x,y){const p=ground(x,y);if(!p)return;drag.g.position.x=p.x;drag.g.position.z=p.z;const t=tileAt(x,y);ringM.visible=false;drag.over=null;if(!t||t===drag.k)return;
 const pp=tpos(t);ringM.position.set(pp.x,.08,pp.z);ringM.visible=true;const[i,j]=L.unkey(t);
 if(S.g[t]&&L.canMerge(S,drag.k,t)){ringM.material.color.set(0x3fff6a);drag.over=t;ringM.scale.setScalar(1.25+Math.sin(performance.now()/90)*.08)}
 else if(!S.g[t]&&L.tileOK(i,j)&&L.isSafe(S,t)){ringM.material.color.set(0xffffff);drag.over=t;ringM.scale.setScalar(1.25)}else{ringM.material.color.set(0xff5555);ringM.scale.setScalar(1.25)}}
function cancelDrag(){if(!drag)return;const d=drag;drag=null;ringM.visible=false;const s=d.g.position.clone();tween(220,t=>{d.g.position.lerpVectors(s,d.home,E.out(t))})}
function endDrag(){const d=drag;ringM.visible=false;if(!d.over){if(S.g[d.k]&&S.g[d.k].lv>=L.maxLv(S)&&d.over===null)toast(`${tx('ui.sv_sinirinda_feneri_yukselt',[S.g[d.k].lv])}`);cancelDrag();return}drag=null;
 if(S.g[d.over]){const lv=S.g[d.over].lv+1;scene.remove(d.g);disposeObj(d.g);meshes.delete(d.k);L.merge(S,d.k,d.over,now());const g=syncOne(d.over);popAnim(g,.7);
  SFX.merge(lv);vib(lv>=4?[40,30,60]:30);if(lv>=4)cam.shake=.15+lv*.03;burst(tpos(d.over).setY(.6),0xffe08a,16+lv*2,2.8,1);shock(tpos(d.over),lv>=5?0xffd84a:0x9ff8ff,1.6+lv*.2);const tn_=performance.now();combo=tn_-comboT<4000?combo+1:1;comboT=tn_;const s=tileScr(d.over,1.2);floatTxt(s.x,s.y,`${LV}${lv}!`,'#7dff8a');if(combo>=2){floatTxt(s.x,s.y-34,tx('ui.combo',[combo]),'#ffb347');SFX.coin()}if(lv>=3)bigTxt(tx('ui.birlesti'),`${KINDS[S.g[d.over].k].n} · ${LV}${lv}`,lv>=5?'#ffd84a':'#9ff8ff')}
 else{L.move(S,d.k,d.over);const m=meshes.get(d.k);meshes.delete(d.k);meshes.set(d.over,m);const to=tpos(d.over);const s=d.g.position.clone();tween(160,t=>d.g.position.lerpVectors(s,to,E.out(t)));SFX.pop()}
 ui();save();tutCheck()}
function tap(x,y){const p=pick(x,y);if(!p){closeSheet();return}SFX.tap();
 if(p.camp){if(S.tut<9){toast(tx('ui.once_egitimi_bitir'));return}battle(S.stage,p.camp);return}
 if(p.fener){popAnim(fenerG,.08);openFener();return}
 if(p.post){openIslands();return}
 if(p.k){const b=S.g[p.k];const r=KINDS[b.k].res;if(r&&!b.fog&&(b.stored||0)>=1&&!$('sheet').classList.contains('on')){const a=L.collect(S,p.k,now());const s=tileScr(p.k,1.2);floatTxt(s.x,s.y,`+${a} ${RIC[r]}`,'#ffd27a');fly(r,s.x,s.y,4);SFX.coin();vib(10);popAnim(meshes.get(p.k).g,.15);ui();save();tutCheck();return}
  if(S.tut===2){toast(tx('ui.once_baloncugu_topla'));return}popAnim(meshes.get(p.k).g,.12);{const tp=tpos(p.k);cam.goal=new THREE.Vector3(tp.x*.55,0,tp.z*.55+.9)}openB(p.k);return}
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
let fN=0;function frame(){if(document.hidden){last=performance.now();setTimeout(()=>requestAnimationFrame(frame),500);return}const tn=performance.now(),dt=Math.min(.1,(tn-last)/1000);last=tn;const T=tn/1000,t=now();UT.value=T;
 for(let n=tweens.length-1;n>=0;n--){const w=tweens[n];const k=Math.min(1,(tn-w.t0)/w.dur);w.fn(k);if(k>=1){tweens.splice(n,1);w.done&&w.done()}}
 for(let n=parts.length-1;n>=0;n--){const p=parts[n];p.life-=dt;p.v.y-=9*dt;p.m.position.addScaledVector(p.v,dt);p.m.scale.setScalar(Math.max(.01,p.life));if(p.life<=0){scene.remove(p.m);parts.splice(n,1)}}
 const oa=OC.attributes.position.array;for(let i=0;i<oa.length;i+=3){const x=ocB[i],z=ocB[i+2];oa[i+1]=Math.sin(x*.5+T*1.2)*.12+Math.cos(z*.6+T*.9)*.1}OC.attributes.position.needsUpdate=true;
 fillBDG(); foam.material.opacity=.25+Math.sin(T*1.5)*.12;{const FS=FXI();let nf=0,ns=0;for(const[,o]of meshes){const inn=o.g.children[0],u=inn&&inn.userData;if(!u)continue;const ph=o.g.position.x*1.7+o.g.position.z;if(!o.g.visible)continue;if(!u.bs)u.bs=inn.scale.x;inn.scale.y=u.bs*(1+Math.sin(T*2.2+ph)*.014);
 if(u.flag&&u.flag.userData.cl&&nf<FS.N){const c=u.flag.userData.cl;u.flag.rotation.y=Math.sin(T*3+ph)*.35;u.flag.updateMatrixWorld(true);_xm.makeTranslation(c[4],0,0).premultiply(u.flag.matrixWorld);_xm.multiply(_xs.makeScale(c[1],c[2],c[3]));FS.f.setMatrixAt(nf,_xm);FS.f.setColorAt(nf,_xc.set(c[0]));nf++}
 if(u.smoke){inn.updateMatrixWorld(true);const so=u.so||[-.3,.85,-.25];for(let k=0;k<3&&ns<FS.N*3;k++){const q=(T*.45+k/3+ph*.1)%1;_xv.set(so[0]+q*.18,so[1]+q*.75,so[2]-q*.08).applyMatrix4(inn.matrixWorld);const sc=(.06+q*.16)*o.g.scale.x*inn.scale.x;_xm.makeScale(sc,sc,sc).setPosition(_xv);FS.s.setMatrixAt(ns++,_xm)}}
 if(u.glow)u.glow.scale.setScalar(.13+Math.sin(T*4+ph)*.02)}FS.f.count=nf;FS.s.count=ns;FS.f.instanceMatrix.needsUpdate=FS.s.instanceMatrix.needsUpdate=true;if(FS.f.instanceColor)FS.f.instanceColor.needsUpdate=true}foam.scale.setScalar(1+Math.sin(T*1.5)*.015);
 nf+=((L.night(S,t)?1:0)-nf)*dt*.8;if(fogR!==L.safeR(S)){fogR=L.safeR(S);buildFog();buildTiles()}
 if(fogIM&&fogs.length){const sh=1-nf*.14,cp=camera.position;for(const f of fogs){f.p.set(f.b.x*sh+Math.sin(T*.3+f.ph)*.3,f.b.y+Math.sin(T*.5+f.ph)*.08,f.b.z*sh+Math.cos(T*.25+f.ph)*.3);f.d=f.p.distanceToSquared(cp)}
  const so=fogs.slice().sort((a,b)=>b.d-a.d),aO=fogIM.geometry.attributes.aO,aP=fogIM.geometry.attributes.aP;so.forEach((f,i)=>{_fm.compose(f.p,_fq,_fs.set(f.s,f.s*.6,1));fogIM.setMatrixAt(i,_fm);aO.array[i]=f.o;aP.array[i]=f.up});
  fogIM.instanceMatrix.needsUpdate=true;aO.needsUpdate=true;aP.needsUpdate=true;fUN.value=nf;fogIMat.color.setRGB(1-nf*.35,1-nf*.4,1-nf*.2)}
 const ph=L.nightPhase(S,t);const dk=S.tut<9?.3:ph<.06?(1-ph/.06)*.7:ph<.28?0:ph<.46?(ph-.28)/.18:ph<.81?1-Math.min(1,(ph-.46)/.12)*.55:.45;duskK+=(dk-duskK)*dt*.6;
 const ev=S.tut<9?0:ph>.5&&ph<.82?Math.min(1,(ph-.5)/.1)*.72:0;eveK+=(ev-eveK)*dt*.6;const vN=Math.max(nf,eveK);
 skyU.uT.value=duskK;skyU.uN.value=vN*.9;stars.material.opacity=vN*.95;ambFx(T,dt,vN);
 hemi.intensity=1.45-vN*.62-duskK*.12;sun.intensity=2.1-vN*1.25-duskK*.25;sun.color.setRGB(1,.92-duskK*.22,.82-duskK*.35);
 const IT=ISLT[S.cur]||ISLT.home;scene.fog.color.setRGB(IT.f[0]+duskK*.05-vN*.6,IT.f[1]-duskK*.3-vN*.6,IT.f[2]-duskK*.43-vN*.45);ocean.material.color.setRGB(IT.o[0]-vN*.04+duskK*.05,IT.o[1]-duskK*.1-vN*.32,IT.o[2]-vN*.25-duskK*.06);
 const home=S.cur==='home';if(fenerG)fenerG.visible=home;const on=L.lit(S)&&home;beam.visible=on;halo.visible=on;beam.rotation.y=T*.9;lamp.intensity=on?10+S.fener.lv+Math.sin(T*6)*.6:0;halo.scale.setScalar(on?1.3+vN*.9+Math.sin(T*4)*.1:0);halo.material.opacity=.45+vN*.5;beam.children.forEach(m=>m.material.opacity=.06+vN*.14);
 WALK.upd(Math.min(dt,.05),T);if(baseG&&baseG.userData.glow){const gm=baseG.userData.glow.material;gm.opacity=.35+vN*.6;gm.size=.8+Math.sin(T*11)*.05+Math.sin(T*7.3)*.05}bubN=0;const cand=[];for(const[k,m]of meshes){const b=S.g[k];if(!b)continue;const u=m.g.userData;if(u.bub){u.bub.visible=false;const r=L.rate(S,k);if((b.stored||0)>=Math.max(1,r*.5,L.storeCap(S,k)*.15)&&!b.end&&!(drag&&drag.k===k))cand.push([b.stored/Math.max(1,L.storeCap(S,k)),u,m])}if(u.gh)u.gh.position.y=1.2+Math.sin(T*2)*.1}
 cand.sort((a,b)=>b[0]-a[0]);bubN=cand.length;cand.slice(0,6).forEach(([f,u,m],i)=>{u.bub.visible=true;u.bub.position.y=1.15+(i%2)*.18+Math.sin(T*3+m.g.position.x)*.05;const s=.3+Math.min(1,f)*.12;u.bub.scale.set(s,s,1)});
 foam2.material.opacity=.14+Math.sin(T*1.1+1)*.08;foam2.scale.setScalar(1+Math.sin(T*1.1)*.02);
 for(const b of boats){const a=T*b.sp+b.ph;b.g.position.set(Math.cos(a)*b.r,-.18+Math.sin(T*1.3+b.ph)*.05,Math.sin(a)*b.r);b.g.rotation.y=-a;b.g.rotation.x=Math.sin(T*1.1+b.ph)*.06}
 for(const q of gulls){const a=T*q.sp+q.ph;q.g.position.set(Math.cos(a)*q.r,q.h+Math.sin(T*.8+q.ph)*.3,Math.sin(a)*q.r);q.g.rotation.y=-a;const w=Math.sin(T*9+q.ph)*.6;q.w1.rotation.z=w;q.w2.rotation.z=-w}

 for(const c of CAMPS){c.g.visible=S.cur==='home'&&(c.g.userData.vis!==false);c.g.userData.sp.position.y=1.6+Math.sin(T*2.5)*.08;c.g.position.y=-.25+Math.sin(T*1.3+c.x)*.1;if(c.g.userData.ts)c.g.userData.ts.forEach((tt,i)=>tt.rotation.y=Math.sin(T*2+i)*.4)}
  for(let n=rafts.length-1;n>=0;n--){const r=rafts[n];r.t+=dt/r.dur;r.g.position.lerpVectors(r.from,r.to,E.out(Math.min(1,r.t)));r.g.position.y=-.2+Math.sin(T*2+n)*.06;r.g.rotation.z=Math.sin(T*1.7+n)*.08;if(r.t>=1){scene.remove(r.g);disposeObj(r.g);rafts.splice(n,1);burst(r.to.clone().setY(0),0xffffff,10,1.5,1);syncPeople()}}
 for(const p of people){const u=p.userData;if(!u.t)pickTarget(p);const d=u.t.clone().sub(p.position);d.y=0;const L2=d.length();if(L2<.08){if(Math.random()<.02)pickTarget(p)}else{const v=Math.min(L2,dt*u.sp);p.position.addScaledVector(d.normalize(),v);p.rotation.y=Math.atan2(d.x,d.z);const ph=T*10+u.ph;u.l1.rotation.x=Math.sin(ph)*.6;u.l2.rotation.x=-Math.sin(ph)*.6;p.position.y=Math.abs(Math.sin(ph))*.03}}
 acc+=dt;if(acc>.25){const ev=L.step(S,acc,t);acc=0;handle(ev)}uiAcc+=dt;if(uiAcc>.5){uiAcc=0;ui();if($('sheet').classList.contains('on')&&$('sheet').querySelector('.pbar'))renderSheet()}
 fx7(T,dt,nf,vN,on);updCam();pimUpd();if(QL!=='low'||(++fN&1))renderer.render(scene,camera);labels();tutFrame(T);requestAnimationFrame(frame)}
function handle(evs){for(const e of evs){
 if(e.e==='built'){if(e.isl&&e.isl!==S.cur){toast(`${tx('ui.sv_hazir',[L.ISLANDS[e.isl].n,e.lv])}`);continue}const g=syncOne(e.k);popAnim(g,.6);SFX.done();vib([20,30,20]);burst(tpos(e.k).setY(.6),0xffd84a,16,2.5,1);pillar(tpos(e.k));shock(tpos(e.k),0xffd84a,2);toast(`${tx('ui.sv_hazir_2',[KINDS[S.g[e.k].k].n,e.lv])}`);renderSheet()}
 if(e.e==='fener'){syncFener();popAnim(fenerG,.3);SFX.light();vib([30,40,60]);cam.shake=.25;burst(new THREE.Vector3(0,beam.position.y,0),0xffe08a,30,4,1);pillar(new THREE.Vector3(0,0,0));closeSheet();setTimeout(()=>levelUp(e.lv),500)}
 if(e.e==='dark'){SFX.err();toast(tx('ui.kristal_bitti_fener_sondu'))}
 if(e.e==='trained'){SFX.done();toast(`${tx('ui.hazir',[e.n,TROOPS[e.t].n])}`)}
 if(e.e==='researched'){SFX.done();toast(`${tx('ui.tamamlandi_2',[TECH.find(x=>x.id===e.id).n])}`)}
 if(e.e==='raft'){sendRaft(false);toast(tx('ui.bir_sal_kiyiya_yanasiyor'))}
 if(e.e==='repel'){SFX.light();cam.shake=.1;toast(`${tx('ui.sis_gecesi_fener_yakip',[e.need])}`)}
 if(e.e==='corrupt'){SFX.roar();vib([60,40,60]);cam.shake=.2;e.ks.forEach(k=>{syncOne(k);burst(tpos(k).setY(.6),0x8a5aa8,16,2,1)});toast(`${tx('ui.sis_binayi_ele_gecirdi',[e.ks.length])}`)}
 if(e.e==='wreck'&&!$('modal').classList.contains('on')&&!$('battle').classList.contains('on')){const room=L.cap(S)-S.surv;modal(`<div style="font-size:50px">🚢</div><h2>${tx('ui.batik_gemi')}</h2><p>${tx('ui.kiyiya_bir_enkaz_vurdu',[e.n])}${room<e.n?`<br><span style="color:#ff8a8a">${tx('ui.barinaklarda_sadece_yer_var',[Math.max(0,room)])}</span>`:''}</p>`,[[tx('ui.birak'),'x'],[tx('ui.kurtar'),'o',()=>{const k=Math.min(e.n,Math.max(0,room));S.surv+=k;for(let i=0;i<k;i++)setTimeout(()=>sendRaft(false),i*500);toast(`${tx('ui.kurtulan_katildi',[k])}`);ui()}]])}}}
// ---------- BAŞLAT ----------
resize();buildTiles();buildFog();fogR=L.safeR(S);syncAll();syncPeople();ui();
if(!isNew){const o=L.offline(S,now());if(o)setTimeout(()=>returnScreen(o),600)}
paintIsland(S.cur);buildIslDeco(S.cur);syncBeacon();
{const bw=L.bossWeek(S,now());if(bw)setTimeout(()=>modal(`<img src="img/f_kraken.webp" style="width:90px"><h2>${tx('ui.kraken_haftasi_bitti')}</h2><p>${tx('ui.siran_2')} <b>#${bw.rank}</b><br>${tx('ui.odul',[rwStr(bw.rw)])}</p>`,[[tx('ui.harika_2'),'o']]),900)}
{const side=$('side');if(side&&!$('sMute')){const b=document.createElement('button');b.className='sb';b.id='sMute';b.setAttribute('aria-label','mute');b.onclick=e=>{e.stopPropagation();toggleMute()};side.appendChild(b)}muteLbl()}
const sb=$('startBtn');window.__ldp&&window.__ldp(100);{const ld=$('loading'),tp=$('ldTip');setTimeout(()=>ld&&ld.classList.add('ready'),700);if(tp){let ti=Math.floor(Math.random()*6);const sh=()=>{tp.classList.remove('on');setTimeout(()=>{tp.textContent='💡 '+tx(['ui.ltip0','ui.ltip1','ui.ltip2','ui.ltip3','ui.ltip4','ui.ltip5'][ti++%6]);tp.classList.add('on')},350)};sh();const iv=setInterval(()=>{if(!$('ldTip'))clearInterval(iv);else sh()},5000)}}
sb.disabled=false;sb.textContent='▶ '+tx('ui.play');sb.onclick=()=>{ac();if(S.set.mus)startMusic();setVol();{const ld=$('loading');sb.onclick=null;ld.classList.add('out');document.body.classList.add('fadeIn');setTimeout(()=>ld.remove(),620)}
 if(isNew){S.seen.ch0=1;setTimeout(()=>talk(L.CHAPTERS[0].say),300)}else if(S.tut>=9&&L.loginReady(S,now()))setTimeout(()=>{if(!retPend)openLogin(1)},1200)};
if(new URLSearchParams(location.search).has('skip'))sb.onclick();
applyQ();requestAnimationFrame(frame);setInterval(save,5000);addEventListener('visibilitychange',()=>document.hidden&&save());
// ---------- FENER TAKVİMİ (haftalık tema günleri, günlük 3 sandık) ----------
const EVA={merge:'🔀',upgrade:'🔨',build:'🏗️',train:'⚓',collect:'✋',recruit:'🧑‍✈️',heroup:'⬆️',research:'🔬',battle:'⛵',raid:'🏴‍☠️',arena:'🏟️',boss:'🦑'},EVI=['🎁','🧰','👑'];
const evDayN=i=>{try{return new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(Date.UTC(2026,9,26+i)))}catch(e){return ''+(i+1)}};
// Canlı bonuslar (Fener Takvimi içinde): Kraken hafta sonu, çift konvoy günü, sis gecesi — İstanbul saati
const BNN={kraken:['ui.bn_kraken','ui.bn_kraken_d'],convoy:['ui.bn_convoy','ui.bn_convoy_d'],fog:['ui.bn_fog','ui.bn_fog_d']};
const istF=o=>new Intl.DateTimeFormat(locale,{timeZone:'Europe/Istanbul',...o});
function bonusHtml(){const t=Date.now(),sc=L.bonusSched(t,7),seen=new Set();let h=`<div class="nm" style="margin:12px 2px 2px">⚡ ${tx('ui.bn_t')}</div><div class="sub" style="margin:0 2px 6px">🕒 ${tx('ui.bn_tz')}</div>`;
 const left=ms=>{const m=Math.max(0,Math.round(ms/6e4));return m>=60?tx('ui.bn_left_hm',[Math.floor(m/60),m%60]):tx('ui.bn_left_m',[m])};
 const tm=(x)=>x.end-x.start>=864e5?istF({weekday:'short',hour:'2-digit',minute:'2-digit'}).format(x.start)+' – '+istF({weekday:'short',hour:'2-digit',minute:'2-digit'}).format(x.end):istF({weekday:'short',day:'numeric',month:'short'}).format(x.start)+' · '+istF({hour:'2-digit',minute:'2-digit'}).format(x.start)+'–'+istF({hour:'2-digit',minute:'2-digit'}).format(x.end);
 for(const x of sc){if(seen.has(x.id))continue;seen.add(x.id);const live=x.start<=t;
  h+=`<div class="card"${live?' style="background:linear-gradient(135deg,#1f6f8b,#3a1c40);border-color:#ffd84a"':''}><div class="ic" style="font-size:28px">${x.ic}</div><div class="mid"><div class="nm">${tx(BNN[x.id][0])} ${live?`<span class="tag">${tx('ui.bn_live')}</span>`:''}</div><div class="sub">${tx(BNN[x.id][1])}</div><div class="sub">${live?'⏳ '+left(x.end-t):'📅 '+tm(x)}</div></div></div>`}
 return h}
window.__bonusOn=()=>L.bonusOn();
function openEvent(){sheet(()=>{const t=now();L.evReset(S,t);const di=L.evDow(t),D=L.EVDAYS[di],p=S.ev.p,top=L.EVCH[L.EVCH.length-1].n,left=(Math.floor((t+108e5)/864e5)+1)*864e5-108e5-t;
 let h=hdr('🗓️ '+tx('ui.ev_t'))+`<div class="card evHero"><div class="evIc">${D.ic}</div><div class="mid"><div class="sub">${tx('ui.ev_today')}</div><div class="nm" style="font-size:18px">${tx('ui.ev_d_'+D.id)}</div><div class="sub">⏳ ${tx('ui.ev_left',[fmtT(left/1000)])}</div></div></div>`;
 h+=`<div class="evBar"><div class="pbar"><i style="width:${Math.min(100,p/top*100)}%"></i></div>${L.EVCH.map((c,i)=>`<span class="evMk${S.ev.c.includes(i)?' done':p>=c.n?' rdy':''}" style="left:${c.n/top*100}%">${S.ev.c.includes(i)?'✅':EVI[i]}</span>`).join('')}</div><div class="sub" style="text-align:center;margin:4px 0 8px">⭐ ${fmt(p)} / ${fmt(top)}</div>`;
 L.EVCH.forEach((c,i)=>{const dn=S.ev.c.includes(i),ok=p>=c.n;h+=`<div class="card"${dn?' style="opacity:.6"':''}><div class="ic">${dn?'✅':EVI[i]}</div><div class="mid"><div class="nm">${tx('ui.ev_chest',[i+1])} · ⭐${fmt(c.n)}</div><div class="sub">${rwStr(c.r)}</div>${dn?'':`<div class="pbar"><i style="width:${Math.min(100,p/c.n*100)}%"></i></div>`}</div>${!dn&&ok?`<button class="btn o" data-a="evc" data-v="${i}">${tx('ui.al')}</button>`:''}</div>`});
 h+=`<div class="nm" style="margin:10px 2px 6px">${tx('ui.ev_how')}</div><div class="evAct">${Object.entries(D.w).map(([k,v])=>`<span>${EVA[k]} ${tx('ui.eva_'+k)} <b>+${v}</b></span>`).join('')}</div>`;
 const go={capt:'heroes',sea:'map',kraken:'boss'}[D.id];if(go)h+=`<button class="btn o" style="width:100%;margin-top:8px" data-a="evgo" data-v="${go}">${tx('ui.quest_go')}</button>`;
 h+=bonusHtml();
 h+=`<div class="nm" style="margin:12px 2px 6px">${tx('ui.ev_week')}</div><div class="evWeek">${L.EVDAYS.map((d,i)=>`<div class="${i===di?'on':i<di?'past':''}"><small>${evDayN(i)}</small><b>${d.ic}</b><small>${tx('ui.ev_d_'+d.id)}</small></div>`).join('')}</div><div class="sub" style="margin-top:8px">${tx('ui.ev_note')}</div>`;
 return h})}
ACT.evc=v=>{const i=+v,r=L.EVCH[i]&&L.EVCH[i].r;if(resErr(L.claimEv(S,i,now())))return;SFX.claim();vib([20,30,40]);closeSheet();reward(tx('ui.ev_chest',[i+1]),r,{icon:EVI[i],sub:L.EVDAYS[L.evDow(now())].ic+' '+tx('ui.ev_d_'+L.EVDAYS[L.evDow(now())].id),cb:()=>{ui();setTimeout(openEvent,350)}});ui();save()};
ACT.evgo=v=>{closeSheet();({heroes:openHeroes,map:openMap,boss:openBoss})[v]()};
{const side=$('side');if(side&&!$('sEv')){const b=document.createElement('button');b.className='sb';b.id='sEv';b.innerHTML=`🗓️<small>${tx('ui.ev_side')}</small><i class="dot" id="edot"></i>`;b.onclick=e=>{e.stopPropagation();ac();openEvent()};side.insertBefore(b,$('sBoss'))}}
let evLast=null,evDay='';function evTick(){const b=$('sEv');if(!b)return;const t=now();L.evReset(S,t);const p=S.ev.p,rd=L.evReady(S,t)>=0;$('edot').style.display=S.tut>=9&&rd?'block':'none';b.classList.toggle('hot',S.tut>=9&&rd);
 const di=L.EVDAYS[L.evDow(t)];if(b.dataset.ic!==di.ic){b.dataset.ic=di.ic;b.firstChild.textContent=di.ic}
 if(evLast!==null&&evDay===S.ev.d&&p>evLast&&S.tut>=9){const r=b.getBoundingClientRect();floatTxt(r.left-18,r.top+r.height/2,`+${p-evLast}⭐`,'#ffd27a');popEl(b);if(L.EVCH.some(c=>evLast<c.n&&p>=c.n)){SFX.coin();toast(`${di.ic} ${tx('ui.ev_ready')}`)}}evLast=p;evDay=S.ev.d}
function popEl(el){el.animate&&el.animate([{transform:'scale(1)'},{transform:'scale(1.22)'},{transform:'scale(1)'}],{duration:380,easing:'ease-out'})}
// ---------- boşta birleştirme ipucu: 12 sn hareketsizlikte birleşebilen çifti göster ----------
const mHint=(()=>{const mk=()=>{const m=new THREE.Mesh(new THREE.RingGeometry(.5,.74,36).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x3dff6a,transparent:true,opacity:0,depthWrite:false}));m.visible=false;m.renderOrder=2;scene.add(m);return m};
 const R=[mk(),mk()],hd=document.createElement('div');hd.className='mhand';hd.innerHTML=`👆<small>${tx('ui.hint_merge')}</small>`;document.body.appendChild(hd);let lastAct=performance.now(),pair=null,shown=0;
 const off=()=>{lastAct=performance.now();if(!pair)return;pair=null;R.forEach(m=>m.visible=false);hd.classList.remove('on')};addEventListener('pointerdown',off,true);
 const busy=()=>S.tut<9||drag||document.hidden||['sheet','modal','battle','talk'].some(id=>$(id)&&$(id).classList.contains('on'));
 const find=()=>{const ks=Object.keys(S.g).filter(k=>!S.g[k].end&&!S.g[k].fog).sort((a,b)=>S.g[a].lv-S.g[b].lv);for(let i=0;i<ks.length;i++)for(let j=i+1;j<ks.length;j++)if(L.canMerge(S,ks[i],ks[j]))return[ks[i],ks[j]];return null};
 const anim=()=>{if(!pair)return;if(busy()||!S.g[pair[0]]||!S.g[pair[1]]){off();return}const T=performance.now()/1000;R.forEach((m,i)=>{const pp=tpos(pair[i]);m.position.set(pp.x,.09,pp.z);m.visible=true;const k=(T*1.2+i*.5)%1;m.scale.setScalar(.85+k*.55);m.material.opacity=.95*(1-k)});
  const a=tileScr(pair[0],.4),b=tileScr(pair[1],.4),k=(T*.6)%1,e=k<.15?0:k>.75?1:(k-.15)/.6,ee=e<.5?2*e*e:1-Math.pow(-2*e+2,2)/2;hd.style.transform=`translate(${a.x+(b.x-a.x)*ee}px,${a.y+(b.y-a.y)*ee}px)`;hd.style.opacity=k>.88?(1-k)/.12:k<.06?k/.06:1;requestAnimationFrame(anim)};
 setInterval(()=>{if(pair||shown>=5||busy()||performance.now()-lastAct<12000)return;const p=find();if(!p)return;pair=p;shown++;hd.classList.add('on');requestAnimationFrame(anim)},1500);
 return{off,get pair(){return pair},force:()=>{lastAct=-1e9}}})();
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
  const th=beam.rotation.y;spots.forEach((m,i)=>{const s=i?-1:1;m.visible=on;m.position.set(Math.cos(th)*9.5*s,.02,-Math.sin(th)*9.5*s);sm.opacity=.07+vN*.15+Math.sin(T*4)*.03})}})();
window.__g={get S(){return S},toast,openEvent,mHint,ushArena:()=>{if(!L.ushArena(S,Date.now())){toast('+1 ✨ '+tx('ui.ush_arena'));ui();save()}},sheet,modal,toast,hdr,closeSheet,renderSheet,fmt,fmtT,rwStr,SFX,KEY,L,save,syncAll,syncPeople,ui,battle,openB,openFener,openShop,openHeroes,openWork,openMap,tileScr,scr:v=>scr(new THREE.Vector3(...v)),cam,sendRaft,goIsland,openPass,openBoss,openLogin,openSettings,openClan,openIslands,openHero,openTasks,talk,bossFight,levelUp,reward,get FIT(){return FIT}};

// çevrimiçi katman (Supabase) — yüklenemezse oyun çevrimdışı devam eder
// PWA: servis çalışanı + ana ekrana ekle
let instEv=null;const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
function instBtn(){if(standalone||localStorage.getItem('sf_instNo')==='1')return;let b=$('sInst');if(!b){b=document.createElement('button');b.className='sb';b.id='sInst';b.style.cssText='position:fixed;left:6px;top:calc(env(safe-area-inset-top) + 202px);z-index:6';document.body.appendChild(b);b.onclick=()=>{if(instEv){instEv.prompt();instEv.userChoice.then(c=>{if(c.outcome==='accepted')b.remove();instEv=null})}else modal(`<div style="font-size:48px">📲</div><h2>${tx('ui.inst_t')}</h2><p>${tx('ui.inst_ios')}</p>`,[[tx('ui.tamam'),'o',()=>{}],[tx('ui.inst_no'),'',()=>{localStorage.setItem('sf_instNo','1');b.remove()}]])}}b.innerHTML=`📲<small>${tx('ui.inst')}</small>`}
addEventListener('beforeinstallprompt',e=>{e.preventDefault();instEv=e;instBtn()});addEventListener('appinstalled',()=>$('sInst')?.remove());
if(isIOS&&!standalone)setTimeout(instBtn,1500);
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){navigator.serviceWorker?.register('sw.js',{updateViaCache:'none'}).then(r=>{r.update?.();setInterval(()=>r.update().catch(()=>{}),30*60e3)}).catch(e=>console.warn('sw',e));let had=!!navigator.serviceWorker?.controller;navigator.serviceWorker?.addEventListener('controllerchange',()=>{if(had)toast('🔄 '+tx('ui.updated'));had=true})}
import('./online.js').then(m=>m.start(window.__g)).catch(e=>console.warn('çevrimdışı mod',e));
