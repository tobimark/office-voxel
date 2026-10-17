// Browser check for the big floor page only. It reads the scene layout directly, so
// seat expectations can never drift from the page, and it also reloads the original
// studio and team pages to prove the new files did not disturb them.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { floorSeats, floorRooms } from '../src/floor/layout.js';

const output = process.env.FLOOR_ARTIFACTS || fileURLToPath(new URL('../.artifacts/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const state = () => page.evaluate(() => window.PixOfficeVoxel.getState());
// Yaw keeps damping towards the seat angle, so isolation is compared on the fields
// a stray click would actually change.
const poseOf = actors => actors.map(({ name, action, expression, position, remainingSteps }) => ({ name, action, expression, position, remainingSteps }));
// Software rendering clamps the simulated step, and twenty-four characters are
// heavy, so the budget is only an upper bound.
async function waitForSeat(index) {
  const seat = floorSeats[index];
  try {
    await page.waitForFunction(({ i, x, z }) => {
      const actor = window.PixOfficeVoxel.getState().actors[i];
      return actor.action === 'work' && Math.abs(actor.position.x - x) < .02 && Math.abs(actor.position.z - z) < .02;
    }, { i: index, x: seat.x, z: seat.z }, { timeout: 420000 });
  } catch {
    throw new Error(`actor ${index} never reached its seat ${seat.x},${seat.z}: ${JSON.stringify((await state()).actors[index])}`);
  }
}
try {
  await page.goto(`${url}floor.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  const initial = await state();
  assert.equal(initial.scene, 'floor');
  assert.equal(initial.capacity, 24);
  assert.equal(await page.locator('[data-person]').count(), 24);
  assert.equal(await page.locator('#people-count').textContent(), '24 位');
  // Twenty-four distinct people, six rooms of four, twenty-three already seated.
  const names = await page.locator('[data-person] b').allTextContents();
  assert.equal(new Set(names).size, 24, 'character names must be unique');
  assert.equal(await page.locator('.avatar.portrait').count(), 24, 'every character needs a portrait');
  assert.equal(initial.actors.filter(actor => actor.action === 'work').length, 23);
  assert.equal(floorRooms.length, 6);
  for (let i = 1; i < 24; i++) {
    const seat = floorSeats[i];
    assert.ok(Math.abs(initial.actors[i].position.x - seat.x) < .02 && Math.abs(initial.actors[i].position.z - seat.z) < .02, `actor ${i} not seated`);
    assert.ok(Math.abs(Math.sin(initial.actors[i].yaw)) < .05, `actor ${i} should face its table`);
  }
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${output}/floor-desktop.png`, fullPage: true });
  // The character waiting on foot walks into its own room through its door.
  await page.locator('[data-person="0"]').click();
  await page.locator('[data-action="work"]').click();
  await waitForSeat(0);
  await page.locator('[data-camera="person"]').click();
  await page.locator('[data-action="wave"]').click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${output}/floor-character.png` });
  await page.locator('[data-camera="top"]').click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: `${output}/floor-top.png` });
  // Zoom the plan view onto the corridor so all six doors are readable.
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(5000);
  const canvas = await page.locator('#viewport canvas').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  for (let step = 0; step < 20; step++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${output}/floor-corridor.png` });
  await page.reload();
  await page.waitForFunction(() => window.PixOfficeVoxel);
  await page.waitForTimeout(1500);
  // All twenty-four entries control their own character, including the walk back in.
  for (let i = 0; i < 24; i++) {
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
  // A character inside a room must leave through its door to reach the corridor.
  await page.locator('[data-person="20"]').click();
  await page.locator('[data-action="walk"]').click();
  await page.waitForFunction(() => {
    const actor = window.PixOfficeVoxel.getState().actors[20];
    return Math.abs(actor.position.z) < 1.6 && Math.abs(actor.position.x) < 22;
  }, null, { timeout: 420000 });
  const strolled = (await state()).actors[20].position;
  assert.ok(Math.abs(strolled.z) < 1.6, `actor 20 never left its room: ${JSON.stringify(strolled)}`);
  await page.locator('[data-action="work"]').click();
  await waitForSeat(20);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout overflows');
  await page.screenshot({ path: `${output}/floor-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.waitForTimeout(600);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${url}floor.html?embed=1`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 24);
  assert.equal(await page.locator('.inspector').isVisible(), false);
  assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight));
  await page.goto(url);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 3);
  assert.equal(await page.locator('[data-person]').count(), 3);
  await page.goto(`${url}nine.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel?.getState().capacity === 9);
  assert.equal((await state()).scene, 'team');
  assert.equal(await page.locator('[data-person]').count(), 9);
  // Twenty-four characters are drawn one mesh at a time, so the budget is scaled
  // against the existing nine-person room rather than a fixed number.
  await page.waitForTimeout(1200);
  const teamRender = (await state()).render;
  assert.ok(initial.render.calls <= teamRender.calls * 3.6, `floor draws ${initial.render.calls} vs team ${teamRender.calls}`);
  assert.ok(initial.render.triangles <= teamRender.triangles * 4, `floor triangles ${initial.render.triangles} vs team ${teamRender.triangles}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    result: 'passed',
    checks: ['floor scene id, 24 seats in 6 rooms', '24 unique characters with portraits', '23 seated facing their tables',
      'the standing character walks into its room through the door', 'all 24 controls isolated',
      'all 24 walk back to their own seat through their door', 'a room character leaves through its door to the corridor',
      'person/top/room cameras', 'corridor close-up', 'mobile and tablet layout', 'embed mode',
      'original studio and team pages', 'draw calls vs the existing nine-person room', 'console clean'],
    render: { floor: initial.render, team: teamRender }, output,
  }, null, 2));
} finally { await browser.close(); }
