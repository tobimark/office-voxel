// Visual capture requires a local Vite server; --licenses-only does not.
// Full export replaces the validated set; --only / --ids preserves other assets.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { characterRoster } from '../src/tools/character-roster.js';
import { ASSET_KINDS, exportCharacterAssets } from './lib/character-export.mjs';

const args=process.argv.slice(2);
const licensesOnly=args.includes('--licenses-only');
if(args.some(arg=>arg!=='--licenses-only'&&!arg.startsWith('--only=')&&!arg.startsWith('--ids=')) || (licensesOnly && args.length!==1)) throw new Error('Usage: export-characters.mjs [--only=portrait,sheet,model] [--ids=team-00,...] or --licenses-only');
const option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3).split(',').map(v=>v.trim()).filter(Boolean) ?? fallback;
const roster=characterRoster(), kinds=option('only',ASSET_KINDS), ids=option('ids',roster.map(e=>e.id));
if(!kinds.length || kinds.some(k=>!ASSET_KINDS.includes(k)) || !ids.length || ids.some(id=>!roster.some(e=>e.id===id))) throw new Error('Invalid --only or --ids selection');
const outRoot=fileURLToPath(new URL('../public/assets/characters/',import.meta.url));
if (licensesOnly) {
  const manifest=await exportCharacterAssets({outRoot,roster,readme:assetReadme,licensesOnly:true});
  console.log(`Updated licenses for ${manifest.counts.characters} characters; retained ${manifest.counts.files} PNG/GLB files`);
} else {
  const base=process.env.DEMO_URL||'http://127.0.0.1:5196/';
  const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1200},deviceScaleFactor:1});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.goto(new URL('tools/character-assets.html',base).href);
    await page.waitForFunction(()=>window.characterAssets,null,{timeout:60000});
    const actual=await page.evaluate(()=>window.characterAssets.roster);
    const expected=roster.map(({fingerprint,...e})=>e);
    if(JSON.stringify(actual)!==JSON.stringify(expected)) throw new Error('Browser character catalog differs from Node catalog');
    const manifest=await exportCharacterAssets({outRoot,roster,kinds,ids,readme:assetReadme,async produce(entry,selected){
      const index=roster.findIndex(e=>e.id===entry.id);
      const assets=await page.evaluate(({index,kinds})=>window.characterAssets.get(index,kinds),{index,kinds:selected});
      if(assets.id!==entry.id)throw new Error('Exported character ID mismatch');
      if(errors.length)throw new Error(errors.join(' | '));
      console.log(`${entry.id} ${entry.name}: ${selected.join(', ')}`);
      return Object.fromEntries(selected.map(kind=>[kind,Buffer.from(kind==='model'?assets.model:assets[kind].split(',')[1],'base64')]));
    }});
    console.log(`Published ${manifest.counts.characters} characters / ${manifest.counts.files} files (${(manifest.counts.bytes/1024/1024).toFixed(2)} MB)`);
  } finally {await browser.close();}
}

export function assetReadme(manifest) {
  return `# 人物导出产物\n\n由 scripts/export-characters.mjs 生成；manifest.json 记录稳定外观 ID、人物身份和五布局使用关系。\n\n${manifest.counts.characters} 个外观 / ${manifest.counts.files} 个 PNG/GLB 文件。\n\n- portrait.png：144 × 160 像素头像。\n- sheet.png：1024 × 1024 正侧背视图与表情。\n- model.glb：内嵌材质与脸部纹理的静态 glTF 2.0 快照，不包含 JavaScript 动态行为。\n- 运行时由代码生成人物，不读取本目录；Vite publicDir 为 false。\n- --only=portrait,sheet 或 --ids=team-00：局部更新，保留其他文件；首次请完整导出。\n- --licenses-only：无需浏览器，事务更新许可和清单，保留全部 PNG/GLB 字节。\n- 临时目录生成、格式/大小/哈希校验成功后替换；失败保留旧目录。\n\n## 许可\n\n本项目提供的 PNG/GLB 素材采用 [MIT License](LICENSE)，包括 doubao-00。商用、修改与再分发须保留版权和许可声明；具体范围见 [素材许可](ASSET_LICENSE.md)。字体等第三方内容继续适用各自许可，完整声明见 [第三方声明](THIRD_PARTY_NOTICES.md) 与 licenses/。清单中的文件数与字节数仅统计 PNG/GLB。\n\n仓库内的导出和人物使用说明详见 docs/character-assets.md。\n`;
}
