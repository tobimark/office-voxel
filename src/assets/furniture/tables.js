import { box, group, palette as c } from '../materials/art.js';
import { createDeskSlab } from './primitives.js';

export function createFacingTable(parent, { table, surface, thickness, supports, planters }) {
  const root = group(parent);
  const slab = createDeskSlab(root, { ...table, surface, thickness });
  box(root, table.x, surface - thickness - .09, table.z, table.w - .7, .07, .55, '#4a5a58');
  for (const point of supports) box(root, point.x, (surface - thickness) / 2, point.z, .12, surface - thickness, .5, c.white);
  for (const point of planters) {
    box(root, point.x, surface + .07, point.z, .5, .14, .34, '#e6d3b8');
    box(root, point.x, surface + .185, point.z, .34, .1, .22, c.leafLight);
    box(root, point.x, surface + .245, point.z, .18, .07, .14, c.leaf);
  }
  return { root, colliders: [slab.collision], anchors: { surface } };
}
