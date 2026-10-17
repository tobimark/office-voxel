import { createWorkstation } from './workstations.js';

export const furnitureBuilders = Object.freeze({
  'desk-classic': createWorkstation,
  'desk-low': createWorkstation,
  'seat-facing': createWorkstation,
});
export function createFurniture(parent, instance, material) {
  if (!Object.hasOwn(furnitureBuilders, instance.assetId)) throw new Error('Unknown furniture asset: ' + instance.assetId);
  return furnitureBuilders[instance.assetId](parent, instance, material);
}
