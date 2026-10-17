// Big floor plate: 24 people in six glazed team rooms off one long corridor, with a
// meeting room closing the west end and the break area at the east end. Every room
// holds a four-person facing table, so each room is self-contained and every room
// is entered through its own door. Geometry, walls, doors, seats and furniture
// boxes live here as data, shared by the renderer and the navigation tests.
import { teamOffice } from '../layouts.js';
import { monitorPlacement } from '../shared/workstation.js';

export const approach = 1.05;
export const wallSpec = { thickness: .16, solid: .9, height: 2.4 };
export const tableSurface = .98;              // height-matched to the typing pose
export const tableThickness = .15;
export const deskItems = {
  keyboard: { forward: .72, depth: .22, thickness: .045, keyHeight: .013 },
  monitor: monitorPlacement,
  mouse: { forward: .74, side: .45 },
  notebook: { forward: .66, side: .8 },
  mug: { forward: .8, side: -.9 },
};

// The centre of each table is free between its two monitor columns.
export const floorPlanterOffsets = [-.35, .35];

const HALF_W = 23, HALF_D = 11;
const SHELL = { back: -HALF_D + .05, left: -HALF_W + .05, halfWidth: HALF_W, halfDepth: HALF_D };
const BAND = 2.2;                    // corridor wall centrelines sit at ±BAND
const ROOM_X = [[-22.86, -7.74], [-7.58, 7.58], [7.74, 22.86]];
const NORTH_Z = [-10.86, -2.28], SOUTH_Z = [2.28, 10.86];
const MEETING_EAST = -17.1, PANTRY_WEST = 17.1;
export const DOOR_WIDTH = 1.2;
const MEETING_DOOR = 1.4;

// Six rooms, three either side of the corridor, each with four seats at one table.
export const floorRooms = [
  { id: 'design', name: '设计间', number: 'A1', side: 'north', span: ROOM_X[0], door: -12 },
  { id: 'product', name: '产品间', number: 'A2', side: 'north', span: ROOM_X[1], door: 0 },
  { id: 'dev', name: '研发间', number: 'A3', side: 'north', span: ROOM_X[2], door: 12 },
  { id: 'algo', name: '算法间', number: 'B1', side: 'south', span: ROOM_X[0], door: -12 },
  { id: 'ops', name: '运营间', number: 'B2', side: 'south', span: ROOM_X[1], door: 0 },
  { id: 'staff', name: '职能间', number: 'B3', side: 'south', span: ROOM_X[2], door: 12 },
].map(room => {
  const north = room.side === 'north';
  const centerX = (room.span[0] + room.span[1]) / 2;
  return {
    ...room, centerX,
    inner: [room.span[0], room.span[1], ...(north ? NORTH_Z : SOUTH_Z)],
    centerZ: north ? (NORTH_Z[0] + NORTH_Z[1]) / 2 : (SOUTH_Z[0] + SOUTH_Z[1]) / 2,
    doorZ: north ? -BAND : BAND,
    doorInto: north ? -1 : 1,
    outerZ: north ? NORTH_Z[0] + .42 : SOUTH_Z[1] - .42,
  };
});

export const meetingRoom = {
  id: 'meeting', name: '会议室', number: 'C1',
  inner: [SHELL.left + .09, MEETING_EAST - .12, -BAND + .08, BAND - .08],
  door: { z: 0, width: MEETING_DOOR, into: -1 },
};

// Four seats per room: two either side of the table, everyone facing its centre line.
const seats = [];
for (const room of floorRooms) {
  for (const [dx, dz, yaw] of [[-1.35, -1.55, 0], [1.35, -1.55, 0], [-1.35, 1.55, Math.PI], [1.35, 1.55, Math.PI]]) {
    seats.push({ x: room.centerX + dx, z: room.centerZ + dz, yaw, room: room.id, table: { x: room.centerX, z: room.centerZ } });
  }
}
export const floorSeats = seats;

