import { furnitureSpec } from '../shared/furniture-spec.js';
// Loft studio: a long, shallow open studio where nine people sit in two banks
// facing each other across one shared table. Seats, the table and every solid
// furniture zone live here as plain data so the renderer and the navigation
// tests share one source of truth. Only the nine characters' looks are read from
// the original team layout; no original file is touched by this page.
import { loftCast } from '../characters/casts.js';
import { instantiateCharacter } from '../characters/instances.js';
import { monitorPlacement } from '../shared/workstation.js';

// Seat distance from the table's centre line. The table is 2.2 deep, so a seat of
// 1.55 leaves a 0.45 approach to the near edge: enough for the typing hands to
// reach the keyboard (which sits ~0.72 forward) without the body meeting the slab.
export const bankOffset = 1.55;
export const approach = 1.05;   // step-out distance behind a chair

const northX = [-8.8, -4.4, 0, 4.4, 8.8];
const southX = [-6.6, -2.2, 2.2, 6.6];

// Five seats look towards +z, four look towards -z, so every desk faces the table.
export const loftSeats = [
  ...northX.map(x => ({ x, z: -bankOffset, yaw: 0, bank: 'north' })),
  ...southX.map(x => ({ x, z: bankOffset, yaw: Math.PI, bank: 'south' })),
];

export function seatForward(seat, distance = 1) {
  return { x: seat.x + Math.sin(seat.yaw) * distance, z: seat.z + Math.cos(seat.yaw) * distance };
}
export function seatExit(seat) {
  return seatForward(seat, -approach);
}

// The table top is height-matched to the typing pose, not to a real desk: the
// seated hand box bottoms out around y = 1.04 (see the contract test), so a
// 0.98 surface puts the keys under the fingers instead of burying the hands.
export const loftTable = { x: 0, z: 0, w: 19.4, d: 2.2, surface: .98, thickness: .15 };

// Desk items, measured forward of a seat and vertically from the table surface.
export const deskItems = {
  keyboard: { forward: .72, depth: .22, thickness: .045, keyHeight: .013 },
  monitor: monitorPlacement,
  mouse: { forward: .74, side: .48 },
  notebook: { forward: .66, side: .82 },
  mug: { forward: .8, side: -.95 },
};

// Keep centre-line planters between monitor columns, clear of their backs.
export const loftPlanterX = [-5.5, -1.1, 3.3, 7.7];

// id -> collision box. The office builder places each piece of furniture inside
// its own box, so what the player walks around is exactly what they can see.
export const loftZones = [
  { id: 'bar', x: 11.95, z: -1.1, w: 1, d: 5 },
  { id: 'bar-back', x: 12.72, z: -1.1, w: .45, d: 4.8 },
  { id: 'stool-a', x: 11.25, z: -2.9, w: .45, d: .45 },
  { id: 'stool-b', x: 11.25, z: -1.1, w: .45, d: .45 },
  { id: 'stool-c', x: 11.25, z: .7, w: .45, d: .45 },
  { id: 'file-n', x: -12.45, z: -5.4, w: .8, d: 1.2 },
  { id: 'file-s', x: -12.45, z: 5.4, w: .8, d: 1.2 },
  { id: 'low-left', x: -10, z: -7.3, w: 4.5, d: 1.1 },
  { id: 'low-right', x: 6.2, z: -7.35, w: 10, d: .9 },
  { id: 'sofa', x: -9, z: 6.7, w: 2.9, d: 1.5 },
  { id: 'armchair', x: -6.4, z: 6.2, w: 1, d: 1 },
  { id: 'coffee', x: -8.6, z: 5.1, w: 1.3, d: .8 },
  { id: 'booth', x: -1.9, z: 6.5, w: 2.1, d: 2.1 },
  { id: 'lockers', x: 2.8, z: 7.2, w: 3.4, d: .55 },
  { id: 'reader', x: 7.6, z: 6.5, w: 1, d: 1 },
  { id: 'side', x: 6.35, z: 6.7, w: .5, d: .5 },
  { id: 'lamp', x: 8.6, z: 6.6, w: .35, d: .35 },
  { id: 'plant-nw', x: -11.9, z: -6.6, w: .7, d: .7 },
  { id: 'plant-sw', x: -11.9, z: 6.6, w: .7, d: .7 },
  { id: 'plant-bk1', x: -6.9, z: -7, w: .7, d: .7 },
  { id: 'plant-bk2', x: 2.6, z: -7, w: .7, d: .7 },
  { id: 'plant-bar', x: 11.7, z: 3.2, w: .7, d: .7 },
  { id: 'plant-front', x: 5.4, z: 6.9, w: .7, d: .7 },
];

export function loftObstacles() {
  return [
    { x: loftTable.x, z: loftTable.z, w: loftTable.w, d: loftTable.d },
    ...loftSeats.map(seat => ({ x: seat.x, z: seat.z, ...furnitureSpec.chair })),
    ...loftZones.map(({ x, z, w, d }) => ({ x, z, w, d })),
  ];
}

// The first character starts on foot in the south aisle; the other eight sit down.
const standingSpot = { x: 2.6, z: 3.9 };

export const loftOffice = {
  seating: { exitDistance: approach },
  render: { shadowFar: 60, groundSize: 200 },
  id: 'loft', capacity: 9, width: 26, depth: 16,
  bounds: { minX: -12.55, maxX: 12.55, minZ: -7.55, maxZ: 7.55 },
  table: loftTable,
  seats: loftSeats,
  stations: loftSeats,
  stationFor: loftSeats.map((_, index) => index),
  camera: { position: [24, 20, 28], minHeight: 19, minWidth: 34, closeZoom: 5.5 },
  // A loop that walks both aisles, both open ends, and passes the bar.
  patrol: [
    { x: 8.6, z: -3.8 }, { x: -11.4, z: -3.8 }, { x: -11.4, z: 0 },
    { x: -10.6, z: 3.8 }, { x: 8.6, z: 3.8 }, { x: 10.5, z: 2.6 },
  ],
  actors: loftCast.map((reference, index) => {
    const spot = index === 0 ? standingSpot : loftSeats[index];
    return instantiateCharacter(reference, { x: spot.x, z: spot.z, phase: .2 + index * .73 });
  }),
};
