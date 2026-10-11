import assert from 'node:assert/strict';
import { launchBrowser, preparePdf, startServer, waitForDeck, writePdf } from './lib/runtime.mjs';

async function main() {
  const { server, origin } = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    const remoteRequests = new Set();
    context.on('page', (page) => {
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('requestfailed', (request) => {
        if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
          errors.push(`${request.url()}: ${request.failure()?.errorText}`);
        }
      });
      page.on('response', (response) => {
        if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
      });
      page.on('request', (request) => {
        const url = new URL(request.url());
        if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) remoteRequests.add(url.origin);
      });
    });
    const page = await context.newPage();
    await page.goto(`${origin}/?deck=showcase&theme=noir`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    const slideCount = await page.evaluate(() => window.Reveal.getSlides().length);
    assert.ok(slideCount >= 3, 'showcase 应至少包含 3 页');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'noir');
    assert.ok(await page.locator('.slides .katex').count() > 0, '公式应由本地 KaTeX 渲染');
    assert.ok(await page.locator('.slides code.hljs').count() > 0, '代码应完成语法高亮');
    assert.ok(await page.locator('.slides aside.notes').count() > 0, '演讲者备注应从 Markdown 提取');

    const before = await page.evaluate(() => window.Reveal.getIndices());
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction((previous) => {
      const current = window.Reveal.getIndices();
      return current.h !== previous.h || current.v !== previous.v;
    }, before);

    const fragmentResult = await page.evaluate(() => {
      const reveal = window.Reveal;
      const fragmentSlide = reveal.getSlides().find((slide) => slide.querySelector('.fragment'));
      if (!fragmentSlide) return { found: false };
      const { h, v } = reveal.getIndices(fragmentSlide);
      reveal.slide(h, v, -1);
      const beforeCount = fragmentSlide.querySelectorAll('.fragment.visible').length;
      reveal.nextFragment();
      return { found: true, before: beforeCount, after: fragmentSlide.querySelectorAll('.fragment.visible').length };
    });
    assert.ok(fragmentResult.found, 'showcase 应包含 fragment 示例');
    assert.ok(fragmentResult.after > fragmentResult.before, 'fragment 应能逐步展示');

    const codeBounds = await page.evaluate(() => {
      const reveal = window.Reveal;
      const slide = reveal.getSlides().find((item) => item.querySelector('pre code.fragment'));
      if (!slide) return null;
      const { h, v } = reveal.getIndices(slide);
      reveal.slide(h, v, 0);
      const pre = slide.querySelector('pre').getBoundingClientRect();
      const fragment = slide.querySelector('pre code.fragment').getBoundingClientRect();
      const title = slide.querySelector('h2').getBoundingClientRect();
      return { preTop: pre.top, preBottom: pre.bottom, codeTop: fragment.top, codeBottom: fragment.bottom, titleBottom: title.bottom };
    });
    assert.ok(codeBounds, 'showcase 应包含代码分步高亮示例');
    assert.ok(codeBounds.codeTop >= codeBounds.preTop - 1 && codeBounds.codeBottom <= codeBounds.preBottom + 1, '代码高亮层应局限在代码块内');
    assert.ok(codeBounds.preTop > codeBounds.titleBottom, '代码块不应覆盖标题');

    await page.locator('#theme-select').selectOption('paper');
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'paper');
    await page.goto(`${origin}/?deck=showcase&theme=ember`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'ember');

    await page.goto(`${origin}/?deck=starter&theme=noir`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.ok(await page.evaluate(() => window.Reveal.getSlides().length >= 3), 'starter 应可独立播放');

    const printPage = await context.newPage();
    await preparePdf(printPage, `${origin}/?deck=showcase&print-pdf`);
    const pdfPages = await printPage.locator('.pdf-page').count();
    assert.equal(pdfPages, slideCount, 'PDF 应每张幻灯片导出一页，不重复展开 fragment');
    const pdf = await writePdf(printPage);
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', 'PDF 应具有有效文件头');
    assert.ok(pdf.length > 10_000, 'PDF 应包含实际内容');
    assert.deepEqual([...remoteRequests], [], '运行时不应请求外部网络资源');
    assert.deepEqual(errors, [], '页面不应有运行或资源加载错误');
    console.log(`Smoke 通过：${slideCount} 页；键盘导航、fragment、代码高亮、公式、备注、三套主题、starter、${pdfPages} 页 PDF、零外部资源请求。`);
  } finally {
    try {
      await browser?.close();
    } finally {
      await server.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
