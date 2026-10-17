import { furnitureSpec } from '../shared/furniture-spec.js';
// Big floor plate: 24 people in six glazed team rooms off one long corridor, with a
// meeting room closing the west end and the break area at the east end. Every room
// holds a four-person facing table, so each room is self-contained and every room
// is entered through its own door. Geometry, walls, doors, seats and furniture
// boxes live here as data, shared by the renderer and the navigation tests.
import { floorCast } from '../characters/casts.js';
import { instantiateCharacter } from '../characters/instances.js';
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
    ...floorSeats.map(seat => ({ x: seat.x, z: seat.z, ...furnitureSpec.chair })),   // reserved chairs
    ...floorZones.map(({ x, z, w, d }) => ({ x, z, w, d })),
  ];
}

export function seatForward(seat, distance = 1) {
  return { x: seat.x + Math.sin(seat.yaw) * distance, z: seat.z + Math.cos(seat.yaw) * distance };
}
export function seatExit(seat) {
  return seatForward(seat, -approach);
}

const roomOrder = ['design', 'product', 'dev', 'algo', 'ops', 'staff'];
// The first character waits on foot inside the first room; the other twenty-three
// start at their desks.
const standingSpot = { x: -13.6, z: -4.2 };
const actors = floorCast.map((reference, index) => {
  const room = floorRooms.find(item => item.id === roomOrder[Math.floor(index / 4)]);
  const seat = seats[index];
  if (!room || !seat) throw new Error(`no seat for ${reference.instanceId}`);
  const spot = index === 0 ? standingSpot : seat;
  return instantiateCharacter(reference, { x: spot.x, z: spot.z, phase: .2 + index * .61 });
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
