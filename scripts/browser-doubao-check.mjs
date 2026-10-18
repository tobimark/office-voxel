import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../.artifacts/doubao/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  const base = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
  await page.goto(new URL('tools/character-assets.html?preview=doubao-00', base).href);
  await page.waitForFunction(() => document.querySelector('#gallery img')?.complete);
  assert.equal(await page.locator('#gallery figure').count(), 1);
  assert.match(await page.locator('figcaption').textContent(), /doubao-00 · 豆包 · AI 助手/);
  const result = await page.evaluate(async () => {
    const THREE = await import('/tests/three-fixture.js');
    const { createCharacter } = await import('/src/assets/characters/model.js');
    const { instantiateCharacter } = await import('/src/assets/characters/instances.js');
    const { drawPortrait } = await import('/src/assets/characters/appearance.js');
    const { acquireArtResources } = await import('/src/assets/materials/art.js');
    const { disposeSceneResources } = await import('/src/engine/resources.js');
    const config = instantiateCharacter({ characterId: 'doubao', appearanceId: 'doubao-00', instanceId: 'preview:actor:doubao' }, { x: 0, z: 0, phase: 0 });
    const release = acquireArtResources();
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const checks = {};
    let faceDisposed = 0, sharedDisposed = 0;
    try {
      renderer.setSize(400, 420); renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
      scene.background = new THREE.Color('#e5ece9');
      scene.add(new THREE.HemisphereLight('#fff4dd', '#90a2a6', 2.5));
      const light = new THREE.DirectionalLight('#fff1dc', 2.4); light.position.set(-3, 6, 6); scene.add(light);
      const actor = createCharacter(scene, config); actor.ring.visible = false;
      const scarf = actor.torso.getObjectByName('accessory:scarf');
      const leftSkirt = actor.legL.thigh.getObjectByName('outfit:dress-skirt');
      const rightSkirt = actor.legR.thigh.getObjectByName('outfit:dress-skirt');
      checks.joints = !!scarf && leftSkirt?.parent === actor.legL.thigh && rightSkirt?.parent === actor.legR.thigh;
      const portrait = document.createElement('canvas');
      portrait.getContext('2d', { willReadFrequently: true }); drawPortrait(portrait, config);
      const pixel = (x, y) => [...portrait.getContext('2d').getImageData(x, y, 1, 1).data];
      checks.portrait = JSON.stringify(pixel(12, 34)) === JSON.stringify([215, 57, 63, 255])
        && JSON.stringify(pixel(6, 25)) === JSON.stringify([53, 42, 40, 255]);
      const sheet = document.createElement('canvas'); sheet.width = 1200; sheet.height = 900;
      const ctx = sheet.getContext('2d'); ctx.fillStyle = '#f8f9f5'; ctx.fillRect(0, 0, 1200, 900);
      const camera = new THREE.OrthographicCamera(-1.05, 1.05, 1.2, -1.05, .1, 30);
      camera.position.set(0, 1.15, 6); camera.lookAt(0, .95, 0);
      const poses = [
        ['正面', 'idle', 0], ['侧面', 'idle', Math.PI / 2], ['背面', 'idle', Math.PI],
        ['坐下打字', 'work', .4], ['走路', 'walk', .4], ['挥手', 'wave', 0],
      ];
      for (const [i, [label, action, yaw]] of poses.entries()) {
        actor.action = action; actor.targetYaw = yaw; actor.update(1, 1, .85);
        scene.updateMatrixWorld(true);
        if (action === 'work') {
          const hem = leftSkirt.children[1].getWorldPosition(new THREE.Vector3());
          const hip = actor.hips.getWorldPosition(new THREE.Vector3());
          checks.seatedHem = hem.z > hip.z + .15;
        }
        renderer.render(scene, camera);
        const x = i % 3 * 400, y = Math.floor(i / 3) * 450;
        ctx.drawImage(renderer.domElement, x, y);
        ctx.fillStyle = '#293635'; ctx.font = '18px "Microsoft YaHei",sans-serif'; ctx.fillText(label, x + 20, y + 437);
      }
      actor.action = 'walk'; actor.update(.2, 1, .85); scene.updateMatrixWorld(true);
      const before = leftSkirt.children[1].getWorldPosition(new THREE.Vector3());
      actor.update(.6, 1, .85); scene.updateMatrixWorld(true);
      checks.walkingHem = before.distanceTo(leftSkirt.children[1].getWorldPosition(new THREE.Vector3())) > .1;
      const face = actor.head.children.find(mesh => mesh.material?.transparent && mesh.material.map)?.material.map;
      const faceCopy = document.createElement('canvas'); faceCopy.width = faceCopy.height = 32;
      const faceContext = faceCopy.getContext('2d', { willReadFrequently: true });
      const facePixels = () => {
        faceContext.clearRect(0, 0, 32, 32); faceContext.drawImage(face.image, 0, 0);
        return faceContext.getImageData(0, 0, 32, 32).data;
      };
      const isSaliva = (pixels, x, y) => pixels[(y * 32 + x) * 4 + 2] > 200 && pixels[(y * 32 + x) * 4 + 3] === 255;
      actor.expression = 'drool'; actor.action = 'idle'; actor.targetYaw = 0; actor.talkingUntil = 10;
      actor.update(1, 1, .85);
      const saliva = facePixels();
      checks.droolingWhileTalking = isSaliva(saliva, 20, 26) && isSaliva(saliva, 21, 30);
      actor.update(1.5, 1, .85);
      checks.dropletMoves = isSaliva(facePixels(), 21, 31) && !isSaliva(facePixels(), 21, 30);
      actor.update(4.6, 1, .85);
      checks.droolingWhileBlinking = isSaliva(facePixels(), 20, 26);
      actor.expression = 'happy'; actor.talkingUntil = 0; actor.update(1, 1, .85);
      checks.expressionClearsSaliva = !isSaliva(facePixels(), 20, 26);
      actor.expression = 'drool'; actor.update(1, 1, .85);
      camera.left = -.55; camera.right = .55; camera.top = .55; camera.bottom = -.55;
      camera.position.set(0, 1.48, 6); camera.lookAt(0, 1.48, 0); camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const droolingImage = renderer.domElement.toDataURL('image/png');
      face.addEventListener('dispose', () => faceDisposed++);
      leftSkirt.children[0].geometry.addEventListener('dispose', () => sharedDisposed++);
      const image = sheet.toDataURL('image/png');
      return { checks, image, droolingImage };
    } finally {
      try { disposeSceneResources(scene); } finally { release(); renderer.dispose(); }
      checks.privateCleanup = faceDisposed === 1;
      checks.sharedCleanup = sharedDisposed === 1;
    }
  });
  for (const [key, value] of Object.entries(result.checks)) assert.equal(value, true, key);
  assert.deepEqual(errors, []);
  await writeFile(new URL('poses.png', output), Buffer.from(result.image.split(',')[1], 'base64'));
  await writeFile(new URL('drooling.png', output), Buffer.from(result.droolingImage.split(',')[1], 'base64'));
  await page.goto(new URL('characters.html?asset=doubao-00&expression=drool', base).href);
  await page.waitForFunction(() => window.assetLibraryPreview?.getState().expression === 'drool');
  assert.equal(await page.locator('[data-expression="drool"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-camera="face"]').click();
  await page.screenshot({ path: fileURLToPath(new URL('drooling-library.png', output)), fullPage: true });
  await page.goto(new URL('nine.html', base).href);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  await page.locator('[data-expression="drool"]').click();
  assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().actors[0].expression), 'drool');
  assert.deepEqual(errors, []);
  console.log('Doubao: preview, portrait, skirt joints, six poses, animated drooling during blinking/talking, expression reset, library/office selection and resource cleanup passed.');
} finally { await browser.close(); }
