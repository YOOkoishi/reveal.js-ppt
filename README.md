# Reveal.js 演示工作台

用 Markdown 写演讲，用 Reveal.js 播放。默认采用米白色的 **Ivory 暖纸**，提供 9 套可随时切换的风格。支持多套演讲、代码高亮、公式、逐步展示、演讲者备注与 PDF 导出。

## 启动

使用 Node.js 22.12+ 与 npm：

```sh
npm install
npm run dev
```

打开终端显示的本地地址。默认播放 `showcase`，可在演讲列表中切换到 `starter`。内容、字体、公式与代码高亮资源均从本地提供，安装依赖后不需要 CDN。

## 新建一套演讲

```sh
npm run new -- my-talk "我的技术分享"
npm run new -- my-talk-editorial "我的读书分享" --theme editorial
```

命令会创建 `decks/<名称>/deck.json` 与 `slides.md`，已有目录不会被覆盖。名称只接受小写字母、数字及单连字符。默认主题是 `ivory`，也可用 `--theme` 指定。打开 `/?deck=my-talk`，修改文件后页面会自动更新；若新目录没有立即出现，刷新页面。

```text
decks/
  showcase/            完整组件与效果示例
    deck.json
    slides.md
  starter/             可直接改写的简短模板
    deck.json
    slides.md
src/                   播放器、主题与样式
public/                图片等静态资源
scripts/               新建、PDF 导出与浏览器检查
```

`deck.json` 定义演讲信息：

```json
{
  "title": "我的技术分享",
  "description": "演讲的一句话简介",
  "author": "你的名字",
  "date": "2026-10-09",
  "theme": "ivory",
  "tags": ["编译器", "GPU"]
}
```

`theme` 使用下表中的 ID。通过 `/?deck=my-talk&theme=editorial` 可以指定本次播放的风格。

## 选择风格

在工作台中打开风格选择器，或按 `T` 打开风格图库。导出的单文件 HTML 也包含全部 9 套风格，可以在播放时自由切换。选择会按演讲记在当前浏览器中；不会改写 `deck.json` 或已经导出的文件。

| ID | 风格 | 特点 |
| --- | --- | --- |
| `ivory` | Ivory · 暖纸 | 米白纸面与陶土色，适合日常分享与课程汇报；新演讲默认 |
| `editorial` | Editorial · 书页 | 衬线标题与细线留白，适合读书、研究与人文主题 |
| `mist` | Mist · 雾蓝 | 清爽浅蓝与规整线条，适合技术讲解与项目汇报 |
| `sage` | Sage · 鼠尾草 | 灰绿植物色与柔和曲线，适合轻松交流与工作坊 |
| `rose` | Rose · 淡玫瑰 | 低饱和粉色与简洁几何，适合设计与创意分享 |
| `material` | Material · 柔紫 | Material Design 启发的柔紫色、圆角与层次 |
| `paper` | Paper · 纸白 | 原有纸白与深绿配色，保留线框封面的技术感 |
| `noir` | Noir · 暗夜 | 黑底荧光绿，适合强对比的大屏演示 |
| `ember` | Ember · 余烬 | 深棕与暖橙，适合深色环境里的叙事演讲 |

风格目录由 `src/themes.json` 统一定义；`deck.json` 中的 `theme` 决定默认风格。HTML 与 PDF 导出都支持 `--theme <ID>`，只影响本次输出，不修改演讲源文件。

Editorial 的衬线标题优先使用系统的 Noto Serif CJK SC 等字体，并提供统一回退；中文字体在不同设备上可能略有差异。

## 编写内容

`slides.md` 用独占一行的 `---` 分隔横向幻灯片，用 `--` 分隔纵向子页。`Note:` 后面是演讲者备注，不会作为普通幻灯片正文展示。

````markdown
<!-- .slide: class="slide cover" -->

<p class="eyebrow">TECH TALK</p>

# 我的演讲

一句话介绍本次分享。

Note:
开场时补充背景。

---

<!-- .slide: class="slide" -->

## 一个具体例子

- 先展示问题
- 再展示方法 <!-- .element: class="fragment" -->
- 最后展示结果 <!-- .element: class="fragment" -->

--

<!-- .slide: class="slide" -->

## 展开细节

```cpp [1|2-3]
int sum = 0;
for (int value : values)
    sum += value;
```

---

<!-- .slide: class="slide" -->

## 公式

