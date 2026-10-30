import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../lib/three.module.js';
import { addBuildingEvolution, BUILDING_EVOLUTION } from './building-evolution.js';
import { BUILDINGS } from './rules.js';

// A CPU geometry adapter exercises all architectural additions without a WebGL context.
const geometries = {
  box: new THREE.BoxGeometry(1,1,1), cylinder: new THREE.CylinderGeometry(.5,.5,1,24),
  cone: new THREE.ConeGeometry(.5,1,12), roof: new THREE.ConeGeometry(.5,1,4).translate(0,.5,0),
  ring: new THREE.TorusGeometry(.5,.035,5,48), crystal: new THREE.OctahedronGeometry(.5),
};
const mat = new THREE.MeshBasicMaterial();
function part(group,type,color,size,position,rotation=0) {
  assert.ok(geometries[type], `Unknown primitive ${type}`);
  assert.ok([...size,...position,rotation].every(Number.isFinite));
  assert.ok(size.every(value=>value>0));
  const mesh=new THREE.Mesh(geometries[type],mat); mesh.scale.set(...size); mesh.position.set(...position); mesh.rotation.y=rotation; group.add(mesh); return mesh;
}
const box=(g,c,s,p)=>part(g,'box',c,s,p);
const kit={ part,box,palette:{wood:'wood',edge:'edge',gold:'gold',plaster:'plaster',roof:'roof',stone:'stone',dark:'dark',cyan:'cyan',ember:'ember'},
  house(g,x,z,w,h,d) { box(g,'stone',[w,h,d],[x,h/2,z]); part(g,'roof','roof',[w,.65,d],[x,h,z]); },
  tower(g,x,z,h,r) { part(g,'cylinder','stone',[r,h,r],[x,h/2,z]); part(g,'cone','roof',[r*1.45,.7,r*1.45],[x,h+.3,z]); },
};
for (const building of BUILDINGS) test(`${building.id}: all 7 upgrades add distinct bounded architecture`,()=>{
  assert.equal(BUILDING_EVOLUTION[building.id].length, building.maxLevel);
  assert.equal(new Set(BUILDING_EVOLUTION[building.id]).size, building.maxLevel);
  let previousVertices=0;
  for(let level=1;level<=building.maxLevel;level++) {
    const group=new THREE.Group(); addBuildingEvolution(group,building.id,level,kit);
    assert.equal(group.children.length,level-1);
    let vertices=0; group.traverse(o=>{if(o.isMesh) vertices+=o.geometry.attributes.position.count;});
    if(level>1) {
      assert.ok(vertices>previousVertices, `Level ${level} must add visible geometry`);
      const bounds=new THREE.Box3().setFromObject(group), size=bounds.getSize(new THREE.Vector3());
      assert.ok(size.x<5 && size.z<5 && size.y<6.5, 'Additions stay within the building plot');
      assert.ok(bounds.min.y>=-.15, 'Structure is above the ground');
    }
    previousVertices=vertices;
  }
});
