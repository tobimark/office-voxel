import { appearances, characters } from '../characters/catalog.js';
import { smallOffice, teamOffice } from '../layouts.js';
import { loftOffice } from '../loft/layout.js';
import { suiteOffice } from '../suite/layout.js';
import { floorOffice } from '../floor/layout.js';

const LOOK_KEYS = ['name', 'role', 'signature', 'shirt', 'trim', 'pants', 'hair', 'skin', 'shoes', 'hairStyle', 'outfit', 'accessory', 'eyes', 'glasses', 'lashes', 'freckles', 'beard', 'beautyMark', 'height', 'build'];
export function characterRoster() {
  const layouts = [smallOffice, teamOffice, loftOffice, suiteOffice, floorOffice];
  return Object.values(appearances).map(appearance => {
    const identity = characters[appearance.characterId];
    const config = { ...identity, ...appearance };
    const look = Object.fromEntries(LOOK_KEYS.filter(key => config[key] !== undefined).map(key => [key, config[key]]));
    const [scene, slot] = appearance.id.split('-');
    const usages = layouts.flatMap(layout => layout.actors.flatMap((actor, index) => actor.appearanceId === appearance.id ? [{
      sceneId: layout.id, instanceId: actor.instanceId, actorIndex: index,
      stationId: `${layout.id}:station:${layout.stationFor[index]}`,
    }] : []));
    return { id: appearance.id, characterId: appearance.characterId, fingerprint: JSON.stringify(look), scene, index: Number(slot),
      name: identity.name, role: identity.role, signature: appearance.signature || '', look,
      usedBy: usages.map(usage => `${usage.sceneId}-${String(usage.actorIndex).padStart(2, '0')}`), usages };
  });
}
export function rosterSummary() {
  const roster = characterRoster();
  const count = scene => roster.filter(entry => entry.scene === scene).length;
  return { total: roster.length, studio: count('studio'), team: count('team'), floor: count('floor') };
}
