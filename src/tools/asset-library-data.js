// Discovery is separate from normalization so Node can test the catalog contract.
export function collectAssetLibrary(characterModules, furnitureModules) {
  const identities = new Map(), looks = new Map(), objects = new Map();
  function add(map, id, entry) {
    if (!id || map.has(id)) throw new Error(`Duplicate or missing asset ID: ${id}`);
    map.set(id, entry);
  }
  for (const [source, module] of Object.entries(characterModules)) {
    for (const entry of Object.values(module.characters ?? {})) add(identities, entry.id, entry);
    for (const entry of Object.values(module.appearances ?? {})) add(looks, entry.id, { ...entry, source });
  }
  const characters = [...looks.values()].map(look => {
    const identity = identities.get(look.characterId);
    if (!identity) throw new Error(`Unknown character for appearance: ${look.id}`);
    return { id: look.id, name: identity.name, role: identity.role, category: '人物',
      characterId: identity.id, description: look.signature ?? '基础外观', source: look.source,
      look: { ...look, name: identity.name, role: identity.role, x: 0, z: 0, phase: 0 } };
  });
  for (const [source, module] of Object.entries(furnitureModules)) {
    for (const entry of module.assetPreviews ?? []) {
      if (!entry.name || !entry.category || typeof entry.create !== 'function') throw new Error(`Invalid asset preview in ${source}`);
      add(objects, entry.id, { ...entry, source });
    }
  }
  return { characters, objects: [...objects.values()], identityCount: identities.size };
}

export function filterAssets(entries, query = '', category = '') {
  const term = query.trim().toLocaleLowerCase();
  return entries.filter(entry => (!category || entry.category === category)
    && [entry.id, entry.name, entry.role, entry.characterId, entry.description, entry.category]
      .filter(Boolean).join(' ').toLocaleLowerCase().includes(term));
}
