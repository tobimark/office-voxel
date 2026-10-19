# 使用与集成指南

返回 [项目首页](../README.md)。

独立工程迁移基线与人物、家具、资源生命周期、事务导出的约定见 [素材管理](material-management.md)。

后续批量制作人物与物品时，可参考 [批量素材制作经验与验收规范](batch-asset-guide.md)。

一个独立的浏览器 3D MVP，探索 **Minecraft 启发的方块空间 + 更灵活的人物关节与表情**。使用 Three.js / WebGL 2，全部模型与像素贴图由本示例生成，不依赖 Unity、Minecraft 素材或远程 CDN。不是 Minecraft 资源移植。

## 运行

在仓库根目录执行：

```powershell
npm ci --workspaces=false
npm run dev --workspaces=false
```

- 完整实验室：<http://127.0.0.1:5196/>
- 九人办公室：<http://127.0.0.1:5196/nine.html>
- 共享长桌：<http://127.0.0.1:5196/loft.html>
- 分间套间：<http://127.0.0.1:5196/suite.html>
- 大平层：<http://127.0.0.1:5196/floor.html>
- 人物素材（动作与表情）：<http://127.0.0.1:5196/characters.html>
- 物品素材：<http://127.0.0.1:5196/objects.html>
- 素材目录发现、扩展和更新方式见 [动态素材工作室](asset-library.md)。
- 实际 iframe 嵌入示例：<http://127.0.0.1:5196/embed.html>
- 纯场景模式：<http://127.0.0.1:5196/?embed=1>
- 九人纯场景模式：<http://127.0.0.1:5196/nine.html?embed=1>

页面顶部统一提供「场景体验」「素材库」「开发接入」。场景体验的二级导航可切换三人工作室、九人办公室、共享长桌、分间套间和大平层；窄屏使用带名称和人数的选择菜单。素材库提供人物、物品两个分类，开发接入提供 iframe 嵌入示例。九人版采用更大的三排工位布局，提供九套独立电脑工位、九个可选择的角色、休息区、茶水柜、收纳柜和团队看板。每个人有独立动作、表情与固定工位，继承原有的镜头、光线、灵活度和地面移动控制。

九人版的角色采用各自的发型、服装剪裁、配饰、五官和体型比例。衣服与配饰直接挂在人物关节上，会跟随挥手、走动、打字和庆祝动作；头像与侧栏说明也对应每个人的外形。三人版继续使用原有角色造型。

| 角色 | 主要外形特征 |
| --- | --- |
| 小麦 | 斜刘海短发、浅色发夹、橙色口袋工装、小雀斑 |
| 阿森 | 蓬松卷发、大耳机、绿色连帽卫衣，体型较宽 |
| 小蓝 | 高马尾、蓝色西装、浅色内搭和工作牌，身形修长 |
| 阿洛 | 鸭舌帽、金色方框眼镜、白袖棒球夹克 |
| 小禾 | 金色侧辫、紫色贝雷帽、带颜料斑点的围裙，身形小巧 |
| 阿远 | 束起长辫、胡须、格纹衬衫和腕表，身形高大 |
| 小桃 | 粉色短发、蝴蝶结、奶白背带裤和粉色鞋 |
| 阿墨 | 银灰侧分、黑框眼镜、紫色马甲和口袋笔 |
| 小米 | 针织帽、圆框眼镜、黄色开衫和绿色长围巾 |

`--workspaces=false` 确保安装、锁文件与脚本运行限于本示例。已有本地依赖时直接运行第二条 npm 命令即可。需要 Node.js 22.12+，支持 WebGL 2 的浏览器。

```powershell
npm run build --workspaces=false
npm run preview --workspaces=false
```

默认构建输出为本目录 `dist/`，包含全部八个网站页面，可部署到普通静态网站子目录；preview 端口为 5197。`build:loft`、`build:suite`、`build:floor` 保留单页发布方式，导航自动限制在各自产物包含的页面内。不要直接用 `file://` 打开构建结果。

发布完整站点时，上传整个 `dist/` 的内容，保留八个 HTML、`assets/` 和许可证目录之间的相对位置。三个单页构建适用于单独发布某一种办公室，完整站点无需合并它们的输出。

## 如何体验

### 网站导航、手机与暂停控制

