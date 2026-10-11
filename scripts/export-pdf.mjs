import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { launchBrowser, preparePdf, projectRoot, readDeck, startServer, writePdf } from './lib/runtime.mjs';

async function main() {
  const { values, positionals } = parseArgs({
    options: { theme: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
  });
  if (values.help) {
    console.log('用法：npm run export -- [deck-name] [output.pdf] [--theme <id>]\n默认：npm run export -- showcase exports/showcase.pdf');
    return;
  }
  const [slug = 'showcase', destination, ...extra] = positionals;
  if (extra.length) throw new Error('参数过多。用法：npm run export -- my-talk exports/my-talk.pdf');
  const themes = JSON.parse(await readFile(path.join(projectRoot, 'src/themes.json'), 'utf8'));
  const themeIds = themes.map((theme) => theme.id);
  if (values.theme !== undefined && !themeIds.includes(values.theme)) throw new Error(`未知主题：${values.theme}。可选：${themeIds.join('、')}。`);
  const metadata = await readDeck(slug);
  if (!metadata || !themeIds.includes(metadata.theme)) throw new Error('deck.json 缺少有效的 theme。');
  const outputPath = path.resolve(projectRoot, destination || `exports/${slug}.pdf`);
  if (path.extname(outputPath).toLowerCase() !== '.pdf') throw new Error('输出文件须使用 .pdf 扩展名。');
  await mkdir(path.dirname(outputPath), { recursive: true });
  let browser;
  const { server, origin } = await startServer();
  try {
    browser = await launchBrowser();
    const page = await browser.newPage({ viewport: { width: 1440, height: 810 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const url = new URL('/', origin);
    url.searchParams.set('deck', slug);
    url.searchParams.set('print-pdf', '');
    if (values.theme) url.searchParams.set('theme', values.theme);
    console.log(`正在导出 ${slug}（${values.theme || metadata.theme}）…`);
    await preparePdf(page, url.toString());
    if (errors.length) throw new Error(`页面运行错误：\n${errors.join('\n')}`);
    const pages = await page.locator('.pdf-page').count();
    await writePdf(page, outputPath);
    console.log(`已导出 ${pages} 页：${outputPath}`);
  } finally {
    try {
      await browser?.close();
    } finally {
      await server.close();
    }
  }
}

main().catch((error) => {
  console.error(`导出失败：${error.message}`);
  process.exitCode = 1;
});