$$
\mathrm{Attention}(Q,K,V)
= \mathrm{softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$
````

Markdown 与 HTML 可以混用。复杂排版使用 HTML 内的 HTML 文本：

```html
<div class="two-col">
  <div>
    <h3>问题</h3>
    <p>用一段简短文字说明背景。</p>
  </div>
  <div>
    <h3>方法</h3>
    <p>配一个具体例子。</p>
  </div>
</div>
```

常用样式类：

| 类名 | 用途 |
| --- | --- |
| `slide`、`cover` | 标准页、封面 |
| `eyebrow`、`caption` | 章节小标题、说明文字 |
| `two-col` | 双栏排版 |
| `pipeline`、`pipeline-node` | 流程步骤 |
| `metric-grid`、`metric` | 指标展示 |
| `callout` | 强调一句结论 |
| `fragment` | 按步骤展示元素 |

更多写法直接参考 `decks/showcase/slides.md`。主题主要使用 `--bg`、`--surface`、`--fg`、`--muted`、`--accent`、`--line` 这些 CSS 变量，可统一替换颜色。图片放在 `public/`，在 Markdown 中通过 `![说明](./图片名.png)` 引用；资源路径相对于网页地址，不是 Markdown 文件的位置。

## 演示

| 操作 | 快捷键 |
| --- | --- |
| 下一步 / 上一步 | `Space` / `Shift+Space` |
| 横向 / 纵向切页 | 方向键 |
| 总览 | `Esc` 或 `O` |
| 全屏 | `F` |
| 演讲者视图 | `S` |
| 打开风格图库 | `T` |
| 使用指南 | `?` |
| 黑屏暂停 | `B` 或 `.` |

演讲者视图会打开新窗口，包含备注、计时与下一页预览；浏览器需要允许当前站点弹窗。幻灯片地址中的 hash 可用于分享某一页。

## 导出单文件网页

分享给别人时，导出一个可以**双击打开、离线播放**的 HTML 文件：

```sh
npm run export:html -- showcase
npm run export:html -- my-talk exports/my-talk/index.html
npm run export:html -- my-talk exports/my-talk/index.html --theme material
```

默认生成 `exports/<演讲名称>/index.html`。只需发送这一个文件；接收者使用浏览器打开即可，无需安装 Node.js 或启动服务器。文件包含所选演讲、全部风格、播放器、字体、公式与代码高亮，打开后直接显示 PPT。`--theme` 设置这份文件的默认风格，接收者仍可按 `T` 切换。

图片和音视频先放进 `public/`，在内容中使用 `./图片名.png` 等相对路径，导出时会一起内联。缺失文件、外链媒体、iframe 与 `srcset` 会明确报错；普通网页链接保留，访问链接仍需联网。演讲者备注也包含在导出文件中，按 `S` 可查看。

## 只使用中间的 PPT

在地址中加上 `view=slides`，即可隐藏工作台外框，让幻灯片铺满页面：

```text
/?deck=showcase&view=slides&theme=ivory
```

将 `showcase` 换成你的演讲名称。纯演示保留底部切页箭头与键盘操作，包括 `F` 全屏、`O` 总览、`S` 演讲者视图。

要把多套演讲放进已有网站，先运行 `npm run build`，将 **整个 `dist/` 的内容** 放到网站的 `/slides/` 静态目录。播放器所需的脚本、样式与字体必须一起保留。随后可直接访问 `/slides/?deck=showcase&view=slides&theme=ivory`，或嵌入：

```html
<iframe
  src="/slides/?deck=showcase&amp;view=slides&amp;theme=ivory"
  title="技术分享幻灯片"
  allowfullscreen
  style="display:block;width:100%;aspect-ratio:16/9;border:0"
></iframe>
```

`/slides/` 是部署目录示例，可按你的网站路径替换。在 iframe 中先点击幻灯片，再使用方向键。`localhost` 地址仅供本机预览；分享给别人时使用网站的实际地址。

## 导出 PDF

```sh
npm run export -- my-talk
npm run export -- my-talk exports/my-talk.pdf
npm run export -- my-talk exports/my-talk.pdf --theme editorial
```

导出脚本会自行启动临时本地服务器，并在结束时关闭。默认输出到 `exports/<名称>.pdf`，使用演讲默认风格；用 `--theme` 可指定本次导出的风格，不受浏览器保存的偏好影响。每张幻灯片一页，fragment 合并为最终展示状态。重复导出同一路径会更新该 PDF。

导出与浏览器检查需要 Chromium。脚本依次使用 `CHROMIUM_PATH` 指定的可执行文件、Linux 上的 `/usr/bin/chromium` 或 `/usr/bin/google-chrome`、Playwright 安装的 Chromium。若没有浏览器：

```sh
npx playwright install chromium
```

也可指定本机浏览器：

```sh
CHROMIUM_PATH=/path/to/chromium npm run export -- my-talk
```

需要手动打印或换主题时，打开 `/?deck=my-talk&theme=paper&print-pdf`，使用浏览器打印并启用背景图形、关闭页眉页脚。

## 检查与构建

```sh
npm run check          # TypeScript 检查
npm run build          # 构建到 dist/
npm run test:smoke     # 真实浏览器检查与 PDF 生成验证
npm run test:html      # 单文件在离线 file:// 下的浏览器检查
npm run test:themes    # 9 套风格、切换记忆、布局与离线风格切换
npm run preview       # 预览生产构建
```

Smoke 检查示例演讲的键盘导航、fragment、主题切换、starter 加载、PDF 与资源加载错误。GitHub Actions 会自动执行检查、构建与浏览器验证。

发布时把整个 `dist/` 交给静态 HTTP 服务器即可。普通 `dist/` 构建须通过 HTTP 访问；需要双击打开时，使用上面的 `export:html` 单文件导出。项目使用相对 `base`，可部署到域名子目录；Markdown 里的本地资源也应使用 `./` 开头的相对路径。

## 参考

- [Reveal.js Markdown](https://revealjs.com/markdown/)
- [Reveal.js 演讲者视图](https://revealjs.com/speaker-view/)
- [Reveal.js PDF 导出](https://revealjs.com/pdf-export/)
- [Vite 静态部署](https://vite.dev/guide/static-deploy)
