import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launchBrowser, projectRoot, startServer, waitForDeck } from './lib/runtime.mjs';

const presets = JSON.parse(await readFile(path.join(projectRoot, 'src/themes.json'), 'utf8'));
const ids = presets.map(preset => preset.id);
const metadata = JSON.parse(await readFile(path.join(projectRoot, 'decks/showcase/deck.json'), 'utf8'));
const artifacts = path.join(projectRoot, '.artifacts/themes');

function exportHtml(destination) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(projectRoot, 'scripts/export-html.mjs'), 'showcase', destination], {
      cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(`主题离线导出失败：\n${output}`)));
  });
}

function trackErrors(context, allowed) {
  const errors = [];
  const requests = new Set();
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  });
  context.on('request', request => {
    if (!allowed(new URL(request.url()))) requests.add(request.url());
  });
  context.on('requestfailed', request => {
    if (request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${request.url()}: ${request.failure()?.errorText}`);
  });
  context.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  return () => {
    assert.deepEqual([...requests], [], '主题不能依赖外部网络或额外本地资源');
    assert.deepEqual(errors, [], '主题页面不应出现脚本或资源错误');
  };
}

async function slideState(page) {
  return page.evaluate(() => ({
    indices: window.Reveal.getIndices(),
    visibleFragments: [...window.Reveal.getCurrentSlide().querySelectorAll('.fragment.visible')]
      .map(element => element.getAttribute('data-fragment-index')),
  }));
}

async function appearance(page) {
  return page.evaluate(() => ({
    background: getComputedStyle(document.querySelector('.reveal')).backgroundColor,
    titleFont: getComputedStyle(document.querySelector('.cover h1')).fontFamily,
    art: document.querySelector('.slides .orbital-art').innerHTML,
  }));
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.Reveal.layout();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function openPicker(page, button) {
  if (button) await page.locator(button).click();
  else {
    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('t');
  }
  await page.waitForFunction(() => document.querySelector('#theme-picker').open);
}

async function closePicker(page, escape = false) {
  if (escape) await page.keyboard.press('Escape');
  else await page.locator('.theme-picker-done').click();
  await page.waitForFunction(() => !document.querySelector('#theme-picker').open && window.Reveal.getConfig().keyboard !== false);
}

async function choose(page, id) {
  await page.locator(`[data-theme-choice="${id}"]`).click();
  await page.waitForFunction(theme => document.documentElement.dataset.theme === theme, id);
  assert.equal(await page.locator(`[data-theme-choice="${id}"]`).getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-theme-choice][aria-pressed="true"]').count(), 1);
}

async function inspectWorkspace(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const assertClean = trackErrors(context, url => !['http:', 'https:'].includes(url.protocol) || url.origin === origin);
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/?deck=showcase`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), metadata.theme, '全新浏览器应使用演示元信息默认主题');
    assert.deepEqual(await page.locator('#theme-select option').evaluateAll(options => options.map(option => option.value)), ids,
      '快速选择应完整覆盖共享主题目录');
    await openPicker(page, '[data-action="themes"]');
    assert.deepEqual(await page.locator('[data-theme-choice]').evaluateAll(cards => cards.map(card => card.dataset.themeChoice)), ids);
    for (const group of ['light', 'dark', 'all']) {
      await page.locator(`[data-theme-filter="${group}"]`).click();
      assert.deepEqual(await page.locator('[data-theme-choice]:visible').evaluateAll(cards => cards.map(card => card.dataset.themeChoice)),
        presets.filter(preset => group === 'all' || preset.group === group).map(preset => preset.id), `筛选 ${group} 应显示对应主题`);
    }
    await page.screenshot({ path: path.join(artifacts, 'gallery.png') });
    await closePicker(page, true);

    await page.evaluate(() => {
      const reveal = window.Reveal;
      const slide = reveal.getSlides().find(item => item.querySelector('code.fragment'));
      if (!slide) throw new Error('缺少用于验证主题切换的代码 fragment');
      const { h, v } = reveal.getIndices(slide);
      reveal.slide(h, v, 0);
    });
    const before = await slideState(page);
    const originalAppearance = await appearance(page);
    await openPicker(page);
    await choose(page, 'material');
    await closePicker(page);
    assert.deepEqual(await slideState(page), before, '切换主题必须保留页码和 fragment 进度');
    assert.equal(await page.locator('#theme-select').inputValue(), 'material', '画廊和快速选择应同步');
    assert.equal(new URL(page.url()).searchParams.get('theme'), 'material', '分享地址应保留选择');
    assert.equal(new URL(await page.locator('[data-action="standalone"]').getAttribute('href'), origin).searchParams.get('theme'), 'material');
    assert.equal(new URL(await page.locator('[data-action="print"]').getAttribute('href'), origin).searchParams.get('theme'), 'material');
    const materialAppearance = await appearance(page);
    assert.notEqual(materialAppearance.background, originalAppearance.background, '切换主题应立即更换画布背景');
    assert.notEqual(materialAppearance.art, originalAppearance.art, '切换主题应立即更换封面图形');
    await page.locator('#theme-select').selectOption('editorial');
    assert.notEqual((await appearance(page)).titleFont, materialAppearance.titleFont, '切换书页应立即更换标题字体');
    assert.deepEqual(await slideState(page), before, '快速选择也应保留 fragment 进度');
    await page.locator('#theme-select').selectOption('material');
    await page.locator('#theme-select').blur();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(previous => JSON.stringify(window.Reveal.getIndices()) !== JSON.stringify(previous), before.indices);

    await page.goto(`${origin}/?deck=showcase`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'material', '无 query 重开应记住当前演示的主题');
    await page.goto(`${origin}/?deck=showcase&theme=ivory`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'ivory', '显式 query 应覆盖记忆');
    const starter = JSON.parse(await readFile(path.join(projectRoot, 'decks/starter/deck.json'), 'utf8'));
    await page.goto(`${origin}/?deck=starter`, { waitUntil: 'networkidle' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), starter.theme, '演示之间的主题偏好不能串用');
    assertClean();
  } finally {
    await context.close();
  }
}

