import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../src/', import.meta.url));
async function sources(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await sources(file));
    else if (file.endsWith('.js')) result.push(file);
  }
  return result;
}
test('engine, assets and world never depend on concrete layouts or application adapters', async () => {
  for (const layer of ['engine','assets','world']) {
    for (const file of await sources(path.join(root,layer))) {
      const content = await readFile(file,'utf8');
      for (const [,specifier] of content.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)) {
        if (!specifier.startsWith('.')) continue;
        const target = path.relative(root,path.resolve(path.dirname(file),specifier)).split(path.sep)[0];
        assert.ok(!['layouts','app','integrations','tools'].includes(target),`${path.relative(root,file)} depends on ${target}`);
      }
    }
  }
});
test('all pages use the same application entry and layout registry', async () => {
  for (const name of ['index','nine','loft','suite','floor']) {
    const html=await readFile(new URL(`../${name}.html`,import.meta.url),'utf8');
    assert.match(html,/src="\/src\/app\/main\.js"/);
  }
});
