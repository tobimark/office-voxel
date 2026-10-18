# Office Voxel React 化与 PixOffice 架构对齐方案

日期：2026-10-18。本文是基于两个工作区当前文件的设计方案，尚未实施代码迁移。

## 1. 建议结论与范围

将本项目改成 **React + TypeScript + Vite 应用，保留 Three.js 程序化场景，以独立运行时、场景装配和 React 适配器划分责任**。借鉴 PixOffice 的依赖方向和应用装配方式，按阶段演进为 workspace。

这里将“改造成 PixOffice”理解为对齐其工程架构与 React 应用组织方式。项目继续位于 `D:\kunlunmeta\office-voxel`，保持独立构建。如果实际目标是重新并入 PixOffice，见第 10 节的附加路径。

优先完成五种布局和现有工具的 React 化，再决定是否需要完全拆包。首次交付保持现有画面、动作、人物/工位绑定和页面地址。聊天、地图编辑器、真实后端、通用活动调度等属于后续功能，不能仅通过结构迁移获得。

## 2. 两个项目的真实差异

| 维度 | Office Voxel 当前实现 | PixOffice 当前实现 | 迁移决策 |
| --- | --- | --- | --- |
| 工程 | 独立 Vite 工程，JavaScript ES 模块 | npm workspaces，TypeScript，包与应用分离 | 先支持 TS/TSX，稳定后拆 workspace |
| 页面 | 五布局 HTML 共用 `src/app/main.js`；控件骨架重复 | `example/office-web` 是 React 应用，根 Vite 配置转发到该应用 | 一个 React 页面组件，布局配置驱动 |
| 渲染 | Three.js，程序化模型、贴图和动作 | PixiJS，帧动画与表现适配器 | 保留 Three.js，采用独立渲染边界 |
| 运行时 | `engine/scene.js` 同时负责人物状态、移动、镜头、渲染循环 | `packages/runtime` 不依赖 React/Pixi，管理命令、世界、活动等 | 渐进抽出无 DOM/Three 的人物运行时 |
| 场景 | `layouts` + `world` 编译/组装 + 素材注册表 | 场景包分 `/core` 和 `/pixi` 表现入口 | 沿用现有编译链，最终提供 `/core` 和 `/three` |
| 状态订阅 | 引擎事件订阅；`getState()` 返回新对象；任务快照深拷贝 | React 通过 `useSyncExternalStore(runtime.subscribe, runtime.getRevision)` 订阅版本 | 建立有缓存的 React 状态适配层 |
| 业务 | 模拟任务、屏幕内容、日志、iframe 桥 | dashboard、chat、HTTP/iframe 与场景桥接属于应用层 | 业务数据与 3D 屏幕显示分离 |
| 素材 | JS 是运行时素材来源，PNG/GLB 是导出产物 | 代码包、帧资源、资源清单分别管理 | 保留程序化素材和事务导出链 |
| 质量 | Node + Playwright + 家具/资源/工位契约 | 另外有类型检查、lint、包边界和外部安装检查 | 逐阶段增加类型、React 生命周期、包消费者检查 |

PixOffice 的架构文档明确列出十个核心 workspace 包；其 `example/office-voxel` 仍只依赖 Three.js，是原生 JS 示例。React 化应参考 `example/office-web/src/components/OfficeCanvas.tsx`、应用装配门面和 `packages/`，不能将旧 voxel 示例视为已经完成 React 化的模板。

主要本地依据：

- 本项目：`docs/architecture.md`、`docs/shared-scene-engine.md`、`docs/material-management.md`。
- 本项目：`src/app/scene-page.js`、`src/engine/scene.js`、`src/integrations/tasks/task-displays.js`、`src/integrations/tasks/task-runtime.js`。
- PixOffice：`docs/architecture/README.md`、`scene-isolation.md`、`extension-contracts.md`。
- PixOffice：`example/office-web/src/App.tsx`、`components/OfficeCanvas.tsx`、`application/OfficeScene.ts`。
- PixOffice：`packages/runtime/src/model.ts`、`ports.ts`、`navigationAdapter.ts`、`packages/contracts/src/animation.ts`。

## 3. 技术选择

### 3.1 React 管页面，Three.js 管画面

