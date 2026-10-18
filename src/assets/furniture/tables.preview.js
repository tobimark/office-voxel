import { createFacingTable } from './tables.js';

export const assetPreviews = [{
  id: 'facing-table', name: '对坐长桌', category: '桌子', description: '双侧共享桌面 · 中央绿植',
  create: root => createFacingTable(root, {
    table: { x: 0, z: 0, w: 6, d: 2.2 }, surface: .98, thickness: .15,
    supports: [{ x: -2.3, z: 0 }, { x: 2.3, z: 0 }],
    planters: [{ x: -1.5, z: 0 }, { x: 1.5, z: 0 }],
  }),
}];
