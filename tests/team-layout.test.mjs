import test from 'node:test';
import assert from 'node:assert/strict';
import { smallOffice, teamOffice, workstationObstacles } from '../src/layouts.js';
import { findPath, isWalkable } from '../src/navigation.js';

test('each office has a unique workstation for every character', () => {
  for (const layout of [smallOffice, teamOffice]) {
    assert.equal(layout.actors.length, layout.capacity);
    assert.equal(layout.stations.length, layout.capacity);
    assert.equal(new Set(layout.stationFor).size, layout.capacity);
    assert.equal(new Set(layout.actors.map(p => p.name)).size, layout.capacity);
    for (const index of layout.stationFor) assert.ok(layout.stations[index]);
  }
});

test('all nine workstation exits connect to the shared front aisle', () => {
  const layout = teamOffice;
  const obstacles = workstationObstacles(layout.stations);
  for (const station of layout.stations) {
    const exit = { x: station.x, z: station.z + 2.05 };
    assert.ok(isWalkable(exit.x, exit.z, obstacles, layout.bounds));
    const path = findPath(exit, layout.patrol[0], obstacles, layout.bounds);
    assert.ok(path?.length, `No path from station ${station.x},${station.z}`);
    assert.ok(path.every(p => isWalkable(p.x, p.z, obstacles, layout.bounds)));
  }
});

test('the team room supports navigation beyond the original room bounds', () => {
  const start = { x: 6.5, z: 6.8 }, end = { x: -5.75, z: 6.8 };
  assert.equal(findPath(start, end), null);
  assert.ok(findPath(start, end, workstationObstacles(teamOffice.stations), teamOffice.bounds)?.length);
});
