import { compileLayout } from '../world/compile-layout.js';
import { wallObstacles } from '../world/building.js';
import { defineWorkstations } from '../world/furniture-contract.js';
// Suite office: one corridor, three glazed work rooms and a meeting room, each
// closed by its own door. Walls, door openings, seats and furniture boxes are data
// here so the renderer and the navigation tests share one source of truth. The nine
// characters come from the original team layout; no original file is touched.
import { suiteCast } from '../assets/characters/casts.js';
import { instantiateCharacter } from '../assets/characters/instances.js';
import { monitorPlacement } from '../world/workstation.js';

export const approach = 1.05;                 // step-out distance behind a chair
export const wallSpec = { thickness: .16, solid: .9, height: 2.4 };
export const deskSurface = .98;               // height-matched to the typing pose
export const deskThickness = .15;

// Desk items, measured forward of a seat and vertically from the desk surface.
export const deskItems = {
  keyboard: { forward: .72, depth: .22, thickness: .045, keyHeight: .013 },
  monitor: monitorPlacement,
  mouse: { forward: .74, side: .45 },
  notebook: { forward: .66, side: .8 },
  mug: { forward: .8, side: -.9 },
};

const PARTITION_Z = -.2;   // the three work rooms open onto the corridor here
const DESK_Z = -5;
const SEAT_Z = DESK_Z + 1.18;
const SHELL = { back: -7.95, left: -12.95, halfWidth: 13, halfDepth: 8 };

export const suiteRooms = [
  { id: 'design', name: '设计间', number: '01', centerX: -8.67, inner: [-12.86, -4.40], door: { x: -8.67, width: 1.2, into: -1 } },
  { id: 'dev', name: '研发间', number: '02', centerX: 0, inner: [-4.24, 4.24], door: { x: 0, width: 1.2, into: -1 } },
  { id: 'team', name: '协作间', number: '03', centerX: 8.67, inner: [4.40, 12.87], door: { x: 8.67, width: 1.2, into: -1 } },
];
export const meetingRoom = {
  id: 'meeting', name: '会议室', number: '04',
  inner: [-12.86, -6.98], zInner: [3.58, 7.77],
  // This leaf opens out into the corridor: swung inwards it would fence off the
  // room's east aisle together with the table.
  door: { x: -10, width: 1.4, into: -1 },
};

// Rooms are grouped by craft: design, engineering, and the shared team room.
// Seats stay indexed by character so the UI panel and the layout agree.
const assignment = [
  { id: 'design', actors: [0, 2, 4] },
  { id: 'dev', actors: [1, 3, 5] },
  { id: 'team', actors: [6, 7, 8] },
];
const seats = new Array(9);
const seatOffsets = [-2.7, 0, 2.7];
export const suiteSeats = seats;
for (const { id, actors } of assignment) {
  const room = suiteRooms.find(item => item.id === id);
  actors.forEach((actorIndex, slot) => {
    seats[actorIndex] = { x: room.centerX + seatOffsets[slot], z: SEAT_Z, yaw: Math.PI, room: id };
  });
}

export const suiteWallRuns = [
  {at:PARTITION_Z,from:SHELL.left,to:12.95,doors:suiteRooms.map(room=>room.door)},
  {at:meetingRoom.zInner[0],from:SHELL.left,to:-6.9,doors:[meetingRoom.door]},
  ...[-4.32,4.32,12.95].map(at=>({at,from:SHELL.back,to:PARTITION_Z-.08,axis:'z'})),
  {at:-6.9,from:meetingRoom.zInner[0]+.08,to:meetingRoom.zInner[1],axis:'z'},
  {at:meetingRoom.zInner[1],from:SHELL.left,to:-6.9},
];
const topology = wallObstacles(suiteWallRuns, wallSpec);
export const suiteWalls = topology.walls;
export const suiteLeaves = topology.leaves;

