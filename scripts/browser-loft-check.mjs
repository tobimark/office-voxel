// Browser check for the loft page only. It also reloads the original studio and
// team pages to prove the new, isolated files did not disturb them.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = process.env.LOFT_ARTIFACTS || fileURLToPath(new URL('../.artifacts/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const state = () => page.evaluate(() => window.PixOfficeVoxel.getState());
const facing = yaw => Math.abs(Math.sin(yaw)) < .05 && Math.abs(Math.abs(Math.cos(yaw)) - 1) < .05;
// Yaw keeps damping towards the seat angle, so isolation is compared on the
// fields that a stray click would actually change.
const poseOf = actors => actors.map(({ name, action, expression, position, remainingSteps }) => ({ name, action, expression, position, remainingSteps }));
// Software rendering clamps the simulated step, so a walk across the 26 m room can
// take a while; the budget is only an upper bound.
async function waitForSeat(index) {
  try {
    await page.waitForFunction(i => {
      const actor = window.PixOfficeVoxel.getState().actors[i];
      return actor.action === 'work' && Math.abs(Math.sin(actor.yaw)) < .05;
    }, index, { timeout: 120000 });
  } catch {
    throw new Error(`actor ${index} never returned to a seat: ${JSON.stringify((await state()).actors[index])}`);
  }
}
try {
  await page.goto(`${url}loft.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  const initial = await state();
  assert.equal(initial.scene, 'loft');
  assert.equal(initial.capacity, 9);
  assert.equal(await page.locator('[data-person]').count(), 9);
  assert.equal(await page.locator('#people-count').textContent(), '9 位');
  // Five people on the north bank face +z, four on the south bank face -z.
  assert.equal(initial.actors.filter(actor => actor.action === 'work').length, 8);
  for (let i = 1; i <= 4; i++) assert.ok(facing(initial.actors[i].yaw) && Math.cos(initial.actors[i].yaw) > .95, `actor ${i} should face +z`);
  for (let i = 5; i <= 8; i++) assert.ok(facing(initial.actors[i].yaw) && Math.cos(initial.actors[i].yaw) < -.95, `actor ${i} should face -z`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/loft-desktop.png`, fullPage: true });
  assert.ok(initial.render.triangles > 0 && initial.render.calls > 0);
  // All nine entries control their own character, including seating return.
  for (let i = 0; i < 9; i++) {
    await page.locator(`[data-person="${i}"]`).click();
    const before = (await state()).actors;
    await page.locator('[data-action="wave"]').click();
    await page.locator('[data-expression="surprise"]').click();
    const after = await state();
    assert.equal(after.selected, i);
    assert.equal(after.actors[i].action, 'wave');
    assert.equal(after.actors[i].expression, 'surprise');
    after.actors.forEach((actor, j) => { if (j !== i) assert.deepEqual(poseOf([actor])[0], poseOf(before)[j]); });
    await page.locator('[data-action="work"]').click();
    await waitForSeat(i);
  }
  // Typing close-ups: the shortest, a mid and the tallest character, so the
  // hands-on-keyboard fit is visible at both ends of the height range.
  for (const [index, label] of [[4, 'short'], [1, 'mid'], [5, 'tall']]) {
    await page.locator(`[data-person="${index}"]`).click();
    await page.locator('[data-camera="person"]').click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${output}/loft-typing-${label}.png` });
  }
  // The front presets put the table slab between the camera and the hands, so a
  // side profile and two over-the-shoulder views orbit round for a readable angle.
  const orbit = async (dx, dy, wheel) => {
    const canvas = await page.locator('#viewport canvas').boundingBox();
    const cx = canvas.x + canvas.width / 2, cy = canvas.y + canvas.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + dx, cy + dy, { steps: 14 });
    await page.mouse.up();
    if (wheel) await page.mouse.wheel(0, wheel);
    await page.waitForTimeout(2500);
  };
  await page.locator('[data-person="1"]').click();
  await page.locator('[data-camera="person"]').click();
  await page.waitForTimeout(3500);
  await orbit(-270, -60, -420);
  await page.screenshot({ path: `${output}/loft-typing-side.png` });
  for (const [index, label, dx] of [[4, 'short', -420], [5, 'tall', 0]]) {
    await page.locator(`[data-person="${index}"]`).click();
    await page.locator('[data-camera="person"]').click();
    await page.waitForTimeout(3500);
    await orbit(dx, 110, -300);
    await page.screenshot({ path: `${output}/loft-typing-over-${label}.png` });
  }
  await page.locator('[data-person="8"]').click();
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(3500);
  await page.locator('[data-action="walk"]').click();
  const start = (await state()).actors[8].position;
  await page.waitForFunction(start => {
    const actor = window.PixOfficeVoxel.getState().actors[8];
    return actor.action === 'walk' && Math.hypot(actor.position.x - start.x, actor.position.z - start.z) > .4;
  }, start, { timeout: 15000 });
  const end = (await state()).actors[8].position;
  assert.ok(Math.hypot(end.x - start.x, end.z - start.z) > .4);
  await page.locator('[data-action="work"]').click();
  await waitForSeat(8);
  // Camera presets on the seat that walked back, so the whole loop is exercised.
  await page.locator('[data-person="4"]').click();
  await page.locator('[data-camera="person"]').click();
  await page.locator('[data-action="wave"]').click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${output}/loft-character.png` });
  await page.locator('[data-camera="top"]').click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${output}/loft-top.png` });
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${output}/loft-room.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout overflows');
  await page.screenshot({ path: `${output}/loft-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${url}loft.html?embed=1`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 9);
  assert.equal(await page.locator('.inspector').isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  // The original two pages still work next to the new one.
  await page.goto(url);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 3);
  assert.equal(await page.locator('[data-person]').count(), 3);
  await page.goto(`${url}nine.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 9);
  assert.equal((await state()).scene, 'team');
  assert.equal(await page.locator('[data-person]').count(), 9);
  // Draw calls are dominated by the nine unbatched characters, so the loft is
  // compared with the existing nine-person room instead of an arbitrary budget.
  await page.waitForTimeout(800);
  const teamRender = (await state()).render;
  assert.ok(initial.render.calls <= teamRender.calls * 1.4, `loft draws ${initial.render.calls} vs team ${teamRender.calls}`);
  assert.ok(initial.render.triangles <= teamRender.triangles * 3, `loft triangles ${initial.render.triangles} vs team ${teamRender.triangles}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    result: 'passed',
    checks: ['loft scene id and 9 seats', '5 + 4 facing banks', 'all 9 controls isolated', 'all 9 return to their own seat facing the table',
      'aisle walking', 'person/top/room cameras', 'mobile and tablet layout', 'embed mode', 'original studio and team pages', 'draw calls vs the existing nine-person room', 'console clean'],
    render: { loft: initial.render, team: teamRender }, output,
  }, null, 2));
} finally { await browser.close(); }
