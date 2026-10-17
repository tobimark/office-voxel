import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { characterRoster, rosterSummary } from '../src/shared/character-roster.js';

// The exported assets are committed alongside the code, so these checks run without
// a browser: they re-derive the roster from the layouts and compare it with what is
// actually on disk.
const root = new URL('../public/assets/characters/', import.meta.url);
const manifest = async () => JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const pngSize = buffer => ({ width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) });

test('the manifest lists every distinct character look in the example', async () => {
  const data = await manifest(), roster = characterRoster();
  assert.deepEqual(rosterSummary(), { total: 27, studio: 3, team: 9, floor: 15 });
  assert.equal(data.name, 'pixoffice-voxel-characters');
  assert.equal(data.counts.characters, roster.length);
  assert.deepEqual(data.characters.map(entry => entry.id), roster.map(entry => entry.id));
  for (const [index, entry] of data.characters.entries()) {
    const source = roster[index];
    assert.equal(entry.name, source.name);
    assert.equal(entry.role, source.role);
    assert.deepEqual(entry.look, source.look, `${entry.id} look is out of date — run node scripts/export-characters.mjs`);
    assert.deepEqual(entry.usedBy, source.usedBy, `${entry.id} usage is out of date`);
  }
  // The nine team looks are reused verbatim on the big floor plate.
  const shared = data.characters.filter(entry => entry.usedBy.length > 1);
  assert.equal(shared.length, 9);
  for (const entry of shared) assert.deepEqual(entry.usedBy, [`team-${String(entry.index).padStart(2, '0')}`, `floor-${String(entry.usedBy[1].slice(-2))}`].slice(0, 2));
});

test('every asset is on disk, hashed, and of the declared format', async () => {
  const data = await manifest();
  let files = 0, bytes = 0;
  for (const entry of data.characters) {
    assert.deepEqual(Object.keys(entry.files).sort(), ['model', 'portrait', 'sheet']);
    for (const [kind, file] of Object.entries(entry.files)) {
      const buffer = await readFile(new URL(`${entry.id}/${file.file}`, root));
      files += 1; bytes += buffer.length;
      assert.equal(buffer.length, file.bytes, `${entry.id}/${file.file} size`);
      assert.equal(createHash('sha256').update(buffer).digest('hex'), file.sha256, `${entry.id}/${file.file} sha256`);
      if (kind === 'model') {
        assert.equal(buffer.subarray(0, 4).toString('ascii'), 'glTF', `${file.file} must be a binary glTF`);
        assert.equal(buffer.readUInt32LE(4), 2, 'glTF 2.0');
        assert.equal(buffer.readUInt32LE(8), buffer.length, 'the glb header length must match the file');
      } else {
        assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `${file.file} must be a PNG`);
        const { width, height } = pngSize(buffer);
        if (kind === 'portrait') assert.deepEqual([width, height], [144, 160], 'the portrait keeps the pixel-art aspect');
        else assert.deepEqual([width, height], [1024, 1024], 'the sheet is a 1024 square');
      }
    }
  }
  assert.equal(files, data.counts.files);
  assert.equal(bytes, data.counts.bytes);
  assert.ok(data.counts.bytes < 8 * 1024 * 1024, 'the asset set should stay small enough to commit');
});

test('the models carry the character meshes, materials and embedded face texture', async () => {
  const data = await manifest();
  for (const id of ['studio-00', 'team-04', 'floor-23']) {
    const entry = data.characters.find(item => item.id === id);
    const buffer = await readFile(new URL(`${entry.id}/${entry.files.model.file}`, root));
    const jsonLength = buffer.readUInt32LE(12);
    const json = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8'));
    assert.equal(json.asset.version, '2.0', `${id} glTF version`);
    // A .glb is header (12) + JSON chunk header (8) + JSON + BIN chunk header (8).
    assert.equal(buffer.subarray(24 + jsonLength, 28 + jsonLength).toString('ascii'), 'BIN\0', `${id} needs a binary chunk`);
    // glTF reuses one mesh per distinct geometry+material pair, so the box count
    // shows up as nodes while meshes/materials track the characters' colour set.
    assert.ok(json.nodes.length >= 40, `${id} should carry the whole box rig (${json.nodes.length} nodes)`);
    assert.ok(json.meshes.length >= 6, `${id} meshes (${json.meshes.length})`);
    assert.ok(json.materials.length >= 6, `${id} materials (${json.materials.length})`);
    assert.ok(json.images?.length >= 6, `${id} must embed the pixel textures (${json.images.length})`);
  }
});

test('the asset folder documents itself', async () => {
  const readme = await readFile(new URL('README.md', root), 'utf8');
  assert.match(readme, /export-characters\.mjs/);
  assert.match(readme, /manifest\.json/);
  assert.match(readme, /publicDir/);
});
