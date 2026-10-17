# Suite Office（分间办公室 · 走廊 + 四扇门）

新增的第四个九人页面，与 `index.html`（三人）、`nine.html`（三排工位九人）、`loft.html`（长桌开间）并列。
**只新增文件，不改动任何原有文件**；删掉下面的新增文件即可完整回退。

## 运行

```powershell
cd example/office-voxel
npm run dev --workspaces=false
```

- 页面：<http://127.0.0.1:5196/suite.html>
- 纯场景（嵌入）模式：<http://127.0.0.1:5196/suite.html?embed=1>
- 可选独立构建（不影响原 `vite.config.js`）：`npx vite build --config vite.suite.config.js` → `dist-suite/`

页面顶部导航用短标签列出四个场景（三人 / 九人 / 长桌 / 分间）；因为原页面未修改，反向入口需要直接访问上面的地址。

## 格局：一条走廊，四扇门

```
        后墙 + 每间 2 扇窗
 ┌──────────┬──────────┬──────────┐
 │ 01 设计间 │ 02 研发间 │ 03 协作间 │   ← 三间三人办公室，玻璃隔断 + 一扇门
 │  3 工位   │  3 工位   │  3 工位   │
 └───┬──────┴────┬─────┴────┬─────┘
     │ 门         │ 门        │ 门
 ════╧════════════╧══════════╧════════  ← 走廊（地毯贯通）
 ┌────────────┐      吧台 · 收纳柜 · 沙发休息区
 │ 04 会议室   │ 门                  ← 会议室也在玻璃隔断里，走门进
 │ 长桌 + 6 椅 │
 └────────────┘
```

| | `loft.html`（长桌开间） | `suite.html`（本页） |
| --- | --- | --- |
| 房间 | 一间开间 26 × 16 | 26 × 16，被隔成 4 间 + 一条走廊 |
| 分隔 | 无内墙 | 三间办公室 + 一间会议室，**各有一扇门** |
| 工位 | 一张 19.4 m 共享长桌 | 每间 3 张独立工位 |
| 隔墙做法 | — | 总高 2.4 m：下 0.9 m 实墙 + 上段透明玻璃 + 木框 |
| 公共区 | 吧台、休息角 | 走廊 + 吧台 + 收纳柜 + 沙发休息区 |

## 墙与门是怎么做的

- 隔墙按**运行段**生成：实心下段、玻璃上段、上下横档、两端立柱；门洞位置单独加门套（两侧立柱 + 门楣 + 门楣上方固定玻璃），再放一扇**开启状态的玻璃门扇**（带木框和把手）与地面门槛。
- 每个墙段、每扇门扇都在 `src/layouts/suite.js` 里对应一个碰撞盒，渲染与寻路共用同一份数据。
- 门洞净宽 1.2 m（会议室 1.4 m），大于人物直径 0.64 m，网格寻路能穿过；`tests/suite-layout.test.mjs` 会断言：墙中心不可通行、门洞中心可通行、且**从房间走到走廊的路径必须经过门洞坐标**（走墙会被判失败）。
- 一个踩过的坑：会议室的门原本向内开，门扇和长桌一起把房间东侧过道彻底封死，寻路直接失败。现在这扇门改为**向走廊外开**，测试里保留了「会议室整间可达」这条用例。

## 桌面高度与敲键盘动作

和长桌开间同一套做法：桌面高度对齐 `character.js` 的敲键盘姿势（手部底边约 1.00~1.08、前伸约 0.70 m），因此桌面取 `0.98`、桌板 0.15，键盘放在座位前 0.72、显示器 1.35。`tests/suite-layout.test.mjs` 里的姿势契约会对 9 个人逐个校验：手不得低于桌面、必须落在键帽附近（±0.06）、并且整只手压在桌板范围内。

## 新增文件（回退时删除）

| 文件 | 用途 |
| --- | --- |
| `suite.html` | 页面骨架，注入 `/src/app/main.js` |
| `src/layouts/suite.js` | 房间、门洞、墙段、座位、家具碰撞盒、镜头、巡游路线（纯数据） |
| `src/assets/environments/glazed-rooms.js` | 隔墙/门扇/门窗/工位/会议室/走廊/茶水休息区渲染，复用 `src/assets/materials/art.js` |
| `src/app/main.js` | 布局、家具构建器和文案配置，通过 `app/scene-page.js` 接入统一引擎 |
| `src/app/styles/suite.css` | 仅本页的样式微调（四入口导航在窄屏下的收窄） |
| `vite.suite.config.js` | 可选的独立构建配置，只打包 `suite.html` |
| `tests/suite-layout.test.mjs` | 房间/门/寻路/姿势的自动化检查 |
| `scripts/browser-suite-check.mjs` | 浏览器端交互检查 |
| `docs/suite-office.md` | 本文件 |

原有的 `index.html`、`nine.html`、`embed.html`、`src/*`、`vite.config.js`、`package.json`、`tests/*`、`scripts/browser-*.mjs` 全部未修改（可用文件哈希核对）。

## 验证

```powershell
node --experimental-test-isolation=none --test tests/*.test.mjs   # 18 个用例（含原有 2 个测试文件）
node scripts/browser-suite-check.mjs                              # 需先保持 dev 服务运行
```

`tests/suite-layout.test.mjs` 覆盖：三间各 3 席与朝向、墙不可穿越且门洞可通行、**出房间的路径必须穿过门洞**、会议室整间可达、走廊巡游环线进入三间办公室、家具不越界不压座位、敲键盘姿势契约。

`scripts/browser-suite-check.mjs` 覆盖：场景 id 与 9 席、8 人已在各自房间面向桌子、走廊里的人**走门进房间**、房间里的人**走门出到走廊**、9 个入口互不串扰、9 人各自走门回到自己的座位、三种镜头、手机与平板无横向溢出、`?embed=1`、原三人页与原九人页仍可用、控制台无错误/警告，并对比绘制开销（`suite` 428 draw calls / 23512 三角形 vs 原九人 413 / 18126）。截图写入 `.artifacts/suite-*.png`（`suite-door.png` 是隔墙与门扇的特写）。

自动化检查在 Chromium（headless + SwiftShader）完成，仍需目标设备实测。