const alongX = (at, from, to, doors = []) => {
  const segments = [];
  let cursor = from;
  for (const door of [...doors].sort((a, b) => a.x - b.x)) {
    const start = door.x - door.width / 2, end = door.x + door.width / 2;
    if (start - cursor > .001) segments.push({ x: (cursor + start) / 2, z: at, w: start - cursor, d: wallSpec.thickness });
    cursor = end;
  }
  if (to - cursor > .001) segments.push({ x: (cursor + to) / 2, z: at, w: to - cursor, d: wallSpec.thickness });
  return segments;
};
const alongZ = (at, from, to, doors = []) => {
  const segments = [];
  let cursor = from;
  for (const door of [...doors].sort((a, b) => a.z - b.z)) {
    const start = door.z - door.width / 2, end = door.z + door.width / 2;
    if (start - cursor > .001) segments.push({ x: at, z: (cursor + start) / 2, w: wallSpec.thickness, d: start - cursor });
    cursor = end;
  }
  if (to - cursor > .001) segments.push({ x: at, z: (cursor + to) / 2, w: wallSpec.thickness, d: to - cursor });
  return segments;
};

// Wall runs carry their door openings, so the renderer and the tests build the
// same geometry from the same list.
export const floorWallRuns = [
  { at: -BAND, from: SHELL.left, to: HALF_W - .05, axis: 'x', doors: floorRooms.filter(r => r.side === 'north').map(r => ({ x: r.door, width: DOOR_WIDTH, into: -1 })) },
  { at: BAND, from: SHELL.left, to: HALF_W - .05, axis: 'x', doors: floorRooms.filter(r => r.side === 'south').map(r => ({ x: r.door, width: DOOR_WIDTH, into: 1 })) },
  ...[-7.66, 7.66].flatMap(x => ([
    { at: x, from: SHELL.back, to: NORTH_Z[1] + .08, axis: 'z' },
    { at: x, from: SOUTH_Z[0] - .08, to: -SHELL.back, axis: 'z' },
  ])),
  { at: HALF_W - .05, from: SHELL.back, to: NORTH_Z[1] + .08, axis: 'z' },
  { at: HALF_W - .05, from: SOUTH_Z[0] - .08, to: -SHELL.back, axis: 'z' },
  { at: MEETING_EAST, from: -BAND, to: BAND, axis: 'z', doors: [{ z: meetingRoom.door.z, width: MEETING_DOOR, into: -1 }] },
];

const doorLeaf = (run, door) => {
  const length = door.width - .14;
  if (run.axis === 'x') {
    return { x: door.x + door.width / 2 - .06, z: run.at + door.into * (length / 2 + .06), w: .1, d: length };
  }
  return { x: run.at + door.into * (length / 2 + .06), z: door.z + door.width / 2 - .06, w: length, d: .1 };
};
export const floorWalls = floorWallRuns.flatMap(run => (run.axis === 'x'
  ? alongX(run.at, run.from, run.to, run.doors || [])
  : alongZ(run.at, run.from, run.to, run.doors || [])));
export const floorLeaves = floorWallRuns.flatMap(run => (run.doors || []).map(door => doorLeaf(run, door)));

