// Write every character asset to public/assets/characters/.
//
//   node scripts/export-characters.mjs                        # portrait + sheet + model
//   node scripts/export-characters.mjs --only=portrait,sheet  # skip the .glb files
//
// A dev server must already be running (npm run dev --workspaces=false): the export
// drives tools/character-assets.html in headless Chromium, so the assets are produced
// by the same character.js / appearance.js code the pages use.
import { chromium } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { characterRoster } from '../src/shared/character-roster.js';

const VALID = ['portrait', 'sheet', 'model'];
const outRoot = fileURLToPath(new URL('../public/assets/characters/', import.meta.url));
const relativeRoot = 'public/assets/characters';
const base = process.env.DEMO_URL || 'http://127.0.0.1:5196/';
const requested = (process.argv.find(arg => arg.startsWith('--only='))?.slice('--only='.length) || VALID.join(','))
  .split(',').map(kind => kind.trim()).filter(Boolean);
if (!requested.length || requested.some(kind => !VALID.includes(kind))) {
  throw new Error(`--only accepts a subset of ${VALID.join(',')}`);
}
const kinds = VALID.filter(kind => requested.includes(kind));

const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const fromDataUrl = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const expected = characterRoster();

await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });

const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${base}tools/character-assets.html`);
  await page.waitForFunction(() => window.characterAssets, null, { timeout: 60000 });
  const roster = await page.evaluate(() => window.characterAssets.roster);
  if (roster.length !== expected.length) {
    throw new Error(`the tool found ${roster.length} characters but the roster has ${expected.length}`);
  }
  const characters = [];
  let totalBytes = 0, totalFiles = 0;
  for (let index = 0; index < roster.length; index++) {
    const entry = roster[index], source = expected[index];
    if (entry.id !== source.id || JSON.stringify(entry.look) !== JSON.stringify(source.look)) {
      throw new Error(`character ${entry.id} in the page does not match the roster (${source.id})`);
    }
    const assets = await page.evaluate(i => window.characterAssets.get(i), index);
    const buffers = {
      portrait: fromDataUrl(assets.portrait),
      sheet: fromDataUrl(assets.sheet),
      model: Buffer.from(assets.model, 'base64'),
    };
    const dir = `${outRoot}${entry.id}/`;
    await mkdir(dir, { recursive: true });
    const files = {};
    for (const kind of kinds) {
      const file = kind === 'model' ? 'model.glb' : `${kind}.png`;
      await writeFile(`${dir}${file}`, buffers[kind]);
      files[kind] = { file, bytes: buffers[kind].length, sha256: sha256(buffers[kind]) };
      totalBytes += buffers[kind].length; totalFiles += 1;
    }
    characters.push({ ...entry, files });
    console.log(`  ${entry.id.padEnd(10)} ${entry.name} · ${entry.role}  ${Object.values(files).map(file => `${(file.bytes / 1024).toFixed(1)}kB`).join(' + ')}`);
  }
  if (errors.length) throw new Error(`page errors while exporting: ${errors.join(' | ')}`);
  const manifest = {
    name: 'pixoffice-voxel-characters',
    version: 1,
    generator: 'scripts/export-characters.mjs',
    source: 'src/character.js + src/appearance.js — procedural voxel characters, no external art',
    exportedAt: new Date().toISOString(),
    kinds,
    counts: { characters: characters.length, files: totalFiles, bytes: totalBytes },
    characters,
  };
  await writeFile(`${outRoot}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(`${outRoot}README.md`, readme(manifest, totalFiles, totalBytes));
  console.log(`\n${characters.length} characters, ${totalFiles} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB -> ${relativeRoot}/`);
  console.log('manifest.json written; run `node --experimental-test-isolation=none --test tests/character-assets.test.mjs` to verify.');
} finally {
  await browser.close();
}

function readme(manifest, files, bytes) {
  return `# 人物资产（Character assets）

本目录由 \`node scripts/export-characters.mjs\` 自动生成，请勿手工修改。
资产来自示例本身的程序化人物代码（\`src/character.js\` + \`src/appearance.js\`），
不包含任何 Unity / Minecraft 素材。

- 角色数：${manifest.counts.characters}
- 文件数：${files}，合计 ${(bytes / 1024 / 1024).toFixed(2)} MB
- 生成时间：${manifest.exportedAt}
- 生成内容：${manifest.kinds.join(' / ')}

## 目录结构

\`\`\`
public/assets/characters/
  manifest.json              全部角色的清单：外观字段、用途、文件与 sha256
  README.md                  本文件
  <id>/portrait.png          侧栏头像，36 × 40 像素图的 4 倍放大（144 × 160，最近邻）
  <id>/sheet.png             对照图：正面 / 侧面 / 背面 / 头部特写 + 四种表情纹理 + 外观说明
  <id>/model.glb             glTF 2.0 二进制模型（含像素材质与表情贴图）
\`\`\`

\`id\` 形如 \`floor-07\`：\`studio\`（三人页 3 套）、\`team\`（九人页 9 套）、\`floor\`（大平层新增的 15 套）。
同一个外观被多个场景复用时只导出一份，\`manifest.json\` 的 \`usedBy\` 记录它出现在哪些座位上。

## 重新生成

\`\`\`powershell
npm run dev --workspaces=false            # 需要开发服务在跑
node scripts/export-characters.mjs
node scripts/export-characters.mjs --only=portrait,sheet   # 只要图片，不导模型
\`\`\`

## 使用方式

- 开发服务下可直接访问：\`http://127.0.0.1:5196/public/assets/characters/<id>/portrait.png\`
- 页面运行时仍然**程序化生成**人物（不读取这些文件），所以本目录是导出产物、不是运行时依赖。
- 若希望构建产物带上这些资产，在你自己的 Vite 配置里加一行 \`publicDir: 'public'\`
  （示例原有的 \`vite.config.js\` 是 \`publicDir: false\`，本目录未改动它）。
- 校验资产是否与代码一致：\`node --experimental-test-isolation=none --test tests/character-assets.test.mjs\`
`;
}
