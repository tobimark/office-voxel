import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Font licenses accompany every independently deployable build.
export function pixelFontLicenses() {
  return {
    name: 'pixel-font-licenses',
    async generateBundle() {
      const root = fileURLToPath(new URL('../src/assets/fonts/', import.meta.url));
      const emit = async directory => {
        for (const file of await readdir(directory, { withFileTypes: true })) {
          const absolute = path.join(directory, file.name);
          if (file.isDirectory()) await emit(absolute);
          else if (!file.name.endsWith('.woff2')) this.emitFile({ type: 'asset', fileName: `licenses/fusion-pixel/${path.relative(root, absolute).replaceAll('\\', '/')}`, source: await readFile(absolute) });
        }
      };
      await emit(root);
    },
  };
}
