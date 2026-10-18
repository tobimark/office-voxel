# 项目架构与扩展约定

## 模块边界

五种办公室是同一套应用中的布局预设。页面地址继续保留 `/`、`/nine.html`、`/loft.html`、`/suite.html`、`/floor.html`，全部加载 `src/app/main.js`，通过页面的 `data-office` 选择布局和文案。

```text
src/
  app/                    页面启动、控制面板、文案、样式
  engine/                 Three.js 运行时、人物控制、寻路、生命周期
  world/                  布局编译、场景组装、建筑碰撞和挂点契约
  assets/
    characters/           人物身份、外观、场景实例引用和模型构建
    furniture/            家具规格、构建器注册表、工位和长桌素材
    environments/         房间外壳、墙体和特色装饰的程序化素材
    materials/            图元、像素贴图和共享资源租约
    fonts/                字体及许可证
  layouts/                studio/team/loft/suite/floor 预设和注册表
  integrations/           iframe 桥及任务数据、显示器纹理适配
  tools/                  人物导出页面与使用关系清单
```

`engine`、`world` 和 `assets` 不导入具体布局、应用页面或任务适配层。页面组合这些能力；引擎通过传入的场景构建函数和可选任务扩展工作。`tests/architecture.test.mjs` 检查依赖边界及统一入口，避免重新出现按页面复制引擎的情况。

## 布局编译与场景组装

1. `layouts/registry.js` 提供 `layouts`、`getLayout(id)`，供页面、导出清单及测试统一使用。
2. 每份布局定义空间、人物、座位、工位归属、镜头、`environment` 和 `furniture`。布局文件不导入 Three.js，也不生成网格。
3. `world/compile-layout.js` 校验布局，解析家具实例，生成座位、显示器挂点和导航预留范围；从墙段重新计算实墙和门扇碰撞。编译不会修改原预设。
4. `world/assemble-office.js` 根据素材注册表构建环境和家具，收集碰撞、合批静态方块并注册显示器；保留屏幕为独立网格。
5. `engine/scene.js` 接收组装函数，管理人物、镜头、拾取与销毁。`app/scene-page.js` 默认注入 `assembleOffice`，再组合控制面板、任务展示和 iframe 桥。

核心独立挂载示例：

```js
import { createScene } from '../src/engine/scene.js';
import { assembleOffice } from '../src/world/assemble-office.js';
import { getLayout } from '../src/layouts/registry.js';

const office = createScene({
  viewport,
  layout: getLayout('team'),
  createOffice: assembleOffice,
});
// 宿主移除视图前释放人物、私有资源和共享租约。
office.dispose();
```

## 工位和建筑契约

工位实例含 `id`、`assetId`、`stationIndex` 和 `parameters`。通过 `defineWorkstations()` 创建实例列表；`stationIndex` 显式绑定座位，列表重排不会改变电脑归属。现有素材为 `desk-classic`、`desk-low` 和 `seat-facing`，显示器规格按形态命名为 `monitor-tall`、`monitor-wide`、`monitor-compact`，不识别具体布局名称。

座位 `x/z/yaw` 是运行时的摆放基准。桌子位置、导航范围和显示器正面挂点从座位派生；历史 `stations` 坐标继续保留供既有工具使用。变更座位时无需另外修改模型和碰撞坐标。显示器正面距离仍为 1.42。

环境构建器只读取传入的 `layout`，不从布局模块导入固定房间、座位或家具常量。墙段 `wallRuns` 同时驱动模型和导航；家具区域 `zones` 同时提供特殊装饰的尺寸、位置和导航预留。三人、九人的开放房间共用环境素材，差异由摆放和装饰参数表达。复杂装饰仍允许直接用代码生成。

## 新增办公室

在 `src/layouts/` 新增预设并注册到 `registry.js`。优先复用已有环境和家具：设置房间参数、人物引用、座位、工位绑定及镜头即可。编写新预设时复制数据应使用 `structuredClone()`，并为新场景设置独立的实例 ID；不要修改导入的共享预设。

如果需要新的家具形态，在家具规格和构建器注册表中增加素材，输出模型、碰撞和挂点。只有确实新增房间外壳或装饰形式时才添加环境素材。基础环境 `empty` 可承载纯家具组合，无需新增房间构建器。

