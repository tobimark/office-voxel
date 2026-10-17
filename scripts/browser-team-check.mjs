import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = fileURLToPath(new URL('../.artifacts/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const state = () => page.evaluate(() => window.PixOfficeVoxel.getState());
// Yaw is now exposed consistently across layouts and continues damping after arrival.
// Check command isolation on stable fields, and verify the seated direction separately.
const poseOf = actors => actors.map(({ name, action, expression, position, remainingSteps }) => ({ name, action, expression, position, remainingSteps }));
try {
  await page.goto(url);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  assert.equal((await state()).actors.length, 3);
  await page.getByRole('link', { name: '九人办公室', exact: true }).click();
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 9);
  assert.equal((await state()).scene, 'team');
  assert.equal(await page.locator('[data-person]').count(), 9);
  assert.equal(await page.locator('#people-count').textContent(), '9 位');
  assert.equal((await state()).actors.filter(a => a.action === 'work').length, 8);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/office-nine-desktop.png`, fullPage: true });
  // All nine UI entries control separate actors, including the six new ones.
  for (let i = 0; i < 9; i++) {
    await page.locator(`[data-person="${i}"]`).click();
    const before = (await state()).actors;
    await page.locator('[data-action="wave"]').click();
    await page.locator('[data-expression="surprise"]').click();
    const after = await state();
    assert.equal(after.selected, i);
    assert.equal(after.actors[i].action, 'wave');
    assert.equal(after.actors[i].expression, 'surprise');
    poseOf(after.actors).forEach((actor, j) => { if (j !== i) assert.deepEqual(actor, poseOf(before)[j]); });
    await page.locator('[data-action="work"]').click();
    await page.waitForFunction(index => {
      const actor = window.PixOfficeVoxel.getState().actors[index];
      return actor.action === 'work' && Math.abs(Math.sin(actor.yaw)) < .05 && Math.cos(actor.yaw) < -.95;
    }, i, { timeout: 15000 });
  }
  await page.locator('[data-action="walk"]').click();
  const start = (await state()).actors[8].position;
  await page.waitForFunction(start => {
    const actor = window.PixOfficeVoxel.getState().actors[8];
    return actor.action === 'walk' && Math.hypot(actor.position.x - start.x, actor.position.z - start.z) > .4;
  }, start, { timeout: 10000 });
  const end = (await state()).actors[8].position;
  assert.ok(Math.hypot(end.x - start.x, end.z - start.z) > .4);
  await page.locator('[data-action="work"]').click();
  await page.waitForFunction(() => window.PixOfficeVoxel.getState().actors[8].action === 'work', null, { timeout: 12000 });
  await page.locator('[data-person="4"]').click();
  await page.locator('[data-action="wave"]').click();
  await page.locator('[data-camera="person"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${output}/office-nine-character.png` });
  await page.locator('[data-camera="top"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${output}/office-nine-top.png` });
  await page.locator('[data-action="work"]').click();
  await page.waitForFunction(() => window.PixOfficeVoxel.getState().actors[4].action === 'work');
  await page.locator('[data-camera="room"]').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${output}/office-nine-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${url}nine.html?embed=1`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 9);
  assert.equal(await page.locator('.inspector').isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  await page.goto(`${url}nine.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  await page.getByRole('link', { name: '三人办公室', exact: true }).click();
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 3);
  assert.equal(await page.locator('[data-person]').count(), 3);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'passed', checks: ['page switching', '9 actors / 9 controls', 'all 9 isolated actions and expressions', 'all 9 return to assigned seats', 'team aisle movement', 'person and top cameras', 'mobile/tablet layout', '9-person embed', 'original 3-person page', 'console clean'], output }, null, 2));
} finally { await browser.close(); }
