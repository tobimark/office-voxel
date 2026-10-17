import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = fileURLToPath(new URL('../.artifacts/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1168 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text()); });
  const base = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
  await page.goto(`${base}tests/appearance-preview.html`);
  await page.waitForFunction(() => window.appearancePreview);
  await page.screenshot({ path: `${output}/nine-characters-front.png`, fullPage: true });
  // The same geometry must be distinctive from the seated back view too.
  await page.evaluate(() => window.appearancePreview.render(true));
  await page.screenshot({ path: `${output}/nine-characters-back.png`, fullPage: true });
  await page.goto(`${base}nine.html`);
  await page.waitForFunction(() => window.PixOfficeVoxel);
  assert.equal(await page.locator('canvas.portrait').count(), 9);
  await page.locator('[data-person="8"]').click();
  assert.match(await page.locator('#character-detail').textContent(), /针织帽.*圆框眼镜.*长围巾/);
  assert.deepEqual(errors, []);
  console.log('Character front/back sheets rendered, all 9 matching portraits and selected identity descriptions checked; console clean.');
} finally { await browser.close(); }
