# 人物导出产物

人物目录、使用关系、资源生命周期及事务导出的完整约定见 [素材管理](material-management.md)。

- 定义来源：`src/assets/characters/catalog.js` 的 25 个人物身份、28 套外观。
- 五布局实例：`src/assets/characters/casts.js`，共 54 个实例。
- 清单生成：`src/tools/character-roster.js`，包含 studio/team/loft/suite/floor 的全部使用关系。
- 产物目录：`public/assets/characters/`，28 个条目、84 个 PNG/GLB 文件。
- 运行时由代码生成，不读取产物；Vite 保留 `publicDir: false`。
- GLB 包含模型、材质和当前脸部纹理，不包含 JavaScript 动态行为。

```powershell
cd D:\kunlunmeta\office-voxel
npm run dev
# 另一个终端：
npm run export:characters
npm run export:characters -- --only=portrait,sheet
npm run export:characters -- --ids=team-00
npm test
```

全量导出经临时目录生成、格式/解压/哈希校验后替换；失败回滚旧目录。
Windows 目录改名受阻时，使用复制并逐文件核对的退路，完整备份确认后才移除旧目录；消费者应等待导出成功返回后读取。发布可回滚，但不保证原子可见性；恢复规则见[素材管理](material-management.md)。
局部导出需已有完整有效产物，保留未选中的文件和哈希。
修改外观后应对该外观导出全部三种文件；人物集变化后应完整导出。

`portrait.png` 是 144 × 160 像素头像；`sheet.png` 是 1024 × 1024 正侧背视图、特写与表情；`model.glb` 是内嵌像素贴图的 glTF 2.0 静态快照。

开发服务可访问 `/public/assets/characters/<appearanceId>/portrait.png`。生产构建默认不复制本目录。资源来自程序化人物代码，不含 Unity / Minecraft 外部素材。

## 豆包

新增独立人物身份 `doubao`，外观 ID 为 `doubao-00`，职业为 AI 助手。深棕齐肩短发、黑色连衣裙、红围巾参考[豆包 App Store 头像](https://apps.apple.com/cn/app/id6459478672)，裙装按本项目方块风格制作；没有复制外部模型或贴图。

她暂未分配办公室工位，五布局仍是 54 个实例。开发服务打开 `/tools/character-assets.html?preview=doubao-00` 可查看正侧背视图、头像特写和表情；生成文件位于 `public/assets/characters/doubao-00/`。

布局可通过 `instantiateCharacter({ characterId: 'doubao', appearanceId: 'doubao-00', instanceId: 'custom:actor:doubao' }, { x: 0, z: 0, phase: 0 })` 选择她。裙摆分片挂在大腿关节，随走路与坐姿折向；围巾随躯干运动，继续使用现有动作、表情和资源租约。

`npm run test:browser:doubao` 校验独立预览、头像配色、裙摆坐姿与行走跟随、私有与共享资源释放，并将正侧背、打字、走路、挥手六种视图写入 `.artifacts/doubao/poses.png`。

新增表情 `drool`（呆萌流口水）：发直的小瞳孔、微张嘴和蓝白色口水，水滴以两帧循环下落；眨眼或说话时仍保留口水，切换表情后清除。人物素材库和五布局均可选择，预览地址 `/characters.html?asset=doubao-00&expression=drool`。专项检查还覆盖表情切换及水滴变化，特写截图位于 `.artifacts/doubao/drooling.png`，人物对照图由统一表情目录生成全部五种表情。

验证记录（2026-10-18）：71 项 Node 测试、主入口及 loft/suite/floor 四套构建通过；豆包专项及原有人物外观专项通过；engine、resources、furniture、composition、tasks 和 geometry:workstations 检查全部通过。当前人物素材库也已确认能直接选中 `doubao-00` 并切换打字、行走、挥手。完整事务导出为 28 套外观、84 个文件，约 4.20 MB。

环境失败记录：首次浏览器启动未找到沙箱默认路径中的 Chromium，指定本机浏览器缓存后启动成功；沙箱内本机服务访问先被拒绝，提升浏览器后连接该服务仍超时。将服务与浏览器均运行于宿主后重跑以上检查通过，前述启动和连接失败不计为测试通过。

### 流口水表情增补验证（2026-10-18）

- 75 项 Node 测试及四套生产构建通过；对照图增加第五种表情后，11 项人物目录、导出格式/哈希与素材库契约检查再次通过。事务导出仅更新 28 张对照图，头像和 GLB 保留，完整产物约 4.24 MB。
- 豆包专项通过口水帧变化、说话与眨眼时的口水保留、切换后的清除，以及素材库直接链接和办公室按钮。素材库全量预览、移动端、全部五种表情及资源清理通过；资源、家具基线与工位组合专项通过。
- 引擎完整回归未通过：首次在页面重载时丢失执行上下文；隔离服务及缓存后，三人和九人布局通过，长桌行走步骤等待 180 秒后超时，未将该轮引擎检查计为通过。另行正常加载长桌页面并让末位人物行走，3 秒内坐标从 `(6.6, 2.6)` 移至 `(7.5725, 2.5)`，仍在沿路径行走；该定点检查不代替完整回归。
- 首次任务显示检查也因页面重载导致菜单节点脱离而超时 30 秒，未计为通过；独立缓存服务上的完整重跑通过五布局、全部 54 个人物绑定及附加展示检查。工位几何专项随后通过五布局全部 54 台电脑，四种打字姿态均无前景人物遮挡。
