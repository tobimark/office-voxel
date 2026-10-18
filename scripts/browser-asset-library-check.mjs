import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { appearances } from '../src/assets/characters/catalog.js';
import { characterActions, characterExpressions } from '../src/assets/characters/motions.js';

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1080 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
const base = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const output = '.artifacts/asset-library';
await mkdir(output, { recursive: true });
try {
  for (const kind of ['characters', 'objects']) {
    await page.goto(new URL(`${kind}.html`, base).href);
    await page.waitForFunction(() => window.assetLibraryPreview?.getState().selectedId);
    const cards = page.locator('.asset-card');
    const count = await cards.count();
    if (kind === 'characters') assert.equal(count, Object.keys(appearances).length);
    assert.ok(count > 0);
    assert.equal(await page.locator('#preview canvas').count(), 1);
    assert.equal(await page.locator('.asset-card img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0)), true);
    const ids = await cards.evaluateAll(buttons => buttons.map(button => button.dataset.id));
    for (const id of ids) {
      await page.locator(`.asset-card[data-id="${id}"]`).click();
      assert.equal(await page.locator('#detail-id').textContent(), id);
      assert.equal(await page.locator('#preview-message').isHidden(), true, id);
      assert.equal(await page.locator('#preview canvas').count(), 1);
    }
    if (kind === 'characters') {
      for (const action of characterActions) {
        await page.locator(`[data-action="${action.id}"]`).click();
        assert.equal(await page.evaluate(() => window.assetLibraryPreview.getState().action), action.id);
      }
      for (const expression of characterExpressions) {
        await page.locator(`[data-expression="${expression.id}"]`).click();
        assert.equal(await page.evaluate(() => window.assetLibraryPreview.getState().expression), expression.id);
      }
      await page.locator('#pause').click();
      const frozen = await page.evaluate(() => window.assetLibraryPreview.getState().time);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => window.assetLibraryPreview.getState().time), frozen);
      await page.locator('#pause').click();
      await page.locator('[data-action="wave"]').click();
      await page.locator('[data-expression="happy"]').click();
      await page.locator('[data-camera="face"]').click();
      await page.locator('[data-camera="overview"]').click();
    }
    await page.locator('#search').fill('nothing-matches-this');
    assert.equal(await cards.count(), 0); assert.equal(await page.locator('#empty').isVisible(), true);
    await page.locator('#search').fill('');
    const category = await page.locator('#category option').nth(1).getAttribute('value');
    await page.locator('#category').selectOption(category);
    assert.ok(await cards.count() > 0); assert.ok(await cards.count() < count);
    await page.locator('#category').selectOption('');
    await cards.first().click();
    await page.reload();
    await page.waitForFunction(() => window.assetLibraryPreview?.getState().selectedId);
    assert.equal(await page.evaluate(() => window.assetLibraryPreview.getState().selectedId), ids[0]);
    await page.screenshot({ path: `${output}/${kind}-desktop.png`, fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('[data-camera="front"]').click();
    await page.screenshot({ path: `${output}/${kind}-mobile.png`, fullPage: true });
    await page.evaluate(() => { const preview = window.assetLibraryPreview; preview.dispose(); preview.dispose(); });
    assert.equal(await page.locator('#preview canvas').count(), 0);
    await page.setViewportSize({ width: 1440, height: 1080 });
    console.log(`${kind}: ${count} assets, previews, search/filter, deep link, mobile and cleanup passed`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(new URL('characters.html', base).href);
  await page.waitForFunction(() => window.assetLibraryPreview?.getState().paused);
  await page.locator('nav a[href="./objects.html"]').click();
  await page.waitForFunction(() => window.assetLibraryPreview?.getState().selectedId);
  await page.goBack();
  await page.waitForFunction(() => window.assetLibraryPreview?.getState().paused);
  assert.equal(await page.locator('#preview canvas').count(), 1);
  assert.deepEqual(errors, []);
  console.log('Reduced motion honored; no browser errors or warnings.');
} finally { await browser.close(); }
