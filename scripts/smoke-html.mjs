import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser, projectRoot, waitForDeck } from './lib/runtime.mjs';

function exportHtml(slug, destination) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      path.join(projectRoot, 'scripts/export-html.mjs'), slug,
      ...(destination ? [destination] : []),
    ], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', reject);
    child.once('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`单文件导出失败 (${slug}, exit ${code})：\n${output}`));
    });
  });
}

async function isolatedCopy(source, directory) {
  await mkdir(directory);
  const entry = path.join(directory, 'index.html');
  await copyFile(source, entry);
  assert.deepEqual(await readdir(directory), ['index.html'], '分享目录只应包含 index.html');
  return entry;
}

async function offlineContext(browser, entry) {
  const context = await browser.newContext({
    offline: true,
    viewport: { width: 1440, height: 810 },
  });
  const errors = [];
  const externalRequests = new Set();
  const siblingRequests = new Set();
  context.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol)) externalRequests.add(url.href);
    if (url.protocol === 'file:' && path.resolve(fileURLToPath(url)) !== path.resolve(entry)) {
      siblingRequests.add(url.href);
    }
  });
  context.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') {
      errors.push(`${request.url()}: ${request.failure()?.errorText}`);
    }
  });
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text());
    });
  });
  return {
    context,
    assertClean() {
      assert.deepEqual([...externalRequests], [], '离线演示不应发起 HTTP(S) 请求');
      assert.deepEqual([...siblingRequests], [], '复制后不应读取 index.html 以外的本地文件');
      assert.deepEqual(errors, [], '离线演示及演讲者窗口不应有运行或资源错误');
    },
  };
}

async function inspectShowcase(browser, entry, artifactsDirectory) {
  const audit = await offlineContext(browser, entry);
  const page = await audit.context.newPage();
  try {
    await page.goto(pathToFileURL(entry).href, { waitUntil: 'load' });
    await waitForDeck(page);
    assert.equal(await page.evaluate(() => window.Reveal.getSlides().length), 11, 'showcase 应独立包含 11 页');
    assert.match(await page.locator('.slides').textContent(), /好的想法/);
    assert.equal(await page.locator('.topbar, .workspace-heading, .deck-controls').count(), 0,
      '离线导出应为纯演示，不应携带工作台界面');
    assert.ok(await page.locator('.slides .katex').count() > 0, '离线公式应成功渲染');
    assert.ok(await page.locator('.slides code.hljs').count() > 0, '离线代码应完成语法高亮');
    await page.screenshot({ path: path.join(artifactsDirectory, 'offline.png') });

    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.Reveal.getIndices().h === 1);

    const fragmentBefore = await page.evaluate(() => {
      const reveal = window.Reveal;
      const slide = reveal.getSlides().find(item => item.querySelector('.fragment'));
      if (!slide) return null;
      const { h, v } = reveal.getIndices(slide);
      reveal.slide(h, v, -1);
      return slide.querySelectorAll('.fragment.visible').length;
    });
    assert.notEqual(fragmentBefore, null, 'showcase 应包含分步展示内容');
    await page.keyboard.press('Space');
    await page.waitForFunction(before =>
      window.Reveal.getCurrentSlide().querySelectorAll('.fragment.visible').length > before,
    fragmentBefore);

    const animation = await page.evaluate(() => {
      const reveal = window.Reveal;
      const slides = reveal.getSlides();
      const index = slides.findIndex((slide, i) => slide.hasAttribute('data-auto-animate') &&
        slides[i + 1]?.hasAttribute('data-auto-animate'));
      if (index < 0) return null;
      const { h, v } = reveal.getIndices(slides[index]);
      reveal.slide(h, v);
      return { index, width: slides[index].querySelector('[data-id="flow-b"]').getBoundingClientRect().width };
    });
    assert.ok(animation, 'showcase 应保留连续动画的相邻页面');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(({ index, width }) => {
      const reveal = window.Reveal;
      const slide = reveal.getCurrentSlide();
      return reveal.getSlides().indexOf(slide) === index + 1 &&
        slide.querySelector('[data-id="flow-b"]').getBoundingClientRect().width > width * 1.25;
    }, animation);

    await page.keyboard.press('o');
    await page.waitForFunction(() => window.Reveal.isOverview());
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !window.Reveal.isOverview());
    await page.keyboard.press('Shift+Slash');
    await page.waitForFunction(() => document.querySelector('#portable-help').open);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#portable-help').open &&
      window.Reveal.getConfig().keyboard !== false);
    assert.equal(await page.evaluate(() => window.Reveal.isOverlayOpen()), false,
      '关闭自定义帮助后不应残留 Reveal 内建帮助层');

    await page.evaluate(() => window.Reveal.slide(6));
    const note = await page.evaluate(() =>
      window.Reveal.getCurrentSlide().querySelector('aside.notes').textContent.replace(/\s+/g, ' ').trim().slice(0, 45));
    assert.ok(note.length > 0, '当前页应存在演讲者备注');
    const popupPromise = page.waitForEvent('popup');
    await page.keyboard.press('s');
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForFunction(expected =>
      document.body.innerText.replace(/\s+/g, ' ').includes(expected), note);
    await popup.locator('#notes-forward').click();
    await page.waitForFunction(() => window.Reveal.getIndices().h === 7);
    await popup.waitForFunction(() => document.querySelector('#notes-count').textContent === '8 / 11');
    await popup.screenshot({ path: path.join(artifactsDirectory, 'offline-notes.png') });
    await popup.close();
    await page.bringToFront();

    await page.keyboard.press('f');
    await page.waitForFunction(() => !!document.fullscreenElement);
    await page.keyboard.press('f');
    await page.waitForFunction(() => !document.fullscreenElement);
    audit.assertClean();
  } finally {
    await audit.context.close();
  }
}

