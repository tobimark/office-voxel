import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const directory = fileURLToPath(new URL('../.artifacts/computer-focus/', import.meta.url));
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (['warning', 'error'].includes(msg.type())) errors.push(msg.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
try {
  for (const [name, file, count] of [['loft', 'loft.html', 9], ['floor', 'floor.html', 24], ['studio', '', 3], ['team', 'nine.html', 9], ['suite', 'suite.html', 9]]) {
    await page.goto(new URL(file, url).href);
    await page.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
    await page.evaluate(() => { const api = window.PixOfficeVoxel; api.tasks.seek(12000); api.tasks.pause(true); api.pause(true); });
    const affected = ['loft', 'floor'].includes(name);
    for (let index = 0; index < count; index++) {
      // Exercise the real avatar -> menu -> fixed computer route.
      await page.locator(`[data-person="${index}"]`).click();
      await page.getByRole('menuitem', { name: '查看电脑屏幕' }).click();
      const state = await page.evaluate(() => ({ scene: window.PixOfficeVoxel.getState(), tasks: window.PixOfficeVoxel.tasks.getState() }));
      assert.equal(state.tasks.focused, state.tasks.bindings[index].displayId);
      if ([1, 2, 5, 8, 11, 23].includes(index)) {
        await page.waitForTimeout(150);
        await page.screenshot({ path: `${directory}/${name}-${index}-after.png` });
      }
    }
    // Changing focus must preserve the character simulation and camera presets.
    const originalActors = await page.evaluate(() => window.PixOfficeVoxel.getState().actors);
    for (const target of ['tasks', 'mission', 'room', 'person', 'top']) {
      await page.evaluate(() => { const tasks = window.PixOfficeVoxel.tasks; tasks.focus(tasks.getState().bindings[1].displayId); });
      if (target === 'tasks' || target === 'mission') await page.locator(`[data-task-focus="${target}"]`).click();
      else await page.locator(`[data-camera="${target}"]`).click();
      assert.deepEqual(await page.evaluate(() => window.PixOfficeVoxel.getState().actors), originalActors);
    }
    await page.locator('[data-task-room]').click();
    if (affected) {
      await page.evaluate(() => { const tasks = window.PixOfficeVoxel.tasks; tasks.focus(tasks.getState().bindings[1].displayId); });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.deepEqual(await page.evaluate(() => window.PixOfficeVoxel.getState().actors), originalActors);
      await page.keyboard.press('Escape');
      assert.deepEqual(await page.evaluate(() => window.PixOfficeVoxel.getState().actors), originalActors);
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    console.log(`${name}: ${count} computer focuses and unchanged character state passed`);
  }
  // Also check the default animated transition, not only instant reduced motion.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(new URL('loft.html', url).href);
  await page.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
  await page.evaluate(() => window.PixOfficeVoxel.tasks.focus('loft:computer:1'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${directory}/loft-animated-after.png` });
  await page.locator('[data-task-room]').click();
  assert.deepEqual(errors, []);
  console.log('Computer focus regression passed; no console errors/warnings.');
} finally { await browser.close(); }
