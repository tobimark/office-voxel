# 共享场景引擎

后续人物目录、家具复用、共享 GPU 资源租约与导出管线升级见 [素材管理](material-management.md)。场景资源清理由 `scene-resources.js` 执行，共享资源由 `art.js` 的最后一个租约释放，不能对共享缓存直接调用 `dispose()`。

三人、九人、长桌、套间、大平层现在使用同一个 `createScene()`。各页面入口只选择布局、家具构建器、样式和文案；镜头、人物控制、渲染循环与销毁逻辑均由共享引擎维护。

## 模块边界

| 模块 | 职责 |
| --- | --- |
| `src/shared/scene.js` | WebGL 渲染、灯光、镜头、拾取、动作、寻路与生命周期；只接收容器，不查找页面控制元素 |
| `src/shared/scene-contract.js` | 启动前校验布局、归一化安全出入口、检查家具构建器输出 |
| `src/shared/scene-controls.js` | 创建人物头像，连接页面按钮，接收引擎事件更新 DOM |
| `src/shared/scene-page.js` | 组合引擎、控制面板、任务 UI 和可选兼容桥；处理页面启动失败和热更新 |
| `src/shared/task-displays.js` | 任务纹理、看板翻页、日志和人物菜单；查询限定在传入的 `root` 内 |
| `src/shared/embed-bridge.js` | 注册 `window.PixOfficeVoxel`，校验同源父窗口消息；销毁时退订并清理兼容接口 |
| `src/shared/lifetime.js` | 按资源获得顺序的逆序清理；重复销毁安全，单项清理失败仍继续清理其他资源 |

## 布局契约

保留现有布局中的空间、美术和家具数据，所有布局新增/明确以下约定：

- `id`、`capacity`：场景标识和人物数量。
- `actors`：人物外形、初始位置；当前演示约定首位人物站立，其余人物坐在所属工位。
- `seats`：人物座位锚点数组，`{ x, z, yaw, exit? }`。`yaw` 表示人物坐下后的面向。
- `stations`：家具构建坐标，与 `seats` 按索引对应。三人和九人版仍保留原始桌子坐标，避免改变家具位置。
- `stationFor`：人物索引到工位索引的一对一映射，继续作为 Agent / 显示器绑定的依据。三人版仍为 `[1, 0, 2]`。
- `seating.exitDistance`：未指定 `seat.exit` 时，沿座位朝向的反方向计算安全出入口，默认 1.05。
- `bounds`、`patrol`：寻路边界与巡游路线。
- `camera`：初始位置、适配视口尺寸、人物特写倍率，可选 `maxZoom`。
- `render`：可选的 `shadowSize`、`shadowFar`、`groundSize`，保留原有各布局的阴影覆盖和地面大小。

原三人、九人版的座位为桌子坐标 `z + 1.18`，安全出入口为 `z + 2.05`，现以明确的座位数据提供。长桌、套间、大平层按各自座位朝向计算出入口。

`createOffice(scene, layout)` 接收已归一化的布局，向 `scene` 添加家具并返回 `{ office, obstacles, seats: layout.seats, displays, ... }`。额外的 `stations`、`screens` 保留供已有工具使用。显示器继续使用 `${layout.id}:station:${index}` 绑定，不能按人物排列替换工位索引。

## 新增一种办公室

1. 定义满足上述契约的布局，明确人物座位和安全出入口。
2. 实现家具构建器，提供障碍物和显示器注册信息。
3. 页面准备现有控制面板结构，入口导入样式并调用：

```js
import { bootScene } from '../shared/scene-page.js';

const office = bootScene({
  root: document.querySelector('#app'),
  layout: myLayout,
  createOffice: createMyOffice,
  labels: { blocked: '请沿走道移动。' },
});

// 离开页面或切换办公室前销毁，再使用新布局挂载。
office?.dispose();
```

原来的多页面地址和独立 Vite 构建配置保留。此重构没有添加真实后端，也没有改变模拟任务协议。

## 在自定义界面中使用引擎

核心引擎不要求现有页面骨架，不会自动创建全局 API 或控制面板：

