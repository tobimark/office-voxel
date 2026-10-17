// All layouts measure the visible screen from the seated character's anchor,
// along the direction they face. Keep keyboard reach and seat/table spacing intact.
export const monitorPlacement = Object.freeze({
  screenDistance: 1.42,
  faceOffset: .012,
  get forward() { return this.screenDistance + this.faceOffset; },
});

// Furniture, displays and the runtime share explicit actor anchors in every layout.
export function workstationSeat(layout, stationIndex) {
  return layout.seats[stationIndex];
}
