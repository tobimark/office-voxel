// Website destinations belong to the application, separate from 3D layout data.
export const siteSections = Object.freeze([
  { id: 'scenes', label: '场景体验', context: '办公室布局', selectLabel: '切换办公室' },
  { id: 'assets', label: '素材库', context: '素材分类', selectLabel: '切换素材分类' },
  { id: 'integration', label: '开发接入', context: '接入示例', selectLabel: '选择接入示例' },
].map(section => Object.freeze(section)));

export const sitePages = Object.freeze([
  { id: 'studio', section: 'scenes', file: 'index.html', href: './', label: '三人工作室', capacity: 3 },
  { id: 'team', section: 'scenes', file: 'nine.html', href: './nine.html', label: '九人办公室', capacity: 9 },
  { id: 'loft', section: 'scenes', file: 'loft.html', href: './loft.html', label: '共享长桌', capacity: 9 },
  { id: 'suite', section: 'scenes', file: 'suite.html', href: './suite.html', label: '分间套间', capacity: 9 },
  { id: 'floor', section: 'scenes', file: 'floor.html', href: './floor.html', label: '大平层', capacity: 24 },
  { id: 'characters', section: 'assets', file: 'characters.html', href: './characters.html', label: '人物素材' },
  { id: 'objects', section: 'assets', file: 'objects.html', href: './objects.html', label: '物品素材' },
  { id: 'embed', section: 'integration', file: 'embed.html', href: './embed.html', label: 'iframe 嵌入示例' },
].map(page => Object.freeze(page)));

export const siteEntries = Object.freeze(Object.fromEntries(sitePages.map(page => [page.id, page.file])));
