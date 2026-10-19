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
  async function capture(name) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1800);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `${output}${name}.png` });
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
  await office('nine.html');
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
    await capture(`asset-${kind}`);
  }
  assert.deepEqual(errors, [], 'Screenshot pages must have no browser errors or warnings');
  console.log(`Screenshots verified: ${output}`);
} finally {
  await browser?.close();
  await server.close();
}
