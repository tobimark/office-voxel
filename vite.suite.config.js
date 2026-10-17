import { createOfficeConfig } from './config/vite-factory.js';
export default createOfficeConfig({ entries: { suite: 'suite.html' }, outDir: 'dist-suite' });
