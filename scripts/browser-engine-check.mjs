import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1024, height: 768 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
try {
  for (const [path, module, layoutModule, layoutName, builderName] of [
    ['', '/src/office.js', '/src/layouts.js', 'smallOffice', 'createOffice'],
    ['nine.html', '/src/office.js', '/src/layouts.js', 'teamOffice', 'createOffice'],
    ['loft.html', '/src/loft/office.js', '/src/loft/layout.js', 'loftOffice', 'createLoftOffice'],
    ['suite.html', '/src/suite/office.js', '/src/suite/layout.js', 'suiteOffice', 'createSuiteOffice'],
    ['floor.html', '/src/floor/office.js', '/src/floor/layout.js', 'floorOffice', 'createFloorOffice'],
  ]) {
    await page.goto(new URL(path, url).href);
    await page.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
    const result = await page.evaluate(async ({ module, layoutModule, layoutName, builderName }) => {
      const { createScene } = await import('/src/shared/scene.js');
      const { bootScene } = await import('/src/shared/scene-page.js');
      const { resolveSceneLayout } = await import('/src/shared/scene-contract.js');
      const { createTaskDisplays } = await import('/src/shared/task-displays.js');
      const layout = (await import(layoutModule))[layoutName];
      const createOffice = (await import(module))[builderName];
      const root = document.querySelector('#app'), viewport = root.querySelector('#viewport');
      const first = window.PixOfficeVoxel;
      const initial = first.getState();
      const seats = resolveSceneLayout(layout).seats;
      const aligned = initial.actors.slice(1).every((actor, index) => {
        const seat = seats[layout.stationFor[index + 1]];
        return Math.abs(actor.position.x - seat.x) < 1e-9 && Math.abs(actor.position.z - seat.z) < 1e-9 && Math.abs(actor.yaw - seat.yaw) < 1e-9;
      });
      first.dispose(); first.dispose();
      const emptied = !viewport.children.length && !root.querySelector('.task-toolbar, .agent-menu');
      // The core can mount with only a viewport, with no control panel or global API.
      const isolatedViewport = document.createElement('div');
      isolatedViewport.style.cssText = 'width:480px;height:320px'; root.append(isolatedViewport);
      const core = createScene({ viewport: isolatedViewport, layout, createOffice });
      const noGlobal = !window.PixOfficeVoxel;
      core.dispose(); isolatedViewport.remove();

      // Partial builder failure must dispose resources already attached to the scene.
      let released = false, failed = false;
      try {
        createScene({ viewport, layout, createOffice(scene, data) {
          const built = createOffice(scene, data);
          built.office.traverse(object => { object.geometry?.addEventListener('dispose', () => { released = true; }); });
          throw new Error('Expected builder failure');
        } });
      } catch (error) { failed = error.message === 'Expected builder failure'; }
      const partialClean = failed && released && viewport.children.length === 0;

      // Fail inside task UI creation after its surfaces/toolbars have been acquired.
      let taskFailed = false;
      try {
        createScene({ viewport, layout, createOffice, mountTasks: context => createTaskDisplays({
          ...context, root: document.createElement('div'), embed: true,
        }) });
      } catch { taskFailed = true; }
      const taskPartialClean = taskFailed && !root.querySelector('.task-toolbar, .display-reader, .agent-menu') && !viewport.children.length;

      const mounted = bootScene({ root, layout, createOffice });
      let notifications = 0;
      const unsubscribe = mounted.subscribe(event => { if (event.type === 'state') notifications++; });
      mounted.select(1);
      const notified = notifications > 0;
      unsubscribe(); const before = notifications;
      mounted.select(0);
      const unsubscribed = notifications === before;
      const cleanMount = viewport.querySelectorAll('canvas').length === 1 && root.querySelectorAll('.task-toolbar').length === 1 && root.querySelectorAll('.agent-menu').length === 1;
      mounted.tasks.focus('mission');
      const snap = mounted.tasks.getState();
      let detached = 0, disposed = 0;
      mounted.tasks.setSource({ kind: 'backend', getSnapshot: () => snap, subscribe() { return () => detached++; }, dispose() { disposed++; } });
      const oldTasks = mounted.tasks;
      mounted.dispose(); mounted.dispose();
      const stopped = mounted.action('wave') === false && oldTasks.seek(1000) === false && detached === 1 && disposed === 1 && !window.PixOfficeVoxel;
      const cleared = !root.querySelector('.task-toolbar, .display-reader, .agent-menu') && !root.querySelector('.display-active');
      // Remount once more: one click must dispatch once, without old page handlers.
      const final = bootScene({ root, layout, createOffice });
      window.__engineFinal = final;
      let selects = 0;
      final.subscribe(event => { if (event.type === 'state') selects++; });
      root.querySelector('[data-person="1"]').click();
      return { aligned, emptied, noGlobal, partialClean, taskPartialClean, notified, unsubscribed, cleanMount, stopped, cleared, selects, selected: final.getState().selected };
    }, { module, layoutModule, layoutName, builderName });
    for (const key of ['aligned', 'emptied', 'noGlobal', 'partialClean', 'taskPartialClean', 'notified', 'unsubscribed', 'cleanMount', 'stopped', 'cleared']) assert.equal(result[key], true, `${layoutName}: ${key}`);
    assert.equal(result.selected, 1);
    assert.equal(result.selects, 1, `${layoutName}: avatar must dispatch once`);
    await page.waitForFunction(() => window.PixOfficeVoxel.tasks.getState().fontReady);
    const definition = await page.evaluate(async ({ layoutModule, layoutName }) => {
      const { resolveSceneLayout } = await import('/src/shared/scene-contract.js');
      const layout = resolveSceneLayout((await import(layoutModule))[layoutName]);
      window.PixOfficeVoxel.tasks.pause(true);
      window.PixOfficeVoxel.tasks.focus('mission'); // closes the avatar menu
      window.PixOfficeVoxel.camera('room');
      return { seats: layout.seats, stationFor: layout.stationFor, capacity: layout.capacity, id: layout.id };
    }, { layoutModule, layoutName });
    async function waitForSeat(index) {
      const seat = definition.seats[definition.stationFor[index]];
      await page.waitForFunction(({ index, seat }) => {
        const actor = window.PixOfficeVoxel.getState().actors[index];
        return actor.action === 'work' && Math.hypot(actor.position.x - seat.x, actor.position.z - seat.z) < .01 && Math.cos(actor.yaw - seat.yaw) > .999;
      }, { index, seat }, { timeout: 180000 });
      await page.evaluate(() => window.PixOfficeVoxel.pause(true));
    }
    for (let index = 0; index < definition.capacity; index++) {
      const isolated = await page.evaluate(index => {
        const api = window.PixOfficeVoxel;
        const before = api.getState().actors;
        api.select(index); api.action('wave'); api.expression('surprise');
        const after = api.getState().actors;
        const isolated = after.every((actor, i) => i === index || (actor.action === before[i].action && actor.expression === before[i].expression && actor.position.x === before[i].position.x && actor.position.z === before[i].position.z));
        return isolated && api.action('work');
      }, index);
      assert.equal(isolated, true, `${layoutName}: actor ${index} command isolation`);
      await waitForSeat(index);
    }
    const index = definition.capacity - 1;
    const origin = await page.evaluate(index => {
      const api = window.PixOfficeVoxel; api.select(index);
      api.action('walk'); return api.getState().actors[index].position;
    }, index);
    await page.waitForFunction(({ index, origin, id }) => {
      const actor = window.PixOfficeVoxel.getState().actors[index];
      if (id === 'floor') return Math.abs(actor.position.z) < 1.6;
      if (id === 'suite') return actor.position.z > .5;
      return Math.hypot(actor.position.x - origin.x, actor.position.z - origin.z) > .4;
    }, { index, origin, id: definition.id }, { timeout: 180000 });
    await page.evaluate(() => window.PixOfficeVoxel.action('work'));
    await waitForSeat(index);
    await page.locator('[data-camera="person"]').click();
    assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().camera), 'person');
    await page.locator('[data-camera="top"]').click();
    assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().camera), 'top');
    await page.locator('[data-camera="room"]').click();
    assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().camera), 'room');
    await page.evaluate(() => window.PixOfficeVoxel.dispose());
    await page.waitForTimeout(120);
    assert.equal(await page.locator('#viewport canvas, .task-toolbar, .agent-menu').count(), 0);
    console.log(`${layoutName}: lifecycle, ${definition.capacity} isolated actions/seat returns, walking, camera buttons and cleanup passed`);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
