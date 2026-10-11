# FRAME 演示工程

这是一个 reveal.js + Vite + TypeScript 项目。演示内容在 `decks/<slug>/slides.md`，元信息在同目录的 `deck.json`，公共样式在 `src/styles.css`。

## 编写演示

- 新建演示用 `npm run new -- <slug> "标题"`。默认保留 `showcase` 组件样板和 `starter` 模板。
- 页面使用 1440 × 810 画布。常规页左右留白 94px，上方 76px。内容太多时拆页，先保证演讲距离下的可读性。
- `---` 分隔横向页，`--` 分隔纵向子页，`Note:` 引出演讲者备注。
- 用 `<!-- .slide: data-title="目录标题" -->` 设置目录名称。常用版式与元素可参考 `decks/showcase/slides.md`。
- 优先使用现有主题变量和版式类。组件文本、图表和流程图应保持源码可编辑。
- 风格目录在 `src/themes.json`，扩展样式在 `src/presets.css`，封面装饰在 `src/theme-art.ts`。网页与单文件都可按 `T` 选择风格；改动主题后运行 `npm run test:themes` 并查看截图。
- 字体、公式、高亮和装饰 SVG 通过本地资源提供。图片放在 `public/`，使用 `./文件名` 路径以支持子目录部署。
- 示例数据必须明确标注。真实结果应说明来源、环境和统计口径。

## 验证

- 工程更改后运行 `npm run build`。改动播放器、主题或导出流程后运行 `npm run test:smoke`。
- 新版式需在浏览器中看实际页面，检查标题、代码、公式、图表是否被遮挡或裁切。类型检查不能代替视觉验收。
- 改动打印样式后运行 `npm run export -- <slug>` 并检查实际 PDF。
- `npm run export:html -- <slug>` 生成 `exports/<slug>/index.html`，这是可直接双击、离线分享的单文件版本。修改单文件导出或播放器后运行 `npm run test:html`，验证文件复制到空目录、断网后仍可播放。
- `dist/` 是静态构建产物，通过 HTTP 服务访问。开发服务器默认仅绑定 `127.0.0.1`。
