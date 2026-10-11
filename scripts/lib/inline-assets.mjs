import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { parseFragment } from 'parse5';

const mimeTypes = {
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.bmp': 'image/bmp', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ogv': 'video/ogg',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.aac': 'audio/aac', '.flac': 'audio/flac', '.vtt': 'text/vtt', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.pdf': 'application/pdf',
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function applyReplacements(source, replacements) {
  return replacements.sort((a, b) => b.start - a.start)
    .reduce((text, { start, end, value }) => text.slice(0, start) + value + text.slice(end), source);
}

/** Rewrite actual media nodes, preserving Markdown code examples and slide delimiters. */
export async function inlineAssets(markdown, publicDirectory) {
  const publicRoot = await realpath(publicDirectory);
  const cache = new Map();
  const backgroundVideos = [];

  async function resource(value) {
    const original = value.trim();
    if (!original) throw new Error('媒体资源路径为空，请指定 public/ 下的文件。');
    if (original.startsWith('#') || /^data:/i.test(original)) return original;
    if (/^[a-z][a-z\d+.-]*:/i.test(original) || original.startsWith('//')) {
      throw new Error(`离线导出不能引用远端或临时资源：${original}。请下载到 public/ 并使用本地相对路径。`);
    }
    const url = new URL(original, 'https://frame.invalid/');
    let decoded;
    try { decoded = decodeURIComponent(url.pathname); } catch { throw new Error(`资源路径编码无效：${original}`); }
    const requested = path.resolve(publicRoot, decoded.replace(/^\/+/, ''));
    if (requested !== publicRoot && !requested.startsWith(publicRoot + path.sep)) {
      throw new Error(`资源必须位于 public/ 内：${original}`);
    }
    let filename;
    try { filename = await realpath(requested); } catch { throw new Error(`找不到本地资源：${original}（请放在 public/ 下）。`); }
    if (filename === publicRoot || !filename.startsWith(publicRoot + path.sep)) {
      throw new Error(`资源不能通过符号链接访问 public/ 外部：${original}`);
    }
    if (!cache.has(filename)) {
      const mime = mimeTypes[path.extname(filename).toLowerCase()];
      if (!mime) throw new Error(`暂不支持内联此资源类型：${original}`);
      const contents = await readFile(filename);
      cache.set(filename, `data:${mime};base64,${contents.toString('base64')}`);
    }
    // Query strings are cache hints for static files; SVG/media fragments remain meaningful.
    return cache.get(filename) + url.hash;
  }

  async function cssAssets(css) {
    if (/@import\b/i.test(css)) throw new Error('离线导出不支持 CSS @import，请把样式直接放在当前演讲中。');
    const replacements = [];
    const expression = /url\(\s*(?:(["'])([\s\S]*?)\1|([^)]*))\s*\)/gi;
    for (const match of css.matchAll(expression)) {
      const value = await resource((match[2] ?? match[3]).trim());
      const cssValue = value.replace(/[\s"'()\\]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
      replacements.push({ start: match.index, end: match.index + match[0].length, value: `url(${cssValue})` });
    }
    return applyReplacements(css, replacements);
  }

  async function backgroundVideo(value) {
    const sources = /^data:/i.test(value.trim()) ? [value.trim()] : value.split(',').map((item) => item.trim());
    const tokens = [];
    for (const source of sources) {
      const data = await resource(source);
      if (!data || data.startsWith('#')) throw new Error('背景视频需要一个有效的本地视频文件。');
      const token = `__FRAME_BACKGROUND_VIDEO_${backgroundVideos.length}__`;
      backgroundVideos.push({ token, data });
      tokens.push(token);
    }
    return tokens.join(',');
  }

  async function htmlAssets(html) {
    const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
    const replacements = [];
    async function visit(node) {
      const tag = node.tagName;
      if (['iframe', 'object', 'embed', 'script', 'base'].includes(tag)) {
        throw new Error(`离线导出暂不支持 <${tag}>；请改为本地图片、音视频或普通内容。`);
      }
      if (tag === 'link') throw new Error('离线导出不支持 HTML <link> 外部资源，请改为内联样式或本地媒体。');
      for (const attribute of node.attrs || []) {
        const name = attribute.prefix ? `${attribute.prefix}:${attribute.name}` : attribute.name;
        let value = attribute.value;
        if (name === 'srcset' || name === 'data-srcset') throw new Error('离线导出暂不支持 srcset，请为图片指定单个 src。');
        if (name === 'data-background-iframe') throw new Error('离线导出不支持 iframe 背景，请改用本地图片或视频。');
        if (tag === 'meta' && name === 'http-equiv') throw new Error('离线演讲不能包含自动跳转的 meta 指令。');
        if (name === 'style') value = await cssAssets(value);
        else if (name === 'data-background-video') value = await backgroundVideo(value);
        else if (name === 'data-background-image' || name === 'poster' || name === 'background'
          || (['src', 'data-src'].includes(name) && ['img', 'video', 'audio', 'source', 'track', 'input'].includes(tag))
          || (['href', 'xlink:href'].includes(name) && ['image', 'use'].includes(tag))
          || (name === 'data-background' && (/^(?:data:|https?:|\/\/|\.\.?\/)/i.test(value) || /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(value)))) {
          value = await resource(value);
        }
        if (value !== attribute.value) {
          const location = node.sourceCodeLocation?.attrs?.[name];
          if (!location) throw new Error(`无法定位 HTML 资源属性：${name}`);
          replacements.push({ start: location.startOffset, end: location.endOffset, value: `${name}="${escapeHtml(value)}"` });
        }
      }
      if (tag === 'style') {
        for (const child of node.childNodes || []) {
          if (child.nodeName === '#text' && child.sourceCodeLocation) {
            const location = child.sourceCodeLocation;
            replacements.push({ start: location.startOffset, end: location.endOffset, value: await cssAssets(child.value) });
          }
        }
        return;
      }
      if (node.nodeName === '#comment' && /^\s*\.(?:slide|element):/.test(node.data)) {
        const match = node.data.match(/^(\s*\.(?:slide|element):)([\s\S]*)$/);
        const attributes = await htmlAssets(`<frame-assets ${match[2]}>`);
        if (attributes !== `<frame-assets ${match[2]}>`) {
          const element = parseFragment(attributes).childNodes.find((child) => child.tagName === 'frame-assets');
          // Reveal reads attributes straight from comments, without HTML entity decoding.
          const rewritten = ' ' + element.attrs.map((attribute) => `${attribute.name}="${attribute.value.replace(/"/g, '&quot;')}"`).join(' ') + ' ';
          const location = node.sourceCodeLocation;
          replacements.push({ start: location.startOffset, end: location.endOffset, value: `<!--${match[1]}${rewritten}-->` });
        }
      }
      for (const child of node.childNodes || []) await visit(child);
      if (node.content) await visit(node.content);
    }
    await visit(fragment);
    return applyReplacements(html, replacements);
  }

  const tree = fromMarkdown(markdown);
  const definitions = new Map();
  function collect(node) {
    if (node.type === 'definition' && !definitions.has(node.identifier)) definitions.set(node.identifier, node);
    for (const child of node.children || []) collect(child);
  }
  collect(tree);
  const replacements = [];
  async function visit(node) {
    if (node.type === 'image' || node.type === 'imageReference') {
      const target = node.type === 'image' ? node : definitions.get(node.identifier);
      if (!target) throw new Error(`找不到图片引用定义：${node.identifier}`);
      const src = await resource(target.url);
      const title = target.title ? ` title="${escapeHtml(target.title)}"` : '';
      replacements.push({
        start: node.position.start.offset, end: node.position.end.offset,
        value: `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.alt || '')}"${title}>`,
      });
      return;
    }
    if (node.type === 'html') {
      const html = await htmlAssets(node.value);
      if (html !== node.value) replacements.push({ start: node.position.start.offset, end: node.position.end.offset, value: html });
      return;
    }
    for (const child of node.children || []) await visit(child);
  }
  await visit(tree);
  return { markdown: applyReplacements(markdown, replacements), backgroundVideos, assetCount: cache.size };
}
