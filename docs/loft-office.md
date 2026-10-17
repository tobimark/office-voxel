# Loft Office（长桌开间 · 双排对坐）

新增的第三个九人办公室页面，与 `index.html`（三人）和 `nine.html`（原九人三排工位）并列。
**只新增文件，不改动任何原有文件**；删掉下面的新增文件即可完整回退。

## 运行

```powershell
cd example/office-voxel
npm run dev --workspaces=false
```

- 页面：<http://127.0.0.1:5196/loft.html>
- 纯场景（嵌入）模式：<http://127.0.0.1:5196/loft.html?embed=1>
- 可选独立构建（不影响原 `vite.config.js`）：`npx vite build --config vite.loft.config.js` → `dist-loft/`

页面顶部导航可切回三人办公室与原九人办公室；因为原页面未修改，反向入口需要直接访问上面的地址。

## 格局差异

| | `nine.html`（原九人） | `loft.html`（本页） |
| --- | --- | --- |
| 房间 | 20 × 17 | 26 × 16，长条开间 |
| 工位 | 3 排 × 3 列，全部朝同一方向 | 两排对坐：北 5 席朝 +z，南 4 席朝 −z |
| 桌面 | 9 张各自独立的桌子 | 一张 19.4 m 共享长桌，两侧显示器背对背 |
| 走道 | 工位前方一条主过道 | 长桌两侧各一条长走道 + 两端通道，形成环形巡游路线 |
| 场景焦点 | 团队看板、茶水柜 | 左端 6.4 m 长条白板墙、右端吧台（3 张高脚凳 + 背吧架）、窗下矮柜书架、电话亭、休息角、收纳柜 |
| 坐姿朝向 | 全部 yaw = π | 逐座位朝向（北 0、南 π），起身从椅子**后方**走道离开 |

九位角色的外观（发型、服装、配饰、像素头像）沿用原九人页面的人物数据，站位与朝向全部重排。

## 桌面高度与敲键盘动作对齐

桌子高度不是按真实办公桌定的，而是**对齐 `character.js` 的敲键盘动作**：坐姿时手部方块底边落在 `y ≈ 1.00~1.08`、向前伸到座位前约 `0.70 m`。因此：

| 数值 | 取值 | 原因 |
| --- | --- | --- |
| 桌面高度 `loftTable.surface` | `0.98` | 键盘键帽顶面 1.038 正好落在手的下方，手不会陷进桌面 |
| 桌板厚度 | `0.15` | 桌板底面 0.83，膝盖（约 0.55）在桌下通过 |
| 座位到桌面近边 | `1.55 − 1.1 = 0.45` | 手能伸到键盘（键盘中心在座位前 0.72） |
| 键盘 / 鼠标 / 显示器 | 座位前 `0.72 / 0.74 / 1.15` | 由 `deskItems` 统一给出，渲染与测试共用 |

`tests/loft-layout.test.mjs` 里有一条契约用例，按上述姿势公式逐个角色校验：手不得低于桌面、必须落在键帽附近（±0.06）、并在前后方向上压在键盘范围内。以后如果有人再把桌子抬高，这条用例会直接失败。

## 新增文件（回退时删除）

| 文件 | 用途 |
| --- | --- |
| `loft.html` | 页面骨架，与 `nine.html` 同结构，注入 `/src/loft/main.js` |
| `src/loft/layout.js` | 座位、长桌、家具碰撞盒、镜头、巡游点位等纯数据 |
| `src/loft/office.js` | 长桌开间家具与房间渲染，复用 `src/art.js` 图元 |
| `src/loft/main.js` | 布局、家具构建器和文案配置，通过 `shared/scene-page.js` 接入统一引擎 |
| `src/loft/style.css` | 仅本页的样式微调（三入口导航在窄屏下的收窄） |
| `vite.loft.config.js` | 可选的独立构建配置，只打包 `loft.html` |
| `tests/loft-layout.test.mjs` | 座位/朝向/步出点/环线寻路的自动化检查 |
| `scripts/browser-loft-check.mjs` | 浏览器端交互检查 |
| `docs/loft-office.md` | 本文件 |

原有的 `index.html`、`nine.html`、`embed.html`、`src/*`、`vite.config.js`、`package.json`、`tests/*`、`scripts/browser-*.mjs` 全部未修改（可用文件哈希核对）。

## 验证

```powershell
# 单元检查：新增布局 + 原有 navigation / team-layout 用例
node --experimental-test-isolation=none --test tests/*.test.mjs
# 浏览器检查：需要先保持 dev 服务运行
node scripts/browser-loft-check.mjs
```

`tests/loft-layout.test.mjs` 覆盖：9 席与两排朝向、每个座位的步出点可行走、每个座位都能走到巡游路线、环线闭合、家具不越界也不压座位，以及**敲键盘时手落在键盘上、不陷进桌面**的姿势契约。

`scripts/browser-loft-check.mjs` 覆盖：场景 id 与 9 个角色、5+4 对坐朝向、9 个入口互不串扰、9 人各自回到自己的座位并面向长桌、走道行走、特写/俯视/全景镜头、手机与平板无横向溢出、`?embed=1`、原三人页与原九人页仍可用、控制台无错误/警告，并顺带对比绘制开销（`loft` 425 draw calls / 22550 三角形 vs 原九人 413 / 18126）。截图写入 `.artifacts/loft-*.png`，其中 `loft-typing-{short,mid,tall,side,over-short,over-tall}.png` 用于核对桌面高度与敲键盘姿势。

自动化检查在 Chromium（headless + SwiftShader）完成，仍需目标设备实测。
