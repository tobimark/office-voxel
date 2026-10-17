import test from 'node:test';
import assert from 'node:assert/strict';
import { monitorPlacement, workstationSeat } from '../src/world/workstation.js';
import { smallOffice, teamOffice } from '../src/layouts/index.js';
import { loftOffice, deskItems as loftItems, loftPlanterX } from '../src/layouts/loft.js';
import { floorOffice, deskItems as floorItems, floorPlanterOffsets } from '../src/layouts/floor.js';
import { suiteOffice, deskItems as suiteItems } from '../src/layouts/suite.js';

test('every scene uses one seat-relative screen specification without changing keyboard reach', () => {
  for (const items of [loftItems, floorItems, suiteItems]) {
    assert.equal(items.monitor, monitorPlacement);
    assert.ok(Math.abs(items.monitor.forward - items.monitor.faceOffset - monitorPlacement.screenDistance) < 1e-10);
    assert.equal(items.keyboard.forward, .72);
  }
  for (const layout of [smallOffice, teamOffice, loftOffice, floorOffice, suiteOffice]) {
    layout.stations.forEach((station, i) => {
      const seat = workstationSeat(layout, i);
      assert.equal(seat.x, station.x);
      assert.equal(seat.z, station.yaw === undefined ? station.z + 1.18 : station.z);
    });
  }
});

test('the facing monitors and their housings stay separated across the shared table', () => {
  // A monitor housing extends .04 + .09/2 behind its mounting origin.
  const housingBack = monitorPlacement.forward + .04 + .09 / 2;
  const clearance = 2 * (1.55 - housingBack);
  assert.ok(clearance > .05, `monitor housings overlap or are too close: ${clearance}`);
  assert.ok(monitorPlacement.screenDistance - .58 + .1 > .93, 'camera near plane clears the seated typing envelope');
});

test('centre-line plants stay between monitor columns after the screen distance is unified', () => {
  const minimumGap = .5 + .25; // monitor half-width + planter half-width
  for (const x of loftPlanterX) for (const seat of loftOffice.seats) assert.ok(Math.abs(x - seat.x) > minimumGap);
  for (const room of floorOffice.rooms) for (const offset of floorPlanterOffsets) {
    for (const seat of floorOffice.seats.filter(s => s.room === room.id)) assert.ok(Math.abs(room.centerX + offset - seat.x) > minimumGap);
  }
});
