import { studioCast, teamCast } from './characters/casts.js';
import { instantiateCharacter } from './characters/instances.js';
import { furnitureSpec } from './shared/furniture-spec.js';
// Scene data is shared by the renderer and navigation checks. Each page selects
// its own layout; the original three-person room remains the default.
const studioStations = [{ x: -3, z: -2.1 }, { x: .15, z: -2.1 }, { x: 3.3, z: -2.1 }];
// These two furniture builders use desk centres; publish actor anchors explicitly.
const seatsAtDesks = stations => stations.map(p => ({
  x: p.x, z: p.z + 1.18, yaw: Math.PI,
  exit: { x: p.x, z: p.z + 2.05 },
}));
export const smallOffice = {
  id: 'studio', capacity: 3, width: 12, depth: 9,
  bounds: { minX: -5.5, maxX: 5.5, minZ: -3.9, maxZ: 3.9 },
  stations: studioStations,
  seats: seatsAtDesks(studioStations),
  stationFor: [1, 0, 2],
  render: { shadowSize: 10, shadowFar: 35, groundSize: 200 },
  camera: { position: [12, 10, 14], maxZoom: 4, minHeight: 10.5, minWidth: 16.5, closeZoom: 3.2 },
  patrol: [{ x: 2.65, z: 2.95 }, { x: -.65, z: 2.85 }, { x: .15, z: .1 }],
  actors: studioCast.map((reference, i) => instantiateCharacter(reference, [
    { x: .3, z: 1.6, phase: .2 }, { x: -3, z: -.92, phase: 1.8 }, { x: 3.3, z: -.92, phase: 3.1 },
  ][i])),
};

const teamStations = [-5.6, -.7, 4.2].flatMap(z => [-4.25, 0, 4.25].map(x => ({ x, z })));


export const teamOffice = {
  id: 'team', capacity: 9, width: 20, depth: 17,
  bounds: { minX: -9.5, maxX: 9.5, minZ: -7.9, maxZ: 7.9 },
  stations: teamStations,
  seats: seatsAtDesks(teamStations),
  render: { shadowSize: 16, shadowFar: 50, groundSize: 200 },
  stationFor: teamCast.map((_, i) => i),
  camera: { position: [20, 18, 23], minHeight: 18.5, minWidth: 28, closeZoom: 5 },
  patrol: [{ x: 6.5, z: 6.8 }, { x: -5.75, z: 6.8 }, { x: -6.25, z: -2.5 }, { x: 6.5, z: -2.5 }],
  actors: teamCast.map((reference, i) => instantiateCharacter(reference, {
    x: teamStations[i].x, z: teamStations[i].z + (i === 0 ? 2.05 : 1.18), phase: .2 + i * .73,
  })),
};

export function workstationObstacles(stations) {
  return stations.flatMap(p => [
    { x: p.x, z: p.z, ...furnitureSpec.desk },
    { x: p.x, z: p.z + 1.2, ...furnitureSpec.chair },
  ]);
}