// id -> collision box. The office builder places each piece of furniture inside its
// own box, so what the player walks around is exactly what they can see.
export const suiteZones = [
  ...suiteRooms.flatMap(room => [
    { id: `${room.id}-sideboard`, kind: 'sideboard', x: room.centerX, z: -7.5, w: 5.2, d: .9 },
    { id: `${room.id}-plant`, kind: 'plant', x: room.centerX - 3.5, z: -1.2, w: .7, d: .7 },
  ]),
  { id: 'meeting-table', kind: 'meeting-table', x: -9.9, z: 6, w: 2.6, d: 1 },
  ...[4.9, 7.1].flatMap((z, row) => [-10.7, -9.9, -9.1].map((x, column) => (
    { id: `meeting-chair-${row}-${column}`, kind: 'meeting-chair', x, z, w: .5, d: .5 }))),
  { id: 'pantry-bar', kind: 'bar', x: -2.3, z: 7.2, w: 6.6, d: 1.05 },
  { id: 'pantry-back', kind: 'bar-back', x: -2.3, z: 7.85, w: 6.4, d: .5 },
  ...[-4.4, -2.3, -0.2].map((x, index) => ({ id: `stool-${index}`, kind: 'stool', x, z: 6.35, w: .45, d: .45 })),
  { id: 'lockers', kind: 'lockers', x: 3.7, z: 7.5, w: 2.6, d: .55 },
  { id: 'sofa', kind: 'sofa', x: 8.4, z: 6.9, w: 2.9, d: 1.5 },
  { id: 'coffee', kind: 'coffee', x: 8.4, z: 5.4, w: 1.3, d: .8 },
  { id: 'armchair-a', kind: 'armchair', x: 6.1, z: 5.5, w: 1, d: 1 },
  { id: 'armchair-b', kind: 'armchair', x: 10.7, z: 5.5, w: 1, d: 1 },
  { id: 'plant-corner-a', kind: 'plant', x: 12.4, z: 3, w: .7, d: .7 },
  { id: 'plant-corner-b', kind: 'plant', x: -5.9, z: 4.5, w: .7, d: .7 },
  { id: 'plant-corner-c', kind: 'plant', x: 11.9, z: 4.6, w: .7, d: .7 },
];

export function suiteObstacles(layout = suiteOffice) {
  return compileLayout(layout).obstacles;
}

export function seatForward(seat, distance = 1) {
  return { x: seat.x + Math.sin(seat.yaw) * distance, z: seat.z + Math.cos(seat.yaw) * distance };
}
export function seatExit(seat) {
  return seatForward(seat, -approach);
}

// The first character waits in the corridor; the other eight start at their desks.
const standingSpot = { x: 0, z: 2.6 };

export const suiteOffice = {
  environment: { assetId: 'partitioned-rooms', zones: suiteZones, wallRuns: suiteWallRuns, wallStyle: { jambKind: 'wood' }, walls: suiteWalls, leaves: suiteLeaves, wallSpec, deskSurface, deskThickness, deskItems },
  furniture: defineWorkstations('desk-low', suiteSeats, suiteSeats, { surface: deskSurface, thickness: deskThickness, deskItems, paletteIndices: suiteSeats.map(seat => Math.abs(Math.round(seat.x))) }),

  seating: { exitDistance: approach },
  render: { shadowFar: 60, groundSize: 200 },
  id: 'suite', capacity: 9, width: 26, depth: 16,
  bounds: { minX: -12.55, maxX: 12.55, minZ: -7.55, maxZ: 7.55 },
  shell: SHELL,
  partitionZ: PARTITION_Z,
  deskZ: DESK_Z,
  rooms: suiteRooms,
  meetingRoom,
  seats: suiteSeats,
  stations: suiteSeats,
  stationFor: suiteSeats.map((_, index) => index),
  camera: { position: [24, 21, 28], minHeight: 20, minWidth: 35, closeZoom: 5.5 },
  // A loop that walks the corridor and enters every work room through its door.
  patrol: [
    { x: 11.6, z: 1.7 }, { x: -11.6, z: 1.7 },
    { x: -8.67, z: 1 }, { x: -8.67, z: -1.9 }, { x: -8.67, z: 1 },
    { x: 0, z: 1.7 }, { x: 0, z: -1.9 }, { x: 0, z: 1.7 },
    { x: 8.67, z: 1 }, { x: 8.67, z: -1.9 }, { x: 8.67, z: 1 },
  ],
  actors: suiteCast.map((reference, index) => {
    const spot = index === 0 ? standingSpot : suiteSeats[index];
    return instantiateCharacter(reference, { x: spot.x, z: spot.z, phase: .2 + index * .73 });
  }),
};
