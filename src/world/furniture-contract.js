import { furnitureSpec, workstationSpecs } from '../assets/furniture/spec.js';
import { monitorPlacement } from './workstation.js';

export function seatPoint(seat, forward, side = 0) {
  return { x: seat.x + Math.sin(seat.yaw) * forward + Math.cos(seat.yaw) * side,
    z: seat.z + Math.cos(seat.yaw) * forward - Math.sin(seat.yaw) * side };
}
export function rotatedBox(x, z, w, d, yaw = 0) {
  const cosine = Math.abs(Math.cos(yaw)), sine = Math.abs(Math.sin(yaw));
  return { x, z, w: w * cosine + d * sine, d: w * sine + d * cosine };
}
export function defineWorkstations(assetId, seats, stations, parameters = {}) {
  if (seats.length !== stations.length) throw new Error('Workstation anchor count mismatch');
  const { paletteIndices, ...options } = parameters;
  return seats.map((_, stationIndex) => ({
    id: `station-${stationIndex}`, assetId, stationIndex,
    parameters: { ...options, paletteIndex: paletteIndices?.[stationIndex] ?? stationIndex },
  }));
}

// Both the renderer and navigation consume this resolved instance. No preset
// imports and no duplicate authored world coordinates inside furniture assets.
export function resolveFurniture(instance, layout) {
  const seat = layout.seats[instance.stationIndex], station = layout.stations[instance.stationIndex];
  if (!seat || !station) throw new Error(`Missing workstation anchors: ${instance.id}`);
  const parameters = instance.parameters ?? {};
  const specification = workstationSpecs[instance.assetId];
  if (instance.assetId !== 'desk-classic' && (!Number.isFinite(parameters.surface) || parameters.surface <= 0 || !parameters.deskItems)) throw new Error('Invalid workstation parameters');
  if (parameters.paletteIndex !== undefined && (!Number.isInteger(parameters.paletteIndex) || parameters.paletteIndex < 0)) throw new Error('Invalid workstation palette');
  const classic = instance.assetId === 'desk-classic';
  const desk = seatPoint(seat, 1.18);
  const yaw = seat.yaw - Math.PI;
  const colliders = [];
  if (specification.hasDesk) colliders.push(rotatedBox(desk.x, desk.z, furnitureSpec.desk.w, furnitureSpec.desk.d, yaw));
  const chair = classic ? { x: desk.x + Math.sin(yaw) * 1.2, z: desk.z + Math.cos(yaw) * 1.2 } : seat;
  colliders.push(rotatedBox(chair.x, chair.z, furnitureSpec.chair.w, furnitureSpec.chair.d, yaw));
  const monitor = parameters.deskItems?.monitor;
  const screenDistance = classic ? monitorPlacement.screenDistance : monitor?.forward - monitor?.faceOffset;
  if (!Number.isFinite(screenDistance) || screenDistance <= 0) throw new Error('Invalid monitor placement');
  const screen = seatPoint(seat, screenDistance);
  return { ...instance, parameters, seat, station: desk, desk, yaw, colliders,
    anchors: { seat: { ...seat }, monitor: { ...screen, y: classic ? 1.70 : (parameters.surface ?? .98) + .485, yaw: seat.yaw + Math.PI } },
  };
}
