// Pure building topology shared by wall rendering and navigation compilation.
export function wallObstacles(runs, { thickness }) {
  if (!Number.isFinite(thickness) || thickness <= 0) throw new Error('Invalid wall thickness');
  const walls = [], leaves = [];
  for (const run of runs) {
    const axis = run.axis ?? 'x';
    if (!['x','z'].includes(axis) || ![run.at,run.from,run.to].every(Number.isFinite) || run.from >= run.to) throw new Error('Invalid wall run');
    const coordinate = door => axis === 'x' ? door.x : door.z;
    const doors = [...(run.doors ?? [])].sort((a,b) => coordinate(a) - coordinate(b));
    const segment = (from, to) => {
      if (to - from <= .001) return;
      walls.push(axis === 'x'
        ? { x: (from + to) / 2, z: run.at, w: to - from, d: thickness }
        : { x: run.at, z: (from + to) / 2, w: thickness, d: to - from });
    };
    let cursor = run.from;
    for (const door of doors) {
      const center = coordinate(door), start = center - door.width / 2, end = center + door.width / 2;
      if (!Number.isFinite(center) || !Number.isFinite(door.width) || door.width <= .14 || ![-1,1].includes(door.into) || start < cursor || end > run.to) throw new Error('Invalid wall door');
      segment(cursor, start); cursor = end;
      const length = door.width - .14;
      leaves.push(axis === 'x'
        ? {x:end-.06,z:run.at+door.into*(length/2+.06),w:.1,d:length}
        : {x:run.at+door.into*(length/2+.06),z:end-.06,w:length,d:.1});
    }
    segment(cursor, run.to);
  }
  return { walls, leaves };
}
