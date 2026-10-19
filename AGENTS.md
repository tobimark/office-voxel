# 仓库贡献指南（Repository Guidelines）

## 项目结构与模块划分

本项目是一个 multi-agents 项目的前端，基于 Three.js、原生 JavaScript ES 模块和 Vite 构建。

- `src/app/`：五页面共用入口、控制面板、文案与样式；`src/integrations/`：任务展示和 iframe 适配。
- `src/engine/`：渲染、镜头、人物控制、寻路与资源生命周期；`src/world/`：布局编译、场景组装、碰撞与挂点契约。
- `src/assets/`：人物、材质、家具和环境构建器；素材层不得导入具体布局或应用适配层。
- `src/layouts/`：五种布局的独立预设及统一注册表，负责选择素材、摆放和绑定实例。
- `tests/`：Node 测试与基线数据；`scripts/`：Playwright 检查、构建辅助及导出工具。
- `src/assets/fonts/`：内置字体与许可证；`public/assets/characters/`：生成的 PNG/GLB 产物。
- `docs/`：架构说明与验证记录。修改架构前先阅读 `docs/architecture.md`、`docs/shared-scene-engine.md` 和 `docs/material-management.md`。

## 开发、构建与测试命令

使用 Node.js 22.12 或更高版本，在仓库根目录执行命令。

- `npm ci`：按锁文件安装依赖。
- `npm run dev`：启动开发服务，地址为 `http://127.0.0.1:5196/`。
- `npm run build`：构建三人、九人及嵌入页面；`npm run preview`：在 5197 端口预览构建结果。
- `npm run build:loft`、`npm run build:suite`、`npm run build:floor`：分别构建长桌、套间和大平层页面。
- `npm test`：运行全部 Node 测试。
- `node scripts/browser-serve.mjs`：在 5206 端口启动稳定测试服务。在测试终端设置 `$env:DEMO_URL='http://127.0.0.1:5206/'`；修改源码后必须重启该服务。
- `npm run export:characters`：通过已启动的开发服务重新导出人物素材。

## 代码风格与命名规范

遵循相邻代码风格：两空格缩进、语句使用分号、JavaScript 字符串使用单引号，导入路径显式保留 `.js` 扩展名。函数和变量使用 camelCase，类使用 PascalCase，模块文件名使用 kebab-case。文本换行遵循 `.gitattributes` 中的 LF 约定。目前未配置格式化或静态检查工具。

## 测试要求

单元测试使用 `node:test` 和严格断言，文件命名为 `tests/*.test.mjs`；浏览器检查使用 Playwright Chromium/SwiftShader。当前没有覆盖率数值门槛。行为修改应补充有针对性的契约或生命周期测试。修改场景后，通过 `npm run` 执行 `test:browser:engine`、`test:browser:resources`、`test:browser:furniture`、`test:browser:composition`、`test:browser:tasks` 和 `test:geometry:workstations`。有意更新基线数据时应说明原因；超时应单独记录，不能计为通过。

## 素材与生命周期约定

明确区分人物身份、外观方案、场景实例和业务 Agent，并保留稳定 ID。通过 `assembleOffice()` 组装场景；家具和环境构建器只消费传入的实例数据，不读取固定布局。工位座位是摆放基准，碰撞与显示器挂点由同一契约派生。自定义场景必须持有美术资源租约，先释放私有资源，再释放租约。运行时继续通过代码生成素材，保留 `publicDir: false`。不要手动清空导出目录；通过事务导出的 `--only=portrait`、`--ids=team-00` 选项局部更新，保留未选中的产物。

## 提交与合并请求规范

现有提交使用 Conventional Commits 风格，例如 `feat:`、`chore:`。每次提交聚焦一项改动。合并请求应说明行为变化、关联相关问题，并列出验证结果与限制；涉及视觉变化时附上截图。不要提交依赖目录、构建产物、日志或 `.artifacts/`。
