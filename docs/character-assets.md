# 人物导出产物

人物目录、使用关系、资源生命周期及事务导出的完整约定见 [素材管理](material-management.md)。

- 定义来源：`src/characters/catalog.js` 的 24 个人物身份、27 套外观。
- 五布局实例：`src/characters/casts.js`，共 54 个实例。
- 清单生成：`src/shared/character-roster.js`，包含 studio/team/loft/suite/floor 的全部使用关系。
- 产物目录：`public/assets/characters/`，27 个条目、81 个 PNG/GLB 文件。
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
局部导出需已有完整有效产物，保留未选中的文件和哈希。
修改外观后应对该外观导出全部三种文件；人物集变化后应完整导出。

`portrait.png` 是 144 × 160 像素头像；`sheet.png` 是 1024 × 1024 正侧背视图、特写与表情；`model.glb` 是内嵌像素贴图的 glTF 2.0 静态快照。

开发服务可访问 `/public/assets/characters/<appearanceId>/portrait.png`。生产构建默认不复制本目录。资源来自程序化人物代码，不含 Unity / Minecraft 外部素材。