// Furniture per room, then the shared corridor, meeting room and break area.
const roomZones = floorRooms.flatMap(room => {
  const nookX = room.door <= room.centerX ? room.centerX + 4.3 : room.centerX - 4.3;
  const plantX = room.door <= room.centerX ? room.centerX - 5.9 : room.centerX + 5.9;
  return [
    { id: `${room.id}-table`, kind: 'table', x: room.centerX, z: room.centerZ, w: 4.9, d: 2.2 },
    { id: `${room.id}-storage`, kind: 'storage', x: room.centerX, z: room.outerZ, w: 6, d: .9 },
    { id: `${room.id}-nook`, kind: 'nook', x: nookX, z: room.centerZ, w: 1.2, d: 1.2 },
    { id: `${room.id}-stool-a`, kind: 'stool', x: nookX, z: room.centerZ - 1.45, w: .45, d: .45 },
    { id: `${room.id}-stool-b`, kind: 'stool', x: nookX, z: room.centerZ + 1.45, w: .45, d: .45 },
    { id: `${room.id}-plant`, kind: 'plant', x: plantX, z: room.centerZ, w: .7, d: .7 },
  ];
});
const meeting = { x: (SHELL.left + .09 + MEETING_EAST - .12) / 2, z: 0 };
const publicZones = [
  // A shallow, narrow meeting table: a bigger one, plus its chairs, would fence the
  // room's two side aisles off from each other.
  { id: 'meeting-table', kind: 'meeting-table', x: meeting.x, z: 0, w: 2.6, d: 1 },
  ...[-1.1, 0, 1.1].flatMap(dx => [-1, 1].map(dz => (
    { id: `meeting-chair-${dx}-${dz}`, kind: 'meeting-chair', x: meeting.x + dx, z: dz * .85, w: .5, d: .5 }))),
  { id: 'meeting-credenza', kind: 'storage', x: -19.6, z: 1.85, w: 1.6, d: .55 },
  { id: 'pantry-bar', kind: 'bar', x: 22.2, z: 0, w: 1.1, d: 4 },
  { id: 'pantry-back', kind: 'bar-back', x: 22.85, z: 0, w: .4, d: 4.1 },
  ...[-1.35, 0, 1.35].map((z, index) => ({ id: `pantry-stool-${index}`, kind: 'stool', x: 21.3, z, w: .45, d: .45 })),
  { id: 'pantry-lockers', kind: 'lockers', x: 19.2, z: 1.8, w: 2.6, d: .55 },
  { id: 'corridor-bench-a', kind: 'bench', x: 6.5, z: -1.85, w: 2.2, d: .5 },
  { id: 'corridor-bench-b', kind: 'bench', x: -6.5, z: 1.85, w: 2.2, d: .5 },
  { id: 'plant-west', kind: 'plant', x: -15.8, z: -1.7, w: .7, d: .7 },
  { id: 'plant-east', kind: 'plant', x: 16.2, z: 1.7, w: .7, d: .7 },
  { id: 'plant-pantry-a', kind: 'plant', x: 18.1, z: -1.7, w: .7, d: .7 },
  { id: 'plant-pantry-b', kind: 'plant', x: 20.4, z: -1.8, w: .7, d: .7 },
];
export const floorZones = [...roomZones, ...publicZones];

export function floorObstacles() {
  return [
    ...floorWalls,
    ...floorLeaves,
    ...floorSeats.map(seat => ({ x: seat.x, z: seat.z, w: .78, d: .78 })),   // reserved chairs
    ...floorZones.map(({ x, z, w, d }) => ({ x, z, w, d })),
  ];
}

export function seatForward(seat, distance = 1) {
  return { x: seat.x + Math.sin(seat.yaw) * distance, z: seat.z + Math.cos(seat.yaw) * distance };
}
export function seatExit(seat) {
  return seatForward(seat, -approach);
}

