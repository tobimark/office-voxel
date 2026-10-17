import { smallOffice } from './studio.js';
import { teamOffice } from './team.js';
import { loftOffice } from './loft.js';
import { suiteOffice } from './suite.js';
import { floorOffice } from './floor.js';

export const layouts = Object.freeze({ studio: smallOffice, team: teamOffice, loft: loftOffice, suite: suiteOffice, floor: floorOffice });
export function getLayout(id) {
  const layout = Object.hasOwn(layouts, id) ? layouts[id] : undefined;
  if (!layout) throw new Error('Unknown layout: ' + id);
  return layout;
}
