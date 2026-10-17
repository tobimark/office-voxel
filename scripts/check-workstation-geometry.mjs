import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../.artifacts/computer-focus/', import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ reducedMotion: 'reduce' });
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
const results = [];
try {
  await page.goto(`${process.env.DEMO_URL || 'http://127.0.0.1:5196/'}loft.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
  for (const name of ['studio', 'team', 'loft', 'floor', 'suite']) {
    const result = await page.evaluate(async name => {
      const THREE = await import('/node_modules/three/build/three.module.js');
      const { createCharacter } = await import('/src/character.js');
      const { monitorPlacement, workstationSeat } = await import('/src/shared/workstation.js');
      const base = ['studio', 'team'].includes(name);
      const layouts = await import(base ? '/src/layouts.js' : `/src/${name}/layout.js`);
      const builder = await import(base ? '/src/office.js' : `/src/${name}/office.js`);
      const layout = layouts[base ? name === 'studio' ? 'smallOffice' : 'teamOffice' : `${name}Office`];
      const scene = new THREE.Scene();
      const furniture = builder[base ? 'createOffice' : `create${name[0].toUpperCase()}${name.slice(1)}Office`](scene, layout);
      const actors = layout.actors.map((config, index) => {
        const actor = createCharacter(scene, config), seat = workstationSeat(layout, layout.stationFor[index]);
        actor.root.position.set(seat.x, 0, seat.z); actor.root.rotation.y = seat.yaw; actor.targetYaw = seat.yaw; actor.action = 'work';
        return actor;
      });
      const screens = furniture.displays.filter(d => d.kind === 'computer');
      scene.updateMatrixWorld(true);
      const positions = screens.map((entry, index) => {
        const seat = workstationSeat(layout, index), center = entry.mesh.getWorldPosition(new THREE.Vector3());
        const forward = new THREE.Vector3(Math.sin(seat.yaw), 0, Math.cos(seat.yaw));
        const delta = new THREE.Vector3(center.x - seat.x, 0, center.z - seat.z);
        return { id: entry.id, distance: delta.dot(forward), lateral: delta.clone().cross(forward).length() };
      });
      const caster = new THREE.Raycaster(), occlusions = [];
      caster.near = .1; caster.far = .5799;
      // Sample the full screen and surrounding frame during several typing poses.
      // No character is hidden, and no renderer/material/depth setting is altered.
      for (const time of [0, .4, 1.1, 2.6]) {
        actors.forEach(a => a.update(time, 1, .85)); scene.updateMatrixWorld(true);
        for (const entry of screens) {
          const normal = new THREE.Vector3(0, 0, 1).transformDirection(entry.mesh.matrixWorld);
          const direction = normal.clone().multiplyScalar(-.58).add(new THREE.Vector3(0, -.002, 0)).normalize();
          let count = 0;
          for (let y = -3; y <= 3; y++) for (let x = -4; x <= 4; x++) {
            const target = entry.mesh.localToWorld(new THREE.Vector3(x / 4 * entry.width * .65, y / 3 * entry.height * .75, 0));
            const origin = target.clone().addScaledVector(normal, .58).add(new THREE.Vector3(0, .002, 0));
            caster.set(origin, direction);
            if (caster.intersectObjects(actors.map(a => a.root), true).length) count++;
          }
          if (count) occlusions.push({ screen: entry.id, time, count });
        }
      }
      return { name, target: monitorPlacement.screenDistance, positions, occlusions, visibleCharacters: actors.filter(a => a.root.visible).length };
    }, name);
    results.push(result);
    assert.ok(result.positions.every(p => Math.abs(p.distance - result.target) < 1e-6 && p.lateral < 1e-6), `${name}: inconsistent screen placement`);
    assert.deepEqual(result.occlusions, [], `${name}: characters still enter the computer view`);
    assert.equal(result.visibleCharacters, result.positions.length);
    console.log(`${name}: ${result.positions.length} screens at ${result.target}; 4 typing poses, zero foreground character intersections`);
  }
  await writeFile(`${directory}/geometry-after.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
