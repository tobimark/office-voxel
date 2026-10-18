import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { collectAssetLibrary, filterAssets } from '../src/tools/asset-library-data.js';
import * as catalog from '../src/assets/characters/catalog.js';
import { characterActions, characterExpressions } from '../src/assets/characters/motions.js';
import { furnitureBuilders } from '../src/assets/furniture/registry.js';
import { monitorSpecs } from '../src/assets/furniture/spec.js';

async function discover(directory, match) {
  const modules = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) Object.assign(modules, await discover(url, match));
    else if (match(entry.name)) modules[url.href] = await import(url.href);
  }
  return modules;
}

test('directory catalogs include every current appearance and registered furniture variant', async () => {
  const library = collectAssetLibrary(
    await discover(new URL('../src/assets/characters/', import.meta.url), name => name === 'catalog.js'),
    await discover(new URL('../src/assets/furniture/', import.meta.url), name => name.endsWith('.preview.js')),
  );
  assert.deepEqual(library.characters.map(entry => entry.id).sort(), Object.keys(catalog.appearances).sort());
  assert.equal(library.identityCount, Object.keys(catalog.characters).length);
  for (const id of [...Object.keys(furnitureBuilders), ...Object.keys(monitorSpecs)]) {
    assert.ok(library.objects.some(entry => entry.id === id), id);
  }
  assert.equal(library.objects.length, new Set(library.objects.map(entry => entry.id)).size);
});

test('new directory modules are collected without a page-side asset list', () => {
  const source = { characters: { test: { id: 'test', name: '新伙伴', role: '测试' } },
    appearances: { look: { id: 'look', characterId: 'test', shirt: '#123456' } } };
  const object = { id: 'new-object', name: '新物品', category: '装饰', create() {} };
  const library = collectAssetLibrary({ '/new/catalog.js': source }, { '/new/extra.preview.js': { assetPreviews: [object] } });
  assert.equal(library.characters[0].name, '新伙伴');
  assert.equal(library.objects[0].source, '/new/extra.preview.js');
  assert.equal(library.objects[0].create, object.create);
  assert.equal(source.appearances.look.x, undefined, 'source data is not mutated');
  assert.throws(() => collectAssetLibrary({ one: source, two: source }, {}), /Duplicate/);
  assert.throws(() => collectAssetLibrary({ one: { appearances: source.appearances } }, {}), /Unknown character/);
  assert.throws(() => collectAssetLibrary({}, { one: { assetPreviews: [{ id: 'invalid' }] } }), /Invalid/);
  assert.deepEqual(collectAssetLibrary({}, {}).objects, []);
});

test('search supports Chinese names, roles and case-insensitive IDs with category filters', () => {
  const entries = [{ id: 'DESK-A', name: '办公桌', category: '桌子' }, { id: 'xiaomai', name: '小麦', role: '设计师', category: '人物' }];
  assert.equal(filterAssets(entries, ' desk-a ')[0].id, 'DESK-A');
  assert.equal(filterAssets(entries, '设计师')[0].name, '小麦');
  assert.equal(filterAssets(entries, '', '桌子').length, 1);
  assert.deepEqual(filterAssets(entries, '不存在'), []);
});

test('motion catalog covers the model action and expression branches', async () => {
  const model = await readFile(new URL('../src/assets/characters/model.js', import.meta.url), 'utf8');
  const actions = new Set(['idle', ...[...model.matchAll(/actor\.action === '([^']+)'/g)].map(match => match[1])]);
  const expressions = new Set([...model.matchAll(/e === '([^']+)'/g)].map(match => match[1]));
  assert.deepEqual(new Set(characterActions.map(entry => entry.id)), actions);
  assert.deepEqual(new Set(characterExpressions.map(entry => entry.id)), expressions);
});
