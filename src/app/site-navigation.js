import { sitePages, siteSections } from './site-pages.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

// Rendered by Vite in development and production, so links work before JS/WebGL.
export function renderSiteNavigation(pageId, availableFiles = sitePages.map(page => page.file)) {
  const pages = sitePages.filter(page => availableFiles.includes(page.file));
  const current = pages.find(page => page.id === pageId);
  if (!current) throw new Error(`Unavailable website page: ${pageId}`);
  const section = siteSections.find(item => item.id === current.section);
  const siblings = pages.filter(page => page.section === current.section);
  const sections = siteSections.filter(item => pages.some(page => page.section === item.id));
  const primary = sections.map(item => {
    const destination = pages.find(page => page.section === item.id);
    return `<a href="${escapeHtml(destination.href)}"${item.id === section.id ? ' aria-current="true"' : ''}>${escapeHtml(item.label)}</a>`;
  }).join('');
  const secondary = siblings.map(page => `<a href="${escapeHtml(page.href)}"${page.id === pageId ? ' aria-current="page"' : ''}>${escapeHtml(page.label)}${page.capacity ? `<span>${page.capacity} 人</span>` : ''}</a>`).join('');
  const options = siblings.map(page => `<option value="${escapeHtml(page.href)}"${page.id === pageId ? ' selected' : ''}>${escapeHtml(page.label)}${page.capacity ? ` · ${page.capacity} 人` : ''}</option>`).join('');

  return `<header class="site-header">
    <div class="site-top">
      <a class="site-brand" href="${escapeHtml(pages[0].href)}" aria-label="Office Voxel 首页"><span class="site-mark" aria-hidden="true"><i></i><i></i><i></i></span>Office Voxel</a>
      <span class="site-tagline">像素办公室实验室</span>
      <nav class="site-primary" aria-label="网站主导航">${primary}</nav>
    </div>
    <div class="site-context">
      <span class="site-context-label">${escapeHtml(section.context)}</span>
      <nav class="site-secondary" aria-label="${escapeHtml(section.context)}">${secondary}</nav>
      <div class="site-mobile-switch">
        <label class="site-select-label" for="site-page-select">${escapeHtml(section.selectLabel)}</label>
        <select id="site-page-select" data-site-page-select>${options}</select>
      </div>
      ${section.id === 'scenes' ? '<button id="pause" class="site-pause" aria-pressed="false">暂停动画</button>' : ''}
    </div>
  </header>`;
}
