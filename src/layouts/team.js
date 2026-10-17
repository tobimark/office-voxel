import { instantiateCharacter } from '../assets/characters/instances.js';
import { seatsAtDesks } from '../world/workstation.js';
import { defineWorkstations } from '../world/furniture-contract.js';
import { teamCast } from '../assets/characters/casts.js';
const teamStations = [-5.6, -.7, 4.2].flatMap(z => [-4.25, 0, 4.25].map(x => ({ x, z })));


export const teamOffice = {
  environment: { assetId: 'open-room', windows: [-7.5, -3.9, -.3, 3.3], tagline: 'NINE PEOPLE. ONE TEAM.', signX: 7.35, loungeX: -8.35, loungeZ: 1.6, tableX: -6.8, rugX: -9, coffeeX: 8.25, wallClockZ: 4.5, secondaryBoard: true },
  furniture: defineWorkstations('desk-classic', seatsAtDesks(teamStations), teamStations),
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
