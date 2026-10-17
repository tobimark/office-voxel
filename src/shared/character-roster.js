// The single list of every distinct character look in this example. Both the asset
// exporter and its test read this module, so the files on disk and the layouts can
// never drift apart. It imports layouts only — no DOM, no three.js — so plain Node
// can use it too.
import { smallOffice, teamOffice } from '../layouts.js';
import { floorOffice } from '../floor/layout.js';

// Everything that makes a character look the way it does. Position and animation
// phase are deliberately excluded: the same look reused in another room is one asset.
const LOOK_KEYS = [
  'name', 'role', 'signature',
  'shirt', 'trim', 'pants', 'hair', 'skin', 'shoes',
  'hairStyle', 'outfit', 'accessory', 'eyes', 'glasses',
  'lashes', 'freckles', 'beard', 'beautyMark', 'height', 'build',
];

export function characterRoster() {
  const byLook = new Map();
  const add = (scene, index, config) => {
    const look = Object.fromEntries(LOOK_KEYS.filter(key => config[key] !== undefined).map(key => [key, config[key]]));
    const fingerprint = JSON.stringify(look);
    const usage = `${scene}-${String(index).padStart(2, '0')}`;
    const existing = byLook.get(fingerprint);
    if (existing) { existing.usedBy.push(usage); return; }
    byLook.set(fingerprint, {
      id: usage, fingerprint, scene, index,
      name: config.name, role: config.role, signature: config.signature || '',
      look, usedBy: [usage],
    });
  };
  smallOffice.actors.forEach((config, index) => add('studio', index, config));
  teamOffice.actors.forEach((config, index) => add('team', index, config));
  floorOffice.actors.forEach((config, index) => add('floor', index, config));
  return [...byLook.values()];
}

// Handy for documentation and assertions: 3 studio looks, 9 team looks, and the 15
// characters the big floor page adds on top of the team nine.
export function rosterSummary() {
  const roster = characterRoster();
  const count = scene => roster.filter(entry => entry.scene === scene).length;
  return { total: roster.length, studio: count('studio'), team: count('team'), floor: count('floor') };
}
