import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { sitePages } from '../src/app/site-pages.js';

const base = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const output = '.artifacts/navigation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });

async function ready(destination) {
  if (destination.section === 'scenes') await page.waitForFunction(() => window.PixOfficeVoxel?.tasks.getState().fontReady);
  else if (destination.section === 'assets') await page.waitForFunction(() => window.assetLibraryPreview?.getState().selectedId);
  else await page.waitForFunction(() => !document.querySelector('[data-command]').disabled);
}

try {
  for (const destination of sitePages) {
    const response = await page.goto(new URL(destination.href, base).href);
    assert.equal(response.status(), 200, destination.file);
    await ready(destination);
    assert.deepEqual(await page.locator('.site-primary a').allTextContents(), ['场景体验', '素材库', '开发接入']);
    assert.equal(await page.locator('.site-primary [aria-current]').textContent(), { scenes: '场景体验', assets: '素材库', integration: '开发接入' }[destination.section]);
    assert.equal(await page.locator('.site-secondary [aria-current="page"]').getAttribute('href'), destination.href);
    const siblings = sitePages.filter(item => item.section === destination.section);
    assert.equal(await page.locator('.site-secondary a').count(), siblings.length);
    assert.equal(await page.locator('#site-page-select').inputValue(), destination.href);
    if (destination.section === 'scenes') {
      const apiPaused = await page.evaluate(() => window.PixOfficeVoxel.getState().paused);
      await page.locator('#pause').click();
      assert.equal(await page.evaluate(() => window.PixOfficeVoxel.getState().paused), !apiPaused);
      await page.locator('#pause').click();
    }
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${destination.id}: overflow at ${width}px`);
      const useSelector = width <= 1000;
      assert.equal(await page.locator('#site-page-select').isVisible(), useSelector);
      assert.equal(await page.locator('.site-secondary').isVisible(), !useSelector);
      assert.equal(await page.locator('.site-primary a').evaluateAll(links => links.every(link => {
        const bounds = link.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.height >= 44;
      })), true, `${destination.id}: primary navigation bounds at ${width}px`);
      if ([390, 1440].includes(width) && ['studio', 'floor', 'characters', 'embed'].includes(destination.id)) {
        await page.screenshot({ path: `${output}/${destination.id}-${width}.png`, fullPage: true });
      }
    }
    console.log(`${destination.file}: sections, current page, ${siblings.length} destinations, responsive 320–1440px passed`);
  }

  // Traverse every layout through the actual mobile switch, then the primary sections.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base);
  for (const destination of sitePages.filter(item => item.section === 'scenes').slice(1)) {
    await page.getByLabel('切换办公室', { exact: true }).selectOption(destination.href);
    await page.waitForURL(new URL(destination.href, base).href);
    await ready(destination);
    assert.equal(await page.locator('#site-page-select').inputValue(), destination.href);
  }
  await page.goBack();
  await page.waitForURL(new URL('suite.html', base).href);
  assert.equal(await page.locator('#site-page-select').inputValue(), './suite.html');
  await page.getByRole('link', { name: '素材库', exact: true }).click();
  await ready(sitePages.find(item => item.id === 'characters'));
  await page.getByLabel('切换素材分类', { exact: true }).selectOption('./objects.html');
  await page.waitForURL(new URL('objects.html', base).href);
  await ready(sitePages.find(item => item.id === 'objects'));
  await page.getByRole('link', { name: '开发接入', exact: true }).click();
  await ready(sitePages.find(item => item.id === 'embed'));
  await page.getByRole('button', { name: '让小麦打个招呼', exact: true }).click();
  const embedded = page.frames().find(frame => frame.url().includes('embed=1'));
  await embedded.waitForFunction(() => window.PixOfficeVoxel.getState().actors[0].action === 'wave');
  assert.equal(await embedded.locator('.site-header').isVisible(), false);
  assert.equal(await embedded.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true);
  await page.getByRole('link', { name: 'Office Voxel 首页', exact: true }).click();
  await page.waitForURL(new URL('./', base).href);

  // Build-time navigation must remain usable even if application JS fails or is disabled.
  const staticPage = await browser.newPage({ javaScriptEnabled: false });
  await staticPage.goto(base);
  await staticPage.locator('.site-secondary a[href="./floor.html"]').click();
  assert.equal(staticPage.url(), new URL('floor.html', base).href);
  await staticPage.getByRole('link', { name: '素材库', exact: true }).click();
  assert.equal(staticPage.url(), new URL('characters.html', base).href);
  await staticPage.close();

  assert.deepEqual(errors, []);
  console.log(`Mobile navigation, iframe commands, pure embed, JS-disabled links and clean console passed. Screenshots: ${output}`);
} finally {
  await browser.close();
}
