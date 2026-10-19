import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const notices = ['LICENSE', 'ASSET_LICENSE.md', 'THIRD_PARTY_NOTICES.md', 'licenses/pixoffice/LICENSE', 'licenses/three/LICENSE', 'licenses/vite/LICENSE.md'];

// One collection serves every website build and the transactional asset export.
export async function readDistributionLicenses() {
  const files = new Map(await Promise.all(notices.map(async name => [name, await readFile(new URL(name, root))])));
  const normalize = text => text.replaceAll('\r\n', '\n').trimEnd();
  for (const [name, source] of [
    ['licenses/three/LICENSE', new URL('../LICENSE', import.meta.resolve('three'))],
    ['licenses/vite/LICENSE.md', new URL('LICENSE.md', import.meta.resolve('vite/package.json'))],
  ]) {
    const installed = await readFile(source, 'utf8');
    if (normalize(files.get(name).toString('utf8')) !== normalize(installed)) {
      throw new Error(`Dependency license changed; update ${name} and THIRD_PARTY_NOTICES.md before distribution`);
    }
  }
  const fonts = fileURLToPath(new URL('src/assets/fonts/', root));
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(absolute);
      else if (!entry.name.endsWith('.woff2')) {
        const name = path.relative(fonts, absolute).split(path.sep).join('/');
        files.set(`licenses/fusion-pixel/${name}`, await readFile(absolute));
      }
    }
  }
  await collect(fonts);
  return files;
}