```js
import { createScene } from './shared/scene.js';

const office = createScene({ viewport, layout, createOffice });
const unsubscribe = office.subscribe(event => {
  if (event.type === 'state') updateControls(event.state);
});

office.select(0);
office.action('wave');
office.camera('person');
unsubscribe();
office.dispose();
```

容器需要实际宽高。`createScene()` 初始化失败会释放已获得的资源并抛出错误，宿主负责显示错误 UI。通过可选的 `mountTasks(context)` 可以接入任务展示扩展，扩展返回 `tick()`、`exit()`、`dispose()` 等方法；核心会管理其生命周期。现有 DOM 任务展示依赖页面头像，由 `bootScene()` 负责组合。

公共接口：

- `select(index)`、`action(name)`、`expression(name)`、`camera(mode)`、`pause(boolean)`：兼容原有方法。
- `lighting(name)`、`flexibility(0..1)`、`pixelated(boolean)`：供自定义面板控制渲染设置。
- `getState()`：独立的状态快照，保留原字段，新增 `disposed`、`pixelated`，所有布局均包含人物 `yaw`。
- `subscribe(listener)`：订阅事件，返回退订函数；当前状态可立即用 `getState()` 获取。
- `dispose()` / `disposed`：主动销毁和查询销毁状态；销毁后的命令返回 `false`。
- `tasks`：使用页面适配器时提供原有任务显示接口，核心独立挂载时可不提供。

事件包含 `state`（选择、动作、设置或移动抵达时的状态）、`status`、`lighting`、`bubble`、`fps`、`ready`、`error`。订阅不是逐帧人物坐标流；`onEvent` 参数可接收初始化期间的事件。真实任务数据仍通过 `tasks.setSource()` 接入，人物动画暂停与模拟任务暂停保持独立。

`bootScene({ bridge: false })` 可以关闭全局 API / iframe 兼容桥。现有页面适配器的 embed 样式仍作用于整个页面；需要同页多个独立视图时，应使用 `createScene()` 配合各自的界面。

## 验证

```powershell
npm run test --workspaces=false
node scripts/browser-serve.mjs
# 另一个终端，按本机 Chromium 安装目录设置 PLAYWRIGHT_BROWSERS_PATH：
$env:DEMO_URL = 'http://127.0.0.1:5206/'
npm run test:browser:engine --workspaces=false
npm run test:browser --workspaces=false
npm run test:browser:tasks --workspaces=false
```

引擎专项检查覆盖全部五种布局的初始座位/朝向、无页面面板的独立挂载、家具构建失败、任务 UI 初始化失败、状态退订、数据源释放、重复销毁及重新挂载；还会逐个验证全部 54 个人物的动作隔离、回工位朝向，以及走道/出房间移动和镜头按钮。此检查使用 1024×768 视口，并暂停模拟任务内容，以减少软件渲染的负担。已有布局浏览器检查保留用于额外的 embed、响应式和截图检查。

### 本次验证记录（2026-10-17）

- 42 项 Node 单元测试通过，包含新增座位契约、所有安全出入口的可达性、非法配置和清理失败后的继续释放。
- 主入口、长桌、套间、大平层四套生产构建通过，原有字体及许可证资源随构建保留。
- 五布局引擎专项通过：54 个人物动作隔离和回工位、朝向、走道/出房间移动、镜头按钮，以及独立挂载、初始化失败和重挂载。
- 原有基础浏览器检查、九人交互检查和任务显示检查通过，覆盖响应式、同源 iframe、全部 54 个人物电脑绑定和任务数据源替换。
- 电脑特写专项通过全部 54 台电脑，切换特写、看板和镜头后人物状态保持正确，控制台无错误或警告。
- 工位几何检查通过：全部 54 块屏幕与座位的正面距离为 1.42；四种打字姿态下未发现前景人物进入电脑特写的采样区域。
- 原九人检查现在单独验证入座朝向；动作隔离比较稳定字段，避免将到达后持续平滑变化的 `yaw` 当作串人物操作。

浏览器验证使用 Chromium / SwiftShader。旧长桌完整截图脚本在连续镜头截图阶段出现操作超时，未记作通过；其人物、回工位和镜头按钮行为由引擎专项单独验证通过。此结果不代表 Safari、移动实机或实际 GPU 的性能保证。
