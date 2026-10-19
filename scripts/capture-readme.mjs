import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

// Run a private server so screenshots always reflect the current checkout.
const output = fileURLToPath(new URL('../docs/images/', import.meta.url));
await mkdir(output, { recursive: true });
const server = await createServer({ server: { host: '127.0.0.1', port: 5208, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
let browser;
const errors = [];
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
  async function capture(name, { fullPage = false } = {}) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}${name}.png`, fullPage });
    console.log(`Captured ${name}.png`);
  }
  async function office(path) {
    await page.goto(`http://127.0.0.1:5208/${path}`);
    await page.waitForFunction(() => window.PixOfficeVoxel?.tasks?.getState().fontReady);
    await page.evaluate(() => {
      window.PixOfficeVoxel.pause(true);
      window.PixOfficeVoxel.tasks.seek(12000);
      window.PixOfficeVoxel.tasks.pause(true);
    });
    await page.locator('#loading').waitFor({ state: 'hidden' });
  }
  async function navigation(section, href) {
    assert.deepEqual(await page.locator('.site-primary a').allTextContents(), ['场景体验', '素材库', '开发接入']);
    assert.equal(await page.locator('.site-primary [aria-current]').textContent(), section);
    assert.equal(await page.locator('.site-secondary [aria-current="page"]').getAttribute('href'), href);
  }
  await office('nine.html');
  await navigation('场景体验', './nine.html');
  await capture('office-nine');
  await page.locator('[data-person="0"]').click();
  await page.getByRole('menuitem', { name: '查看电脑屏幕' }).click();
  await capture('task-computer');
  for (const [path, name] of [['?embed=1', 'office-studio'], ['loft.html?embed=1', 'office-loft'], ['suite.html?embed=1', 'office-suite'], ['floor.html?embed=1', 'office-floor']]) {
    await page.setViewportSize({ width: 1200, height: 800 });
    await office(path);
    await capture(name);
  }
  await page.setViewportSize({ width: 1600, height: 1080 });
  for (const kind of ['characters', 'objects']) {
    await page.goto(`http://127.0.0.1:5208/${kind}.html`);
    await page.waitForFunction(() => window.assetLibraryPreview?.getState().selectedId);
    if (kind === 'characters') {
      await page.locator('.asset-card[data-id="team-00"]').click();
      await page.locator('[data-action="wave"]').click();
      await page.waitForTimeout(600);
      await page.locator('#pause').click();
    } else {
      const station = page.locator('.asset-card').filter({ hasText: '工位' }).first();
      await station.click();
    }
    await page.locator('#asset-list').evaluate(list => { list.scrollTop = 0; });
    await page.locator('#preview-message').waitFor({ state: 'hidden' });
    await navigation('素材库', `./${kind}.html`);
    await capture(`asset-${kind}`, { fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await office('');
  await navigation('场景体验', './');
  assert.equal(await page.getByLabel('切换办公室', { exact: true }).isVisible(), true);
  assert.equal(await page.locator('.site-secondary').isVisible(), false);
  await capture('office-mobile');

  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto('http://127.0.0.1:5208/embed.html');
  await navigation('开发接入', './embed.html');
  await page.getByRole('button', { name: '让小麦打个招呼', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('[data-command]').disabled);
  const embedded = page.frames().find(frame => frame.url().includes('embed=1'));
  assert.ok(embedded);
  await embedded.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
  await embedded.evaluate(() => {
    window.PixOfficeVoxel.pause(true);
    window.PixOfficeVoxel.tasks.seek(12000);
    window.PixOfficeVoxel.tasks.pause(true);
  });
  assert.equal(await embedded.locator('.site-header').isVisible(), false);
  await capture('embed-example', { fullPage: true });
  assert.deepEqual(errors, [], 'Screenshot pages must have no browser errors or warnings');
  console.log(`Screenshots verified: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