// The nine originals keep their exact looks; the other fifteen are assembled from
// the same pixel parts (hair style, outfit, accessory) with new palettes.
const legacy = Object.fromEntries(teamOffice.actors.map(person => [person.name, person]));
const newcomer = (name, role, signature, look) => ({ name, role, signature, ...look });
const fresh = [
  newcomer('小满', '交互设计', '低发髻 · 灰蓝西装 · 腕表', { shirt: '#7fa3a8', trim: '#e9dfc4', pants: '#4f6272', hair: '#3b3a44', hairStyle: 'bun', outfit: 'blazer', accessory: 'watch', eyes: 'almond', lashes: true, height: .99, build: .97, shoes: '#3f4a54' }),
  newcomer('阿真', '视觉设计', '短刺发 · 紫色马甲 · 粗框眼镜', { shirt: '#8f6f9e', trim: '#ded3ec', pants: '#4a4458', hair: '#2f3138', hairStyle: 'spiky', outfit: 'vest', accessory: 'pen', eyes: 'narrow', glasses: 'heavy', height: 1.03, build: 1.02, shoes: '#33323c', skin: '#d9a67f' }),
  newcomer('小柚', '内容编辑', '齐肩短发 · 米色开衫 · 蝴蝶结', { shirt: '#c9a0a8', trim: '#f2e6c9', pants: '#5c6470', hair: '#4a3a2e', hairStyle: 'bob', outfit: 'cardigan', accessory: 'bow', eyes: 'round', height: .97, build: .95, shoes: '#7b6455' }),
  newcomer('小鹿', '客户成功', '高马尾 · 米白棒球夹克 · 无配饰', { shirt: '#e0c48f', trim: '#f0e5c9', pants: '#45536b', hair: '#2e2a26', hairStyle: 'ponytail', outfit: 'varsity', eyes: 'bright', lashes: true, height: .98, build: .99, shoes: '#e6ded0' }),
  newcomer('阿宽', '运维工程师', '侧削短发 · 格纹衬衫 · 腕表', { shirt: '#6f8f7a', trim: '#c9d8bd', pants: '#3f4a52', hair: '#3a3330', hairStyle: 'undercut', outfit: 'plaid', accessory: 'watch', eyes: 'narrow', beard: true, height: 1.05, build: 1.1, shoes: '#4a4438', skin: '#c08e68' }),
  newcomer('阿焱', '算法工程师', '蓬松卷发 · 铁锈色格纹 · 大耳机', { shirt: '#b5603f', trim: '#e6c9a8', pants: '#4b4a55', hair: '#2b2320', hairStyle: 'curly', outfit: 'plaid', accessory: 'headphones', eyes: 'relaxed', height: 1.02, build: 1.05, shoes: '#3c3a3f', skin: '#c98f66' }),
  newcomer('阿泽', '数据分析师', '深棕侧分 · 藏蓝西装 · 方框眼镜', { shirt: '#5f7f9a', trim: '#eae2cf', pants: '#3f4a52', hair: '#46403a', hairStyle: 'sidepart', outfit: 'blazer', accessory: 'watch', eyes: 'relaxed', glasses: 'square', height: 1, build: .96, shoes: '#39434d' }),
  newcomer('阿澈', '解决方案', '短碎发 · 灰蓝夹克 · 鸭舌帽', { shirt: '#7a8fa8', trim: '#e6e2d2', pants: '#4b5566', hair: '#2a2f38', hairStyle: 'pixie', outfit: 'varsity', accessory: 'cap', eyes: 'almond', height: 1.01, build: 1, shoes: '#cdd6dc' }),
  newcomer('小乔', '市场专员', '侧编发 · 珊瑚色西装 · 发夹', { shirt: '#d08a6a', trim: '#f6e0d2', pants: '#5a5568', hair: '#4c3326', hairStyle: 'braid', outfit: 'blazer', accessory: 'hairclip', eyes: 'bright', lashes: true, freckles: true, height: .96, build: .94, shoes: '#8a6a58' }),
  newcomer('阿栗', '商务拓展', '束发辫 · 墨绿背带裤 · 腕表', { shirt: '#7d9a86', trim: '#d8e3cc', pants: '#4d5a63', hair: '#33291f', hairStyle: 'locs', outfit: 'overalls', accessory: 'watch', eyes: 'narrow', beard: true, height: 1.06, build: 1.09, shoes: '#4a4034', skin: '#a9714c' }),
  newcomer('阿棠', '招聘', '短刺发 · 米白背带裤 · 蝴蝶结', { shirt: '#e8dfbd', trim: '#cbd8b4', pants: '#8a7f66', hair: '#6b4a2f', hairStyle: 'spiky', outfit: 'overalls', accessory: 'bow', eyes: 'round', freckles: true, height: .95, build: .98, shoes: '#92795e' }),
  newcomer('小枫', '技术支持', '侧削短发 · 灰绿卫衣 · 鸭舌帽', { shirt: '#6f7f8f', trim: '#c4d2c2', pants: '#3f4a52', hair: '#33383d', hairStyle: 'undercut', outfit: 'hoodie', accessory: 'cap', eyes: 'relaxed', glasses: 'round', height: 1.04, build: 1.03, shoes: '#dde5e6' }),
  newcomer('小舟', '财务', '齐肩短发 · 灰绿马甲 · 胸牌', { shirt: '#8a9a7c', trim: '#e4e8d4', pants: '#46505a', hair: '#3f3a35', hairStyle: 'bob', outfit: 'vest', accessory: 'badge', eyes: 'narrow', glasses: 'square', height: .99, build: 1, shoes: '#3f4740' }),
  newcomer('阿岚', '法务', '高马尾 · 藕荷开衫 · 方框眼镜', { shirt: '#9a8fa8', trim: '#efe6f2', pants: '#454b5c', hair: '#2d2a28', hairStyle: 'ponytail', outfit: 'cardigan', eyes: 'almond', lashes: true, glasses: 'square', height: 1.02, build: .98, shoes: '#4a4a52' }),
  newcomer('小羽', '实习生', '短碎发 · 橙棕工装 · 蝴蝶结', { shirt: '#d8a86a', trim: '#f4e2c4', pants: '#5f6b63', hair: '#514034', hairStyle: 'pixie', outfit: 'utility', accessory: 'bow', eyes: 'bright', freckles: true, height: .94, build: .92, shoes: '#eadfc8' }),
];
const freshByName = Object.fromEntries(fresh.map(person => [person.name, person]));

