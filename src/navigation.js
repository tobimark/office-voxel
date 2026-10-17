// Local, deterministic grid navigation. Furniture bounds are inflated by the
// character radius, and diagonal corner cutting is intentionally disallowed.
export const ROOM = { minX: -5.5, maxX: 5.5, minZ: -3.9, maxZ: 3.9 };
export const STEP = 0.25;
export const RADIUS = 0.32;

export function isWalkable(x, z, obstacles = [], room = ROOM) {
  if (x < room.minX + RADIUS || x > room.maxX - RADIUS ||
      z < room.minZ + RADIUS || z > room.maxZ - RADIUS) return false;
  return !obstacles.some(o => x > o.x - o.w / 2 - RADIUS &&
    x < o.x + o.w / 2 + RADIUS && z > o.z - o.d / 2 - RADIUS &&
    z < o.z + o.d / 2 + RADIUS);
}

export function findPath(start, end, obstacles = [], room = ROOM) {
  if (!isWalkable(end.x, end.z, obstacles, room)) return null;
  const snap = p => ({ x: Math.round(p.x / STEP), z: Math.round(p.z / STEP) });
  const a = snap(start), b = snap(end), key = p => `${p.x},${p.z}`;
  if (!isWalkable(b.x * STEP, b.z * STEP, obstacles, room)) return null;
  const queue = [a], seen = new Map([[key(a), null]]);
  let index = 0;
  while (index < queue.length) {
    const point = queue[index++];
    if (key(point) === key(b)) {
      const path = [];
      let cursor = point;
      while (cursor && key(cursor) !== key(a)) {
        path.unshift({ x: cursor.x * STEP, z: cursor.z * STEP });
        cursor = seen.get(key(cursor));
      }
      path.push({ x: end.x, z: end.z });
      return path;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: point.x + dx, z: point.z + dz };
      if (seen.has(key(next)) || !isWalkable(next.x * STEP, next.z * STEP, obstacles, room)) continue;
      seen.set(key(next), point);
      queue.push(next);
    }
  }
  return null;
}
