import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../.artifacts/task-displays/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (['error', 'warning'].includes(msg.type())) errors.push(msg.text()); });
const url = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const getState = () => page.evaluate(() => window.PixOfficeVoxel.tasks.getState());
async function load(path) {
  await page.goto(new URL(path, url).href);
  await page.waitForFunction(() => window.PixOfficeVoxel?.tasks?.getState().fontReady);
  await page.evaluate(() => { window.PixOfficeVoxel.pause(true); window.PixOfficeVoxel.tasks.seek(12000); window.PixOfficeVoxel.tasks.pause(true); });
}
async function capture(name) { await page.waitForTimeout(1800); await page.screenshot({ path: `${output}/${name}.png`, fullPage: true }); }
try {
  for (const [path, name, capacity] of [['loft.html', 'loft', 9], ['', 'studio', 3], ['nine.html', 'team', 9], ['suite.html', 'suite', 9], ['floor.html', 'floor', 24]]) {
    if (process.env.TASK_SCENES && !process.env.TASK_SCENES.split(',').includes(name)) continue;
    await load(path);
    let state = await getState();
    assert.equal(state.bindings.length, capacity);
    assert.equal(state.surfaces.filter(s => s.kind === 'computer').length, capacity);
    assert.equal(new Set(state.bindings.map(b => b.displayId)).size, capacity);
    assert.ok(state.surfaces.every(s => s.revision > 0));
    assert.ok(Object.values(state.logs).filter(logs => logs.length).length >= 2);
    const before = state.surfaces.map(s => s.revision);
    await page.waitForTimeout(800);
    assert.deepEqual((await getState()).surfaces.map(s => s.revision), before, 'paused content must not redraw');
    await capture(`${name}-room`);
    await page.locator('[data-task-focus="mission"]').click();
    assert.equal((await getState()).focused, 'mission');
    await capture(`${name}-mission`);
    await page.locator('[data-task-focus="tasks"]').click();
    await capture(`${name}-tasks`);
    const board = (await getState()).surfaces.find(s => s.id === 'tasks');
    if (board.pages > 1) { await page.locator('[data-display-next]').click(); assert.notEqual((await getState()).surfaces.find(s => s.id === 'tasks').page, board.page); }
    // Every avatar, including all 24 on Floor, must open its own computer.
    for (let i = 0; i < capacity; i++) {
      await page.locator(`[data-person="${i}"]`).click();
      assert.equal(await page.locator('#agent-display-menu').isVisible(), true);
      await page.getByRole('menuitem', { name: '查看电脑屏幕' }).click();
      assert.equal((await getState()).focused, state.bindings[i].displayId);
    }
    await page.locator('[data-person="0"]').click();
    await page.getByRole('menuitem', { name: '查看电脑屏幕' }).click();
    await capture(`${name}-computer`);
    // Keyboard menu exit returns focus to the originating avatar.
    await page.locator('[data-person="1"]').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#agent-display-menu').isHidden(), true);
    assert.equal(await page.locator('[data-person="1"]').evaluate(el => el === document.activeElement), true);
    await page.locator('[data-task-room]').click();
    assert.equal((await getState()).focused, null);
    assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().camera), 'room');
    await page.evaluate(() => { window.PixOfficeVoxel.tasks.seek(29000); window.PixOfficeVoxel.tasks.pause(true); });
    assert.equal((await getState()).subtasks[3].status, 'blocked');
    await page.evaluate(() => { window.PixOfficeVoxel.tasks.seek(74000); window.PixOfficeVoxel.tasks.pause(true); });
    assert.equal((await getState()).run.status, 'completed');
    await page.locator('[data-task-replay]').click();
    state = await getState(); assert.ok(Object.values(state.logs).every(logs => !logs.length));
    assert.equal(state.subtasks.filter(t => t.status === 'completed').length, 0);
    if (name === 'floor') {
      const textures = await page.evaluate(() => window.PixOfficeVoxel.getState().render.textures);
      for (let i = 0; i < 5; i++) await page.evaluate(() => { window.PixOfficeVoxel.tasks.seek(74000); window.PixOfficeVoxel.tasks.replay(); });
      assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().render.textures), textures);
      const rooms = state.surfaces.filter(s => s.roomId && s.kind === 'board'); assert.equal(rooms.length, 6);
    }
    console.log(`${name}: task content, ${capacity} mappings, menus, playback and focus passed`);
  }
  await load('loft.html?embed=1');
  assert.ok(await page.locator('.task-toolbar').isVisible());
  await page.locator('[data-task-focus="tasks"]').click(); await capture('embed-tasks');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-task-focus="mission"]').click(); await capture('mobile-mission');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('[data-task-people]').click();
  await page.locator('[data-agent-person="0"]').click();
  const rect = await page.locator('#agent-display-menu').boundingBox(); assert.ok(rect.x >= 0 && rect.x + rect.width <= 390);
  await page.getByRole('menuitem', { name: '查看电脑屏幕' }).click(); await capture('mobile-computer');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await load('floor.html');
  await page.locator('[data-task-focus="mission"]').click(); await capture('reduced-motion-mission');
  assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().paused), true);
  await page.locator('#tweaks-toggle').click();
  await page.locator('#lighting').selectOption('night');
  await page.locator('#pixelated').check();
  await page.locator('#tweaks-close').click();
  await page.locator('[data-task-focus="tasks"]').click(); await capture('night-pixelated-tasks');
  // Replace the source, stream enough output to exercise history, then detach it.
  await page.evaluate(() => {
    const tasks = window.PixOfficeVoxel.tasks, snapshot = tasks.getState();
    snapshot.run = { ...snapshot.run, title: '后端快照：动态任务内容', status: 'running' };
    snapshot.subtasks[0].description = '中文长段说明与 Mixed Agent 内容需要完整分页展示。'.repeat(12);
    tasks.setSource({ kind: 'backend', getSnapshot: () => snapshot, subscribe(fn) { window.__taskEvent = fn; return () => { window.__taskDetached = true; }; } });
    const agentId = snapshot.subtasks[0].assigneeAgentId;
    for (let i = 1; i <= 12; i++) window.__taskEvent({ runId: snapshot.run.id, seq: snapshot.seq + i, type: 'agent.output', payload: { id: `backend-${i}`, agentId, subtaskId: snapshot.subtasks[0].id, text: `工具输出 ${i}：验证独立日志和历史翻页。`, timestamp: i * 1000, kind: 'tool' } });
    tasks.focus(snapshot.bindings.find(b => b.agentId === agentId).displayId);
  });
  assert.equal(await page.locator('.task-playback').isHidden(), true);
  await page.locator('[data-display-prev]').click();
  assert.ok((await getState()).surfaces.some(s => s.offset > 0));
  await capture('backend-history');
  await page.locator('[data-display-latest]').click();
  assert.ok((await getState()).surfaces.filter(s => s.kind === 'computer').every(s => s.offset === 0));
  await page.locator('[data-task-focus="tasks"]').click();
  assert.ok((await getState()).surfaces.find(s => s.id === 'tasks').pages > 1);
  await capture('backend-long-tasks');
  await page.evaluate(() => { const tasks = window.PixOfficeVoxel.tasks, snapshot = tasks.getState(); tasks.setSource({ kind: 'backend', getSnapshot: () => snapshot, subscribe: () => () => {} }); });
  assert.equal(await page.evaluate(() => window.__taskDetached), true);
  assert.deepEqual(errors, []);
  console.log(`Task displays browser checks passed; screenshots: ${output}`);
} finally { await browser.close(); }
