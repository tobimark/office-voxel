// Scene data is shared by the renderer and navigation checks. Each page selects
// its own layout; the original three-person room remains the default.
const studioStations = [{ x: -3, z: -2.1 }, { x: .15, z: -2.1 }, { x: 3.3, z: -2.1 }];
// These two furniture builders use desk centres; publish actor anchors explicitly.
const seatsAtDesks = stations => stations.map(p => ({
  x: p.x, z: p.z + 1.18, yaw: Math.PI,
  exit: { x: p.x, z: p.z + 2.05 },
}));
export const smallOffice = {
  id: 'studio', capacity: 3, width: 12, depth: 9,
  bounds: { minX: -5.5, maxX: 5.5, minZ: -3.9, maxZ: 3.9 },
  stations: studioStations,
  seats: seatsAtDesks(studioStations),
  stationFor: [1, 0, 2],
  render: { shadowSize: 10, shadowFar: 35, groundSize: 200 },
  camera: { position: [12, 10, 14], maxZoom: 4, minHeight: 10.5, minWidth: 16.5, closeZoom: 3.2 },
  patrol: [{ x: 2.65, z: 2.95 }, { x: -.65, z: 2.85 }, { x: .15, z: .1 }],
  actors: [
    { name: '小麦', role: '设计师', x: .3, z: 1.6, shirt: '#d57645', trim: '#ecad75', pants: '#687b76', hair: '#654330', hairStyle: 'bob', phase: .2 },
    { name: '阿森', role: '开发者', x: -3, z: -.92, shirt: '#79917a', trim: '#adba94', pants: '#526568', hair: '#343e39', hairStyle: 'spiky', glasses: true, phase: 1.8 },
    { name: '小蓝', role: '产品经理', x: 3.3, z: -.92, shirt: '#708fa5', trim: '#abc2c9', pants: '#5b6276', hair: '#84553a', hairStyle: 'bob', phase: 3.1 },
  ],
};

const teamStations = [-5.6, -.7, 4.2].flatMap(z => [-4.25, 0, 4.25].map(x => ({ x, z })));
const teammates = [
  { name: '小麦', role: '设计师', signature: '斜刘海短发 · 发夹 · 橙色工装',
    shirt: '#d57645', trim: '#f3d6a0', pants: '#687b76', hair: '#874e2e', hairStyle: 'asymmetric',
    outfit: 'utility', accessory: 'hairclip', eyes: 'bright', freckles: true, height: .96, build: .94, shoes: '#f4ebd5' },
  { name: '阿森', role: '开发者', signature: '蓬松卷发 · 大耳机 · 绿色卫衣',
    shirt: '#64896f', trim: '#bed0a6', pants: '#405667', hair: '#343831', hairStyle: 'curly', skin: '#d3a17c',
    outfit: 'hoodie', accessory: 'headphones', eyes: 'relaxed', height: 1.04, build: 1.12, shoes: '#d9e4dc' },
  { name: '小蓝', role: '产品经理', signature: '高马尾 · 蓝色西装 · 工作牌',
    shirt: '#637f9d', trim: '#e6e5d7', pants: '#445669', hair: '#69412f', hairStyle: 'ponytail',
    outfit: 'blazer', accessory: 'badge', eyes: 'almond', lashes: true, height: 1.07, build: .94, shoes: '#394c57' },
  { name: '阿洛', role: '前端开发', signature: '鸭舌帽 · 棒球夹克 · 方框眼镜',
    shirt: '#b7854e', trim: '#f2e5c9', pants: '#4c687c', hair: '#343944', hairStyle: 'undercut', skin: '#d9a17d',
    outfit: 'varsity', accessory: 'cap', glasses: 'square', eyes: 'narrow', height: 1.02, build: 1.03, shoes: '#d3a96d' },
  { name: '小禾', role: '插画师', signature: '金色侧辫 · 贝雷帽 · 画画围裙',
    shirt: '#e8dfbd', trim: '#b7c995', pants: '#827a66', hair: '#c6a055', hairStyle: 'braid',
    outfit: 'apron', accessory: 'beret', eyes: 'round', freckles: true, height: .93, build: .98, shoes: '#926c52' },
  { name: '阿远', role: '后端开发', signature: '束起长辫 · 胡须 · 格纹衬衫',
    shirt: '#547e83', trim: '#bdcbb2', pants: '#465858', hair: '#3d3029', hairStyle: 'locs', skin: '#b77f58',
    outfit: 'plaid', accessory: 'watch', eyes: 'narrow', beard: true, height: 1.09, build: 1.08, shoes: '#574334' },
  { name: '小桃', role: '运营', signature: '粉色短发 · 蝴蝶结 · 奶白背带裤',
    shirt: '#c27e83', trim: '#f4e4c2', pants: '#e4d5b8', hair: '#bc7684', hairStyle: 'pixie',
    outfit: 'overalls', accessory: 'bow', eyes: 'bright', lashes: true, beautyMark: true, height: .95, build: .96, shoes: '#b66b72' },
  { name: '阿墨', role: '测试工程师', signature: '银灰侧分 · 黑框眼镜 · 紫色马甲',
    shirt: '#e0ddcd', trim: '#b3aac9', pants: '#4c5264', hair: '#c0c5c4', hairStyle: 'sidepart', skin: '#d6a481',
    outfit: 'vest', accessory: 'pen', glasses: 'heavy', eyes: 'relaxed', height: 1.01, build: 1.11, shoes: '#414953' },
  { name: '小米', role: '项目经理', signature: '针织帽 · 圆框眼镜 · 长围巾',
    shirt: '#bd9a56', trim: '#eee0b3', pants: '#637c78', hair: '#654c3a', hairStyle: 'shaggy',
    outfit: 'cardigan', accessory: 'beanie', glasses: 'round', eyes: 'round', height: .98, build: 1.02, shoes: '#6e5642' },
];

export const teamOffice = {
  id: 'team', capacity: 9, width: 20, depth: 17,
  bounds: { minX: -9.5, maxX: 9.5, minZ: -7.9, maxZ: 7.9 },
  stations: teamStations,
  seats: seatsAtDesks(teamStations),
  render: { shadowSize: 16, shadowFar: 50, groundSize: 200 },
  stationFor: teammates.map((_, i) => i),
  camera: { position: [20, 18, 23], minHeight: 18.5, minWidth: 28, closeZoom: 5 },
  patrol: [{ x: 6.5, z: 6.8 }, { x: -5.75, z: 6.8 }, { x: -6.25, z: -2.5 }, { x: 6.5, z: -2.5 }],
  actors: teammates.map((person, i) => ({
    ...person, x: teamStations[i].x,
    z: teamStations[i].z + (i === 0 ? 2.05 : 1.18), phase: .2 + i * .73,
  })),
};

export function workstationObstacles(stations) {
  return stations.flatMap(p => [
    { x: p.x, z: p.z, w: 2.55, d: 1.28 },
    { x: p.x, z: p.z + 1.2, w: .78, d: .78 },
  ]);
}
