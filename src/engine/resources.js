import { isSharedArtResource } from '../assets/materials/art.js';

// Private GPU objects belong to this scene. Shared immutable art belongs to the
// lease pool, including during partial initialization. Continue after errors.
export function disposeSceneResources(scene) {
  const resources = new Set();
  scene.traverse(object => {
    if (object.isInstancedMesh) resources.add(object);
    if (object.geometry) resources.add(object.geometry);
    if (object.shadow?.map) resources.add(object.shadow.map);
    if (object.shadow?.mapPass) resources.add(object.shadow.mapPass);
    for (const material of Array.isArray(object.material) ? object.material : object.material ? [object.material] : []) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  const errors = [];
  for (const resource of resources) {
    if (isSharedArtResource(resource)) continue;
    try { resource.dispose(); } catch (error) { errors.push(error); }
  }
  scene.clear();
  if (errors.length) throw new AggregateError(errors, 'Private scene cleanup failed');
}
