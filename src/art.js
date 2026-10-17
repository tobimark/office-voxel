import * as THREE from 'three';

export const palette = {
  cream: '#ececdb', wood: '#c9a477', woodDark: '#987754', green: '#79917a',
  leaf: '#63865c', leafLight: '#8caa70', ink: '#293635', white: '#f8f9f5',
  orange: '#d57645', blue: '#708fa5', floor: '#cfb18b', skin: '#edc19d',
};
const cache = new Map();
const geometry = new THREE.BoxGeometry(1, 1, 1);
let seed = 19;
function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }

export function texture(color, kind = 'noise') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, 32, 32);
  for (let i = 0; i < 110; i++) {
    ctx.fillStyle = random() > .5 ? '#ffffff0a' : '#0000000b';
    ctx.fillRect(Math.floor(random() * 32), Math.floor(random() * 32), kind === 'wood' ? 8 : 2, 1 + Math.floor(random() * 2));
  }
  const map = new THREE.CanvasTexture(canvas);
  map.magFilter = map.minFilter = THREE.NearestFilter;
  map.colorSpace = THREE.SRGBColorSpace;
  return map;
}
export function material(color, kind = 'noise') {
  const key = `${color}:${kind}`;
  if (!cache.has(key)) cache.set(key, new THREE.MeshStandardMaterial({ map: texture(color, kind), roughness: .9 }));
  return cache.get(key);
}
export function box(parent, x, y, z, w, h, d, color, kind = 'noise') {
  const mesh = new THREE.Mesh(geometry, color?.isMaterial ? color : material(color, kind));
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}
export function group(parent, x = 0, y = 0, z = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
}
export function canvasMaterial(width, height, draw, lit = false) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.magFilter = map.minFilter = THREE.NearestFilter;
  return lit ? new THREE.MeshBasicMaterial({ map }) : new THREE.MeshStandardMaterial({ map, roughness: 1 });
}
export function panel(parent, x, y, z, w, h, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.position.set(x, y, z); parent.add(mesh); return mesh;
}

export function batchStaticBoxes(root) {
  root.updateMatrixWorld(true);
  const batches = new Map();
  root.traverse(object => {
    if (object.isMesh && object.geometry === geometry) {
      const key = object.material.uuid;
      if (!batches.has(key)) batches.set(key, []);
      batches.get(key).push(object);
    }
  });
  const inverse = root.matrixWorld.clone().invert();
  for (const meshes of batches.values()) {
    const batch = new THREE.InstancedMesh(geometry, meshes[0].material, meshes.length);
    meshes.forEach((mesh, i) => {
      batch.setMatrixAt(i, new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld));
      mesh.parent.remove(mesh);
    });
    batch.castShadow = batch.receiveShadow = true;
    batch.instanceMatrix.needsUpdate = true;
    batch.computeBoundingSphere();
    root.add(batch);
  }
}
