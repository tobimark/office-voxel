import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { distributionLicenses } from '../scripts/distribution-licenses.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export function createOfficeConfig({ entries, outDir = 'dist' }) {
  return defineConfig({
    root, base: './', publicDir: false,
    server: { fs: { strict: true, allow: [root] } },
    plugins: [distributionLicenses(), {
      name: 'standalone-office',
      resolveId(source) {
        if (source.startsWith('@pixoffice/') || /(?:^|[/\\])packages[/\\]/.test(source)) throw new Error(`Office must not import parent project code: ${source}`);
      },
    }],
    build: {
      outDir, emptyOutDir: true,
      rolldownOptions: {
        input: Object.fromEntries(Object.entries(entries).map(([key,file]) => [key, `${root}${file}`])),
        output: { codeSplitting: { groups: [
          { name: 'orbit-controls', test: /three[/\\]examples[/\\]/, priority: 10, includeDependenciesRecursively: false },
          { name: 'three', test: /node_modules[/\\]three[/\\]/, priority: 0 },
        ] } },
      },
    },
  });
}
