import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSceneLayout } from '../src/world/scene-contract.js';
import { createLifetime } from '../src/engine/lifetime.js';
import { smallOffice, teamOffice, workstationObstacles } from '../src/layouts/index.js';
import { loftOffice, seatExit as loftExit, loftObstacles } from '../src/layouts/loft.js';
import { suiteOffice, seatExit as suiteExit, suiteObstacles } from '../src/layouts/suite.js';
import { floorOffice, seatExit as floorExit, floorObstacles } from '../src/layouts/floor.js';
import { findPath } from '../src/engine/navigation.js';

test('studio/team desk anchors resolve to the original actor seats and safe exits', () => {
  for (const definition of [smallOffice, teamOffice]) {
    const layout = resolveSceneLayout(definition);
    definition.stations.forEach((desk, i) => {
      const seat = layout.seats[i];
      assert.ok(Math.abs(seat.z - (desk.z + 1.18)) < 1e-10);
      assert.equal(seat.x, desk.x);
      assert.equal(seat.yaw, Math.PI);
      assert.ok(Math.abs(seat.exit.z - (desk.z + 2.05)) < 1e-10);
      assert.ok(findPath(seat.exit, layout.patrol[0], workstationObstacles(definition.stations), layout.bounds));
    });
    assert.notEqual(layout.seats, definition.seats, 'normalization must not mutate furniture data');
  }
});

test('oriented seats preserve every layout exit and its route to the walking loop', () => {
  for (const [definition, exit, obstacles] of [[loftOffice, loftExit, loftObstacles], [suiteOffice, suiteExit, suiteObstacles], [floorOffice, floorExit, floorObstacles]]) {
    const layout = resolveSceneLayout(definition);
    layout.seats.forEach((seat, i) => {
      assert.deepEqual(seat.exit, exit(definition.seats[i]));
      assert.ok(findPath(seat.exit, layout.patrol[0], obstacles(), layout.bounds), `${layout.id} seat ${i} exit must remain reachable`);
    });
    assert.deepEqual(layout.stationFor, definition.stationFor);
  }
});

test('invalid assignments, coordinates and explicit exits fail before mounting', () => {
  for (const patch of [
    { capacity: 0 }, { stationFor: [0, 0, 2] }, { stationFor: [0, 1, 99] },
    { actors: smallOffice.actors.map(actor => ({ ...actor, instanceId: 'duplicate' })) },
    { seats: smallOffice.seats.map((seat, i) => i ? seat : { ...seat, yaw: NaN }) },
    { seats: smallOffice.seats.map((seat, i) => i ? seat : { ...seat, exit: { x: 0, z: Infinity } }) },
    { camera: { ...smallOffice.camera, minHeight: 0 } },
  ]) assert.throws(() => resolveSceneLayout({ ...smallOffice, ...patch }), /Invalid scene layout/);
});

test('lifetime cleans once in reverse order and continues after cleanup errors', () => {
  const lifetime = createLifetime(), calls = [];
  lifetime.add(() => calls.push('first'));
  lifetime.add(() => { calls.push('second'); throw new Error('release failed'); });
  lifetime.add(() => calls.push('third'));
  assert.throws(() => lifetime.dispose(), AggregateError);
  assert.deepEqual(calls, ['third', 'second', 'first']);
  lifetime.dispose();
  assert.equal(calls.length, 3);
  lifetime.add(() => calls.push('late'));
  assert.equal(calls.at(-1), 'late');
});
