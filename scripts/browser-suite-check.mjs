// Browser check for the suite page only. It also reloads the original studio and
// team pages to prove the new, isolated files did not disturb them.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = process.env.SUITE_ARTIFACTS || fileURLToPath(new URL('../.artifacts/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const state = () => page.evaluate(() => window.PixOfficeVoxel.getState());
// Yaw keeps damping towards the seat angle, so isolation is compared on the
// fields that a stray click would actually change.
const poseOf = actors => actors.map(({ name, action, expression, position, remainingSteps }) => ({ name, action, expression, position, remainingSteps }));
// Room layout mirrored from src/suite/layout.js: three rooms of three, seats by slot.
const roomCenter = { design: -8.67, dev: 0, team: 8.67 };
const roomOf = { 0: 'design', 2: 'design', 4: 'design', 1: 'dev', 3: 'dev', 5: 'dev', 6: 'team', 7: 'team', 8: 'team' };
const slotOf = { 0: 0, 2: 1, 4: 2, 1: 0, 3: 1, 5: 2, 6: 0, 7: 1, 8: 2 };
const seatFor = index => ({ x: roomCenter[roomOf[index]] + [-2.7, 0, 2.7][slotOf[index]], z: -3.82 });
// Software rendering clamps the simulated step, so a walk through the corridor can
// take a while; the budget is only an upper bound.
async function waitForSeat(index) {
  const seat = seatFor(index);
  try {
    await page.waitForFunction(({ i, seat }) => {
      const actor = window.PixOfficeVoxel.getState().actors[i];
      return actor.action === 'work'
        && Math.abs(actor.position.x - seat.x) < .02 && Math.abs(actor.position.z - seat.z) < .02;
    }, { i: index, seat }, { timeout: 180000 });
  } catch {
    throw new Error(`actor ${index} never reached its seat inside ${roomOf[index]}: ${JSON.stringify((await state()).actors[index])}`);
  }
}
try {
  await page.goto(`${url}suite.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  const initial = await state();
  assert.equal(initial.scene, 'suite');
  assert.equal(initial.capacity, 9);
  assert.equal(await page.locator('[data-person]').count(), 9);
  assert.equal(await page.locator('#people-count').textContent(), '9 位');
  assert.equal(initial.actors.filter(actor => actor.action === 'work').length, 8);
  // Eight people start at their desks inside a room, facing the desk.
  for (let i = 1; i <= 8; i++) {
    const seat = seatFor(i);
    assert.ok(Math.abs(initial.actors[i].position.x - seat.x) < .02 && Math.abs(initial.actors[i].position.z - seat.z) < .02, `actor ${i} not seated`);
    assert.ok(Math.abs(Math.sin(initial.actors[i].yaw)) < .05 && Math.cos(initial.actors[i].yaw) < -.95, `actor ${i} should face -z`);
  }
  assert.equal(initial.render.calls > 0 && initial.render.triangles > 0, true);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/suite-desktop.png`, fullPage: true });
  // The character waiting in the corridor must enter its room through the door.
  await page.locator('[data-person="0"]').click();
  await page.locator('[data-action="work"]').click();
  await waitForSeat(0);
  assert.ok((await state()).actors[0].position.z < -.5, 'actor 0 should end up inside a room');
  // Zoom the plan view onto the middle room's partition: the glazed wall, its
  // door, the open leaf and the corridor beyond.
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(3500);
  const canvas = await page.locator('#viewport canvas').boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  for (let step = 0; step < 18; step++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${output}/suite-door.png` });
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(3500);
  // All nine entries control their own character, including the walk back in.
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
  await page.locator('[data-camera="person"]').click();
  await page.locator('[data-action="wave"]').click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${output}/suite-character.png` });
  await page.locator('[data-camera="top"]').click();
  await page.waitForTimeout(5000);
  await page.screenshot({ path: `${output}/suite-top.png` });
  await page.locator('[data-camera="room"]').click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${output}/suite-rooms.png` });
  // A character inside a room must leave through its door to stroll the corridor.
  await page.locator('[data-person="8"]').click();
  await page.locator('[data-action="walk"]').click();
  await page.waitForFunction(() => window.PixOfficeVoxel.getState().actors[8].position.z > .5, null, { timeout: 180000 });
  const strolled = (await state()).actors[8].position;
  assert.ok(strolled.z > .5, `actor 8 never left its room: ${JSON.stringify(strolled)}`);
  await page.locator('[data-action="work"]').click();
  await waitForSeat(8);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'mobile layout overflows');
  await page.screenshot({ path: `${output}/suite-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.goto(`${url}suite.html?embed=1`);
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
  // Draw calls are dominated by the nine unbatched characters, so the suite is
  // compared with the existing nine-person room instead of an arbitrary budget.
  await page.waitForTimeout(800);
  const teamRender = (await state()).render;
  assert.ok(initial.render.calls <= teamRender.calls * 1.4, `suite draws ${initial.render.calls} vs team ${teamRender.calls}`);
  assert.ok(initial.render.triangles <= teamRender.triangles * 3, `suite triangles ${initial.render.triangles} vs team ${teamRender.triangles}`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({
    result: 'passed',
    checks: ['suite scene id and 9 seats in 3 rooms', 'everyone seated facing their desk', 'corridor character enters through its room door',
      'looking back out over the glazed partition', 'all 9 controls isolated', 'all 9 walk back to their own seat through the door',
      'a room character leaves through its door to the corridor', 'person/top/room cameras', 'mobile and tablet layout', 'embed mode',
      'original studio and team pages', 'draw calls vs the existing nine-person room', 'console clean'],
    render: { suite: initial.render, team: teamRender }, output,
  }, null, 2));
} finally { await browser.close(); }
