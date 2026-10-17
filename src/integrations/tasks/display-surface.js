import * as THREE from 'three';

export function createDisplaySurface(entry) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let texture, material;
  function makeTexture() {
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.minFilter = map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
    return map;
  }
  function resize(compact) {
    const width = entry.kind === 'computer' ? compact ? 256 : 384 : 576;
    const height = Math.max(120, Math.round(width * entry.height / entry.width / 12) * 12);
    if (canvas.width === width && canvas.height === height) return false;
    canvas.width = width; canvas.height = height; ctx.imageSmoothingEnabled = false;
    // GPU texture dimensions are immutable after first upload. Recreate the
    // backing texture on breakpoint changes to avoid partial-upload remnants.
    if (texture) { texture.dispose(); texture = makeTexture(); material.map = texture; material.needsUpdate = true; }
    return true;
  }
  resize(false);
  texture = makeTexture();
  material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const previousMaterial = entry.mesh.material;
  entry.mesh.material = material;
  let revision = 0;
  return {
    canvas, ctx, resize,
    draw(fn) { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); fn(ctx, canvas.width, canvas.height); ctx.restore(); texture.needsUpdate = true; revision++; },
    get revision() { return revision; },
    dispose() { entry.mesh.material = previousMaterial; texture.dispose(); material.dispose(); },
  };
}
