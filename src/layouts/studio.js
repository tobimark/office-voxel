import { instantiateCharacter } from '../assets/characters/instances.js';
import { seatsAtDesks } from '../world/workstation.js';
import { defineWorkstations } from '../world/furniture-contract.js';
import { studioCast } from '../assets/characters/casts.js';
const studioStations = [{ x: -3, z: -2.1 }, { x: .15, z: -2.1 }, { x: 3.3, z: -2.1 }];
export const smallOffice = {
  environment: { assetId: 'open-room', windows: [-3.85, -.65], tagline: 'MAKE SPACE FOR IDEAS.', signX: 3.65, loungeX: -4.48, loungeZ: 1.62, tableX: -2.85, rugX: -.3, coffeeX: 4.65, wallClockZ: 2.7, secondaryBoard: false },
  furniture: defineWorkstations('desk-classic', seatsAtDesks(studioStations), studioStations),
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
