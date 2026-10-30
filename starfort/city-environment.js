import * as THREE from '../lib/three.module.js';
import { CITY_PLOTS, CITY_NODES, CITY_LINKS } from './city-layout.js';

// Walled citadel on rocky ground. Plots, paths and building anchors stay put;
// only the land around them changes. Meshes share the scene material pool.
export function buildCityEnvironment(group, {part,box,house,tower,torch,palette:p,animations,hash}) {
  const local=(x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);group.add(g);return g;};
  const tree=(g,x,y,z,h=1.6)=>{
    part(g,'cylinder',p.wood,[.12,h*.65,.12],[x,y+h*.3,z]);
    for(let j=0;j<3;j++) part(g,'cone',['#1f6b32','#2f8a3c','#49a84a'][j],[h*(.52-j*.11),h*.58,h*(.52-j*.11)],[x,y+h*(.48+j*.2),z]);
  };
  const hedge=(g,x,z,w,d,y)=>{
    box(g,p.edge,[w+.12,.17,d+.12],[x,y+.08,z]);
    box(g,'#237a34',[w,.28,d],[x,y+.26,z]);
  };
  const railing=(g,x,y,z,length,rotation=0)=>{
    const rail=new THREE.Group();rail.position.set(x,y,z);rail.rotation.y=rotation;g.add(rail);
    box(rail,p.stone,[length,.23,.22],[0,.12,0]);
    box(rail,p.edge,[length,.1,.28],[0,.52,0]);
    const count=Math.max(1,Math.round(length/.5));
    for(let i=0;i<=count;i++)box(rail,p.edge,[.13,.42,.16],[-length/2+i*length/count,.32,0]);
  };
  const slab=(x,z,w,d,y,h,color)=>box(group,color,[w,h,d],[x,y,z]);

  // Curtain sits outside every plot. The south gap is the only gate.
  const xL=-14.4,xR=14.4,zN=-13.2,zS=15.4,wallT=1.22,moatW=5.4;
  const faceW=xL-wallT/2,faceE=xR+wallT/2,faceN=zN-wallT/2,faceS=zS+wallT/2;
  const moatW0=faceW-moatW,moatE0=faceE+moatW,moatN0=faceN-moatW,moatS0=faceS+moatW;
  const landH=.62,landY=-landH/2,waterH=.46,waterY=-.55;

  // Fields around the moat, cobbled yard under the walls. No disc, no void.
  slab((-82+moatW0)/2,0,82+moatW0,168,landY,landH,p.grass);
  slab((82+moatE0)/2,0,82-moatE0,168,landY,landH,'#2f8a3c');
  slab(0,(-82+moatN0)/2,moatE0-moatW0,82+moatN0,landY,landH,'#1f6b32');
  slab(0,(82+moatS0)/2,moatE0-moatW0,82-moatS0,landY,landH,'#49a84a');
  slab(0,(faceN+faceS)/2,faceE-faceW,faceS-faceN,-.08,.5,'#9a8468');
  const westMoatX=(faceW+moatW0)/2,eastMoatX=(faceE+moatE0)/2;
  slab(westMoatX,0,moatW,moatS0-moatN0,waterY,waterH,p.water);
  slab(eastMoatX,0,moatW,moatS0-moatN0,waterY,waterH,p.water);
  slab(0,(faceN+moatN0)/2,faceE-faceW,moatW,waterY,waterH,p.water);
  // South moat breaks for the bridge.
  slab((-1.85+moatW0)/2,(faceS+moatS0)/2,-1.85-moatW0,moatW,waterY,waterH,p.water);
  slab((1.85+moatE0)/2,(faceS+moatS0)/2,moatE0-1.85,moatW,waterY,waterH,p.water);
  // Stone banks make the water read as a moat from the high camera, not a shadow.
  box(group,p.stone,[faceE-faceW,.7,.55],[0,.28,faceN-.28]);
  box(group,p.stone,[-2.4-faceW,.7,.55],[(faceW-2.4)/2,.28,faceS+.28]);
  box(group,p.stone,[faceE-2.4,.7,.55],[(faceE+2.4)/2,.28,faceS+.28]);
  box(group,p.stone,[.55,.7,faceS-faceN],[faceW-.28,.28,(faceN+faceS)/2]);
  box(group,p.stone,[.55,.7,faceS-faceN],[faceE+.28,.28,(faceN+faceS)/2]);
  box(group,p.edge,[faceE-faceW+1.2,.1,.28],[0,.62,moatN0+.2]);
  box(group,p.edge,[-2.2-moatW0,.1,.28],[(moatW0-2.2)/2,.62,moatS0-.2]);
  box(group,p.edge,[moatE0-2.2,.1,.28],[(moatE0+2.2)/2,.62,moatS0-.2]);
  box(group,p.edge,[.28,.1,moatS0-moatN0],[moatW0+.2,.62,0]);
  box(group,p.edge,[.28,.1,moatS0-moatN0],[moatE0-.2,.62,0]);

  for(let i=0;i<7;i++){
    const x=(hash(i+80)-.5)*62, z=(hash(i+81)-.5)*62;
    if(Math.abs(x)<22&&Math.abs(z-1)<22) continue;
    slab(x,z,3.2+hash(i+82)*5.5,2.4+hash(i+83)*4,.07,.1,i%2?'#1f6b32':'#49a84a');
  }

  function runWall(x,z,length,alongX,outward){
    if(length<0.5) return;
    const h=2.46,t=wallT;
    if(alongX){
      box(group,p.dark,[length,.72,t+.5],[x,.12,z]);
      box(group,p.stone,[length,h,t],[x,h/2,z]);
      box(group,p.edge,[length,.14,t+.16],[x,h+.02,z]);
    }else{
      box(group,p.dark,[t+.5,.72,length],[x,.12,z]);
      box(group,p.stone,[t,h,length],[x,h/2,z]);
      box(group,p.edge,[t+.16,.14,length],[x,h+.02,z]);
    }
    const step=.92,n=Math.floor(length/step),span=n*step;
    for(let i=0;i<n;i+=2){
      if(hash(i*17+x*9+z*3)<.16) continue;
      const tOff=-span/2+step*.5+i*step;
      const mh=.26+hash(i*3+x+z*2)*.22;
      if(alongX) box(group,p.edge,[.4,mh,t*.8],[x+tOff,h+.12+mh/2,z]);
      else box(group,p.edge,[t*.8,mh,.4],[x,h+.12+mh/2,z+tOff]);
    }
    const bStep=2.2,bn=Math.floor(length/bStep);
    for(let i=0;i<bn;i++){
      if(hash(i*29+z*5+x)<.2) continue;
      const tOff=-length/2+bStep*.5+i*bStep, jut=.28+hash(i+4)*.14;
      if(alongX) box(group,p.dark,[.32,1.5,jut],[x+tOff,.76,z+outward*(t/2+jut/2-.02)]);
      else box(group,p.dark,[jut,1.5,.32],[x+outward*(t/2+jut/2-.02),.76,z+tOff]);
    }
  }
  function spanWall(a,b,fixed,alongX,outward){
    const length=Math.abs(b-a), mid=(a+b)/2;
    if(alongX) runWall(mid,fixed,length,true,outward);
    else runWall(fixed,mid,length,false,outward);
  }
  const tuck=.95, gateOuter=3.62;
  spanWall(xL+tuck,xR-tuck,zN,true,-1);
  spanWall(zN+tuck,zS-tuck,xL,false,-1);
  spanWall(zN+tuck,zS-tuck,xR,false,1);
  spanWall(xL+tuck,-gateOuter,zS,true,1);
  spanWall(gateOuter,xR-tuck,zS,true,1);

  const turret=(x,z,h,r)=>{
    const g=local(x,0,z);
    box(g,p.dark,[r*2.4,.42,r*2.4],[0,.16,0]);
    tower(g,0,0,h,r);
  };
  // Corner towers differ on purpose; the gatehouse is the tall accent.
  turret(xL,zN,4.05,1.12);
  turret(xR,zN,3.7,1.0);
  turret(xL,zS,3.85,1.06);
  turret(xR,zS,4.15,1.16);
  turret(xL,.15,3.2,.88);
  turret(xR,2.55,3.35,.94);
  turret(-2.72,zS+.15,4.5,1.08);
  turret(2.78,zS+.02,4.12,.98);
  box(group,p.stone,[3.7,.82,1.4],[0,3.02,zS]);
  box(group,p.edge,[4.0,.16,1.55],[0,3.48,zS]);
  for(let i=-1;i<=1;i+=2) box(group,p.edge,[.38,.32,1.15],[i*.85,3.7,zS]);
  box(group,p.wood,[.72,1.85,.1],[-.48,.96,zS+.2]);
  box(group,'#3a2c24',[.68,1.85,.1],[.62,.96,zS-.08]);
  for(let i=-2;i<=2;i++) box(group,'#241e1a',[.055,1.55,.055],[i*.26,1.05,zS+.48]);
  part(group,'box',p.ember,[.42,.14,.06],[0,3.12,zS+.7],0,.35);
  box(group,'#8e2f36',[.56,1.22,.06],[-2.72,2.35,zS+1.48]);
  box(group,'#7a2830',[.48,.96,.06],[3.15,2.05,zS+1.28]);
  part(group,'crystal',p.gold,[.16,.24,.05],[-2.72,2.72,zS+1.54]);
  torch(group,-1.45,.05,zS+1.55,animations);
  torch(group,1.7,.05,zS+1.4,animations);
  const bridgeZ=faceS+moatW/2;
  box(group,p.dark,[2.7,.22,moatW+.9],[0,.02,bridgeZ]);
  for(let i=-2;i<=2;i++) box(group,i%2?p.wood:'#7d5640',[.4,.07,moatW+.5],[i*.46,.2,bridgeZ]);
  for(const side of [-1,1]) box(group,p.edge,[.16,.4,moatW+.4],[side*1.2,.38,bridgeZ]);
  box(group,'#675e54',[3.1,.08,12],[.35,.08,moatS0+6.2]);
  part(group,'rock','#6a635a',[1.7,1.05,1.35],[faceE+moatW+2.4,.45,3.6],.5);
  box(group,'#b08948',[.7,.4,.55],[8.4,.28,moatS0+3.1]);
  box(group,p.wood,[.85,.16,.7],[8.4,.08,moatS0+3.1]);
  box(group,'#a67c40',[.9,.5,.6],[-10.2,.32,moatS0+5.4]);

  const hearth=new THREE.PointLight('#ff8a32',8,22,2);
  hearth.position.set(.35,2.5,zS+.6);
  group.add(hearth);

  for(let row=0;row<2;row++)for(let i=0;i<11;i++){
    const h=7+hash(i+row*40)*11, x=-46+i*9+hash(i+2)*3, z=-34-row*15-hash(i+90)*5;
    part(group,'rock',row?'#5d7ea3':'#2c4a72',[11,h,9],[x,h*.26,z],hash(i)*4);
    part(group,'cone','#f4f7fb',[3,h*.15,3],[x,h*.58,z]);
  }
  for(let i=0;i<14;i++){
    const x=-34+i*5.1+hash(i+20)*2, z=-22-hash(i+21)*5;
    tree(group,x,0,z,1.45+hash(i+22)*1.1);
  }
  for(let i=0;i<10;i++){
    const a=hash(i+3)*Math.PI*2, r=24+hash(i+9)*16;
    const x=Math.cos(a)*r, z=Math.sin(a)*r*.8+1;
    if(Math.abs(x)<21&&Math.abs(z-1)<21) continue;
    if(z>faceS&&Math.abs(x)<5) continue;
    part(group,'rock',i%2?'#6d675e':'#8d8478',[1.1+hash(i)*2, .7+hash(i+1)*1.4, 1.2],[x,.35,z],a);
    if(i%2===0) tree(group,x+1.4,0,z+.6,1.2+hash(i+5));
  }

  for(const [id,plot] of Object.entries(CITY_PLOTS)){
    const {x,y,z,width:w,depth:d}=plot;
    box(group,p.dark,[w,y+.55,d],[x,(y-.55)/2,z]);
    box(group,p.stone,[w+.1,.18,d+.1],[x,y-.12,z]);
    box(group,p.edge,[w+.2,.13,d+.2],[x,y-.02,z]);
    for(let ix=-Math.floor(w/1.05)/2;ix<Math.floor(w/1.05)/2;ix++)for(let iz=-Math.floor(d/1.05)/2;iz<Math.floor(d/1.05)/2;iz++){
      box(group,(Math.round(ix+iz)*2)%3?'#c4a57a':'#8d7356',[1.01,.025,1.01],[x+(ix+.5)*1.05,y+.06,z+(iz+.5)*1.05]);
    }
    for(let ix=-w/2+.4;ix<w/2;ix+=1.25){
      box(group,p.stone,[.3,y+.3,.22],[x+ix,(y-.2)/2,z+d/2+.08]);
      if(Math.abs(ix)>1.25)box(group,p.edge,[.38,.18,.35],[x+ix,y+.08,z+d/2+.1]);
    }
    railing(group,x,y,z-d/2,w);
    railing(group,x-w/2,y,z,d,Math.PI/2);
    railing(group,x+w/2,y,z,d,Math.PI/2);
    for(const sign of [-1,1]){
      tree(group,x+sign*(w/2-.65),y+.08,z-d/2+.65,id==='keep'?1.55:1.1);
      hedge(group,x+sign*(w/2-.48),z+.15,.38,1.6,y+.08);
    }
    if(id==='keep'){
      const g=local(x,y,z);
      for(const side of [-1,1]){
        turretOn(g,side*3,-2.4);
        box(g,'#2f8a3c',[1.1,.06,1.7],[side*2.7,.1,.55]);
        for(let n=0;n<4;n++)part(g,'foliage','#8d5a6a',[.2,.2,.2],[side*2.7+(n%2)*.35-.15,.23,.15+Math.floor(n/2)*.45]);
        torch(g,side*1.3,.1,2.6,animations);
      }
    }
    if(id==='observatory'){
      for(const sign of [-1,1]){
        part(group,'cylinder',p.stone,[.38,1.1,.38],[x+sign*1.9,y+.55,z+1.4]);
        part(group,'crystal',p.cyan,[.28,.55,.28],[x+sign*1.9,y+1.3,z+1.4],0,.28);
      }
    }
  }
  function turretOn(g,x,z){tower(g,x,z,2.15,.7);}

  for(const [from,to,w] of CITY_LINKS){
    const a=CITY_NODES[from],b=CITY_NODES[to],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    const steps=Math.ceil(length/(Math.abs(b[1]-a[1])>.15?.22:.65));
    for(let i=0;i<steps;i++){
      const f=(i+.5)/steps,y=a[1]+(b[1]-a[1])*f;
      box(group,i%2?p.edge:'#8a8174',[w,.14,length/steps+.025],[a[0]+dx*f,y+.09,a[2]+dz*f],angle);
      if(Math.abs(b[1]-a[1])>.15)for(const side of [-1,1]){
        box(group,p.stone,[.15,.3,length/steps+.025],[a[0]+dx*f+Math.cos(angle)*w*.53*side,y+.23,a[2]+dz*f-Math.sin(angle)*w*.53*side],angle);
      }
    }
  }

  part(group,'cylinder',p.edge,[3.4,.18,3.4],[0,.31,7.6]);
  part(group,'cylinder',p.dark,[1.55,.28,1.55],[0,.5,7.6]);
  part(group,'cylinder',p.water,[1.34,.05,1.34],[0,.66,7.6]);
  part(group,'cylinder',p.edge,[.4,.7,.4],[0,.96,7.6]);
  part(group,'crystal',p.cyan,[.32,.55,.32],[0,1.55,7.6],0,.22);
  for(const x of [-1.7,1.7]){
    torch(group,x,.3,8.8,animations);
    const g=local(x,.25,9.9);house(g,0,0,.85,.62,.75,x<0?'#7a3a34':'#5c6a74');
  }
  for(const side of [-1,1]){
    const g=local(side*9.5,.05,5.5);house(g,0,0,1.0,.72,.95,side<0?'#7a4038':'#5a534c');
    house(g,.2,1.65,.85,.55,.75,'#6b4a38');
    for(let i=0;i<2;i++){
      const stall=local(side*2,.25,5.9+i*.8);
      box(stall,p.wood,[.7,.58,.4],[0,.29,0]);
      for(const x of [-.4,.4])box(stall,p.wood,[.04,1.0,.04],[x,.5,-.2]);
      part(stall,'roof',side<0?'#8e2f36':'#3c4658',[.95,.18,.7],[0,.95,0]);
    }
  }
  // Inner bailey gate, smaller than the curtain gatehouse.
  for(const side of [-1,1]){
    box(group,p.stone,[8.4,.9,.45],[side*5.65,.48,10.3]);
    box(group,p.edge,[8.5,.15,.55],[side*5.65,.97,10.3]);
    for(let i=0;i<15;i++)box(group,p.edge,[.28,.28,.55],[side*(1.6+i*.56),1.16,10.3]);
    const g=local(side*1.35,.15,10.4);tower(g,0,0,2.05,.9);
    torch(group,side*1.05,.15,11,animations);
  }
  box(group,p.edge,[2.0,.32,.65],[0,1.85,10.4]);
  box(group,p.gold,[2.1,.07,.7],[0,2.04,10.4]);
  box(group,p.stone,[2.35,.26,4.4],[0,.22,12.55]);
  for(const side of [-1,1])railing(group,side*1.15,.22,12.55,4.2,Math.PI/2);
}
