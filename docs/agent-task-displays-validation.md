# 多 Agent 任务显示：实现与验收记录

日期：2026-10-16（Asia/Shanghai）。

## 已实现

- 五种布局：三人、九人、Loft、Suite、Floor。
- 场景内真实板面显示任务主题、目标和完成进度；分块白板显示子任务内容、负责人和状态。
- 独立工位纹理显示对应 Agent 的当前任务、步骤、日志和结果摘要；固定工位绑定不受人物走动影响。
- 74 秒确定性 mock，包含三个 Agent 并行工作、受阻后恢复、最终完成，支持暂停、继续、重播。
- 主板/白板镜头按钮，人物头像菜单中的电脑特写，正面镜头自适应，返回全景。
- Suite、Floor 复用走廊原有墙面标牌显示主题；房间白板按工位归属过滤，公共看板显示全部子任务。
- 本地中文像素字体、字号网格、低频光标、按内容变化重绘、日志容量上限和生命周期释放。
- 手机特写采用更大文字、单任务卡和分页；桌面保留多卡片布局。断点变更时重建 GPU 纹理以消除旧尺寸上传残影。
- embed 模式提供紧凑头像栏；菜单可用键盘操作，支持 Escape 和点击外部关闭。
- `tasks.setSource()` 支持快照和事件订阅形式的后端适配器，切换时销毁旧数据源订阅。当前默认演示使用本地 mock。

## 自动验证

| 检查 | 结果 |
| --- | --- |
| `npm run test --workspaces=false` | 35 / 35 通过，包括 7 项新增状态、映射、日志、分页、镜头测试 |
| `npm run test:browser:tasks --workspaces=false` | 五种布局全量通过，54 个人物菜单与工位映射全部通过 |
| 窄屏调整后的专项复验（`TASK_SCENES=extras`） | 通过：embed、390px 窄屏、减少动态效果、夜间像素模式、替换数据源、长文本和日志翻页 |
| `npm run test:browser --workspaces=false` | 原有 WebGL、动作、表情、灵活度、回工位、走路、暂停、人物选择、光线、像素模式、手机/平板、iframe 命令、embed、减少动态效果回归通过 |
| 默认 Vite 构建 | 通过：三人、九人、embed |
| `vite.loft.config.js` 构建 | 通过 |
| `vite.suite.config.js` 构建 | 通过 |
| `vite.floor.config.js` 构建 | 通过 |
| 当前任务文案、状态中文字符覆盖 | 字体 cmap 检查无缺字；字体包含 36,539 个映射字符 |
| 字体与许可证发布 | 四套产物均包含本地 WOFF2 和 `licenses/fusion-pixel/` |

专项测试还检查了暂停后纹理不再重绘、Floor 重播五次后纹理数量稳定、同轮旧事件/重复事件不重复追加、跨 Agent 日志引用被拒绝、每 Agent 最多保留 200 条日志、数据源退订和实际页面无控制台错误/警告。

浏览器验证使用本机 Chromium 的 SwiftShader WebGL，未进行移动实机或 Safari 验证；渲染性能结果不代表实机帧率保证。

## 视觉检查

已打开并检查桌面主题板、子任务白板、电脑特写，以及手机主题板/电脑特写和夜间像素模式截图。修正了低帧率镜头未及时到位、Loft 白板过矮、窄屏字体过小及 Canvas 尺寸变化后的 GPU 纹理残影。

27 张专项截图位于忽略目录 `.artifacts/task-displays/`，包括：

- `loft-mission.png`、`loft-tasks.png`、`loft-computer.png`
- `studio-*`、`team-*`、`suite-*`、`floor-*`
- `mobile-mission.png`、`mobile-computer.png`
- `embed-tasks.png`、`reduced-motion-mission.png`、`night-pixelated-tasks.png`
- `backend-history.png`、`backend-long-tasks.png`

运行方法、事件字段、后端适配接口和独立构建命令见示例 README 的“多 Agent 动态任务演示”。
