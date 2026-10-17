# 人物资产（Character assets）

本目录由 `node scripts/export-characters.mjs` 自动生成，请勿手工修改。
资产来自示例本身的程序化人物代码（`src/character.js` + `src/appearance.js`），
不包含任何 Unity / Minecraft 素材。

- 角色数：27
- 文件数：81，合计 4.06 MB
- 生成时间：2026-10-16T11:11:19.360Z
- 生成内容：portrait / sheet / model

## 目录结构

```
public/assets/characters/
  manifest.json              全部角色的清单：外观字段、用途、文件与 sha256
  README.md                  本文件
  <id>/portrait.png          侧栏头像，36 × 40 像素图的 4 倍放大（144 × 160，最近邻）
  <id>/sheet.png             对照图：正面 / 侧面 / 背面 / 头部特写 + 四种表情纹理 + 外观说明
  <id>/model.glb             glTF 2.0 二进制模型（含像素材质与表情贴图）
```

`id` 形如 `floor-07`：`studio`（三人页 3 套）、`team`（九人页 9 套）、`floor`（大平层新增的 15 套）。
同一个外观被多个场景复用时只导出一份，`manifest.json` 的 `usedBy` 记录它出现在哪些座位上。

## 重新生成

```powershell
npm run dev --workspaces=false            # 需要开发服务在跑
node scripts/export-characters.mjs
node scripts/export-characters.mjs --only=portrait,sheet   # 只要图片，不导模型
```

## 使用方式

- 开发服务下可直接访问：`http://127.0.0.1:5196/public/assets/characters/<id>/portrait.png`
- 页面运行时仍然**程序化生成**人物（不读取这些文件），所以本目录是导出产物、不是运行时依赖。
- 若希望构建产物带上这些资产，在你自己的 Vite 配置里加一行 `publicDir: 'public'`
  （示例原有的 `vite.config.js` 是 `publicDir: false`，本目录未改动它）。
- 校验资产是否与代码一致：`node --experimental-test-isolation=none --test tests/character-assets.test.mjs`