引入 React、React DOM、TypeScript、React 类型和 Vite React 插件。React 19 系列可作为与参考项目一致的起点，安装时检查 Node、Vite 与插件兼容关系并提交锁文件。保留当前 Three.js 版本，避免一次迁移同时升级引擎。

第一阶段使用 `allowJs`，新增 UI 和接口用 TS/TSX，既有引擎逐步补类型。沿用两空格、分号、单引号与 LF；明确扩展名和包编译约定，不整库改写格式。

保留 Vite 客户端应用形态。第一阶段不需要 Next.js、服务端渲染、全局状态库或 React Three Fiber。现有 imperative Three.js API 已有独立挂载/销毁能力，适合由 React 容器接入；将全部几何和动作重写为 JSX 会扩大视觉与资源回归范围，可另行评估。

### 3.2 页面和画布的所有权

React 拥有导航、人物列表、动作/表情按钮、调节面板、任务工具栏、分页、人物菜单、加载/错误状态与素材库列表。Three.js 拥有专用 viewport 内的 WebGL canvas、模型、灯光、相机、纹理与逐帧动画。

头像与素材预览通过小型 canvas 组件使用现有绘制/预览函数。React 决定节点何时存在，绘制逻辑只操作该节点内部。旧任务适配器只能操作显式交给它的独立容器，不应修改 React 已管理的控件。

### 3.3 两个交付层级

1. **React 可用版本**：保留现有核心目录，以 React 替换页面和任务 DOM，完成类型入口、生命周期与所有旧行为回归。
2. **PixOffice 式模块版本**：抽取纯运行时和表现端口，打通一个不依赖 React 的消费示例，再将稳定边界迁入 workspace。

React 化完成不以拆出若干包为前提；拆包完成必须有独立消费验证，不能仅把目录重命名。

## 4. 第一阶段目录与迁移映射

```text
src/
  app/
    main.tsx
    office-app.tsx
    pages/
      office-page.tsx
      character-library-page.tsx
      object-library-page.tsx
    components/
      office-canvas.tsx
      office-navigation.tsx
      people-panel.tsx
      action-panel.tsx
      camera-toolbar.tsx
      scene-settings.tsx
      task-toolbar.tsx
      display-reader.tsx
      agent-menu.tsx
      character-avatar.tsx
    hooks/
      use-office-session.ts
      use-scene-snapshot.ts
      use-task-snapshot.ts
    application/
      create-office-session.ts
      scene-store.ts
      task-store.ts
      page-config.ts
    styles/
  engine/                 第一阶段保留现有实现
  world/                  保留布局编译与 assembleOffice
  assets/                 保留程序化人物、家具、环境、资源租约
  layouts/                保留五种布局和稳定 ID
  integrations/
    embed-bridge.js        兼容层
    tasks/
      task-runtime.js      业务状态
      mock-task-source.js  模拟数据与回放
      task-surfaces.js     从 task-displays 拆出的 3D 屏幕适配
      task-session.ts      业务订阅、命令与 UI/画面共享状态
  tools/                  保留导出工具，页面逐步迁移
```

| 当前文件/能力 | 处理方式 |
| --- | --- |
| 五份 HTML 控件 | 收敛成 `office-page.tsx` 和页面配置；HTML 仅保留入口、布局标识、标题和 metadata |
| `app/main.js` | 改为统一 React 入口，继续兼容 `nine → team` |
| `app/scene-page.js` | 拆出不操作页面控件的 session 工厂；过渡期保留旧入口 |
| `app/scene-controls.js` | 迁到 React 控件与状态适配器，功能迁完后删除旧 DOM 实现 |
| `engine/scene.js` | 首阶段复用 `createScene()`，第二阶段拆人物运行时和渲染器 |
| `task-displays.js` | 分离 task session、3D 屏幕、镜头聚焦与 React UI |
| `agent-menu.js` | 迁为 React 菜单，选择/聚焦仍通过命令端口 |
| `embed-bridge.js` | 从应用 session 挂载，保留旧全局 API 与消息格式 |
| `tools/asset-library-page.js` | 人物/物件列表、过滤和详情迁 React，预览组件继续调用现有构建器 |
| `tools/character-assets.js` | 保留机器导出 API 与工具地址，优先与 UI 迁移解耦 |

旧 UI 与新 UI 可以存在于不同验收入口，但同一个已迁移页面上只能有一份控制实现。

