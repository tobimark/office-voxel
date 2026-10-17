import test from 'node:test';
import assert from 'node:assert/strict';
import {
  suiteOffice, suiteRooms, meetingRoom, suiteSeats, suiteWalls, suiteLeaves, suiteZones, suiteObstacles,
  seatExit, deskItems, deskSurface,
} from '../src/suite/layout.js';
import { findPath, isWalkable } from '../src/navigation.js';

test('the suite seats nine people in three rooms of three, each facing its own desk', () => {
  const layout = suiteOffice;
  assert.equal(layout.capacity, 9);
  assert.equal(layout.actors.length, 9);
  assert.equal(layout.stations.length, 9);
  assert.equal(new Set(layout.stationFor).size, 9);
  assert.equal(new Set(layout.actors.map(person => person.name)).size, 9);
  assert.equal(suiteRooms.length, 3);
  for (const room of suiteRooms) {
    const seats = suiteSeats.filter(seat => seat.room === room.id);
    assert.equal(seats.length, 3, `${room.id} holds three seats`);
    assert.equal(room.door.width >= 1.1, true, `${room.id} needs a real door`);
    for (const seat of seats) {
      assert.ok(seat.x > room.inner[0] + .4 && seat.x < room.inner[1] - .4, `${room.id} seat clears its walls`);
      assert.equal(seat.yaw, Math.PI);
    }
  }
  // The desk sits in front of each seat, and its near edge leaves knee room.
  for (const seat of suiteSeats) {
    const deskNear = layout.deskZ + 1.28 / 2, chairFar = seat.z - .78 / 2;
    assert.ok(deskNear < chairFar, 'desk and chair must not overlap');
    assert.ok(chairFar - deskNear < .4, 'desk and chair must stay close');
  }
});

test('walls block, doors open, and no room can be left through a wall', () => {
  const obstacles = suiteObstacles(), layout = suiteOffice;
  for (const wall of suiteWalls) {
    assert.equal(isWalkable(wall.x, wall.z, obstacles, layout.bounds), false, `wall at ${wall.x},${wall.z} is porous`);
  }
  for (const leaf of suiteLeaves) {
    assert.equal(isWalkable(leaf.x, leaf.z, obstacles, layout.bounds), false, 'an open door leaf is still solid');
  }
  for (const room of suiteRooms) {
    const door = room.door, seat = suiteSeats.find(item => item.room === room.id);
    assert.ok(isWalkable(door.x, layout.partitionZ, obstacles, layout.bounds), `${room.id} doorway must be open`);
    assert.equal(isWalkable(door.x + 2, layout.partitionZ, obstacles, layout.bounds), false, `${room.id} wall must be solid`);
    const path = findPath(seatExit(seat), { x: door.x, z: 1.7 }, obstacles, layout.bounds);
    assert.ok(path?.length, `${room.id} cannot reach the corridor`);
    const throughDoor = path.some(point => Math.abs(point.x - door.x) <= door.width / 2 && Math.abs(point.z - layout.partitionZ) < .8);
    assert.ok(throughDoor, `${room.id} walked through a wall instead of its door`);
  }
  // A seat is reserved by its chair, so walking always starts at the step-out.
  for (const seat of suiteSeats) {
    assert.equal(isWalkable(seat.x, seat.z, obstacles, layout.bounds), false, 'the chair reserves the seat');
    const exit = seatExit(seat);
    assert.ok(isWalkable(exit.x, exit.z, obstacles, layout.bounds), `blocked step-out at ${exit.x},${exit.z}`);
  }
});

test('the meeting room is walled, doored, furnished and still walkable inside', () => {
  const obstacles = suiteObstacles(), layout = suiteOffice;
  const door = meetingRoom.door, north = meetingRoom.zInner[0];
  assert.ok(isWalkable(door.x, north, obstacles, layout.bounds), 'meeting doorway must be open');
  assert.equal(isWalkable(door.x - 3, north, obstacles, layout.bounds), false, 'meeting wall must be solid');
  assert.equal(isWalkable(-6.9, 6, obstacles, layout.bounds), false, 'east wall must be solid');
  assert.equal(isWalkable(-9.9, 6, obstacles, layout.bounds), false, 'the table blocks its own footprint');
  // Both side aisles and the strip behind the door stay usable.
  assert.ok(isWalkable(-12.2, 6, obstacles, layout.bounds), 'west aisle');
  assert.ok(isWalkable(-7.6, 5, obstacles, layout.bounds), 'east aisle');
  assert.ok(isWalkable(door.x, 4.2, obstacles, layout.bounds), 'entry strip');
  const path = findPath({ x: door.x, z: 1.7 }, { x: -7.6, z: 6.6 }, obstacles, layout.bounds);
  assert.ok(path?.length, 'the whole meeting room is reachable through its door');
});

test('the corridor loop walks all three work rooms through their doors', () => {
  const obstacles = suiteObstacles(), layout = suiteOffice, patrol = layout.patrol;
  for (const point of patrol) assert.ok(isWalkable(point.x, point.z, obstacles, layout.bounds), `blocked patrol point ${point.x},${point.z}`);
  for (let i = 0; i < patrol.length; i++) {
    const from = patrol[i], to = patrol[(i + 1) % patrol.length];
    const path = findPath(from, to, obstacles, layout.bounds);
    assert.ok(path?.length, `no path ${from.x},${from.z} -> ${to.x},${to.z}`);
  }
  for (const room of suiteRooms) {
    const inside = patrol.filter(point => Math.abs(point.x - room.centerX) < .1 && point.z < layout.partitionZ - .5);
    assert.ok(inside.length, `${room.id} is not on the loop`);
  }
});

test('every piece of furniture stays on the floor plate and off the seats', () => {
  const layout = suiteOffice;
  for (const zone of suiteZones) {
    assert.ok(Math.abs(zone.x) + zone.w / 2 <= layout.width / 2 + .12, `${zone.id} overflows x`);
    assert.ok(Math.abs(zone.z) + zone.d / 2 <= layout.depth / 2 + .12, `${zone.id} overflows z`);
    for (const seat of suiteSeats) {
      const overlaps = Math.abs(zone.x - seat.x) < (zone.w + .78) / 2 && Math.abs(zone.z - seat.z) < (zone.d + .78) / 2;
      assert.equal(overlaps, false, `${zone.id} overlaps the seat at ${seat.x},${seat.z}`);
    }
  }
});

test('typing hands rest on the keys instead of sinking into the desk top', () => {
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
  const keyTop = deskSurface + keys.thickness + keys.keyHeight;
  const keyboard = { back: keys.forward - keys.depth / 2, front: keys.forward + keys.depth / 2 };
  const deskEdge = 1.18 - 1.28 / 2;
  for (const actor of suiteOffice.actors) {
    const hand = handOf(actor);
    assert.ok(hand.bottom > deskSurface + .01, `${actor.name} sinks into the desk top`);
    assert.ok(Math.abs(hand.bottom - keyTop) < .06, `${actor.name} misses the keys: hand ${hand.bottom.toFixed(3)} vs keys ${keyTop.toFixed(3)}`);
    assert.ok(hand.forward - hand.depth / 2 > deskEdge, `${actor.name} types past the desk edge`);
    assert.ok(hand.forward - hand.depth / 2 < keyboard.front && hand.forward + hand.depth / 2 > keyboard.back,
      `${actor.name} types beside the keyboard`);
  }
});
