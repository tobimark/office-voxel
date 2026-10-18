import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishDirectory } from '../scripts/lib/publish-directory.mjs';

const denied = () => Object.assign(new Error('directory rename denied'), { code: 'EPERM' });
async function fixture(t, previous = true) {
  const parent = fileURLToPath(new URL('../.artifacts/', import.meta.url));
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'publication-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const stage = path.join(root, '.characters-stage-test'), outRoot = path.join(root, 'characters');
  async function writeTree(directory, text) {
    await fs.mkdir(path.join(directory, 'nested'), { recursive: true });
    await fs.writeFile(path.join(directory, 'manifest.json'), text);
    await fs.writeFile(path.join(directory, 'nested', 'asset.bin'), text);
  }
  await writeTree(stage, 'new');
  if (previous) await writeTree(outRoot, 'old');
  return { root, stage, outRoot, platform: 'win32', rename: async () => { throw denied(); } };
}
const readTree = async root => Promise.all([
  fs.readFile(path.join(root, 'manifest.json'), 'utf8'),
  fs.readFile(path.join(root, 'nested', 'asset.bin'), 'utf8'),
]);

test('Windows denied renames publish verified copies with or without an existing export', async t => {
  for (const previous of [false, true]) {
    const options = await fixture(t, previous);
    await publishDirectory(options);
    assert.deepEqual(await readTree(options.outRoot), ['new', 'new']);
    assert.deepEqual(await readTree(options.stage), ['new', 'new']);
    assert.deepEqual((await fs.readdir(options.root)).sort(), ['.characters-stage-test', 'characters']);
  }
});

test('a damaged backup copy is rejected before removing any previous content', async t => {
  const options = await fixture(t);
  await assert.rejects(publishDirectory({ ...options, copy: async (from, to, settings) => {
    await fs.cp(from, to, settings);
    if (to.endsWith('nested')) await fs.writeFile(path.join(to, 'asset.bin'), 'damaged');
  } }), /File copy differs/);
  assert.deepEqual(await readTree(options.outRoot), ['old', 'old']);
  assert.deepEqual((await fs.readdir(options.root)).sort(), ['.characters-stage-test', 'characters']);
});

test('a partially copied new export is removed and the verified previous export is restored', async t => {
  const options = await fixture(t);
  await assert.rejects(publishDirectory({ ...options, copy: async (from, to, settings) => {
    await fs.cp(from, to, settings);
    if (from.startsWith(options.stage + path.sep) && to.endsWith('nested')) throw new Error('copy interrupted');
  } }), /copy interrupted/);
  assert.deepEqual(await readTree(options.outRoot), ['old', 'old']);
  assert.deepEqual((await fs.readdir(options.root)).sort(), ['.characters-stage-test', 'characters']);
});

test('a partial old-directory removal failure restores every previous file from the backup', async t => {
  const options = await fixture(t);
  let failed = false;
  await assert.rejects(publishDirectory({ ...options, remove: async (target, settings) => {
    if (target === options.outRoot && !failed) {
      failed = true;
      await fs.rm(path.join(target, 'nested'), { recursive: true });
      throw new Error('remove interrupted');
    }
    await fs.rm(target, settings);
  } }), /remove interrupted/);
  assert.deepEqual(await readTree(options.outRoot), ['old', 'old']);
  assert.deepEqual((await fs.readdir(options.root)).sort(), ['.characters-stage-test', 'characters']);
});

test('failed fallback rollback retains the complete previous backup and reports its path', async t => {
  const options = await fixture(t), backup = `${options.stage}-previous`;
  await assert.rejects(publishDirectory({ ...options, copy: async (from, to, settings) => {
    if (to.startsWith(options.outRoot + path.sep)) throw new Error('disk unavailable');
    await fs.cp(from, to, settings);
  } }), error => error instanceof AggregateError && error.message.includes(backup));
  assert.deepEqual(await readTree(backup), ['old', 'old']);
});

test('fallback never overwrites a pre-existing backup destination', async t => {
  const options = await fixture(t), backup = `${options.stage}-previous`;
  await fs.mkdir(backup);
  await fs.writeFile(path.join(backup, 'unrelated.txt'), 'keep');
  await assert.rejects(publishDirectory(options), { code: 'EEXIST' });
  assert.deepEqual(await readTree(options.outRoot), ['old', 'old']);
  assert.equal(await fs.readFile(path.join(backup, 'unrelated.txt'), 'utf8'), 'keep');
});

test('non-Windows EPERM and non-permission errors propagate without copying', async t => {
  for (const [platform, code] of [['linux', 'EPERM'], ['win32', 'EIO']]) {
    const options = await fixture(t);
    const error = Object.assign(new Error('rename failure'), { code });
    await assert.rejects(publishDirectory({ ...options, platform, rename: async () => { throw error; }, copy: async () => {
      assert.fail('unexpected copy');
    } }), candidate => candidate === error);
    assert.deepEqual(await readTree(options.outRoot), ['old', 'old']);
  }
});
