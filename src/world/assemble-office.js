import { group, batchStaticBoxes, canvasMaterial } from '../assets/materials/art.js';
import { environmentBuilders } from '../assets/environments/registry.js';
import { createFurniture } from '../assets/furniture/registry.js';
import { compileLayout } from './compile-layout.js';
import { validateOffice } from './scene-contract.js';
import { registerComputers } from './display-registry.js';

export function assembleOffice(scene, definition) {
  const layout = compileLayout(definition);
  const builder = environmentBuilders[layout.environment.assetId];
  if (!Object.hasOwn(environmentBuilders, layout.environment.assetId)) throw new Error('Unknown environment asset: ' + layout.environment.assetId);
  const instances = [];
  const built = builder(scene, layout, { group, placeFurniture(parent, screenMaterial) {
    const material = screenMaterial ?? canvasMaterial(64, 40, ctx => { ctx.fillStyle = '#293e40'; ctx.fillRect(0, 0, 64, 40); }, true);
    const screens = [];
    for (const instance of layout.furniture) {
      const result = createFurniture(parent, instance, material);
      instances.push({ id: instance.id, stationIndex: instance.stationIndex, ...result });
      screens[instance.stationIndex] = result.screens[0];
    }
    return screens;
  } });
  // Environment-specific decorations may add reservations as they are built.
  const obstacles = [...layout.obstacles, ...built.obstacles];
  batchStaticBoxes(built.office);
  registerComputers(built.displays, built.screens, layout);
  const result = { ...built, obstacles, seats: layout.seats, instances };
  validateOffice(result, layout);
  return result;
}
