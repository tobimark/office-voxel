import test from 'node:test';
import assert from 'node:assert/strict';
import {
  floorOffice, floorRooms, meetingRoom, floorSeats, floorWalls, floorLeaves, floorZones, floorObstacles,
  seatExit, seatForward, deskItems, tableSurface, approach, DOOR_WIDTH,
} from '../src/floor/layout.js';
import { findPath, isWalkable } from '../src/navigation.js';

test('the floor seats twenty-four people in six rooms of four', () => {
  const layout = floorOffice;
  assert.equal(layout.capacity, 24);
  assert.equal(layout.actors.length, 24);
  assert.equal(layout.stations.length, 24);
  assert.equal(new Set(layout.stationFor).size, 24);
  assert.equal(new Set(layout.actors.map(person => person.name)).size, 24);
  assert.equal(floorRooms.length, 6);
  for (const room of floorRooms) {
    const seats = floorSeats.filter(seat => seat.room === room.id);
    assert.equal(seats.length, 4, `${room.id} holds four seats`);
    for (const seat of seats) {
      assert.ok(seat.x > room.span[0] + .7 && seat.x < room.span[1] - .7, `${room.id} seat clears its walls`);
      assert.ok(seat.yaw === 0 || seat.yaw === Math.PI);
      // Everyone faces their table's centre line, and the chair clears its edge.
      const facing = seatForward(seat, 1.55);
      assert.ok(Math.abs(facing.z - seat.table.z) < 1e-9 && Math.abs(facing.x - seat.table.x) <= 4.9 / 2,
        `${room.id} seat does not face the table`);
      const gap = Math.abs(seat.z - seat.table.z) - .39 - 2.2 / 2;
      assert.ok(gap > 0 && gap < .5, `${room.id} chair sits ${gap} from the table edge`);
    }
  }
  // Each room starts four people, and the first character waits on foot.
  const perRoom = new Map();
  layout.actors.forEach((actor, index) => {
    const room = floorSeats[index].room;
    perRoom.set(room, (perRoom.get(room) ?? 0) + 1);
  });
  for (const room of floorRooms) assert.equal(perRoom.get(room.id), 4, `${room.id} staffed by four`);
  assert.ok(layout.actors[0].x !== floorSeats[0].x || layout.actors[0].z !== floorSeats[0].z, 'the first character starts on foot');
});

test('every room is walled, and can only be left through its own door', () => {
  const obstacles = floorObstacles(), layout = floorOffice;
  for (const wall of floorWalls) {
    assert.equal(isWalkable(wall.x, wall.z, obstacles, layout.bounds), false, `porous wall at ${wall.x},${wall.z}`);
  }
  for (const leaf of floorLeaves) {
    assert.equal(isWalkable(leaf.x, leaf.z, obstacles, layout.bounds), false, 'an open door leaf is still solid');
  }
  for (const room of floorRooms) {
    const doorZ = room.side === 'north' ? -layout.band : layout.band;
    assert.ok(isWalkable(room.door, doorZ, obstacles, layout.bounds), `${room.id} doorway must be open`);
    assert.equal(isWalkable(room.door + 2, doorZ, obstacles, layout.bounds), false, `${room.id} wall must be solid`);
    for (const seat of floorSeats.filter(item => item.room === room.id)) {
      assert.equal(isWalkable(seat.x, seat.z, obstacles, layout.bounds), false, 'the chair reserves the seat');
      const exit = seatExit(seat);
      assert.ok(isWalkable(exit.x, exit.z, obstacles, layout.bounds), `blocked step-out at ${exit.x},${exit.z}`);
      const path = findPath(exit, { x: room.door, z: 0 }, obstacles, layout.bounds);
      assert.ok(path?.length, `${room.id} seat cannot reach the corridor`);
      const throughDoor = path.some(point => Math.abs(point.x - room.door) <= DOOR_WIDTH / 2 + .1
        && Math.abs(Math.abs(point.z) - layout.band) < 1.2);
      assert.ok(throughDoor, `${room.id} left through a wall instead of its door`);
    }
  }
});

