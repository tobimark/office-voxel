import { createOfficeConfig } from './config/vite-factory.js';
import { siteEntries } from './src/app/site-pages.js';
export default createOfficeConfig({ entries: siteEntries });
