import test from 'node:test';
import assert from 'node:assert/strict';
import { loftOffice, loftSeats, loftTable, loftZones, loftObstacles, seatExit, seatForward, bankOffset, deskItems } from '../src/layouts/loft.js';
import { findPath, isWalkable } from '../src/engine/navigation.js';

test('the loft seats nine people in two banks facing one shared table', () => {
  const layout = loftOffice;
  assert.equal(layout.capacity, 9);
  assert.equal(layout.actors.length, 9);
  assert.equal(layout.stations.length, 9);
  assert.equal(new Set(layout.stationFor).size, 9);
  assert.equal(new Set(layout.actors.map(person => person.name)).size, 9);
  for (const index of layout.stationFor) assert.ok(layout.stations[index]);

  const north = loftSeats.filter(seat => seat.bank === 'north');
  const south = loftSeats.filter(seat => seat.bank === 'south');
  assert.equal(north.length, 5);
  assert.equal(south.length, 4);
  for (const seat of north) assert.equal(seat.yaw, 0);
  for (const seat of south) assert.equal(seat.yaw, Math.PI);
  for (const seat of north) assert.ok(seat.z < 0);
  for (const seat of south) assert.ok(seat.z > 0);

  for (const seat of loftSeats) {
    // Chairs stay clear of the table while leaving room for knees.
    const gap = Math.abs(seat.z) - .39 - loftTable.d / 2;
    assert.ok(gap > 0 && gap < .5, `seat ${seat.x} sits ${gap} from the table edge`);
    // Facing the table means a step of bankOffset lands on its centre line.
    const facing = seatForward(seat, bankOffset);
    assert.ok(Math.abs(facing.z) < 1e-9 && Math.abs(facing.x - seat.x) < 1e-9, `seat ${seat.x} does not face the table`);
  }
});

test('every loft seat has a clear step-out and reaches the shared walking loop', () => {
  const obstacles = loftObstacles();
  const layout = loftOffice;
  for (const seat of loftSeats) {
    // The seat itself is reserved by its chair: characters step out, then sit.
    assert.equal(isWalkable(seat.x, seat.z, obstacles, layout.bounds), false, `seat ${seat.x} should be occupied`);
    const exit = seatExit(seat);
    assert.ok(isWalkable(exit.x, exit.z, obstacles, layout.bounds), `blocked step-out at ${exit.x},${exit.z}`);
    const path = findPath(exit, layout.patrol[0], obstacles, layout.bounds);
    assert.ok(path?.length, `no path from seat ${seat.x},${seat.z}`);
    assert.ok(path.every(point => isWalkable(point.x, point.z, obstacles, layout.bounds)));
  }
});

test('the loft walking loop closes around both ends of the long table', () => {
  const obstacles = loftObstacles();
  const layout = loftOffice;
  const patrol = layout.patrol;
  assert.ok(patrol.length >= 4);
  for (const point of patrol) assert.ok(isWalkable(point.x, point.z, obstacles, layout.bounds), `blocked patrol point ${point.x},${point.z}`);
  for (let i = 0; i < patrol.length; i++) {
    const from = patrol[i], to = patrol[(i + 1) % patrol.length];
    const path = findPath(from, to, obstacles, layout.bounds);
    assert.ok(path?.length, `no path ${from.x},${from.z} -> ${to.x},${to.z}`);
  }
  // Both long aisles and both open ends are walkable end to end.
  assert.ok(isWalkable(0, -3.8, obstacles, layout.bounds));
  assert.ok(isWalkable(0, 3.8, obstacles, layout.bounds));
  assert.ok(isWalkable(-11.4, 0, obstacles, layout.bounds));
  assert.ok(isWalkable(10.5, 0, obstacles, layout.bounds));
});

test('typing hands rest on the keys instead of sinking into the table top', () => {
  // Seated "work" hand box, derived from src/assets/characters/model.js: hips lift to 0.59 in
  // world space, +0.16 forward shift, shoulder -1.48 rad, elbow -0.50, torso lean
  // 0.13, upper arm 0.27, forearm 0.24, hand box 0.19 x 0.09 x 0.22.
  const handOf = ({ height = 1, build = 1 }) => {
    const lean = .13;
    const y = .59 + (.5605 * height * Math.cos(lean) - .4888 * build * Math.sin(lean));
    const forward = .16 * build + .5605 * height * Math.sin(lean) + .4888 * build * Math.cos(lean);
    return { bottom: y - .045 * height, forward, depth: .22 * build };
  };
  const keys = deskItems.keyboard;
  const keyTop = loftTable.surface + keys.thickness + keys.keyHeight;
  const keyboard = { back: keys.forward - keys.depth / 2, front: keys.forward + keys.depth / 2 };
  for (const actor of loftOffice.actors) {
    const hand = handOf(actor);
    assert.ok(hand.bottom > loftTable.surface + .01, `${actor.name} sinks into the table top`);
    assert.ok(Math.abs(hand.bottom - keyTop) < .06, `${actor.name} misses the keys: hand ${hand.bottom.toFixed(3)} vs keys ${keyTop.toFixed(3)}`);
    assert.ok(hand.forward - hand.depth / 2 < keyboard.front && hand.forward + hand.depth / 2 > keyboard.back,
      `${actor.name} types beside the keyboard`);
  }
});

test('the loft is a longer, shallower room and keeps its furniture inside it', () => {
  const layout = loftOffice;
  assert.ok(layout.width > 20 && layout.depth > 12);
  assert.ok(layout.width !== 20 || layout.depth !== 17, 'the loft must not reuse the original team room');
  for (const zone of loftZones) {
    assert.ok(Math.abs(zone.x) + zone.w / 2 <= layout.width / 2 + .1, `${zone.id} overflows x`);
    assert.ok(Math.abs(zone.z) + zone.d / 2 <= layout.depth / 2 + .1, `${zone.id} overflows z`);
  }
  // No piece of furniture sits on a seat.
  for (const zone of loftZones) {
    for (const seat of loftSeats) {
      const overlaps = Math.abs(zone.x - seat.x) < (zone.w + .78) / 2 && Math.abs(zone.z - seat.z) < (zone.d + .78) / 2;
      assert.equal(overlaps, false, `${zone.id} overlaps the seat at ${seat.x},${seat.z}`);
    }
  }
});
