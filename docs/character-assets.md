# 人物资产（public/assets/characters）

把示例里**全部人物**导出、落盘成可直接使用的外形资产：头像、对照图、glTF 模型。
资产由示例自身的程序化人物代码（`src/character.js` + `src/appearance.js`）生成，
不含 Unity / Minecraft 或任何外部素材。

- 落盘位置：`example/office-voxel/public/assets/characters/`
- 规模：**27 个角色 / 81 个文件 / 约 4.1 MB**
- 页面运行时仍然程序化生成人物，**不读取这些文件**——它们是导出产物，不是运行时依赖。

## 目录结构

```
public/assets/characters/
  manifest.json          全部角色清单：外观字段、用途、文件、大小与 sha256
  README.md              资产目录自述（由脚本生成）
  <id>/portrait.png      侧栏头像：36 × 40 像素图 ×4 最近邻放大（144 × 160）
  <id>/sheet.png         对照图 1024²：正面 / 侧面 / 背面 / 头部特写
                         + 开心·专注·惊讶·困倦 四张表情贴图 + 外观与重用说明
  <id>/model.glb         glTF 2.0 二进制模型（含像素材质与表情贴图）
```

`id` 形如 `team-04`、`floor-13`：

| 前缀 | 数量 | 对应页面 |
| --- | --- | --- |
| `studio` | 3 | 三人办公室（`index.html`，基础服装） |
| `team` | 9 | 九人办公室（`nine.html`），同时被长桌开间与分间办公室复用 |
| `floor` | 15 | 大平层（`floor.html`）新增的 15 位 |

同一个外观只导出一份，`manifest.json` 的 `usedBy` 记录它出现在哪些座位上
（例如 `team-04: team-04, floor-03`）。合计 27 套 = 3 + 9 + 15。

## 重新生成

```powershell
cd example/office-voxel
npm run dev --workspaces=false                              # 需要开发服务在跑
node scripts/export-characters.mjs                          # 头像 + 对照图 + 模型
node scripts/export-characters.mjs --only=portrait,sheet    # 只要图片
```

导出流程：Node 启动 headless Chromium 打开 [tools/character-assets.html](../tools/character-assets.html)，
该页用 `src/character.js` / `src/appearance.js` 现场搭出每个角色，
渲染四个视角、读取脸部贴图、用 `GLTFExporter` 打出 `.glb`，再把结果交回 Node 落盘并写清单。
Node 侧会用同一份人物清单 [src/shared/character-roster.js](../src/shared/character-roster.js) 交叉校验，
防止"页面认出来的角色"和"代码里的角色"不一致。

## 怎么用

- 开发服务直接可取：
  `http://127.0.0.1:5196/public/assets/characters/floor-13/sheet.png`
  （`server.fs.allow` 已限定在本示例目录内，路径就在示例根下，已验证 200。）
- 生产构建：示例原有的 `vite.config.js` 是 `publicDir: false`（本目录未改动它）。
  要在构建产物里带上资产，在你自己的 Vite 配置里加一行 `publicDir: 'public'` 即可。
- `.glb` 可直接拖进 Blender / three.js 编辑器 / glTF 查看器；像素材质与表情贴图已内嵌。

## 校验

```powershell
node --experimental-test-isolation=none --test tests/character-assets.test.mjs
```

`tests/character-assets.test.mjs`（纯 Node，不需要浏览器）会：

1. 从布局重新推导 27 套外观，与 `manifest.json` 的 `id / look / usedBy` **逐字段比对**
   ——代码改了外观却忘了重新导出，这条会直接失败并提示重跑脚本；
2. 逐个文件核对存在性、字节数、sha256，并用魔数确认格式：
   PNG 头、`.glb` 的 `glTF` 魔数与版本 2、头里声明的长度等于文件长度；
3. 校验头像恒为 144 × 160、对照图恒为 1024²、资产集总大小仍在上限内；
4. 抽样解析 `.glb` 的 JSON 块，确认节点数、材质数、内嵌贴图与 BIN 块都在。

## 新增文件（回退时删除）

| 文件 | 用途 |
| --- | --- |
| `src/shared/character-roster.js` | 全部角色外观清单（导出与测试共用，纯数据、Node 可读） |
| `src/tools/character-assets.js` | 浏览器端导出实现（四视角渲染、头像放大、GLB 导出） |
| `tools/character-assets.html` | 导出入口页（`?preview=1` 可先看三张对照图） |
| `scripts/export-characters.mjs` | Node 侧落盘脚本：写文件、算 sha256、生成 `manifest.json` 与资产 README |
| `tests/character-assets.test.mjs` | 资产与代码一致性、格式与哈希校验 |
| `public/assets/characters/**` | 生成出来的资产本体（27 × 3 个文件 + 清单 + README） |
| `docs/character-assets.md` | 本文件 |

原有的 `index.html`、`nine.html`、`embed.html`、`src/*`（原有文件）、`vite.config.js`、`package.json`、`tests/*`（原有文件）、`scripts/browser-*.mjs` 全部未修改（可用文件哈希核对）。
