import { box, group, panel, palette as c } from '../art.js';
import { furnitureSpec } from './furniture-spec.js';
export { furnitureSpec } from './furniture-spec.js';

// Collision envelopes are navigation reservations, not triangle bounds.
export const seatAxes = seat => ({ fx: Math.sin(seat.yaw), fz: Math.cos(seat.yaw), rx: Math.cos(seat.yaw), rz: -Math.sin(seat.yaw) });
export function seatPoint(seat, forward, side = 0) {
  const { fx, fz, rx, rz } = seatAxes(seat);
  return { x: seat.x + fx * forward + rx * side, z: seat.z + fz * forward + rz * side };
}
export function createMug(parent, x, y, z, color) {
  box(parent, x, y + .09, z, .16, .18, .16, color);
  box(parent, x, y + .185, z, .11, .01, .11, c.woodDark);
  box(parent, x + .11, y + .09, z, .08, .09, .07, color);
}
export function createPlant(parent, x, z, scale = 1, y = 0) {
  const root = group(parent, x, y, z); root.scale.setScalar(scale);
  box(root, 0, .19, 0, .42, .38, .42, '#e6d3b8');
  box(root, 0, .4, 0, .48, .08, .48, c.white);
  box(root, 0, .46, 0, .35, .05, .35, c.woodDark);
  box(root, 0, .78, 0, .09, .65, .09, c.woodDark);
  for (const [a, b, h, s] of [[-.22, 0, .9, .42], [.22, .06, 1.16, .46], [0, -.14, 1.42, .48], [-.12, .17, 1.23, .38], [.16, -.1, .77, .32]]) {
    box(root, a, h, b, s, s * .8, s, h > 1.2 ? c.leafLight : c.leaf);
  }
  return { root, collision: y ? null : { x, z, w: furnitureSpec.plant.w * scale, d: furnitureSpec.plant.d * scale } };
}
export function createChair(parent, seat) {
  const root = group(parent, seat.x, 0, seat.z); root.rotation.y = seat.yaw + Math.PI;
  box(root, 0, .57, 0, .74, .16, .68, c.green);
  box(root, 0, .94, .31, .74, .68, .14, c.green);
  box(root, 0, .29, 0, .09, .45, .09, c.ink);
  box(root, 0, .09, 0, .74, .08, .1, c.ink); box(root, 0, .09, 0, .1, .08, .66, c.ink);
  for (const sx of [-.33, .33]) for (const sz of [-.26, .26]) box(root, sx, .065, sz, .12, .12, .12, c.ink);
  return { root, seat: { ...seat }, collision: { x: seat.x, z: seat.z, ...furnitureSpec.chair } };
}
// x/z and yaw are the monitor mount in its parent's coordinates. The returned
// screen is the live display attachment; it must stay outside static batching.
export function createMonitor(parent, { x = 0, z = 0, yaw = 0, surface, faceOffset = .01, material, variant = 'shared' }) {
  const root = group(parent, x, 0, z); root.rotation.y = yaw;
  const legacy = variant === 'studio';
  const suite = variant === 'suite';
  box(root, 0, legacy ? 1.23 : surface + .015, 0, legacy ? .5 : .34, legacy ? .07 : .03, legacy ? .32 : .22, c.ink);
  box(root, 0, legacy ? 1.43 : surface + .195, legacy ? -.08 : -.09, legacy ? .09 : .08, legacy ? .40 : .32, legacy ? .09 : .08, c.ink);
  box(root, 0, legacy ? 1.70 : surface + .485, legacy ? -.06 : -.04, legacy || suite ? 1.05 : 1, legacy ? .65 : .6, legacy ? .10 : .09, c.ink);
  const screen = panel(root, 0, legacy ? 1.70 : surface + .485, legacy ? 0 : faceOffset, legacy || suite ? .94 : .92, legacy ? .53 : suite ? .5 : .52, material);
  return { root, screen, mount: { x, z, yaw } };
}
export function createDeskSlab(parent, { x = 0, z = 0, w, d, surface, thickness }) {
  const mesh = box(parent, x, surface - thickness / 2, z, w, thickness, d, c.wood, 'wood');
  return { mesh, collision: { x, z, w, d }, surface };
}
export function createKeyboard(parent, seat, surface, keys) {
  const p = seatPoint(seat, keys.forward), { fx, fz, rx, rz } = seatAxes(seat);
  box(parent, p.x, surface + keys.thickness / 2, p.z, .62, keys.thickness, keys.depth, '#e6e6d9');
  for (let row = 0; row < 3; row++) for (let col = 0; col < 9; col++) {
    const side = (col - 4) * .062, forward = (row - 1) * .068;
    box(parent, p.x + rx * side + fx * forward, surface + keys.thickness + keys.keyHeight / 2,
      p.z + rz * side + fz * forward, .05, keys.keyHeight, .045, '#99a3a1');
  }
}
