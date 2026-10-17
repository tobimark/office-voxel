import test from 'node:test';
import assert from 'node:assert/strict';
import { smallOffice, teamOffice } from '../src/layouts/index.js';
import { loftOffice } from '../src/layouts/loft.js';
import { suiteOffice } from '../src/layouts/suite.js';
import { floorOffice } from '../src/layouts/floor.js';
import { appearances } from '../src/assets/characters/catalog.js';
import { instantiateCharacter } from '../src/assets/characters/instances.js';
import { characterRoster } from '../src/tools/character-roster.js';
import { createBindings } from '../src/integrations/tasks/task-runtime.js';

test('all 54 instances reference stable identities and appearances with complete usages', () => {
  const usages = characterRoster().flatMap(entry => entry.usages);
  const ids = new Set();
  for (const layout of [smallOffice, teamOffice, loftOffice, suiteOffice, floorOffice]) {
    for (const actor of layout.actors) {
      assert.ok(!ids.has(actor.instanceId)); ids.add(actor.instanceId);
      assert.equal(appearances[actor.appearanceId].characterId, actor.characterId);
      assert.equal(usages.filter(u => u.instanceId === actor.instanceId).length, 1);
    }
  }
  assert.equal(ids.size, 54); assert.equal(usages.length, 54);
  const actor = teamOffice.actors[0], studio = smallOffice.actors[0];
  assert.equal(actor.characterId, studio.characterId);
  assert.notEqual(actor.appearanceId, studio.appearanceId);
  assert.throws(() => instantiateCharacter({ ...actor, appearanceId: 'unknown' }, actor), /Invalid character/);
  assert.throws(() => instantiateCharacter({ ...actor, characterId: 'asen' }, actor), /Invalid character/);
});

test('cast order and names do not replace explicit instance or business Agent IDs', () => {
  const layout = { ...smallOffice, actors: [...smallOffice.actors].reverse().map((p,i)=>({ ...p, name: 'renamed', agentId: `backend-${i}` })) };
  const displays = layout.stations.map((_,i)=>({kind:'computer', stationId:`studio:station:${i}`,id:`screen-${i}`}));
  const bindings = createBindings(layout, displays);
  assert.equal(bindings[0].actorId, smallOffice.actors[2].instanceId);
  assert.equal(bindings[0].agentId, 'backend-0');
  assert.equal(bindings[0].stationId, 'studio:station:1');
});
