import * as THREE from '../lib/three.module.js';
import { addBuildingEvolution } from './building-evolution.js';
import { CITY_PLOTS, CITY_VIEW, CITY_PALETTE } from './city-layout.js';
import { buildCityEnvironment } from './city-environment.js';

// Rendering owns no game state. All geometry, material and input lifetimes stay here.
export function createScene(canvas, { onSelect = () => {}, onProject = () => {} } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-16, 16, 12, -12, .1, 180);
  const target = new THREE.Vector3(...CITY_VIEW.target), goal = target.clone();
  const offset = new THREE.Vector3(...CITY_VIEW.offset), ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const geometries = new Set(), materials = new Set(), textures = new Set(), geometryCache = new Map(), materialCache = new Map();
  scene.background = paintSky();
  scene.fog = new THREE.Fog('#7d8da0', 72, 168);
  function paintSky() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const gtx = c.getContext('2d');
    const sky = gtx.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#070b14'); sky.addColorStop(.38, '#162234'); sky.addColorStop(.7, '#3e5168'); sky.addColorStop(1, '#7d8da0');
    gtx.fillStyle = sky; gtx.fillRect(0, 0, 1024, 512);
    const dust = gtx.createRadialGradient(150, 168, 8, 170, 190, 200);
    dust.addColorStop(0, 'rgba(196, 122, 64, .22)'); dust.addColorStop(1, 'rgba(196, 122, 64, 0)');
    gtx.fillStyle = dust; gtx.fillRect(0, 40, 420, 280);
    const halo = gtx.createRadialGradient(786, 86, 8, 786, 86, 64);
    halo.addColorStop(0, 'rgba(220, 230, 240, .2)'); halo.addColorStop(1, 'rgba(220, 230, 240, 0)');
    gtx.fillStyle = halo; gtx.fillRect(700, 10, 180, 160);
    gtx.fillStyle = '#e7eef8'; gtx.beginPath(); gtx.arc(786, 86, 20, 0, Math.PI * 2); gtx.fill();
    gtx.fillStyle = '#121a2c'; gtx.beginPath(); gtx.arc(798, 78, 16, 0, Math.PI * 2); gtx.fill();
    gtx.fillStyle = 'rgba(236, 232, 214, .92)';
    for (const [x, y] of [[92, 40], [168, 88], [246, 34], [318, 76], [404, 28], [488, 96], [560, 42], [688, 30], [860, 52], [940, 96], [196, 124], [530, 118]]) gtx.fillRect(x, y, 2, 2);
    gtx.fillStyle = '#f7f3e6'; gtx.fillRect(612, 46, 3, 3);
    gtx.strokeStyle = 'rgba(186, 214, 232, .75)'; gtx.lineWidth = 1.4;
    gtx.beginPath(); gtx.moveTo(628, 38); gtx.lineTo(548, 96); gtx.stroke();
    gtx.fillStyle = 'rgba(214, 224, 232, .12)';
    for (const [x, y, w, h] of [[240, 168, 150, 22], [520, 198, 200, 26], [760, 156, 120, 18]]) { gtx.beginPath(); gtx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); gtx.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; textures.add(tex); return tex;
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const models = new Map(), levels = new Map(), worldAnimations = [];
  const palette = CITY_PALETTE;
  let frameId = 0, disposed = false, width = 1, height = 1, zoom = 1, drag = null, selected = 'keep', lastTime = 0;
  const locations = CITY_PLOTS, projected = new THREE.Vector3();
  const hash = n => { const v = Math.sin(n * 127.1 + 17.7) * 43758.5453; return v - Math.floor(v); };
  // Procedural material detail; shared maps are freed with the scene.
  function surface(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#b7b7b7'; ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) for (let x = 0; x < 256; x += 4) {
      const tone = Math.floor(160 + hash(x * 31 + y * 97) * 65);
      ctx.fillStyle = `rgb(${tone},${tone},${tone})`; ctx.fillRect(x, y, 4, 4);
    }
    ctx.lineWidth = kind === 'roof' ? 2 : 3;
    for (let y = 0; y < 256; y += kind === 'roof' ? 24 : 32) {
      ctx.strokeStyle = '#777'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
      for (let x = (y / 32 % 2) * 32; x < 256; x += 64) {
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 32); ctx.stroke();
      }
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, y + 3); ctx.lineTo(256, y + 3); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(c); texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture); return texture;
  }
  const masonry = surface('stone'), roofTiles = surface('roof');
  const surfaceMaps = new Map([[palette.stone, masonry], [palette.edge, masonry], [palette.dark, masonry], [palette.roof, roofTiles]]);
  function geometry(type) {
    if (geometryCache.has(type)) return geometryCache.get(type);
    const g = ({ box: () => new THREE.BoxGeometry(1, 1, 1), cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 24),
      cone: () => new THREE.ConeGeometry(.5, 1, 12), pyramid: () => new THREE.ConeGeometry(.5, 1, 4).rotateY(Math.PI / 4),
      foliage: () => new THREE.IcosahedronGeometry(.5, 1), rock: () => new THREE.DodecahedronGeometry(.5, 0), crystal: () => new THREE.OctahedronGeometry(.5, 0),
      ring: () => new THREE.TorusGeometry(.5, .035, 5, 48), roof: () => {
        const shape = new THREE.Shape(); shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, 1); shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
      } })[type]();
    geometries.add(g); geometryCache.set(type, g); return g;
  }
  function material(color, glow = 0) {
    const key = `${color}/${glow}`;
    if (!materialCache.has(key)) {
      const map = surfaceMaps.get(color);
      const brass = color === palette.gold, water = color === palette.water;
      const m = new THREE.MeshStandardMaterial({ color, map, bumpMap: map, bumpScale: map ? .08 : 0,
        roughness: water ? .22 : brass ? .42 : glow ? .34 : .9,
        metalness: water ? .58 : brass ? .48 : glow ? .2 : .02,
        emissive: glow ? color : '#000000', emissiveIntensity: glow ? Math.min(glow, .7) : 0, flatShading: true });
      materials.add(m); materialCache.set(key, m);
    }
    return materialCache.get(key);
  }
  function part(group, type, color, size, position, rotation = 0, glow = 0, dynamic = false) {
    const mesh = new THREE.Mesh(geometry(type), material(color, glow));
    mesh.scale.set(...size); mesh.position.set(...position); mesh.rotation.y = rotation;
    mesh.castShadow = !glow; mesh.receiveShadow = !glow; mesh.userData.dynamic = dynamic; group.add(mesh); return mesh;
  }
  const box = (g, color, size, position, rotation = 0) => part(g, 'box', color, size, position, rotation);
  function consolidate(group) {
    group.updateMatrixWorld(true);
    const inverse = group.matrixWorld.clone().invert(), buckets = new Map();
    group.traverse(mesh => {
      if (!mesh.isMesh || mesh.userData.dynamic) return;
      let p = mesh.parent; while (p && p !== group) { if (p.userData.dynamic) return; p = p.parent; }
      const key = `${mesh.material.uuid}/${mesh.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, []); buckets.get(key).push(mesh);
    });
    for (const pieces of buckets.values()) {
      if (pieces.length < 2) continue;
      const copies = pieces.map(m => (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld)));
      const count = copies.reduce((n, g) => n + g.attributes.position.count, 0), positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), uvs = new Float32Array(count * 2);
      let cursor = 0;
      for (const g of copies) { positions.set(g.attributes.position.array, cursor); normals.set(g.attributes.normal.array, cursor); if (g.attributes.uv) uvs.set(g.attributes.uv.array, cursor / 3 * 2); cursor += g.attributes.position.array.length; g.dispose(); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(normals, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2)); g.computeBoundingSphere();
      g.userData.starfortMerged = true; geometries.add(g);
      const merged = new THREE.Mesh(g, pieces[0].material); merged.castShadow = pieces[0].castShadow; merged.receiveShadow = pieces[0].receiveShadow;
      pieces.forEach(m => m.removeFromParent()); group.add(merged);
    }
  }
  const hemisphere = new THREE.HemisphereLight('#9eb6d0', '#2e3428', .85); scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#ffe0bf', 3.15); sun.position.set(-22, 24, 16); sun.castShadow = true;
  const shadowPixels = Math.min(window.innerWidth || 1280, window.innerHeight || 800) < 760 ? 1024 : 1536;
  sun.shadow.mapSize.set(shadowPixels, shadowPixels); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 96 });
  sun.shadow.bias = -.00045; sun.shadow.normalBias = .04; scene.add(sun);
  const rim = new THREE.DirectionalLight('#8fb4d4', .48); rim.position.set(16, 12, -22); scene.add(rim);
  const fill = new THREE.DirectionalLight('#d9c7a4', .38); fill.position.set(8, 14, 28); scene.add(fill);

  function torch(g, x, y, z, animations) {
    box(g, '#393640', [.08, .55, .08], [x, y + .25, z]);
    part(g, 'cylinder', palette.gold, [.17, .09, .17], [x, y + .53, z]);
    const flame = part(g, 'crystal', palette.ember, [.15, .29, .15], [x, y + .7, z], 0, 1.25, true);
    animations.push({ type: 'flame', object: flame, phase: x * 2 + z });
  }
  function windowPane(g, x, y, z, scale = 1, rotation = 0) {
    box(g, palette.dark, [.23 * scale, .36 * scale, .055], [x, y, z], rotation);
    part(g, 'box', palette.ember, [.12 * scale, .24 * scale, .065], [x, y, z], rotation, .65);
  }
  function tower(g, x, z, h, radius = .65) {
    part(g, 'cylinder', palette.dark, [radius * 1.15, .2, radius * 1.15], [x, .1, z]);
    part(g, 'cylinder', palette.stone, [radius, h, radius], [x, h / 2, z]);
    part(g, 'cylinder', palette.edge, [radius * 1.12, .12, radius * 1.12], [x, h - .05, z]);
    part(g, 'cone', palette.roof, [radius * 1.45, .7, radius * 1.45], [x, h + .3, z]);
    part(g, 'crystal', palette.gold, [.1, .22, .1], [x, h + .75, z]);
    windowPane(g, x, h * .58, z + radius * .5, .7);
  }
  function house(g, x, z, w, h, d, roof = palette.roof) {
    box(g, palette.dark, [w + .16, .18, d + .16], [x, .09, z]);
    box(g, palette.plaster, [w, h, d], [x, .18 + h / 2, z]);
    for (const a of [-1, 1]) for (const b of [-1, 1]) box(g, palette.wood, [.075, h + .08, .075], [x + a * w / 2, .18 + h / 2, z + b * d / 2]);
    box(g, palette.wood, [w + .02, .075, d + .02], [x, .18 + h * .52, z]);
    part(g, 'roof', roof, [w + .3, .65, d + .25], [x, .18 + h, z]);
    box(g, palette.gold, [.055, .055, d + .3], [x, h + .84, z]);
    box(g, palette.dark, [.28, .49, .05], [x, .42, z + d / 2 + .025]);
    windowPane(g, x - w * .31, .18 + h * .68, z + d / 2 + .04, .7);
    windowPane(g, x + w * .31, .18 + h * .68, z + d / 2 + .04, .7);
  }
  const environment = new THREE.Group(); scene.add(environment);
  buildCityEnvironment(environment, { part, box, house, tower, torch, palette, animations: worldAnimations, hash });
  consolidate(environment);

  function buildModel(id, level) {
    const g = new THREE.Group(), animations = []; g.userData.id = id; g.userData.animations = animations;
    const tier = Math.min(3, Math.floor((level - 1) / 2));
    if (id === 'keep') {
      part(g, 'cylinder', palette.dark, [3.75, .25, 3.75], [0, .1, 0]);
      box(g, palette.stone, [2.05, 1.8, 1.75], [0, 1.05, 0]);
      box(g, palette.edge, [2.19, .14, 1.88], [0, 1.92, 0]);
      part(g, 'roof', palette.roof, [2.5, 1.1, 2.15], [0, 1.97, 0]);
      box(g, palette.gold, [.08, .08, 2.3], [0, 3.1, 0]);
      for (const x of [-.8, -.4, .4, .8]) {
        box(g, palette.dark, [.12, 1.85, .2], [x, 1.02, .91]);
        windowPane(g, x, 1.5, 1.025, .64);
      }
      for (const x of [-1.18, 1.18]) {
        box(g, '#8e2f36', [.28, .82, .07], [x, 1.35, 1.23]);
        part(g, 'crystal', palette.gold, [.13, .2, .04], [x, 1.4, 1.275]);
      }
      tower(g, 0, -.9, 3.5 + tier * .2, .63);
      for (const x of [-1.1, 1.1]) for (const z of [-.85, .85]) tower(g, x, z, 2.45 + tier * .17, .73);
      box(g, palette.dark, [.62, .9, .1], [0, .65, .93]);
      for (const x of [-.6, .6]) windowPane(g, x, 1.43, .91);
      box(g, palette.gold, [.77, .12, .18], [0, 1.15, .95]);
      for (let i = 0; i < 3; i++) box(g, palette.edge, [1 - i * .1, .1, .25], [0, .06 + i * .08, 1.65 - i * .24]);
      const crystal = part(g, 'crystal', palette.cyan, [.65, 1.13, .65], [0, 3.78 + tier * .1, 0], .3, .8, true);
      animations.push({ type: 'crystal', object: crystal, y: crystal.position.y, phase: 0 });
      const orbit = part(g, 'ring', palette.gold, [1.25, 1.25, 1.25], [0, 3.77, 0], 0, 0, true); orbit.rotation.x = 1.16;
      animations.push({ type: 'orbit', object: orbit });
      torch(g, -.72, .15, 1.4, animations); torch(g, .72, .15, 1.4, animations);
    } else if (id === 'farm') {
      house(g, -.4, -.45, 1.1, .65, .8, '#7f5f3e');
      for (let row = 0; row < 4; row++) {
        box(g, '#65513d', [1.65, .075, .2], [.15, .08, .22 + row * .24]);
        for (let n = 0; n < 7; n++) part(g, 'cone', '#c0ad63', [.1, .24, .1], [-.58 + n * .24, .21, .22 + row * .24]);
      }
      box(g, palette.wood, [.12, 1.6, .12], [1, .8, -.5]);
      const sails = new THREE.Group(); sails.position.set(1, 1.35, -.32); sails.userData.dynamic = true; g.add(sails);
      for (let i = 0; i < 4; i++) { const b = box(sails, '#c9bfa6', [.13, .65, .045], [0, .34, 0]); b.rotation.z = i * Math.PI / 2; b.position.set(-Math.sin(b.rotation.z) * .34, Math.cos(b.rotation.z) * .34, 0); }
      animations.push({ type: 'mill', object: sails });
    } else if (id === 'lumber') {
      house(g, -.15, -.25, 1.25, .8, .95, '#5c4034');
      for (let i = 0; i < 7; i++) { const log = part(g, 'cylinder', i % 2 ? '#98734d' : '#765a40', [.23, 1.1, .23], [-.55 + (i % 4) * .28, .18 + Math.floor(i / 4) * .22, .73]); log.rotation.x = Math.PI / 2; }
      box(g, palette.wood, [.7, .1, .5], [1, .56, .1]); box(g, palette.wood, [.13, .55, .13], [1, .28, .1]);
      part(g, 'cylinder', '#a2aab0', [.52, .045, .52], [1, .69, .1]).rotation.x = Math.PI / 2;
    } else if (id === 'quarry') {
      for (let i = 0; i < 6; i++) part(g, 'rock', ['#6e7780', '#495565', '#8a9296'][i % 3], [1.15, .8 + hash(i) * .8, .9], [Math.cos(i * 1.2) * .65, .35, Math.sin(i * 1.2) * .55], i);
      box(g, palette.dark, [.75, .8, .1], [0, .4, .57]);
      for (const x of [-.47, .47]) box(g, palette.wood, [.14, 1.05, .16], [x, .52, .64]);
      box(g, palette.wood, [1.12, .18, .2], [0, 1.03, .64]);
      for (const x of [-.23, .23]) box(g, '#82818a', [.05, .06, 1.2], [x, .08, 1]);
      for (let i = 0; i < 3; i++) part(g, 'crystal', '#9ac6d7', [.17, .45, .17], [.55 + i * .18, .85, -.15 + i * .1], i, .15);
      torch(g, -.78, .1, .8, animations);
    } else if (id === 'forge') {
      house(g, -.2, -.2, 1.45, .9, 1.1, '#3f3a38');
      box(g, palette.dark, [.5, 1.85, .5], [.52, .96, -.43]); box(g, palette.edge, [.62, .16, .6], [.52, 1.9, -.43]);
      box(g, '#222a38', [.53, .53, .1], [-.15, .42, .4]);
      part(g, 'box', '#ff9856', [.38, .32, .12], [-.15, .38, .43], 0, .9);
      box(g, '#737984', [.55, .15, .26], [.8, .62, .7]); box(g, '#49515e', [.28, .45, .22], [.8, .34, .7]);
      part(g, 'pyramid', '#9298a2', [.35, .18, .28], [1.08, .63, .7]).rotation.z = -Math.PI / 2;
      torch(g, -.95, .1, .6, animations);
    } else if (id === 'tavern') {
      house(g, 0, -.15, 1.65, 1.2, 1.15, '#7a3040');
      box(g, palette.wood, [1.9, .12, .65], [0, .13, .68]);
      for (const x of [-.7, .7]) box(g, palette.wood, [.08, .86, .08], [x, .56, .88]);
      part(g, 'roof', '#96604f', [1.9, .35, .65], [0, .95, .72]);
      part(g, 'cylinder', '#a17c51', [.39, .5, .39], [-1, .25, .5]);
      box(g, palette.gold, [.09, 1.55, .09], [1, .77, .5]); box(g, '#7c4655', [.48, .42, .1], [1, 1.3, .5]);
      part(g, 'crystal', palette.gold, [.18, .24, .07], [1, 1.3, .57]);
      torch(g, -.75, .1, .95, animations);
    } else if (id === 'observatory') {
      part(g, 'cylinder', palette.dark, [1.9, .18, 1.9], [0, .09, 0]);
      part(g, 'cylinder', palette.stone, [1.3, 1.1, 1.3], [0, .7, 0]);
      part(g, 'cone', palette.roof, [1.8, .9, 1.8], [0, 1.63, 0]);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; windowPane(g, Math.sin(a) * .66, .82, Math.cos(a) * .66, .75, a); }
      part(g, 'cylinder', palette.gold, [.12, .5, .12], [0, 2.14, 0]);
      const orb = part(g, 'crystal', palette.cyan, [.47, .7, .47], [0, 2.62, 0], 0, .6, true);
      animations.push({ type: 'crystal', object: orb, y: 2.62, phase: 1.7 });
      for (let i = 0; i < 2; i++) { const ring = part(g, 'ring', palette.gold, [1.05, 1.05, 1.05], [0, 2.6, 0], i * Math.PI / 2); ring.rotation.x = .75 + i * .7; }
      box(g, palette.gold, [.14, .14, .8], [.7, 1.25, .3], -.6);
    }
    addBuildingEvolution(g, id, level, { box, part, house, tower, palette });
    consolidate(g);
    g.userData.baseScale = locations[id].scale; g.scale.setScalar(g.userData.baseScale);
    g.position.set(locations[id].x, locations[id].y + .08, locations[id].z); scene.add(g); return g;
  }
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 64;
  const glowCtx = glowCanvas.getContext('2d'), glowGradient = glowCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
  glowGradient.addColorStop(0, '#fff'); glowGradient.addColorStop(.12, '#c2f2ff'); glowGradient.addColorStop(.4, '#69bcd455'); glowGradient.addColorStop(1, '#69bcd400');
  glowCtx.fillStyle = glowGradient; glowCtx.fillRect(0, 0, 64, 64);
  const glowMap = new THREE.CanvasTexture(glowCanvas); textures.add(glowMap);
  const auraMaterial = new THREE.SpriteMaterial({ map: glowMap, color: '#d7eef4', transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false }); materials.add(auraMaterial);
  const aura = new THREE.Sprite(auraMaterial); aura.position.set(locations.keep.x, locations.keep.y + 4.6, locations.keep.z); aura.scale.set(2.3, 2.3, 1); scene.add(aura);
  const crystalLight = new THREE.PointLight('#9fd7e4', 3.2, 8, 2); crystalLight.position.copy(aura.position); scene.add(crystalLight);
  const moteGeo = new THREE.BufferGeometry(), motePositions = new Float32Array(22 * 3);
  for (let i = 0; i < 22; i++) { motePositions[i*3] = (hash(i+400)-.5)*16; motePositions[i*3+1] = 4.2+hash(i+500)*4.5; motePositions[i*3+2] = (hash(i+600)-.5)*16; }
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePositions,3)); geometries.add(moteGeo);
  const moteMat = new THREE.PointsMaterial({ map: glowMap, size: .07, color: '#efe6d4', transparent:true, opacity:.4, depthWrite:false, blending:THREE.AdditiveBlending }); materials.add(moteMat);
  const motes = new THREE.Points(moteGeo,moteMat); scene.add(motes);
  const selectionMaterial = new THREE.MeshBasicMaterial({ color: '#e4c98a', transparent: true, opacity: .7, depthWrite: false }); materials.add(selectionMaterial);
  const selection = new THREE.Mesh(geometry('ring'), selectionMaterial); selection.rotation.x = -Math.PI / 2; selection.position.y = .18; scene.add(selection);
  function removeModel(g) { g.traverse(o => { if (o.geometry?.userData.starfortMerged) { o.geometry.dispose(); geometries.delete(o.geometry); } }); g.removeFromParent(); }
  function update(state) {
    if (disposed) return;
    for (const id of Object.keys(locations)) {
      const level = Math.max(1, Math.trunc(Number(state?.buildings?.[id]) || 1));
      if (levels.get(id) === level) continue;
      const previous = levels.get(id);
      if (models.has(id)) removeModel(models.get(id));
      const model = buildModel(id, level);
      if (previous !== undefined && level > previous && !reducedMotion) model.userData.upgradedAt = performance.now();
      models.set(id, model); levels.set(id, level);
    }
    focus(selected, false);
  }
  function focus(id, move = true) {
    if (!locations[id] || disposed) return;
    selected = id; const {x,y,z,scale} = locations[id], radius = (id === 'keep' ? 4.25 : 3.2)*scale;
    selection.position.set(x, y + .19, z); selection.scale.set(radius, radius, radius);
    if (move) goal.set(x * .4, 1.5 + y * .16, z * .4);
  }
  function resize() {
    if (disposed) return;
    width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    const aspect = width / height, extent = Math.max(CITY_VIEW.halfHeight, CITY_VIEW.halfWidth / aspect) / zoom;
    camera.left = -extent * aspect; camera.right = extent * aspect; camera.top = extent; camera.bottom = -extent; camera.updateProjectionMatrix();
  }
  function hit(event) {
    const rect = canvas.getBoundingClientRect(); pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    ray.setFromCamera(pointer, camera);
    for (const intersection of ray.intersectObjects([...models.values()], true)) {
      let o = intersection.object; while (o) { if (o.userData.id) return o.userData.id; o = o.parent; }
    }
    // Each courtyard is tested at its own elevation, not the old island ground plane.
    const point = new THREE.Vector3(), candidates = [];
    for (const [id, {x,y,z,scale}] of Object.entries(locations)) {
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -y-.08), point)) continue;
      if (Math.hypot(point.x-x, point.z-z) < (id === 'keep' ? 2 : 1.45)*scale) candidates.push({id, distance:ray.ray.origin.distanceToSquared(point)});
    }
    if(candidates.length) return candidates.sort((a,b)=>a.distance-b.distance)[0].id;
    return null;
  }
  function pointerDown(e) { if (e.button !== 0) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false }; goal.copy(target); canvas.setPointerCapture(e.pointerId); }
  function pointerMove(e) {
    if (!drag || drag.id !== e.pointerId) { canvas.style.cursor = hit(e) ? 'pointer' : 'grab'; return; }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 6) drag.moved = true;
    if (!drag.moved) return;
    const scale = (camera.right - camera.left) / width;
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1); up.y = 0; up.normalize();
    target.addScaledVector(right, -dx * scale).addScaledVector(up, dy * scale); target.x = THREE.MathUtils.clamp(target.x, -7, 7); target.z = THREE.MathUtils.clamp(target.z, -7, 8); goal.copy(target); canvas.style.cursor = 'grabbing';
  }
  function pointerUp(e) { if (!drag || drag.id !== e.pointerId) return; const click = !drag.moved; drag = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); canvas.style.cursor = 'grab'; if (click) { const id = hit(e); if (id) { focus(id); onSelect(id); } } }
  function pointerCancel() { drag = null; canvas.style.cursor = 'grab'; }
  function zoomBy(factor) { zoom = THREE.MathUtils.clamp(zoom * factor, .8, 2); goal.copy(target); resize(); }
  function overview() { goal.set(...CITY_VIEW.target); zoom = 1; resize(); }
  function wheel(e) { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * .001)); }
  function animate(items, t) {
    for (const a of items) {
      if (a.type === 'flame') { a.object.scale.y = .29 * (1 + Math.sin(t * 7 + a.phase) * .13); a.object.rotation.y = t * .7; }
      if (a.type === 'crystal') { a.object.rotation.y = t * .32 + a.phase; a.object.position.y = a.y + Math.sin(t * 1.6 + a.phase) * .075; }
      if (a.type === 'orbit') a.object.rotation.z = t * .2;
      if (a.type === 'mill') a.object.rotation.z = -t * .22;
    }
  }
  function frame(time) {
    if (disposed || document.hidden) { frameId = 0; return; }
    const dt = Math.min(.05, (time - (lastTime || time)) / 1000); lastTime = time;
    target.lerp(goal, 1 - Math.exp(-5 * dt)); camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld();
    if (!reducedMotion) { animate(worldAnimations, time / 1000); for (const g of models.values()) animate(g.userData.animations, time / 1000); motes.rotation.y = time * .000016; motes.position.y = Math.sin(time * .0002) * .3; }
    for (const model of models.values()) {
      if (model.userData.upgradedAt === undefined) continue;
      const progress = Math.min(1, (time - model.userData.upgradedAt) / 700);
      model.scale.setScalar(model.userData.baseScale * (1 + Math.sin(progress * Math.PI) * .12));
      if (progress >= 1) delete model.userData.upgradedAt;
    }
    for (const [id, plot] of Object.entries(locations)) {
      projected.set(plot.x, plot.y + .25, plot.z + plot.labelZ).project(camera);
      onProject(id, (projected.x + 1) * width / 2, (1 - projected.y) * height / 2, Math.abs(projected.x)<.97 && Math.abs(projected.y)<.94);
    }
    selectionMaterial.opacity = reducedMotion ? .6 : .5 + Math.sin(time / 650) * .08; renderer.render(scene, camera); frameId = requestAnimationFrame(frame);
  }
  function visibility() { if (document.hidden) { cancelAnimationFrame(frameId); frameId = 0; } else if (!disposed && !frameId) { lastTime = 0; frameId = requestAnimationFrame(frame); } }
  const listeners = [['pointerdown', pointerDown], ['pointermove', pointerMove], ['pointerup', pointerUp], ['pointercancel', pointerCancel], ['wheel', wheel]];
  listeners.forEach(([type, fn]) => canvas.addEventListener(type, fn, type === 'wheel' ? { passive: false } : undefined));
  document.addEventListener('visibilitychange', visibility); window.addEventListener('resize', resize);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null; observer?.observe(canvas);
  canvas.style.touchAction = 'none'; canvas.style.cursor = 'grab';
  function dispose() {
    if (disposed) return; disposed = true; cancelAnimationFrame(frameId); observer?.disconnect();
    listeners.forEach(([type, fn]) => canvas.removeEventListener(type, fn)); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('resize', resize);
    if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id); drag = null;
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); sun.shadow.map?.dispose();
    renderer.dispose(); scene.clear(); models.clear(); geometries.clear(); materials.clear();
  }
  resize(); update({}); camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld(); visibility();
  return { update, focus, resize, zoomBy, overview, dispose };
}
