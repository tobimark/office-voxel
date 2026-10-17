import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { acquireArtResources, box, batchStaticBoxes } from '../src/art.js';
import { disposeSceneResources } from '../src/shared/scene-resources.js';
import { createChair, createMonitor, createPlant } from '../src/shared/furniture.js';
// Texture construction needs only these Canvas2D operations; no WebGL in Node.
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {} }) }) };
const counts = resource => { let n = 0; resource.addEventListener('dispose', () => n++); return () => n; };

test('two scenes share art until the last lease, while private resources dispose once', () => {
  const releaseA = acquireArtResources(), releaseB = acquireArtResources();
  const a = new THREE.Scene(), b = new THREE.Scene();
  const ma = box(a,0,0,0,1,1,1,'#abcdef'), mb = box(b,0,0,0,1,1,1,'#abcdef');
  assert.equal(ma.geometry, mb.geometry); assert.equal(ma.material, mb.material);
  const geometryCount = counts(ma.geometry), materialCount = counts(ma.material), mapCount = counts(ma.material.map);
  const privateMap = new THREE.Texture(), privateMat = new THREE.MeshBasicMaterial({map: privateMap});
  const privateGeometry = new THREE.PlaneGeometry(1,1), privateCount = counts(privateGeometry), textureCount = counts(privateMap);
  a.add(new THREE.Mesh(privateGeometry,privateMat));
  batchStaticBoxes(b); const instanceCount = counts(b.children[0]);
  disposeSceneResources(a); releaseA(); releaseA(); disposeSceneResources(a);
  assert.equal(privateCount(),1); assert.equal(textureCount(),1);
  assert.equal(geometryCount(),0); assert.equal(materialCount(),0); assert.equal(mapCount(),0);
  assert.equal(b.children[0].material,mb.material);
  disposeSceneResources(b); releaseB(); releaseB();
  assert.equal(instanceCount(),1); assert.equal(geometryCount(),1); assert.equal(materialCount(),1); assert.equal(mapCount(),1);
  const releaseC = acquireArtResources(), c = new THREE.Scene();
  const mc = box(c,0,0,0,1,1,1,'#abcdef');
  assert.notEqual(mc.geometry,ma.geometry); assert.notEqual(mc.material,ma.material);
  disposeSceneResources(c); releaseC();
});

test('private cleanup continues after an error and shared lease can still release', () => {
  const release = acquireArtResources(), scene = new THREE.Scene();
  const mesh = box(scene,0,0,0,1,1,1,'#123456'); const sharedCount = counts(mesh.geometry);
  const broken = new THREE.PlaneGeometry(1,1), good = new THREE.MeshBasicMaterial();
  broken.dispose = () => { throw Error('expected'); }; const goodCount = counts(good);
  scene.add(new THREE.Mesh(broken, good));
  assert.throws(()=>disposeSceneResources(scene), AggregateError);
  assert.equal(goodCount(),1); assert.equal(scene.children.length,0);
  release(); assert.equal(sharedCount(),1);
});

test('furniture declares chair reservations, plant collisions and live monitor attachments', () => {
  const release = acquireArtResources(), scene = new THREE.Scene();
  try {
    const chair = createChair(scene,{x:2,z:3,yaw:Math.PI});
    assert.deepEqual(chair.collision,{x:2,z:3,w:.78,d:.78});
    assert.equal(chair.seat.yaw,Math.PI);
    assert.equal(createPlant(scene,1,2,.5,1).collision,null);
    assert.deepEqual(createPlant(scene,1,2,.5).collision,{x:1,z:2,w:.3,d:.3});
    const monitor = createMonitor(scene,{x:2,z:1,yaw:Math.PI,surface:.98,material:new THREE.MeshBasicMaterial()});
    batchStaticBoxes(scene);
    assert.equal(monitor.screen.parent,monitor.root);
    assert.ok(!monitor.screen.isInstancedMesh);
    assert.ok(Math.abs(monitor.screen.position.y - 1.465) < 1e-10);
  } finally { disposeSceneResources(scene); release(); }
});
