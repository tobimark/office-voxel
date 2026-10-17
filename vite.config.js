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
    name: 'isolated-voxel-demo',
    resolveId(source) {
      if (source.startsWith('@pixoffice/') || /(?:^|[/\\])packages[/\\]/.test(source)) {
        throw new Error(`Voxel demo must not import shared project code: ${source}`);
      }
    },
  }],
  build: {
    outDir: 'dist', emptyOutDir: true,
    rolldownOptions: {
      input: { demo: `${root}index.html`, nine: `${root}nine.html`, embed: `${root}embed.html` },
      output: {
        codeSplitting: { groups: [
          { name: 'orbit-controls', test: /three[/\\]examples[/\\]/, priority: 10, includeDependenciesRecursively: false },
          { name: 'three', test: /node_modules[/\\]three[/\\]/, priority: 0 },
        ] },
      },
    },
  },
});
