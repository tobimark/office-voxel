import { createChair, createDeskSlab, createKeyboard, createMonitor, createMug, createPlant } from './primitives.js';
import { monitorSpecs } from './spec.js';
import { material } from '../materials/art.js';

export const assetPreviews = [
  { id: 'chair', name: '办公椅', category: '座椅', description: '绿色靠背 · 十字底座',
    create: root => createChair(root, { x: 0, z: 0, yaw: 0 }) },
  { id: 'plant', name: '落地绿植', category: '装饰', description: '方块枝叶 · 陶色花盆',
    create: root => createPlant(root, 0, 0) },
  { id: 'mug', name: '马克杯', category: '桌面物品', description: '橙色杯身 · 方形杯柄',
    create: root => createMug(root, 0, 0, 0, '#d57645') },
  { id: 'desk-slab', name: '木质桌板', category: '桌子', description: '共享桌面组件',
    create: root => createDeskSlab(root, { w: 2.55, d: 1.28, surface: .15, thickness: .15 }) },
  { id: 'keyboard', name: '键盘', category: '桌面物品', description: '三排独立像素按键',
    create: root => createKeyboard(root, { x: 0, z: 0, yaw: 0 }, 0,
      { forward: 0, thickness: .035, depth: .25, keyHeight: .013 }) },
  ...Object.entries(monitorSpecs).map(([id, spec]) => ({
    id, name: { 'monitor-tall': '高支架显示器', 'monitor-wide': '宽屏显示器', 'monitor-compact': '紧凑显示器' }[id] ?? id,
    category: '显示器', description: '独立屏幕 · 可挂载任务画面',
    create: root => createMonitor(root, { spec, material: material('#708fa5') }),
  })),
];
