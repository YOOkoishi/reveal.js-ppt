import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
async function main() {
  const { values, positionals } = parseArgs({
    options: { theme: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
  });
  if (values.help) {
    console.log('用法：npm run new -- my-talk "演讲标题" [--theme <id>]\n默认主题：ivory');
    return;
  }
  const [slug, ...titleParts] = positionals;
  if (!slug || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('请使用 1–64 个小写英文字母、数字或单连字符，例如 npm run new -- my-talk "我的演讲"。');
  }
  const title = titleParts.join(' ').trim() || '我的演讲';
  if (title.includes('\n') || title.includes('\r')) throw new Error('标题须为单行文字。');
  const themes = JSON.parse(await readFile(path.join(projectRoot, 'src/themes.json'), 'utf8'));
  const themeIds = themes.map((theme) => theme.id);
  const theme = values.theme ?? 'ivory';
  if (!themeIds.includes(theme)) throw new Error(`未知主题：${theme}。可选：${themeIds.join('、')}。`);
  const directory = path.join(projectRoot, 'decks', slug);
  await mkdir(path.join(projectRoot, 'decks'), { recursive: true });
  try {
    await mkdir(directory);
  } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`decks/${slug} 已存在，未覆盖任何文件。`);
    throw error;
  }
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const metadata = { title, description: '在这里写一句演讲简介', author: '你的名字', date, theme, tags: [] };
  const safeTitle = title.replace(/[&<>]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
  const slides = `<!-- .slide: class="slide cover" -->

<div class="cover-copy">
  <p class="eyebrow">01 / PRESENTATION</p>
  <h1>${safeTitle}</h1>
  <p class="muted">写下你的核心观点。</p>
  <div class="cover-meta"><span>你的名字</span><span>${date}</span><span>YOUR TOPIC</span></div>
</div>
<div class="orbital-art" aria-hidden="true"></div>

Note:
用一个具体问题开始，说明听众会带走什么。

---

<!-- .slide: class="slide" -->

<p class="eyebrow">01 / CONTEXT</p>

## 问题与方法

- 我们遇到了什么问题？
- 方法如何工作？ <!-- .element: class="fragment" -->
- 如何验证结果？ <!-- .element: class="fragment" -->

Note:
按方向键逐条展示要点，补充具体例子。

---

<!-- .slide: class="slide" -->

<p class="eyebrow">02 / TAKEAWAY</p>

## 结论与下一步

在这里写下最重要的结论。

<div class="callout">下一步：用一句话描述可执行的行动。</div>

Note:
回扣开场问题，留出讨论时间。
`;
  try {
    await writeFile(path.join(directory, 'deck.json'), `${JSON.stringify(metadata, null, 2)}\n`, { flag: 'wx' });
    await writeFile(path.join(directory, 'slides.md'), slides, { flag: 'wx' });
  } catch (error) {
    // Only remove the directory this command just created if writing failed.
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  console.log(`已创建 decks/${slug}/\n编辑 decks/${slug}/slides.md\n开发预览：/?deck=${slug}`);
}

main().catch((error) => {
  console.error(`创建失败：${error.message}`);
  process.exitCode = 1;
});
