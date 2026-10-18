# 动态素材工作室

运行 `npm run dev` 后访问 `/characters.html`（人物）和 `/objects.html`（物品）。两页提供搜索、分类、素材 ID、来源、可旋转缩放的实时 3D 预览与可分享的 `?asset=ID` 地址。人物页支持动作、表情、暂停和表情特写。缩略图从当前代码生成，无需先导出 PNG/GLB。主 `npm run build` 包含两页，保留 `publicDir: false`。

## 数据与更新

`src/tools/asset-library-catalog.js` 用 Vite `import.meta.glob` 自动发现：

- `src/assets/characters/**/catalog.js`：导出的 `characters` 和 `appearances`。每套外观对应一个条目，保留人物身份与外观 ID，未绑定办公室的人物也会展示。
- `src/assets/furniture/**/*.preview.js`：导出的 `assetPreviews`。定义与家具构建器同目录，描述名称、分类和构造参数；模型调用原有构建器。显示器和工位变体从规格、构建器注册表枚举。

动作、表情来自 `src/assets/characters/motions.js`；契约测试核对 `model.js` 的分支，避免标签与模型不一致。页面 HTML 不维护素材名单。

开发服务器监听目录，符合约定的模块增删改后由 Vite 更新。稳定测试服务禁用监听，修改后需重启。生产构建包含构建时目录内容，更新素材后需要重新构建。部署后直接读取服务器新增文件需要另加服务端目录接口，本实现没有引入后端。

物品页展示家具目录中可独立构建的组件和组合：桌板、长桌、椅子、显示器、键盘、杯子、绿植及工位。`environments/` 中嵌入房间构建器的沙发、墙体、柜子等装饰尚无独立素材接口，不在列表中；后续提取成家具构建器并添加预览定义即可展示。

## 新增物品

在家具目录添加 `*.preview.js`：

```js
import { createNewItem } from './new-item.js';

export const assetPreviews = [{
  id: 'new-item',
  name: '新物品',
  category: '桌面物品',
  description: '此素材的说明',
  create(root) {
    return createNewItem(root, {});
  },
}];
```

`create(root)` 必须同步把模型添加到传入的 Three.js Group，不读取具体布局或页面，ID 必须唯一。预览参数只影响示例，不修改真实办公室。

预览器持有共享美术资源租约；切换素材释放旧模型私有资源，页面卸载或热更新时停止动画、解绑观察器和 OrbitControls，再释放私有资源、渲染器与租约。单页仅使用一个 WebGL 上下文，缩略图复用该渲染器。

## 验证

执行 `npm test`、`npm run build`，启动稳定测试服务后设置 `DEMO_URL` 并运行 `npm run test:browser:assets`。浏览器脚本覆盖全部人物与物品、动作表情、筛选和空结果、直接链接、移动端、减少动态效果及销毁；截图保存在本地 `.artifacts/asset-library/`。

### 2026-10-18 验证记录

- `npm test`：75/75 通过，包含 4 项新增的目录、扩展、检索及动作表情契约测试。
- `npm run build`：通过，两个素材页及共享代码均包含在主构建中。
- Chromium/SwiftShader：开发页与实际生产构建均通过 28 套外观、12 件物品的完整预览检查；搜索筛选、空结果、动作表情、暂停、单素材链接、390px 窄屏、减少动态效果及销毁均通过。最终生产构建另检查导航返回恢复和重复销毁。新页面控制台无错误或警告，桌面及手机截图已人工检查。
- 首次浏览器尝试因沙箱网络隔离无法访问服务，其中一次连接超时，未计为通过。改用同一网络环境中的临时服务后重新完成以上检查；临时服务在验证结束后自动关闭。
- 原有六项浏览器/几何脚本全部通过：五布局 54 人的引擎与动作隔离、双场景共享资源生命周期、8,193 个家具网格基线、54 个工位变换与独立组合、任务显示、54 台电脑的距离及遮挡。未更新基线。几何脚本仍输出既有的 Three.js 重复导入警告，几何断言全部通过。