async function geometry(page) {
  return page.evaluate(() => {
    const slide = window.Reveal.getCurrentSlide();
    const bounds = slide.getBoundingClientRect();
    const problems = [];
    for (const element of slide.querySelectorAll('h1,h2,h3,p,pre,.pipeline,.pipeline-node,.flow-stage,.flow-box,.equation,.two-col,.agenda,.cover-meta')) {
      if (element.closest('aside.notes') || element.closest('.fragment:not(.visible)')) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.left < bounds.left - 2 || rect.right > bounds.right + 2 || rect.top < bounds.top - 2 || rect.bottom > bounds.bottom + 2) {
        problems.push({ element: element.tagName + '.' + element.className, text: element.textContent.trim().slice(0, 45), reason: 'outside slide' });
      }
      if (element.scrollWidth > element.clientWidth + 3 && element.matches('h1,h2,h3,.pipeline-node,.flow-box')) {
        problems.push({ element: element.tagName + '.' + element.className, text: element.textContent.trim().slice(0, 45), reason: 'horizontal content overflow' });
      }
    }
    const code = slide.querySelector('pre code.fragment');
    if (code) {
      const codeRect = code.getBoundingClientRect();
      const preRect = code.closest('pre').getBoundingClientRect();
      if (codeRect.top < preRect.top - 2 || codeRect.bottom > preRect.bottom + 2) problems.push({ reason: 'code highlight outside code block' });
    }
    return problems;
  });
}

