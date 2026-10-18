import { collectAssetLibrary } from './asset-library-data.js';

// Vite watches these directories in development and discovers new modules automatically.
// Production builds bundle the current directory contents; exported PNG/GLB is not needed.
export const assetLibrary = collectAssetLibrary(
  import.meta.glob('../assets/characters/**/catalog.js', { eager: true }),
  import.meta.glob('../assets/furniture/**/*.preview.js', { eager: true }),
);
