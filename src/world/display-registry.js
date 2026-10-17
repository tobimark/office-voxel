export function registerDisplay(displays, kind, mesh, options = {}) {
  const entry = { id: options.id ?? `${kind}-${displays.length}`, kind, mesh, width: mesh.geometry.parameters.width, height: mesh.geometry.parameters.height, ...options };
  mesh.userData.displayId = entry.id;
  displays.push(entry);
  return mesh;
}

// Each builder supplies screens in its explicit station construction order.
export function registerComputers(displays, screens, layout) {
  screens.forEach((mesh, stationIndex) => {
    const seat = (layout.seats ?? layout.stations)[stationIndex];
    registerDisplay(displays, 'computer', mesh, { id: `${layout.id}:computer:${stationIndex}`, stationId: `${layout.id}:station:${stationIndex}`, roomId: seat.roomId ?? seat.room });
  });
  return displays;
}
