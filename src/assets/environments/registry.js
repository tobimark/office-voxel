import { buildEnvironment as createOffice } from './open-office.js';
import { buildEnvironment as createLoftOffice } from './long-studio.js';
import { buildEnvironment as createSuiteOffice } from './glazed-rooms.js';
import { buildEnvironment as createFloorOffice } from './corridor-campus.js';

export const environmentBuilders = Object.freeze({
  'open-room': createOffice,
  'long-open-room': createLoftOffice,
  'partitioned-rooms': createSuiteOffice,
  'partitioned-floor': createFloorOffice,
  // A minimal environment makes new compositions possible without copying a room.
  empty(scene, layout, { placeFurniture, group }) {
    const office = group(scene);
    return { office, obstacles: [], displays: [], screens: placeFurniture(office), seats: layout.seats };
  },
});
