import { characters, appearances } from './catalog.js';

export function instantiateCharacter(reference, placement) {
  const { characterId, appearanceId, instanceId } = reference;
  const identity = characters[characterId], appearance = appearances[appearanceId];
  if (!identity || !appearance || appearance.characterId !== characterId || !instanceId) throw new Error('Invalid character reference');
  if (![placement.x, placement.z, placement.phase].every(Number.isFinite)) throw new Error('Invalid character placement');
  const { id, characterId: owner, ...look } = appearance;
  return { name: identity.name, role: identity.role, ...look, x: placement.x, z: placement.z, phase: placement.phase, characterId, appearanceId, instanceId };
}