// Seat order is room order: four people per room, grouped by craft.
const roster = [
  '小麦', '小满', '阿真', '小禾',       // A1 设计间
  '小蓝', '小米', '小柚', '小鹿',       // A2 产品间
  '阿森', '阿洛', '阿远', '阿宽',       // A3 研发间
  '阿焱', '阿泽', '阿墨', '阿澈',       // B1 算法间
  '小桃', '小乔', '阿栗', '阿棠',       // B2 运营间
  '小枫', '小舟', '阿岚', '小羽',       // B3 职能间
];
const roomOrder = ['design', 'product', 'dev', 'algo', 'ops', 'staff'];
// The first character waits on foot inside the first room; the other twenty-three
// start at their desks.
const standingSpot = { x: -13.6, z: -4.2 };
const actors = roster.map((name, index) => {
  const room = floorRooms.find(item => item.id === roomOrder[Math.floor(index / 4)]);
  const seat = seats[index];
  const person = legacy[name] || freshByName[name];
  if (!room || !seat || !person) throw new Error(`no seat or look for ${name}`);
  const spot = index === 0 ? standingSpot : seat;
  return { ...person, name, x: spot.x, z: spot.z, phase: .2 + index * .61 };
});

export const floorOffice = {
  seating: { exitDistance: approach },
  render: { shadowFar: 80, groundSize: 400 },
  id: 'floor', capacity: 24, width: HALF_W * 2, depth: HALF_D * 2,
  bounds: { minX: -HALF_W + .45, maxX: HALF_W - .45, minZ: -HALF_D + .45, maxZ: HALF_D - .45 },
  shell: SHELL, band: BAND, meetingRoom, rooms: floorRooms,
  seats: floorSeats, stations: floorSeats,
  stationFor: floorSeats.map((_, index) => index),
  camera: { position: [30, 27, 38], minHeight: 36, minWidth: 56, closeZoom: 6 },
  // A loop that walks the corridor and steps into three rooms through their doors.
  patrol: [
    { x: 20.6, z: 0 }, { x: -16.2, z: 0 },
    { x: -12, z: 1 }, { x: -12, z: -3.6 }, { x: -12, z: 1 },
    { x: 0, z: 1 }, { x: 0, z: 4 }, { x: 0, z: 1 },
    { x: 12, z: -1 }, { x: 12, z: -3.6 }, { x: 12, z: 1 },
  ],
  actors,
};
