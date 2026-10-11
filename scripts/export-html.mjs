import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { build } from 'vite';
import { escapeHtml, inlineAssets } from './lib/inline-assets.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
async function canonicalDestination(filename) {
  const missing = [];
  let ancestor = filename;
  while (true) {
    try { return path.join(await realpath(ancestor), ...missing.reverse()); } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
      const parent = path.dirname(ancestor);
      if (parent === ancestor) throw error;
      missing.push(path.basename(ancestor));
      ancestor = parent;
    }
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    options: { theme: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
    allowPositionals: true,
  });
  if (values.help) {
    console.log('用法：npm run export:html -- [deck-name] [output.html] [--theme <id>]\n默认：exports/<deck-name>/index.html，可双击离线打开。');
    return;
  }
  const [slug = 'showcase', destination, ...extra] = positionals;
  if (extra.length) throw new Error('参数过多。用法：npm run export:html -- my-talk exports/my-talk/index.html');
  if (!slug || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('演讲名称须由小写英文字母、数字和单连字符组成。');
  const themes = JSON.parse(await readFile(path.join(projectRoot, 'src/themes.json'), 'utf8'));
  const themeIds = themes.map((theme) => theme.id);
  if (values.theme !== undefined && !themeIds.includes(values.theme)) throw new Error(`未知主题：${values.theme}。可选：${themeIds.join('、')}。`);
  const output = path.resolve(projectRoot, destination || `exports/${slug}/index.html`);
  if (path.extname(output).toLowerCase() !== '.html') throw new Error('输出文件须使用 .html 扩展名。');
  const canonicalOutput = await canonicalDestination(output);
  const canonicalRoot = await realpath(projectRoot);
  const reserved = ['src', 'decks', 'scripts', 'public', 'dist', 'node_modules', '.git', '.github', '.agents', '.codex'];
  if (canonicalOutput === path.join(canonicalRoot, 'index.html') || reserved.some((name) => {
    const folder = path.join(canonicalRoot, name);
    return canonicalOutput === folder || canonicalOutput.startsWith(folder + path.sep);
  })) throw new Error('输出路径不能覆盖工程源码、静态资源或普通构建目录；请使用 exports/ 或工程外的目录。');

  let meta, markdown;
  try {
    meta = JSON.parse(await readFile(path.join(projectRoot, 'decks', slug, 'deck.json'), 'utf8'));
    markdown = await readFile(path.join(projectRoot, 'decks', slug, 'slides.md'), 'utf8');
  } catch (error) { throw new Error(`无法读取演讲 ${slug}：${error.message}`); }
  if (!meta || typeof meta.title !== 'string' || !themeIds.includes(meta.theme)) throw new Error('deck.json 缺少有效的 title 或 theme。');
  if (values.theme) meta = { ...meta, theme: values.theme };
  const embedded = await inlineAssets(markdown, path.join(projectRoot, 'public'));
  const data = { id: slug, meta, markdown: embedded.markdown };
  const virtualSource = `
    const deck = ${JSON.stringify(data)};
    for (const asset of ${JSON.stringify(embedded.backgroundVideos)}) {
      const match = asset.data.match(/^data:([^;,]+)(;base64)?,([^#]*)(#.*)?$/);
      if (!match) throw new Error('Invalid embedded background video');
      const bytes = match[2] ? Uint8Array.from(atob(match[3]), c => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(match[3]));
      const url = URL.createObjectURL(new Blob([bytes], {type: match[1]})) + (match[4] || '');
      deck.markdown = deck.markdown.replaceAll(asset.token, url);
    }
    export default deck;
  `;
  console.log(`正在打包离线演讲 ${slug}（${meta.theme}）…`);
  const result = await build({
    configFile: false,
    root: projectRoot,
    publicDir: false,
    logLevel: 'warn',
    plugins: [{
      name: 'frame-selected-deck',
      resolveId(id) { if (id === 'virtual:frame-deck') return '\0virtual:frame-deck'; },
      load(id) { if (id === '\0virtual:frame-deck') return virtualSource; },
    }],
    build: {
      write: false,
      target: 'es2022',
      lib: { entry: path.join(projectRoot, 'src/portable.ts'), name: 'FramePresentation', formats: ['iife'] },
      assetsInlineLimit: Infinity,
      cssCodeSplit: false,
      minify: true,
      license: true,
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap((item) => item.output);
  const chunks = outputs.filter((item) => item.type === 'chunk');
  const assets = outputs.filter((item) => item.type === 'asset');
  const licenses = assets.filter((item) => item.fileName === '.vite/license.md');
  if (chunks.length !== 1 || assets.some((item) => !item.fileName.endsWith('.css') && item.fileName !== '.vite/license.md')) {
    throw new Error('打包结果包含未内联的额外文件，已停止写出；请检查新增的脚本或资源导入。');
  }
  const assetText = (item) => typeof item.source === 'string' ? item.source : Buffer.from(item.source).toString();
  const css = assets.filter((item) => item.fileName.endsWith('.css')).map(assetText).join('\n');
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import\b/i.test(cssWithoutComments)) throw new Error('构建后的 CSS 仍含 @import，无法保证离线使用。请将相关样式放入本地工程。');
  for (const match of cssWithoutComments.matchAll(/url\(\s*(?:(["'])([\s\S]*?)\1|([^)]*))\s*\)/gi)) {
    const resource = (match[2] ?? match[3]).trim();
    if (resource && !/^(?:data:|#)/i.test(resource)) {
      throw new Error(`构建后的 CSS 仍引用外部资源：${resource}。请使用本地导入，使 Vite 将其内联。`);
    }
  }
  const js = chunks[0].code;
  const favicon = `data:image/jpeg;base64,${(await readFile(path.join(projectRoot, 'public/source.jpg'))).toString('base64')}`;
  const html = `<!doctype html>
<html lang="zh-CN" data-theme="${escapeHtml(meta.theme)}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.title)} · FRAME</title>
  <meta name="description" content="${escapeHtml(meta.description || '')}">
  <link rel="icon" type="image/jpeg" href="${favicon}">
  <style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body>
  <div id="app"></div>
  <template id="frame-third-party-licenses">${escapeHtml(licenses.map(assetText).join('\n'))}</template>
  <script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`;
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, html);
  console.log(`已导出：${output}\n单文件 ${Math.ceil(Buffer.byteLength(html) / 1024)} KiB，内联 ${embedded.assetCount} 个演讲媒体文件；可双击打开并直接分享。`);
}

main().catch((error) => {
  console.error(`HTML 导出失败：${error.message}`);
  process.exitCode = 1;
});