async function inspectVisuals(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 } });
  const assertClean = trackErrors(context, url => !['http:', 'https:'].includes(url.protocol) || url.origin === origin);
  const report = [];
  try {
    const page = await context.newPage();
    for (const id of ids) {
      await page.goto(`${origin}/?deck=showcase&view=slides&theme=${id}`, { waitUntil: 'networkidle' });
      await waitForDeck(page);
      await page.evaluate(() => window.Reveal.configure({ transition: 'none', autoAnimate: false }));
      const currentAppearance = await appearance(page);
      const slides = await page.evaluate(() => window.Reveal.getSlides().map(slide => ({
        ...window.Reveal.getIndices(slide),
        name: slide.matches('.cover') ? 'cover' : slide.matches('.chapter') ? 'chapter' : slide.matches('.code-slide') ? 'code' : slide.querySelector('.pipeline') ? 'flow' : null,
      })));
      for (const slide of slides) {
        await page.evaluate(({ h, v }) => window.Reveal.slide(h, v, 999), slide);
        await settle(page);
        assert.deepEqual(await geometry(page), [], `${id} 第 ${slide.h + 1} 页不应出现内容溢出`);
        if (slide.name) await page.screenshot({ path: path.join(artifacts, `${id}-${slide.name}.png`), animations: 'disabled' });
      }
      const radius = await page.locator('.pipeline-node').first().evaluate(element => getComputedStyle(element).borderRadius);
      report.push({ id, ...currentAppearance, pipelineRadius: radius });
    }
    assert.equal(new Set(report.map(item => item.background)).size, ids.length, '全部主题应具有可区分的实际背景');
    const soft = report.filter(item => ['ivory', 'editorial', 'mist', 'sage', 'rose', 'material'].includes(item.id));
    assert.equal(new Set(soft.map(item => item.art)).size, soft.length, '柔和预设应各有自己的封面图形');
    assert.notEqual(report.find(item => item.id === 'editorial').titleFont, report.find(item => item.id === 'ivory').titleFont,
      '书页预设应应用不同标题字体');
    assert.ok(parseFloat(report.find(item => item.id === 'material').pipelineRadius) >= 20, 'Material 预设应具有柔和圆角组件');
    await writeFile(path.join(artifacts, 'report.json'), JSON.stringify(report.map(({ art, ...item }) => item), null, 2) + '\n');
    assertClean();
  } finally {
    await context.close();
  }
}

async function inspectOffline(browser, temporaryRoot) {
  const built = path.join(temporaryRoot, 'built/index.html');
  await exportHtml(built);
  const shared = path.join(temporaryRoot, 'shared');
  await mkdir(shared);
  const entry = path.join(shared, 'index.html');
  await copyFile(built, entry);
  assert.deepEqual(await readdir(shared), ['index.html']);
  const context = await browser.newContext({ offline: true, viewport: { width: 1440, height: 900 } });
  const assertClean = trackErrors(context, url => {
    if (['http:', 'https:'].includes(url.protocol)) return false;
    return url.protocol !== 'file:' || path.resolve(fileURLToPath(url)) === path.resolve(entry);
  });
  try {
    const page = await context.newPage();
    await page.goto(pathToFileURL(entry).href, { waitUntil: 'load' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), metadata.theme, '接收者初次打开应从打包的元信息开始');
    await page.evaluate(() => window.Reveal.slide(4, 0, 0));
    const before = await slideState(page);
    await openPicker(page);
    assert.deepEqual(await page.locator('[data-theme-choice]').evaluateAll(cards => cards.map(card => card.dataset.themeChoice)), ids);
    for (const id of ids) {
      await choose(page, id);
      assert.deepEqual(await slideState(page), before, `离线切换 ${id} 应保持播放进度`);
    }
    await choose(page, 'material');
    await page.screenshot({ path: path.join(artifacts, 'offline-gallery.png') });
    await closePicker(page, true);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(previous => JSON.stringify(window.Reveal.getIndices()) !== JSON.stringify(previous), before.indices);
    await page.reload({ waitUntil: 'load' });
    await waitForDeck(page);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'material', '本浏览器重新打开离线文件应记住主题');
    assertClean();
  } finally {
    await context.close();
  }
}

async function main() {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'frame-themes-smoke-'));
  await mkdir(artifacts, { recursive: true });
  const { server, origin } = await startServer();
  let browser;
  try {
    browser = await launchBrowser();
    await inspectWorkspace(browser, origin);
    await inspectVisuals(browser, origin);
    await inspectOffline(browser, temporaryRoot);
    console.log(`Themes Smoke 通过：${ids.length} 套预设、画廊筛选与快捷键、页码/fragment 保持、独立主题记忆、全部页面边界、36 张视觉截图、离线单文件全主题切换、零外部资源请求。截图：.artifacts/themes/`);
  } finally {
    try { await browser?.close(); } finally {
      await server.close();
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
