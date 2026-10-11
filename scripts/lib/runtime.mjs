import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export function validateSlug(slug) {
  if (!slug || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error('名称须为 1–64 个小写英文字母、数字或单连字符，例如 my-talk。');
  }
  return slug;
}

export async function readDeck(slug) {
  validateSlug(slug);
  const directory = path.join(projectRoot, 'decks', slug);
  try {
    const metadata = JSON.parse(await readFile(path.join(directory, 'deck.json'), 'utf8'));
    await access(path.join(directory, 'slides.md'));
    return metadata;
  } catch (error) {
    throw new Error(`无法读取 decks/${slug}/deck.json 或 slides.md：${error.message}`);
  }
}

export async function startServer() {
  const server = await createServer({
    root: projectRoot,
    logLevel: 'error',
    clearScreen: false,
    server: { host: '127.0.0.1', port: 0, strictPort: false, open: false },
  });
  try {
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('无法获取本地服务器端口。');
    return { server, origin: `http://127.0.0.1:${address.port}` };
  } catch (error) {
    await server.close();
    throw error;
  }
}

export async function launchBrowser() {
  let executablePath = process.env.CHROMIUM_PATH;
  if (executablePath) {
    try {
      await access(executablePath, constants.X_OK);
    } catch {
      throw new Error(`CHROMIUM_PATH 指向的浏览器无法执行：${executablePath}`);
    }
  } else {
    for (const candidate of ['/usr/bin/chromium', '/usr/bin/google-chrome']) {
      try {
        await access(candidate, constants.X_OK);
        executablePath = candidate;
        break;
      } catch {
        // Fall back to the next system executable, then Playwright's browser.
      }
    }
  }
  try {
    return await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  } catch (error) {
    throw new Error(`Chromium 启动失败。可运行 npx playwright install chromium，或设置 CHROMIUM_PATH。\n${error.message}`);
  }
}

export async function waitForDeck(page) {
  await page.waitForFunction(() =>
    (window.__deckReady === true && window.Reveal?.isReady()) || document.querySelector('.error-page'),
  undefined, { timeout: 30_000 });
  const errorPage = page.locator('.error-page');
  if (await errorPage.count()) {
    throw new Error(`演示初始化失败：${(await errorPage.textContent())?.trim()}`);
  }
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;
      await image.decode();
    }));
  });
}

export async function preparePdf(page, url) {
  await page.emulateMedia({ media: 'print' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await waitForDeck(page);
  await page.waitForSelector('.pdf-page', { state: 'attached', timeout: 30_000 });
}

export async function writePdf(page, outputPath) {
  return page.pdf({
    path: outputPath,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });
}
