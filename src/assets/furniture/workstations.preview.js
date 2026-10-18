import { createFurniture, furnitureBuilders } from './registry.js';
import { resolveFurniture } from '../../world/furniture-contract.js';
import { monitorPlacement } from '../../world/workstation.js';
import { material } from '../materials/art.js';

const names = { 'desk-classic': '经典办公工位', 'desk-low': '低桌办公工位', 'seat-facing': '对坐桌面组合' };
export const assetPreviews = Object.keys(furnitureBuilders).map(id => ({
  id, name: names[id] ?? id, category: '工位组合',
  description: id === 'seat-facing' ? '显示器、键盘、椅子与桌面物品；桌板为独立素材' : '桌椅、显示器与桌面物品的完整组合',
  create(root) {
    const instance = resolveFurniture({ id: 'preview:station:0', assetId: id, stationIndex: 0,
      parameters: { paletteIndex: 0, surface: .98, thickness: .15, deskItems: {
        monitor: { forward: monitorPlacement.forward, faceOffset: monitorPlacement.faceOffset },
        keyboard: { forward: .82, thickness: .035, depth: .25, keyHeight: .013 },
        mouse: { forward: .8, side: .58 }, notebook: { forward: 1, side: -.85 }, mug: { forward: 1.4, side: .9 },
      } },
    }, { seats: [{ x: 0, z: 0, yaw: Math.PI }], stations: [{ x: 0, z: -1.18 }] });
    return createFurniture(root, instance, material('#708fa5'));
  },
}));
