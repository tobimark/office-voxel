import test from 'node:test';
import assert from 'node:assert/strict';
import { layouts, getLayout } from '../src/layouts/registry.js';
import { compileLayout } from '../src/world/compile-layout.js';
import { furnitureBuilders } from '../src/assets/furniture/registry.js';
import { monitorPlacement } from '../src/world/workstation.js';

const clone = value => structuredClone(value);

test('all presets compile workstation identities, seats, collisions and monitor anchors', () => {
  let count = 0;
  for (const preset of Object.values(layouts)) {
    const original = clone(preset), world = compileLayout(preset);
    assert.equal(world.furniture.length, preset.capacity);
    for (const instance of world.furniture) {
      assert.ok(Object.hasOwn(furnitureBuilders, instance.assetId));
      const seat = world.seats[instance.stationIndex];
      assert.deepEqual(instance.anchors.seat, seat);
      const monitor = instance.anchors.monitor;
      assert.ok(Math.abs(Math.hypot(monitor.x-seat.x, monitor.z-seat.z)-monitorPlacement.screenDistance)<1e-9);
      assert.ok(instance.colliders.length > 0);
      count++;
    }
    assert.deepEqual(preset, original, 'compilation must not mutate authored presets');
  }
  assert.equal(count,54);
  assert.throws(()=>getLayout('unknown'),/Unknown layout/);
});

test('a moved and rotated station updates visual inputs, reservations and monitor anchors together', () => {
  for (const preset of Object.values(layouts)) {
    const changed = clone(preset);
    changed.seats[0].x += .5; changed.seats[0].z += .4; changed.seats[0].yaw += Math.PI / 2;
    changed.stations[0].x += .5; changed.stations[0].z += .4;
    const world=compileLayout(changed), instance=world.furniture[0];
    assert.equal(instance.seat.x,changed.seats[0].x);
    assert.ok(Math.abs(instance.desk.x-(instance.seat.x+Math.sin(instance.seat.yaw)*1.18))<1e-9);
    assert.equal(instance.anchors.seat.yaw,changed.seats[0].yaw);
    assert.ok(Math.abs(instance.anchors.monitor.x-(instance.seat.x+Math.sin(instance.seat.yaw)*1.42))<1e-9);
    assert.notDeepEqual(instance.colliders,compileLayout(preset).furniture[0].colliders);
  }
});

test('reordered furniture keeps explicit station identity and invalid compositions fail early', () => {
  const preset=clone(layouts.team);preset.furniture.reverse();
  const compiled=compileLayout(preset);
  assert.equal(compiled.furniture[0].stationIndex,8);
  assert.deepEqual(compiled.furniture[0].seat,preset.seats[8]);
  for(const patch of [
    {furniture:preset.furniture.slice(1)},
    {furniture:preset.furniture.map(()=>preset.furniture[0])},
    {furniture:preset.furniture.map((p,i)=>i?p:{...p,assetId:'missing'})},
  ]) assert.throws(()=>compileLayout({...preset,...patch}));
});

test('wall-run edits compile both solid walls and open door-leaf reservations from fresh data', () => {
  const changed=clone(layouts.suite), before=compileLayout(changed);
  changed.environment.wallRuns[0].doors[0].x += .3;
  const after=compileLayout(changed);
  assert.notDeepEqual(after.environment.walls,before.environment.walls);
  assert.notDeepEqual(after.environment.leaves,before.environment.leaves);
  assert.ok(Math.abs(after.environment.leaves[0].x-before.environment.leaves[0].x-.3)<1e-9);
});

test('monitor configuration changes update the published mount instead of leaving a stale constant', () => {
  const preset=clone(layouts.loft);
  preset.furniture[0].parameters.deskItems.monitor.forward += .1;
  const world=compileLayout(preset), instance=world.furniture[0];
  assert.ok(Math.abs(Math.hypot(instance.anchors.monitor.x-instance.seat.x,instance.anchors.monitor.z-instance.seat.z)-1.52)<1e-9);
});
test('invalid asset dimensions and overlapping or out-of-range doors are rejected', () => {
  for(const update of [
    layout=>{layout.furniture[0].parameters.surface=NaN;},
    layout=>{layout.furniture[0].parameters.paletteIndex=-1;},
    layout=>{layout.environment.wallRuns[0].doors[0].width=100;},
    layout=>{layout.environment.wallRuns[0].doors.push({...layout.environment.wallRuns[0].doors[0]});},
    layout=>{layout.environment.zones[0].w=0;},
  ]) {
    const preset=clone(layouts.suite);update(preset);assert.throws(()=>compileLayout(preset));
  }
});
