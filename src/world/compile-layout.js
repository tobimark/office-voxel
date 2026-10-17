import { resolveSceneLayout } from './scene-contract.js';
import { resolveFurniture } from './furniture-contract.js';
import { wallObstacles } from './building.js';
import { workstationSpecs } from '../assets/furniture/spec.js';

export function compileLayout(definition) {
  const layout = resolveSceneLayout(definition);
  if (!layout.environment?.assetId) throw new Error('Missing environment asset');
  if (!Array.isArray(layout.furniture)) throw new Error('Missing furniture instances');
  const ids = new Set(), occupied = new Set();
  const furniture = layout.furniture.map(instance => {
    if (typeof instance.id !== 'string' || !instance.id || ids.has(instance.id)) throw new Error('Duplicate or missing furniture instance ID');
    if (!Number.isInteger(instance.stationIndex)) throw new Error('Invalid furniture station');
    if (occupied.has(instance.stationIndex)) throw new Error('Duplicate furniture station');
    if (!Object.hasOwn(workstationSpecs, instance.assetId)) throw new Error('Unknown furniture asset: ' + instance.assetId);
    ids.add(instance.id); occupied.add(instance.stationIndex);
    return resolveFurniture(instance, layout);
  });
  if (occupied.size !== layout.seats.length) throw new Error('Every station requires one furniture instance');
  const topology = layout.environment.wallRuns
    ? wallObstacles(layout.environment.wallRuns, layout.environment.wallSpec)
    : { walls: [], leaves: [] };
  const table = layout.table;
  const obstacles = [
    ...topology.walls, ...topology.leaves,
    ...(table ? [{ x: table.x, z: table.z, w: table.w, d: table.d }] : []),
    ...furniture.flatMap(instance => instance.colliders),
    ...(layout.environment.zones ?? []).map(({ x, z, w, d }) => ({ x, z, w, d })),
  ];
  if (obstacles.some(box => ![box.x,box.z,box.w,box.d].every(Number.isFinite) || box.w <= 0 || box.d <= 0)) throw new Error('Invalid world collision');
  return { ...layout, furniture, obstacles, environment: { ...layout.environment, ...topology } };
}