test('the meeting room closes the west end and stays walkable on both sides', () => {
  const obstacles = floorObstacles(), layout = floorOffice;
  const doorX = meetingRoom.inner[1] + .12;
  assert.ok(isWalkable(doorX, meetingRoom.door.z, obstacles, layout.bounds), 'meeting doorway must be open');
  assert.equal(isWalkable(doorX, meetingRoom.door.z + 2, obstacles, layout.bounds), false, 'meeting wall must be solid');
  assert.equal(isWalkable(meetingRoom.inner[0] + 2, 0, obstacles, layout.bounds), false, 'the table blocks its own footprint');
  assert.ok(isWalkable(-22, 0, obstacles, layout.bounds), 'west aisle');
  assert.ok(isWalkable(-18, -1.4, obstacles, layout.bounds), 'south aisle');
  const path = findPath({ x: 0, z: 0 }, { x: -22, z: 0 }, obstacles, layout.bounds);
  assert.ok(path?.length, 'the far aisle is reachable through the meeting door');
});

test('the corridor loop runs the plate and steps into three rooms', () => {
  const obstacles = floorObstacles(), layout = floorOffice, patrol = layout.patrol;
  for (const point of patrol) assert.ok(isWalkable(point.x, point.z, obstacles, layout.bounds), `blocked patrol point ${point.x},${point.z}`);
  for (let i = 0; i < patrol.length; i++) {
    const from = patrol[i], to = patrol[(i + 1) % patrol.length];
    const path = findPath(from, to, obstacles, layout.bounds);
    assert.ok(path?.length, `no path ${from.x},${from.z} -> ${to.x},${to.z}`);
  }
  for (const room of [floorRooms[0], floorRooms[4], floorRooms[2]]) {
    const inside = patrol.some(point => Math.abs(point.x - room.door) < .1
      && (room.side === 'north' ? point.z < -layout.band : point.z > layout.band));
    assert.ok(inside, `${room.id} is not on the loop`);
  }
  // The corridor itself is walkable end to end, past the pantry.
  assert.ok(findPath({ x: -16, z: 0 }, { x: 20, z: 0 }, obstacles, layout.bounds)?.length, 'corridor is blocked');
});

test('every piece of furniture stays on the plate and off the seats', () => {
  const layout = floorOffice;
  for (const zone of floorZones) {
    assert.ok(Math.abs(zone.x) + zone.w / 2 <= layout.width / 2 + .12, `${zone.id} overflows x`);
    assert.ok(Math.abs(zone.z) + zone.d / 2 <= layout.depth / 2 + .12, `${zone.id} overflows z`);
    for (const seat of floorSeats) {
      const overlaps = Math.abs(zone.x - seat.x) < (zone.w + .78) / 2 && Math.abs(zone.z - seat.z) < (zone.d + .78) / 2;
      assert.equal(overlaps, false, `${zone.id} overlaps the seat at ${seat.x},${seat.z}`);
    }
  }
  assert.ok(approach > .5);
});

test('typing hands rest on the keys for all twenty-four seats', () => {
  // Seated "work" hand box, derived from src/character.js: hips lift to 0.59 in
  // world space, +0.16 forward shift, shoulder -1.48 rad, elbow -0.50, torso lean
  // 0.13, upper arm 0.27, forearm 0.24, hand box 0.19 x 0.09 x 0.22.
  const handOf = ({ height = 1, build = 1 }) => {
    const lean = .13;
    const y = .59 + (.5605 * height * Math.cos(lean) - .4888 * build * Math.sin(lean));
    const forward = .16 * build + .5605 * height * Math.sin(lean) + .4888 * build * Math.cos(lean);
    return { bottom: y - .045 * height, forward, depth: .22 * build };
  };
  const keys = deskItems.keyboard;
  const keyTop = tableSurface + keys.thickness + keys.keyHeight;
  const keyboard = { back: keys.forward - keys.depth / 2, front: keys.forward + keys.depth / 2 };
  const tableEdge = 1.55 - 2.2 / 2;
  for (const actor of floorOffice.actors) {
    const hand = handOf(actor);
    assert.ok(hand.bottom > tableSurface + .01, `${actor.name} sinks into the table top`);
    assert.ok(Math.abs(hand.bottom - keyTop) < .06, `${actor.name} misses the keys: hand ${hand.bottom.toFixed(3)} vs keys ${keyTop.toFixed(3)}`);
    assert.ok(hand.forward - hand.depth / 2 > tableEdge, `${actor.name} types past the table edge`);
    assert.ok(hand.forward - hand.depth / 2 < keyboard.front && hand.forward + hand.depth / 2 > keyboard.back,
      `${actor.name} types beside the keyboard`);
  }
});
