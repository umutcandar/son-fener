import * as THREE from '../lib/three.module.js';
import { CITY_PLOTS, CITY_NODES, CITY_LINKS } from './city-layout.js';

// Original, terraced Starfort city. All meshes share the scene's geometry/material pool.
export function buildCityEnvironment(group, {part,box,house,tower,torch,palette:p,animations,hash}) {
  const local=(x,y,z)=>{const g=new THREE.Group();g.position.set(x,y,z);group.add(g);return g;};
  const tree=(g,x,y,z,h=1.6)=>{
    part(g,'cylinder',p.wood,[.12,h*.65,.12],[x,y+h*.3,z]);
    for(let j=0;j<3;j++) part(g,'cone',['#3e5b43','#527451','#69815b'][j],[h*(.52-j*.11),h*.6,h*(.52-j*.11)],[x,y+h*(.47+j*.21),z]);
  };
  const hedge=(g,x,z,w,d,y)=>{
    box(g,p.edge,[w+.12,.17,d+.12],[x,y+.08,z]);
    box(g,'#536e48',[w,.28,d],[x,y+.26,z]);
  };
  const railing=(g,x,y,z,length,rotation=0)=>{
    const rail=new THREE.Group();rail.position.set(x,y,z);rail.rotation.y=rotation;g.add(rail);
    box(rail,p.stone,[length,.23,.22],[0,.12,0]);
    box(rail,p.edge,[length,.1,.28],[0,.52,0]);
    const count=Math.max(1,Math.round(length/.5));
    for(let i=0;i<=count;i++)box(rail,p.edge,[.13,.42,.16],[-length/2+i*length/count,.32,0]);
  };

  // A river wraps around a rocky promontory instead of a circular display pedestal.
  box(group,'#4c8e9c',[150,.2,150],[0,-2.2,0]);
  part(group,'rock','#6c8175',[27,4,25],[0,-2.3,1.1],.16);
  part(group,'cylinder','#698362',[27.6,.38,25.6],[0,-.15,1.1]);
  for(let i=0;i<54;i++){
    const a=i/54*Math.PI*2, r=12.1+hash(i+10)*1.4;
    part(group,'rock',['#697d78','#83918a','#5c7374'][i%3],[1.5+hash(i)*1.5,2+hash(i+1)*2,1.9],[Math.cos(a)*r,-1.15,1.1+Math.sin(a)*r*.89],a);
    if(i%2===0 && !(Math.sin(a)>.8&&Math.abs(Math.cos(a))<.24))tree(group,Math.cos(a)*(r-.65),0,1.1+Math.sin(a)*(r-.65)*.89,1.3+hash(i+14)*1.2);
  }
  // Distant layered ridges, brighter at the horizon, with snow caps.
  for(let row=0;row<2;row++)for(let i=0;i<15;i++){
    const h=6+hash(i+row*40)*13, x=-42+i*6, z=-28-row*14-hash(i+90)*5;
    part(group,'rock',row?'#92aeb7':'#688894',[10,h,9],[x,h*.22-2,z],i*.8);
    part(group,'cone',row?'#d6e0db':'#bccdc9',[3,h*.18,3],[x,h*.64-2,z],i*.8);
  }

  for(const [id,plot] of Object.entries(CITY_PLOTS)){
    const {x,y,z,width:w,depth:d}=plot;
    box(group,p.dark,[w,y+.55,d],[x,(y-.55)/2,z]);
    box(group,p.stone,[w+.1,.18,d+.1],[x,y-.12,z]);
    box(group,p.edge,[w+.2,.13,d+.2],[x,y-.02,z]);
    // Stone seams and inset planting make each district read as a built place.
    for(let ix=-Math.floor(w/1.05)/2;ix<Math.floor(w/1.05)/2;ix++)for(let iz=-Math.floor(d/1.05)/2;iz<Math.floor(d/1.05)/2;iz++){
      box(group,(Math.round(ix+iz)*2)%3?'#bbbda9':'#c5c5b2',[1.01,.025,1.01],[x+(ix+.5)*1.05,y+.06,z+(iz+.5)*1.05]);
    }
    // Repeated buttresses articulate the retaining wall without covering entrances.
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
        tower(g,side*3,-2.4,2.25,.72);
        box(g,'#6f8560',[1.1,.06,1.7],[side*2.7,.1,.55]);
        for(let n=0;n<4;n++)part(g,'foliage','#9d778e',[.2,.2,.2],[side*2.7+(n%2)*.35-.15,.23,.15+Math.floor(n/2)*.45]);
        torch(g,side*1.3,.1,2.6,animations);
      }
    }
    if(id==='observatory'){
      for(const sign of [-1,1]){
        part(group,'cylinder',p.stone,[.38,1.1,.38],[x+sign*1.9,y+.55,z+1.4]);
        part(group,'crystal',p.cyan,[.3,.6,.3],[x+sign*1.9,y+1.35,z+1.4],0,.35);
      }
    }
  }

  for(const [from,to,w] of CITY_LINKS){
    const a=CITY_NODES[from],b=CITY_NODES[to],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),angle=Math.atan2(dx,dz);
    const steps=Math.ceil(length/(Math.abs(b[1]-a[1])>.15?.22:.65));
    for(let i=0;i<steps;i++){
      const f=(i+.5)/steps,y=a[1]+(b[1]-a[1])*f;
      box(group,i%2?p.edge:'#b9beae',[w,.14,length/steps+.025],[a[0]+dx*f,y+.09,a[2]+dz*f],angle);
      if(Math.abs(b[1]-a[1])>.15)for(const side of [-1,1]){
        box(group,p.stone,[.15,.3,length/steps+.025],[a[0]+dx*f+Math.cos(angle)*w*.53*side,y+.23,a[2]+dz*f-Math.sin(angle)*w*.53*side],angle);
      }
    }
  }

  // Front square: fountain, market awnings and small homes give the city human scale.
  part(group,'cylinder',p.edge,[3.4,.18,3.4],[0,.31,7.6]);
  part(group,'cylinder',p.dark,[1.55,.28,1.55],[0,.5,7.6]);
  part(group,'cylinder','#74b8be',[1.34,.04,1.34],[0,.65,7.6]);
  part(group,'cylinder',p.edge,[.4,.7,.4],[0,.96,7.6]);
  part(group,'crystal',p.cyan,[.38,.7,.38],[0,1.6,7.6],0,.3);
  for(const x of [-1.7,1.7]){
    torch(group,x,.3,8.8,animations);
    const g=local(x,.25,9.9);house(g,0,0,.85,.62,.75,x<0?'#8d5c48':'#617b86');
  }
  for(const side of [-1,1]){
    const g=local(side*9.5,.05,5.5);house(g,0,0,1.0,.72,.95,side<0?'#966b50':'#747b88');
    house(g,.2,1.65,.85,.55,.75,'#9e765a');
    for(let i=0;i<2;i++){
      const stall=local(side*2,.25,5.9+i*.8);
      box(stall,p.wood,[.7,.58,.4],[0,.29,0]);
      for(const x of [-.4,.4])box(stall,p.wood,[.04,1.0,.04],[x,.5,-.2]);
      part(stall,'roof',side<0?'#9e5f57':'#618c91',[.95,.18,.7],[0,.95,0]);
    }
  }
  // A short defensive wall follows the lower terrace; the gate stays open.
  for(const side of [-1,1]){
    box(group,p.stone,[8.4,.9,.45],[side*5.65,.48,10.3]);
    box(group,p.edge,[8.5,.15,.55],[side*5.65,.97,10.3]);
    for(let i=0;i<15;i++)box(group,p.edge,[.28,.28,.55],[side*(1.6+i*.56),1.16,10.3]);
    const g=local(side*1.35,.15,10.4);tower(g,0,0,2.05,.9);
    torch(group,side*1.05,.15,11,animations);
  }
  box(group,p.edge,[2.0,.32,.65],[0,1.85,10.4]);
  box(group,p.gold,[2.1,.07,.7],[0,2.04,10.4]);
  box(group,p.stone,[2.2,.35,5],[0,-.05,12]);
  for(const side of [-1,1])railing(group,side*1.1,.1,12,4,Math.PI/2);
  // Waterfall on the western cliff: translucent colour is unnecessary for clean mobile rendering.
  for(let i=0;i<5;i++)box(group,i%2?'#99d1d0':'#b5ddda',[.14,2.3,.16],[-11.5+i*.19,-1,-1.3]);
  for(let i=0;i<4;i++){
    const ring=part(group,'ring','#b7d8d4',[1+i*.6,1+i*.6,1+i*.6],[-11.2,-2.07,-1.2]);ring.rotation.x=-Math.PI/2;
  }
}
