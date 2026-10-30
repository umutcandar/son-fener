// World-space plots are presentation only; save identifiers and building rules stay stable.
export const CITY_PLOTS = {
  keep:        { x: 3.3, z: -5.8, y: 2.8, width: 7.6, depth: 6.6, scale: 1.18, labelZ: 2.35 },
  observatory: { x: -5.3, z: -5.7, y: 3.2, width: 5.8, depth: 5.8, scale: 1.08, labelZ: 2.1 },
  forge:       { x: -5.5, z: .9, y: .85, width: 5.8, depth: 5.6, scale: 1, labelZ: 1.8 },
  tavern:      { x: .5, z: 1.8, y: 1.1, width: 5.5, depth: 5.4, scale: 1, labelZ: 1.85 },
  quarry:      { x: 6.5, z: .8, y: 1.1, width: 5.6, depth: 5.8, scale: 1, labelZ: 1.9 },
  farm:        { x: -5, z: 7, y: .25, width: 6, depth: 5.1, scale: 1, labelZ: 1.95 },
  lumber:      { x: 5.7, z: 7, y: .25, width: 5.8, depth: 5.2, scale: 1, labelZ: 1.9 },
};
// Every terrace has a walkable link down to the entrance; paths become stairs on slopes.
export const CITY_NODES = {
  gate: [0, .25, 11.2], square: [0, .25, 7.7], crossing: [.5, .25, 5.45],
  keep: [3.3, 2.8, -2.5], observatory: [-5.3, 3.2, -2.8],
  forge: [-5.5, .85, 3.7], tavern: [.5, 1.1, 4.5], quarry: [6.5, 1.1, 3.7],
  farm: [-2, .25, 7.7], lumber: [2.8, .25, 7.7],
  west: [-5.5, .25, 5.45], east: [6.5, .25, 5.45],
  laneFront: [-2.4, .25, 5.45], laneBack: [-2.4, 1.1, -1.75],
  upper: [.5, 1.1, -1.75], keepStair: [3.3, 1.1, .1],
  observatoryStair: [-5.3, .85, -.8],
};
export const CITY_LINKS = [
  ['gate','square',2.1], ['square','crossing',2.1], ['square','farm',1.4], ['square','lumber',1.4],
  ['crossing','west',1.6], ['west','forge',1.65], ['crossing','east',1.6], ['east','quarry',1.65],
  ['crossing','tavern',1.8], ['crossing','laneFront',1.2], ['laneFront','laneBack',1.2], ['laneBack','upper',1.2], ['upper','keepStair',1.5], ['keepStair','keep',1.8],
  ['laneBack','observatoryStair',1.2], ['observatoryStair','observatory',1.7],
];
export const CITY_VIEW = { target: [0, 2.4, 5.2], offset: [22, 26, 32], halfWidth: 17.6, halfHeight: 13.4 };
export const CITY_PALETTE = {
  stone:'#b7a890', dark:'#3e3934', edge:'#d2c2a2', roof:'#3c4658', gold:'#d4b36a',
  wood:'#6b4330', plaster:'#ead8bc', cyan:'#7ec8d6', ember:'#ffb15a', grass:'#4d6844', water:'#2f7594',
};