当前多页 HTML 保留各自的控制面板骨架，样式按页面类名限定；业务 Agent 与 `stationFor` 的兼容索引仍保留。这次没有引入编辑器、后端或通用 ECS 框架。

## 验证

- `npm test`：布局、人物、依赖边界、组装、寻路和资源生命周期契约。
- 四套生产构建保留，配置共用 `config/vite-factory.js`。
- `test:browser:furniture`：8,193 个网格实例的几何、变换、材质和贴图基线。
- `test:browser:composition`：54 个工位移动、旋转、重排后的实际屏幕挂点，以及无需新构建器的两人布局挂载、交互与销毁。
- 原引擎、任务展示、资源生命周期和电脑几何检查继续执行。稳定测试服务不监听源码，修改后必须重启。

## 本轮验证记录（2026-10-17）

- 重构前：55 项 Node 测试中 48 项通过，7 项旧导出事务测试在临时目录改名时返回 `EPERM`；主入口构建通过。
- 重构后：63 项 Node 测试中 56 项通过，新增的 8 项架构和组装测试全部通过；同样的 7 项旧导出事务测试仍返回 `EPERM`，未计为通过。原因尚未定位，日志保存在本地 `.artifacts/refactor-unit.tap`，没有跳过或修改故障测试来消除报错。
- 主入口、长桌、套间、大平层四套生产构建通过。
- 五布局全部 54 人的动作隔离、回座、朝向、移动、镜头和清理回归通过；任务展示、工位绑定、数据源替换及长文本检查通过。
- 最终代码重新启动服务后，8,193 个家具网格实例的外观基线、54 个移动/旋转工位及重排绑定、两人新布局、双场景共享资源生命周期和全部 54 台电脑几何检查通过。
- 人物目录内容、外观 ID、场景实例 ID、Agent/工位绑定及导出的 PNG/GLB 字节保持原样；仅更新清单中的源码路径说明。

目录重命名错误已于 2026-10-18 按下节处理。多页 HTML 控件骨架、特殊环境装饰和旧索引协议仍按兼容性需要保留；后续可独立改造，不需要恢复按布局复制引擎或家具构建器。

## Windows 导出事务修复（2026-10-18）

最小实验在不运行 Three.js 或浏览器的情况下复现了非空目录改名被拒绝；Node 与 PowerShell 均失败，移除目录内容后可改名。默认沙箱及沙箱外测试均出现同类错误，失败数随运行变化；本轮完整测试修复前为 60/63，通过重试延迟 5 秒也未能解除已受阻目录。证据指向本机 Windows 的非空目录改名限制；尚未定位具体占用进程或系统组件，不能归因于某一杀毒软件。

发布逻辑已抽到 `scripts/lib/publish-directory.mjs`。保留优先改名路径，Windows 权限/占用错误增加复制退路，逐文件核对完成后才移除旧目录，并处理部分复制、部分删除、回滚及备份保留。原有导出测试没有跳过或放宽，新增 7 项退路契约测试。

- `npm test`：70/70 通过，日志为本地 `.artifacts/eperm-fixed.tap`；原 8 项导出事务测试全部通过。
- 主入口、长桌、套间、大平层四套生产构建通过。
- 使用现有 27 套人物产物作为生成输入，在临时目录强制目录改名返回 `EPERM`，完整发布 81 个文件后局部更新 `team-00` 头像通过；未选中文件与清单哈希不变，临时目录和锁清理通过。仓库中的人物 PNG/GLB 未重新生成或修改。
- 10 项 npm 浏览器/几何脚本全部通过：通用页面、引擎、九人页面、人物外观、任务显示、电脑特写、工位几何、家具基线、共享资源和布局组合。覆盖五布局 54 人、54 台电脑、8,193 个家具网格及双场景生命周期，日志为本地 `.artifacts/eperm-*.log`。本次使用新启动的 5226 端口服务和 Chromium/SwiftShader，未使用已占用的 5206 服务；旧长桌等独立完整截图脚本未另外执行。

此修复不改变场景和素材外观。复制退路不保证原子可见性，强制终止后的人工恢复规则见[素材管理](material-management.md)。

几何检查脚本仍会触发 Three.js 重复导入警告，几何断言全部通过；本次未修改这项既有脚本行为。
