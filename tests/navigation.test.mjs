import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, isWalkable, STEP } from '../src/engine/navigation.js';

test('route goes around a desk with clearance for the body', () => {
  const obstacles = [{ x: 0, z: 0, w: 2, d: 2 }];
  const start = { x: -3, z: 0 };
  const path = findPath(start, { x: 3, z: 0 }, obstacles);
  assert.ok(path?.length);
  let previous = start;
  for (const point of path) {
    assert.ok(isWalkable(point.x, point.z, obstacles));
    assert.ok(Math.hypot(point.x - previous.x, point.z - previous.z) <= STEP + 0.001);
    previous = point;
  }
  assert.deepEqual(path.at(-1), { x: 3, z: 0 });
});
test('rejects furniture and targets outside the room', () => {
  assert.equal(findPath({ x: 0, z: 2 }, { x: 0, z: 0 }, [{ x: 0, z: 0, w: 2, d: 2 }]), null);
  assert.equal(findPath({ x: 0, z: 0 }, { x: 20, z: 0 }), null);
});
test('does not cross a wall that divides the room', () => {
  assert.equal(findPath({ x: -3, z: 0 }, { x: 3, z: 0 }, [{ x: 0, z: 0, w: 1, d: 8 }]), null);
});
test('keeps exact reachable destination', () => {
  assert.deepEqual(findPath({ x: 0, z: 0 }, { x: 1.1, z: 1.1 }).at(-1), { x: 1.1, z: 1.1 });
});