## 5. 必须先设计好的接口与生命周期

### 5.1 React session

建议的 session 对外形态如下，仅为新接口草案，尚未实现：

```ts
interface OfficeSession {
  scene: SceneCommands;
  tasks: TaskCommands;
  sceneStore: ReadableStore<SceneUiSnapshot>;
  taskStore: ReadableStore<TaskUiSnapshot>;
  dispose(): void;
}

interface ReadableStore<T> {
  subscribe(listener: () => void): () => void;
  getSnapshot(): T;
}
```

`createOfficeSession({ viewport, layout, labels, taskSource, ... })` 负责装配现有引擎和任务能力。第一阶段内部可以继续使用 `createScene()`，无需先拆完 runtime。session 应明确数据源是否由自己创建：自建的负责 dispose，外部借用的只退订；通过显式 ownership 选项允许调用者转交所有权。

在 Effect 的 setup 中创建本次挂载的 session，cleanup 中销毁该 session。不要在组件 render、`useMemo` 或会被重复调用的初始化函数中创建有 WebGL、全局监听或定时器副作用的对象。开发 StrictMode 会额外运行 Effect 的 setup/cleanup，应以此验证资源清理。[React StrictMode](https://react.dev/reference/react/StrictMode)、[useEffect](https://react.dev/reference/react/useEffect)。

切换布局创建新 session，普通按钮操作复用当前 session。依赖使用稳定的 layout ID、数据源身份和受控配置，避免因每次 render 新建配置对象而反复创建 WebGL。挂载失败显示可重试状态；字体加载、模块加载和预览准备需要取消或代次检查，禁止晚到结果写回旧场景。

### 5.2 React 状态订阅

现有 `createScene().getState()` 每次返回新对象，`createTaskRuntime().getSnapshot()` 每次深拷贝，均不能直接作为 `useSyncExternalStore` 的 `getSnapshot`。建立实例级 store，收到状态变化时更新缓存，未变化时返回同一引用；也可像 PixOffice 一样订阅单调递增 revision，再按版本缓存派生快照。[React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)。

订阅函数保持稳定，销毁时退订。状态分为：

- UI 状态：菜单、弹窗、筛选、当前分页，由 React 局部状态管理。
- 场景事实：动作、位置、入座、选中人物，由引擎/未来 runtime 管理。
- 业务事实：Agent、任务、日志、数据源连接，由 task session 管理。

按钮调用命令，控件从状态订阅反映结果。动态位置、骨骼角度、气泡逐帧投影留在渲染适配器中；React 只处理气泡内容和显隐。通过专用 ref/overlay 适配器更新气泡位置，避免相机每帧更新整棵 React 树。FPS 使用独立低频订阅。

### 5.3 任务展示拆分

现有 `task-displays.js` 创建 toolbar/reader/菜单、订阅任务源、生成屏幕纹理、处理镜头、回放和分页；embed 模式还从 `.people` 克隆头像。改成：

1. `task-session` 拥有任务源接入、已校验业务状态、bindings 和回放控制。
2. `task-surfaces` 消费状态及显示挂点，管理 CanvasTexture、脏标记和 GPU 清理。
3. 镜头聚焦适配器拥有相机位置、清晰度切换、退出恢复。
4. React 拥有工具栏、菜单和分页控件，通过同一套 focus/page/replay 命令交互。

embed 人物列表直接从绑定数据绘制，停止克隆 React DOM。保留现有纹理脏标记机制，避免每次 React 更新都重绘全部电脑屏幕。任务数据是业务事实，人物工作动画是映射结果；动画结束不能自动意味着业务任务成功。

### 5.4 清理责任

session 先停止对外命令并取消异步流程、退订业务/全局事件和时钟，再释放任务屏幕私有资源、人物/场景私有资源、WebGL renderer 与共享资源租约。具体顺序沿用现有逆序 lifetime 管理，屏幕材质先恢复、私有资源先释放、共享租约最后释放。

任意一次 dispose 失败仍继续其他清理，重复 dispose 安全。React 关闭一个预览或场景不能影响另一个仍在使用的共享资源。视图销毁与外部 runtime 销毁必须分开定义；未来借用 runtime 时，不因 React 画布卸载自动删除宿主业务状态。

## 6. 第二阶段：接近 PixOffice 的模块结构

```text
apps/
  office-web/             React 产品页面、任务业务、embed、素材库
packages/
  contracts/              纯类型/校验、稳定 ID、运行时与视图端口
  runtime/                人物状态、移动、入座、命令、时钟与事件
  renderer-three/         WebGL、镜头、拾取、人物视图与逐帧渲染
  assets-voxel/           /core 人物目录与规格；/three 程序化构建与资源
  scene-office/           /core 布局编译；/three 组装、挂点与场景表现
  react/                  通用 OfficeCanvas/订阅 hooks/session 容器
examples/
  minimal-vanilla/        不依赖 React 的 Three.js 场景消费验证
scripts/                  构建、浏览器验收、素材事务导出
tests/                    行为、依赖边界、资源与包消费者验证
```

暂用 `@office-voxel/*` 作为名称示意，实际 scope 和是否发布另定。首批可将 React adapter 留在应用内，只有第二个消费方出现后再独立为 `react` 包；也不提前拆出只有一个实现的动画包。

依赖箭头表示导入：

```text
apps/office-web → react adapter、runtime、scene-office、renderer-three、assets-voxel
react adapter → contracts（通过 session 工厂接入具体实现）
scene-office/core → contracts、runtime、assets-voxel/core
scene-office/three → scene-office/core、renderer-three、assets-voxel/three
renderer-three → contracts、runtime 的只读端口、Three.js peer
runtime → contracts
assets-voxel/core → contracts
assets-voxel/three → assets-voxel/core、contracts、Three.js peer
contracts → 不依赖上述实现
```

实际依赖声明要覆盖公开类型和入口引用。Three.js 在视觉包中声明 peer dependency，应用提供一份版本；运行时不导入 DOM、React、Three、具体办公室布局或业务任务适配器。

### 6.1 拆包前先消除现有双向依赖

不能照搬现有目录为包：

- `assets/furniture/workstations.js` 导入 `world/workstation.js`；该模块又读取 assets 中的家具规格。
- 环境构建器导入 `world/display-registry.js`，而 `world/assemble-office.js` 反向导入环境素材。
- `engine/scene.js` 直接创建人物、取得美术资源；`engine/resources.js` 依赖素材缓存判定。

将工位几何派生和规格放到 `assets-voxel/core` 的公共纯函数中，让场景编译器与素材构建器共同消费。将带 mesh 的显示注册工具放入 `/three` 表现辅助模块，contracts 只保留显示挂点数据类型。渲染器通过装配参数获得人物视图工厂、场景构建器和资源释放钩子，停止硬编码某套素材。

通用 `createLifetime` 可先作为内部工具保留；不为单个工具增加一个公共包。涉及 Three 的资源遍历不得进入 contracts 或纯 runtime。

### 6.2 从 scene.js 提取纯 runtime

分开人物逻辑状态与 `Object3D`：坐标、路径、动作、表情、目标座位、选中状态通过可序列化数据表达；视图读取状态更新 root/joints。`createCharacter()` 当前返回的可变 actor 混合了表现与状态，需要逐项映射，不能把其 Three 对象直接放进新的 runtime。

保留现有 `x/z` 地面坐标、0.25 导航步长、0.32 人物半径与 `yaw`，以现有行为为基线。应用 session 统一提供时钟：每帧先推进 runtime，再同步/渲染视图；继续驱动模拟源时明确毫秒/秒换算。React 不启动另一套模拟时钟。

初次提取只覆盖已有移动、回座、动作和选择行为。PixOffice 的活动编排、资源占用、持久化、地图事务需要业务需求和独立验收，不能将它们算作已包含在 React 化中。

### 6.3 构建和导入约束随拆包调整

现有 `config/vite-factory.js` 会拒绝 `@pixoffice/*` 和任何包含 `packages/` 的导入。这是隔离父项目的保护，迁入本仓库 workspace 时应改成“允许本仓库显式包入口、继续禁止父仓库路径和包内部越界”，不能直接删除保护。

`tests/architecture.test.mjs` 当前只扫描 `.js`，且断言 HTML 使用 `/src/app/main.js`。应扩展扫描 TS/TSX/JSX 与 workspace imports，更新入口契约，同时保留分层约束。拆包后通过显式 exports 导入编译产物，增加打包后在临时目录真实安装的检查。

## 7. 路由、构建、素材与协议兼容

- 第一阶段保留 `/`、`/nine.html`、`/loft.html`、`/suite.html`、`/floor.html`。多页 HTML 加载同一个 React 入口，由 `data-office`/页面配置选择布局，无需立即引入路由库。
- 保留 `embed.html`、`?embed=1`、同源父窗口校验、`pixoffice-voxel:command` / `ready` 和 `window.PixOfficeVoxel` 兼容门面。普通组件不通过 window 调用引擎；多实例仅指定兼容实例暴露全局 API。
- 保留 `characters.html`、`objects.html` 和导出工具入口；产品列表页面可迁 React，机器导出入口继续按原契约工作。
- 保留主构建及 `build:loft`、`build:suite`、`build:floor`。在共享 Vite factory 接入 React 插件，全部构建均验证，防止只有首页支持 TSX。
- 保留 `base: './'`、`publicDir: false`、字体与许可证插件、Three/OrbitControls 分块策略；按需加载素材库/导出功能，避免主办公室入口加载 GLTFExporter 和所有预览代码。
- 保留 `characterId`、`appearanceId`、`instanceId`、业务 `agentId` 和 `${layout.id}:station:${index}`。React 列表 key 使用实例 ID；旧 person 索引协议在适配层转换。三人版 `stationFor: [1, 0, 2]` 不能变成顺序绑定。
- 运行时继续由代码生成素材；静态 GLB 不包含现有完整动作与寻路能力。保留事务导出、局部更新与回滚逻辑，不清空导出目录、不借迁移批量重生成素材。

## 8. 实施顺序与验收

以下是单名熟悉项目的开发者的粗略人日估算，非交付承诺；取决于迁移前基线、视觉差异和任务 UI 拆分复杂度。

| 阶段 | 工作与产物 | 验收出口 | 粗估 |
| --- | --- | --- | --- |
| P0 基线 | 记录当前未提交工作、四构建、五布局截图/交互和工具入口；确认状态/资源接口 | 新故障与历史故障可区分，稳定 ID 与绑定有记录 | 0.5–1 天 |
| P1 React 骨架 | TS/TSX、Vite 插件、React OfficeCanvas、session 包装；先三人页独立验收 | StrictMode 重挂载后单 canvas、单循环、无重复监听；已有画面与动作保留 | 1–2 天 |
| P2 五布局 UI | 共享页面、人物/动作/镜头/调节组件、缓存订阅、embed 兼容 | 五布局、旧 URL、移动端、键盘、四构建通过 | 1.5–2.5 天 |
| P3 任务与工具 | task session、屏幕/镜头适配器、React toolbar/reader/menu；素材库 React 化 | 任务源替换、回放、分页、长文本、电脑绑定、预览释放、导出工具兼容 | 2–3 天 |
| P4 运行时分离 | 可序列化人物状态、只读视图端口、依赖解环；纯运行时测试 | Node 无 DOM/Three 测试、无 React 的真实场景运行、原几何/行为基线 | 2–4 天 |
| P5 workspace | 稳定模块迁包、exports、声明、包构建与 smoke | 包外安装可运行、依赖方向检查、全部回归 | 1–2 天 |

**React 完整迁移（P0–P3）约 5–9 人日；完成模块与拆包（P0–P5）约 8–15 人日。** 真实 HTTP/SSE、聊天、地图编辑和复用 PixOffice runtime 不包含在此估算内。

每阶段独立提交、独立验收。P1 可保留单独迁移验收页；五布局全部通过后统一切换正式入口。后续回退通过版本控制恢复上一阶段，不长期维护两套人物引擎或两套正式 UI。

必要验证：

1. `npm test`，按阶段增加 scene/task store 缓存、命令映射、所有权、初始化失败与取消测试；保留现有 Node 行为测试。
2. 主入口、长桌、套间、大平层四套生产构建；加入类型检查与 React hooks lint。
3. 重启 `scripts/browser-serve.mjs` 后设置 `DEMO_URL`，执行 `test:browser:engine`、`resources`、`furniture`、`composition`、`tasks`、`test:geometry:workstations`，并复核基础页面/电脑特写。
4. 新增 React 生命周期浏览器检查：StrictMode、连续切换布局、开关预览、启动失败/重试、字体晚到、卸载后不更新、两个并行场景关闭其一不影响另一个。
5. 验证五布局现有 54 个人物/工位的动作隔离与绑定，保持已有家具几何基线；任何有意视觉变化单列说明和截图。
6. 素材库人物/物件过滤与详情、预览启停、机器导出接口；导出事务测试确认未选中产物保留。不要为页面迁移直接运行全量素材导出。
7. 比较相同机器、视口、DPR 和布局的帧耗时、渲染次数与资源计数。连续卸载后资源达到稳定水平，不宣称 React 化天然提高帧率。

首轮可建议每布局切换/预览重复 20 次，并记录 WebGL 上下文、监听、RAF、纹理/几何计数；具体阈值以 P0 实测为准。超时单列，不能记为通过。

## 9. 风险与处置

| 风险 | 原因 | 处置 |
| --- | --- | --- |
| 重复 canvas/定时器 | Effect 重挂载、布局变化、HMR 多次初始化 | 一个 session 一个所有权边界，幂等 dispose，StrictMode 验证 |
| React 频繁刷新 | 将每帧世界快照或新对象直接当 store snapshot | 缓存快照、按用途分订阅、逐帧表现留视图 |
| 控件状态被覆盖 | 原 task adapter 继续查询或修改 React DOM | 专用遗留容器过渡，完成后由 React 独占控件 |
| 包循环依赖 | 当前 assets/world 存在双向导入 | 先迁共享纯函数和 mesh 辅助工具，再拆包 |
| 工位错绑 | 用 UI 排序或人物外观 ID 代替实例/工位关系 | 保留稳定 ID 与 stationFor，命令边缘转换旧索引 |
| 兄弟场景黑屏 | React cleanup 释放共享材质或缓存 | 延续美术租约，私有资源与共享资源分别释放 |
| 构建/测试只覆盖旧代码 | Vite factory/架构测试仍假定 JS 和旧入口 | 同步更新四构建和扫描范围，保留边界断言 |
| 一次改动过大 | 同步升级引擎、重写动画、拆包、接业务后端 | 按 P0–P5 分段，额外产品功能单独排期 |

## 10. 如果最终要重新并入 PixOffice

区分两个目标：

**A. 共用 React 工作台/业务数据，保留 voxel 运行时。** 在本项目边界稳定后，将办公室视图定义成可注入的 scene host，提取双方 dashboard/task 的数据契约及桥接。先完成员工 ID、场景实例和任务状态的显式映射，再让同一业务页面切换 Pixi/Three 视图。PixOffice dashboard 是异步快照加通知和 execute，当前 voxel task source 是同步快照加有序 TaskEvent；需要适配器和重同步策略，不能简单互换。正式合并时还需替换原有 `example/office-voxel` 的位置与 workspace 名称，避免保留两份可变副本。

**B. 连人物运行时也共用 `@pixoffice/runtime`。** 单独做技术验证：它的 World 为整数格、四向 Facing，导航/入座/占用均围绕 cell；本项目是小数 x/z、连续 yaw 与现有几何半径。`NavigationAdapter` 扩展点本身不代表其他运行时假设已兼容。

可试验按 0.25 世界单位映射一个逻辑格，但座位/门口并不一定全部对齐格点，还需保留精确接触位置、碰撞膨胀与角度表现，防止影响回座和门洞通行。通过三人及套间门洞/转向验收后，才能估算通用 runtime 合并成本。

PixOffice 当前 `VisualAssetManifest.rendererApiVersion` 仍限定为 `pixi-1`，表现与挂点也主要采用二维位置。新 Three 表现需要独立接口或协商扩展带版本的契约，不能只把 `Container` 换成 `Object3D` 就宣称通用动画兼容。现有程序化动作先留在 voxel 素材/视图实现中。

推荐先完成独立项目的 React 可用版本；随后优先选择 A 复用业务工作台，B 以一个小场景的真实兼容结果决定。

## 11. 本次方案的验证范围

已阅读两个本地项目的 package/config、架构文档与实际入口、渲染/任务/素材依赖，并查阅 React 官方生命周期与外部状态订阅文档。方案针对当前工作区，未假定所有未提交改动已提交或已同步到 PixOffice。

本次只新增本文档，没有修改应用代码、安装依赖、迁移目录或重新生成素材；未运行构建及测试，也不将历史文档中的通过记录作为当前工作区的验收结果。