- 点击顶部「场景体验」「素材库」「开发接入」切换分区。第二行提供当前分区的页面入口，办公室名称旁显示容量；点击左上角 Office Voxel 返回三人工作室。
- 窄屏下第二行使用选择菜单，所有五种办公室仍可进入。浏览器后退时菜单恢复为当前页面；人物控制面板移到场景下方。触屏支持拖动旋转和双指缩放。
- 「暂停动画」暂停人物动作；任务工具栏的「暂停演示」暂停模拟任务进度。两者独立，可以暂停人物后继续查看任务，也可暂停任务后操作人物。
- 在「素材库」切换人物与物品，使用搜索和分类缩小范围，再点击素材卡片查看实时预览。地址中的 `?asset=...` 可以分享当前素材。
- 在「开发接入」使用 iframe 下方的按钮控制内嵌人物和镜头。纯场景 `?embed=1` 隐藏网站导航及人物面板，保留任务和镜头操作。

当前版本的实机图片与手机首屏见 [README 的导航指南](../README.md#网站导航与使用)，嵌入宿主截图见 [嵌入与部署](../README.md#嵌入与部署)。

### 多 Agent 动态任务演示

五种布局的显示器共用 `src/world/workstation.js` 的工位距离规范：座位锚点沿朝向到屏幕正面的水平距离为 1.42 场景单位。电脑特写通过空间布局避开人物，不隐藏角色。调查与回归记录见 [统一工位距离修复](workstation-focus-fix.md)。

五种布局均已接入相同的任务展示功能：三人 `/`、九人 `/nine.html`、长桌 `/loft.html`、套间 `/suite.html`、大平层 `/floor.html`。

- 点击场景上方的「任务主题」，聚焦黑板上的任务主题、目标与完成进度。
- 点击「子任务看板」，查看白板上的标题、任务说明、负责人和状态。下方支持翻页；套间和大平层可选择房间看板。
- 点击右侧人物头像打开操作菜单，再点「查看电脑屏幕」。镜头会对准其固定工位，显示该 Agent 的当前任务、操作和独立日志。人物走动不会改变电脑归属。
- embed 模式点击「人物电脑」展开紧凑头像栏，再使用相同的头像菜单。窄屏下使用更大的像素字和单任务分页，减少单屏信息密度。
- 电脑特写下可查看「较早输出」「较新输出」，或回到「最新输出」。点击「返回全景」恢复房间镜头。
- 演示持续 74 秒，模拟六个子任务、多个 Agent 并行输出、受阻后恢复和最终完成。多余工位显示待命。完成后保留结果，可手动「重新演示」。
- 「暂停演示」冻结任务事件和屏幕更新；原有「暂停动画」控制人物动画，两者独立。

内容绘制在实际 3D 板面和显示器纹理上。中文使用本地 Fusion Pixel 12px 字体（OFL 1.1），资源与许可证随每个独立构建打包；无需远程字体服务。字体加载失败时工具栏会显示提示。低分辨率像素模式下，显示器特写临时提高渲染分辨率，离开特写后恢复。

#### 后端数据接入

`window.PixOfficeVoxel.tasks` 提供 `getState()`、`focus(displayId)` 和 `setSource(source)`。`getState().bindings` 是人物、Agent、工位、显示器与房间的显式映射；三人版的人物顺序与工位顺序不同，请按绑定接入。

真实数据源实现下列接口，即可替换默认 mock：

```js
const initial = window.PixOfficeVoxel.tasks.getState();
// 实际接入时 initial 应由后端返回，agent.id 通过 bindings 映射。
const source = {
  kind: 'backend',
  getSnapshot: () => ({
    run: initial.run,
    agents: initial.agents,
    subtasks: initial.subtasks,
    logs: initial.logs,
    seq: initial.seq,
  }),
  subscribe(onEvent) {
    // 将 SSE/WebSocket 消息转换为下面的事件格式后调用 onEvent。
    // 返回退订函数，在切换数据源和销毁场景时调用。
    return () => {};
  },
  dispose() {},
};
window.PixOfficeVoxel.tasks.setSource(source);
```

快照结构和数据校验见 `src/integrations/tasks/task-runtime.js`；动态 mock 见 `src/integrations/tasks/mock-task-source.js`。增量事件格式为 `{ runId, seq, type, payload }`，`seq` 在同一轮单调递增，重复或旧事件会被忽略。支持：

| type | payload |
| --- | --- |
| `run.updated` | `status` |
| `subtask.created` | `id, title, description, assigneeAgentId, status` |
| `subtask.updated` | `subtaskId, status, summary?` |
| `agent.updated` | `agentId, status, currentSubtaskId?, currentStep` |
| `agent.output` | `id, agentId, subtaskId, timestamp, kind, text` |

状态为 `waiting / running / blocked / completed / failed / idle`。`agent.output.timestamp` 为本轮开始后的毫秒数，`kind` 为 `info / tool / result / error`；日志保留最近 200 条，单条上限 2000 字符。真实后端应在传输层处理重连、缺失事件与新运行快照；此处仅提供显示状态适配接口。

Mock 另提供 `tasks.pause(boolean)`、`tasks.replay()`、`tasks.seek(milliseconds)`，方便演示和确定性测试。`setSource` 后模拟控制会自动隐藏。

任务展示专项验证：

```powershell
npm run test --workspaces=false
# 可复用现有 dev 服务；或启动一个不会热重载中断测试的服务：
node scripts/browser-serve.mjs
# 第二个终端；Chromium 已安装时可按实际位置指定缓存：
$env:PLAYWRIGHT_BROWSERS_PATH = "$env:LOCALAPPDATA/ms-playwright"
$env:DEMO_URL = 'http://127.0.0.1:5206/'
npm run test:browser:tasks --workspaces=false
```

专项浏览器检查涵盖五种布局、全部 54 个人物绑定、动态纹理更新、菜单、暂停/重播、资源稳定性、窄屏、embed、减少动态效果和夜间像素模式；截图写入 `.artifacts/task-displays/`。各布局的独立构建命令为 `node node_modules/vite/bin/vite.js build --config vite.loft.config.js`（另有 `vite.suite.config.js`、`vite.floor.config.js`）。

1. 先观察全景：三组电脑工位、办公椅、沙发、茶几、咖啡柜、绿植、窗户、便签板、挂钟。
2. 选择小麦，点击「人物特写」和「挥手招呼」，观察头部侧倾、肩膀、手肘和身体联动。
3. 把「动作灵活度」从 85% 降到 0%，比较僵直摆动与多关节联动。0% 是同一角色骨架的简化动作，不是 Minecraft 的原版动画。
4. 切换开心 / 专注 / 惊讶 / 困倦。人物会自动眨眼，出现对白时配合程序化口型。
5. 点击「坐下工作」返回专属工位，或「散步走走」循环巡游。点击地面空处可以指定目的地，路径会绕开家具。
6. 在「调节」中切换日光 / 午后 / 下班光线，或开启低分辨率像素画面。

鼠标拖拽旋转、滚轮缩放；触屏拖拽旋转、双指缩放。键盘聚焦场景后用方向键旋转、`+` / `-` 缩放。可暂停动画；系统启用减少动态效果时默认暂停，主动选择动作后开始播放。

## 嵌入

构建产物可放入宿主网站的 `/voxel-office/` 子目录：

```html
<iframe
  id="office"
  src="/voxel-office/index.html?embed=1"
  title="像素 3D 办公室"
  style="width:100%;height:640px;border:0"
></iframe>
```

同源宿主可监听 `pixoffice-voxel:ready`，然后发出有限的结构化命令：

```js
const frame = document.querySelector('#office');
window.addEventListener('message', event => {
  if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
  if (event.data?.type === 'pixoffice-voxel:ready') {
    frame.contentWindow.postMessage({
      type: 'pixoffice-voxel:command',
      person: 0,
      action: 'wave',
      expression: 'happy',
      camera: 'person',
    }, location.origin);
  }
});
```

三人版的 `person` 为 0–2，九人版为 0–8；`action`: idle / wave / work / walk / celebrate / think；`expression`: happy / focus / surprise / sleepy / drool；`camera`: room / person / top；`paused`: 布尔值。消息必须来自同源父窗口，跨域页面可以嵌入观看，但当前不接受跨域控制消息。直接在场景页面里也可使用 `window.PixOfficeVoxel` 的同名方法及 `getState()`。状态中的 `scene` 为 `studio` / `team`，`capacity` 为 3 / 9。参见 `embed.html` 的完整宿主示例；嵌入九人版时将 iframe 的地址改为 `nine.html?embed=1` 即可。

## 隔离边界

- 本仓库只包含 Office Voxel 前端，不包含原 PixOffice 的 2D 运行时、其他 3D 实验或 Unity 工程。
- 有自己的 `package.json`、`package-lock.json`、`node_modules/`、Vite 配置、端口和 `dist/`。
- 不导入 `packages/*` 或 `@pixoffice/*`，Vite 插件会拒绝这两类依赖。
- 不请求正式业务 API，不读写正式办公数据，不注册全局 Service Worker。
- 本目录拥有独立 Git 和锁文件，安装、构建与运行均在本仓库根目录进行，不依赖原 PixOffice workspace。

## 代码结构

| 目录 | 职责 |
| --- | --- |
| `src/app/` | 五页面共用入口、控制面板、样式与文案 |
| `src/engine/` | 渲染、镜头、人物控制、寻路和生命周期 |
| `src/world/` | 布局编译、实例组装、碰撞与交互挂点 |
| `src/assets/` | 人物、家具、环境、材质及字体素材 |
| `src/layouts/` | 五种布局的预设和统一注册表 |
| `src/integrations/` | 任务数据与展示、iframe 兼容桥 |
| `src/tools/`、`scripts/` | 导出工具、构建辅助与浏览器验证 |

职责边界与新增办公室流程见 [项目架构](architecture.md)。原有页面地址、`window.PixOfficeVoxel`、同源 iframe 消息和 `tasks.setSource()` 接口继续可用。

## 验证

```powershell
npm run test --workspaces=false
# 首次进行浏览器测试时安装 Chromium：
npx --workspaces=false playwright install chromium
# 保持 dev 服务运行，再在第二个终端执行：
npm run test:browser --workspaces=false
# 场景座位契约、独立挂载、失败清理、订阅与重复销毁/重挂载：
npm run test:browser:engine --workspaces=false
# 九人办公室专项浏览器检查：
npm run test:browser:team --workspaces=false
# 九位角色的正面/背面造型对照图与头像检查（使用 dev 服务）：
npm run test:browser:appearance --workspaces=false
```

`DEMO_URL` 可指定待测服务（需以 `/` 结尾），`PLAYWRIGHT_BROWSERS_PATH` 可指定已有浏览器缓存。浏览器脚本覆盖 WebGL 渲染、动作、表情、灵活度、回工位、走动、暂停、选择人物、光线、像素模式、手机/平板布局、真实 iframe 控制、减少动态效果和控制台错误。截图写入忽略的 `.artifacts/`。

## 本地文件清理

`dist/`、`dist-loft/`、`dist-suite/`、`dist-floor/` 是可重新构建的产物；`.artifacts/` 保存测试截图、报告与临时排查文件，确认不再需要后可删除。未解决故障的日志应保留到问题关闭。上述目录均不提交 Git。

保留 `package-lock.json`、测试基线、字体许可证和 `public/assets/characters/`：人物 PNG/GLB 虽不参与运行时加载，仍是独立导出交付物。`node_modules/` 可通过 `npm ci` 重建，日常清理无需移除。

## MVP 的边界

- 验证的是方块美术、多关节程序动画和浏览器嵌入的组合，尚不是完整游戏或正式渲染器。
- 人物使用独立方块关节，没有蒙皮形变、布料、物理或 IK。对白口型是程序动画，未接语音或音素同步。
- 寻路支持静态家具避障，暂不处理多人物互相避让；入座/离座在专属椅子区域使用简化位置切换。
- 角色特写是镜头预设，不会持续跟随走动中的角色。房间没有前墙、右墙和天花板，便于观察；旋转到墙后会遮挡视线。
- 性能计数为当前机器实时结果，不代表目标设备保证值。固定小场景对静态家具进行了材质分组实例化，尚未做大地图、多角色压力测试或移动设备实机基准。
- 当前检查在 Chromium 自动化浏览器完成；仍需目标设备上的 Chrome、Edge、Safari 实测。

技术参考：[Three.js 像素纹理采样](https://threejs.org/manual/pages/textures.html)。

## 许可证与素材

项目代码及本项目提供的程序化人物、家具、环境和 PNG/GLB 导出素材采用 [MIT License](../LICENSE)，允许商用、修改和再分发，须保留版权与许可声明。具体素材范围和第三方例外见 [素材许可](../ASSET_LICENSE.md)。

本项目从 PixOffice 的 Office Voxel 示例迁出，保留原作者 teejoo 的 MIT 声明。Three.js、Fusion Pixel 字体和开发依赖的来源与原始许可见 [第三方声明](../THIRD_PARTY_NOTICES.md)。字体及其组成字体继续采用 OFL 1.1。

四套生产构建与人物素材导出包均附带 `LICENSE`、`ASSET_LICENSE.md`、`THIRD_PARTY_NOTICES.md` 和 `licenses/`。已有完整人物素材可通过 `npm run export:licenses` 事务更新许可与清单，无需启动浏览器或重生成人物 PNG/GLB。
