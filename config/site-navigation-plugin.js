import path from 'node:path';
import { sitePages } from '../src/app/site-pages.js';
import { renderSiteNavigation } from '../src/app/site-navigation.js';

export function siteNavigationPlugin(entries) {
  let availableFiles;
  return {
    name: 'office-site-navigation',
    configResolved(config) {
      // The dev server serves every HTML page; standalone builds only ship their entries.
      availableFiles = config.command === 'serve' ? sitePages.map(page => page.file) : Object.values(entries);
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, context) {
        const page = sitePages.find(item => item.file === path.basename(context.filename));
        if (!page) return html;
        return {
          html: html.replace('<header data-site-header></header>', renderSiteNavigation(page.id, availableFiles)),
          tags: [
            { tag: 'link', attrs: { rel: 'stylesheet', href: '/src/app/styles/site-navigation.css' }, injectTo: 'head' },
            { tag: 'script', attrs: { type: 'module', src: '/src/app/site-navigation-controls.js' }, injectTo: 'body' },
          ],
        };
      },
    },
  };
}
