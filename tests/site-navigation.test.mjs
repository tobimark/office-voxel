import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../vite.config.js';
import { sitePages, siteEntries } from '../src/app/site-pages.js';
import { renderSiteNavigation } from '../src/app/site-navigation.js';

test('the default build ships every registered destination at its existing URL', async () => {
  const entries = Object.values(config.build.rolldownOptions.input);
  assert.equal(entries.length, 8);
  for (const page of sitePages) {
    assert.ok(entries.some(entry => path.basename(entry) === page.file), page.file);
    const html = await readFile(new URL(`../${page.file}`, import.meta.url), 'utf8');
    assert.equal(html.split('<header data-site-header></header>').length, 2, page.file);
  }
  assert.equal(siteEntries.studio, 'index.html');
  assert.equal(siteEntries.team, 'nine.html');
});

test('each office exposes all five layouts with one current page and matching mobile selection', () => {
  for (const page of sitePages.filter(item => item.section === 'scenes')) {
    const html = renderSiteNavigation(page.id);
    for (const scene of sitePages.filter(item => item.section === 'scenes')) {
      assert.ok(html.includes(`>${scene.label}<span>${scene.capacity} 人</span></a>`));
    }
    assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
    assert.ok(html.includes(`href="${page.href}" aria-current="page"`));
    assert.ok(html.includes(`value="${page.href}" selected`));
    for (const label of ['场景体验', '素材库', '开发接入']) assert.ok(html.includes(`>${label}</a>`));
    assert.equal((html.match(/id="pause"/g) ?? []).length, 1);
  }
});

test('standalone builds only link to destinations included in their output', () => {
  for (const id of ['loft', 'suite', 'floor']) {
    const page = sitePages.find(item => item.id === id);
    const html = renderSiteNavigation(id, [page.file]);
    const links = [...html.matchAll(/(?:href|value)="([^"]+)"/g)].map(match => match[1]);
    assert.ok(links.length > 0);
    assert.ok(links.every(href => href === page.href));
    assert.ok(!html.includes('素材库'));
  }
  assert.throws(() => renderSiteNavigation('studio', ['floor.html']), /Unavailable website page/);
});
