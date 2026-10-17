// Optional standalone build for the loft page only. The shared vite.config.js is
// left untouched, so this file is the whole build surface of the new page.
//
//   npx vite build --config vite.loft.config.js     ->  dist-loft/
//
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { pixelFontLicenses } from './scripts/pixel-font-licenses.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root,
  base: './',
  publicDir: false,
  server: { fs: { strict: true, allow: [root] } },
  plugins: [pixelFontLicenses(), {
    name: 'isolated-loft-page',
    resolveId(source) {
      if (source.startsWith('@pixoffice/') || /(?:^|[/\\])packages[/\\]/.test(source)) {
        throw new Error(`Voxel demo must not import shared project code: ${source}`);
      }
    },
  }],
  build: {
    outDir: 'dist-loft', emptyOutDir: true,
    rolldownOptions: {
      input: { loft: `${root}loft.html` },
      output: {
        codeSplitting: { groups: [
          { name: 'orbit-controls', test: /three[/\\]examples[/\\]/, priority: 10, includeDependenciesRecursively: false },
          { name: 'three', test: /node_modules[/\\]three[/\\]/, priority: 0 },
        ] },
      },
    },
  },
});
