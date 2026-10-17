/**
 * A seat is an actor anchor (x/z/yaw), with an optional explicit exit point.
 * Desk construction coordinates remain in layout.stations for furniture builders.
 * The runtime consumes seats only; stationFor preserves backend/display identities.
 */
export function resolveSceneLayout(layout) {
  const fail = message => { throw new Error(`Invalid scene layout: ${message}`); };
  const finitePoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  if (!layout?.id || !Number.isInteger(layout.capacity) || layout.capacity < 1) fail('id/capacity');
  if (layout.actors?.length !== layout.capacity || layout.stationFor?.length !== layout.capacity) fail('actors/stationFor');
  if (!layout.actors.every(finitePoint)) fail('actor positions');
  if (!layout.seats?.length || layout.seats.length !== layout.stations?.length) fail('seats/stations');
  if (new Set(layout.stationFor).size !== layout.capacity || layout.stationFor.some(i => !Number.isInteger(i) || !layout.seats[i])) fail('seat assignment');
  if (!Number.isFinite(layout.width) || !Number.isFinite(layout.depth) || layout.width <= 0 || layout.depth <= 0) fail('dimensions');
  const b = layout.bounds;
  if (!b || ![b.minX, b.maxX, b.minZ, b.maxZ].every(Number.isFinite) || b.minX >= b.maxX || b.minZ >= b.maxZ) fail('bounds');
  if (!layout.patrol?.length || !layout.patrol.every(finitePoint)) fail('patrol');
  const c = layout.camera;
  if (c?.position?.length !== 3 || !c.position.every(Number.isFinite) || ![c.minWidth, c.minHeight, c.closeZoom].every(n => Number.isFinite(n) && n > 0)) fail('camera');
  const distance = layout.seating?.exitDistance ?? 1.05;
  if (!Number.isFinite(distance) || distance <= 0) fail('exitDistance');
  const seats = layout.seats.map((seat, i) => {
    if (!finitePoint(seat) || !Number.isFinite(seat.yaw)) fail(`seat ${i}`);
    const exit = seat.exit ?? { x: seat.x - Math.sin(seat.yaw) * distance, z: seat.z - Math.cos(seat.yaw) * distance };
    if (!finitePoint(exit)) fail(`seat ${i} exit`);
    return { ...seat, exit: { ...exit } };
  });
  return { ...layout, seats };
}

export function validateOffice({ office, obstacles, seats, displays }, layout) {
  if (!office?.isObject3D || !Array.isArray(obstacles) || seats?.length !== layout.seats.length || !Array.isArray(displays)) throw new Error('Invalid office builder result');
  for (let i = 0; i < seats.length; i++) {
    if (['x', 'z', 'yaw'].some(key => seats[i][key] !== layout.seats[i][key])) throw new Error(`Office seat ${i} differs from layout`);
  }
}