async function inspectMedia(browser, entry) {
  const audit = await offlineContext(browser, entry);
  const page = await audit.context.newPage();
  try {
    await page.goto(pathToFileURL(entry).href, { waitUntil: 'load' });
    await waitForDeck(page);
    assert.equal(await page.evaluate(() => window.Reveal.getSlides().length), 1, '媒体测试包应只包含选定的单页演示');
    const images = await page.locator('.slides img').evaluateAll(elements => elements.map(image => ({
      src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight,
    })));
    assert.equal(images.length, 3, '应保留 Markdown、引用式 Markdown 和 HTML 三种图片');
    for (const image of images) {
      assert.match(image.src, /^data:image\/svg\+xml[;,]/, '本地图片应内联为 data URL');
      assert.deepEqual([image.width, image.height], [32, 16], '图片应在离线环境中实际解码');
    }
    const backgrounds = await page.evaluate(() => ({
      slide: window.Reveal.getCurrentSlide().getAttribute('data-background-image'),
      inline: document.querySelector('#offline-media-style').style.backgroundImage,
    }));
    assert.match(backgrounds.slide, /^data:image\/svg\+xml[;,]/, '幻灯片背景应内联');
    assert.match(backgrounds.inline, /data:image\/svg\+xml[;,]/, '行内 CSS 背景应内联');
    audit.assertClean();
  } finally {
    await audit.context.close();
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'frame-offline-smoke-'));
  const fixtureSlug = `offline-smoke-${process.pid}-${Date.now()}`;
  const fixtureDirectory = path.join(projectRoot, 'decks', fixtureSlug);
  const assetDirectory = path.join(projectRoot, 'public', fixtureSlug);
  const artifactsDirectory = path.join(projectRoot, '.artifacts');
  let createdDeck = false;
  let createdAssets = false;
  let browser;
  try {
    console.log('正在导出并检查单文件 HTML（file://，断网，空目录）…');
    await exportHtml('showcase');
    const showcaseEntry = await isolatedCopy(path.join(projectRoot, 'exports/showcase/index.html'), path.join(temporaryRoot, 'shared'));
    const html = await readFile(showcaseEntry, 'utf8');
    assert.ok(html.length > 10_000, '导出文件应包含实际演示和运行资源');
    await mkdir(artifactsDirectory, { recursive: true });
    browser = await launchBrowser();
    await inspectShowcase(browser, showcaseEntry, artifactsDirectory);

    await mkdir(fixtureDirectory);
    createdDeck = true;
    await mkdir(path.join(projectRoot, 'public'), { recursive: true });
    await mkdir(assetDirectory);
    createdAssets = true;
    await writeFile(path.join(assetDirectory, 'probe.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="16"><rect width="32" height="16" fill="#caff50"/></svg>', { flag: 'wx' });
    await writeFile(path.join(fixtureDirectory, 'deck.json'), JSON.stringify({
      title: 'Offline media smoke', description: '临时离线媒体测试', author: 'Smoke test', date: '2026.10', theme: 'noir', tags: [],
    }), { flag: 'wx' });
    const media = `./${fixtureSlug}/probe.svg`;
    await writeFile(path.join(fixtureDirectory, 'slides.md'), `<!-- .slide: data-background-image="${media}" -->\n\n# Offline media fixture\n\n![Markdown image](${media})\n\n![Reference image][probe]\n\n[probe]: ${media}\n\n<img src="${media}" alt="HTML image">\n<div id="offline-media-style" style="background-image: url('${media}'); width: 32px; height: 16px;"></div>\n`, { flag: 'wx' });
    const fixtureOutput = path.join(temporaryRoot, 'built', 'index.html');
    await exportHtml(fixtureSlug, fixtureOutput);
    const fixtureEntry = await isolatedCopy(fixtureOutput, path.join(temporaryRoot, 'shared-media'));
    await inspectMedia(browser, fixtureEntry);
    console.log('HTML Smoke 通过：单文件复制后 file:// 断网播放；11 页、代码、公式、fragment、连续动画、总览、备注弹窗、全屏、本地媒体内联；零网络和额外文件请求。');
  } finally {
    try {
      await browser?.close();
    } finally {
      if (createdDeck) await rm(fixtureDirectory, { recursive: true, force: true });
      if (createdAssets) await rm(assetDirectory, { recursive: true, force: true });
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
