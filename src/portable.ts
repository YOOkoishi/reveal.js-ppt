/** Single-file presentation entry. All dependencies and one deck are bundled in HTML. */
import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown';
import Highlight from 'reveal.js/plugin/highlight';
import renderMathInElement from 'katex/contrib/auto-render';
import deckData from 'virtual:frame-deck';
import { themeArt } from './theme-art';
import { initialTheme, rememberTheme } from './themes';
import type { Theme } from './themes';
import { createThemePicker } from './theme-picker';
import '@fontsource-variable/manrope';
import '@fontsource/jetbrains-mono/400.css';
import 'reveal.js/reveal.css';
import 'reveal.js/plugin/highlight/monokai.css';
import 'katex/dist/katex.min.css';
import './styles.css';
import './presets.css';
import './portable.css';

const app = document.querySelector<HTMLElement>('#app')!;
const printing = new URLSearchParams(location.search).has('print-pdf');
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

async function start() {
  let currentTheme = initialTheme(deckData.id, deckData.meta.theme, printing);
  document.documentElement.dataset.theme = currentTheme;
  document.title = deckData.meta.title;
  document.body.classList.add('portable', printing ? 'print-mode' : 'slides-only');
  app.innerHTML = `<main class="workspace"><div class="stage"><div class="reveal"><div class="slides"></div></div></div></main>
    <nav class="portable-tools" aria-label="演示工具"><button data-portable="themes" title="选择风格（T）">风格 <kbd>T</kbd></button><button data-portable="fullscreen" title="全屏（F）">全屏 <kbd>F</kbd></button><button data-portable="notes" title="演讲备注（S）">备注 <kbd>S</kbd></button><button data-portable="help" aria-label="演示使用说明">?</button></nav>
    <dialog id="portable-help"><div class="dialog-header"><span class="dialog-kicker">演示使用说明</span><button data-portable="close" class="icon-button" aria-label="关闭">×</button></div><h2>${escapeHtml(deckData.meta.title)}</h2><p class="panel-description">此文件可直接在浏览器里打开，离线播放。</p><div class="shortcut-grid">${[['← / →', '上一页 / 下一页'], ['Space', '展开内容 / 下一步'], ['F', '全屏'], ['O / Esc', '所有幻灯片'], ['S', '打开演讲备注窗口'], ['T', '选择演示风格'], ['B', '黑屏 / 恢复'], ['Home / End', '首页 / 末页'], ['?', '使用说明']].map(([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`).join('')}</div><p class="portable-help-note">演讲备注在独立窗口打开。投屏时选择幻灯片窗口，把备注窗口留在自己的屏幕上。</p></dialog>
    <div id="portable-status" class="toast" role="status"></div>`;
  const section = document.createElement('section');
  section.setAttribute('data-markdown', '');
  section.setAttribute('data-separator', '^---\\s*$');
  section.setAttribute('data-separator-vertical', '^--\\s*$');
  section.setAttribute('data-separator-notes', '^Note:');
  const template = document.createElement('script');
  template.type = 'text/template';
  template.textContent = deckData.markdown;
  section.append(template);
  document.querySelector('.slides')!.append(section);

  const help = document.querySelector<HTMLDialogElement>('#portable-help')!;
  let notesWindow: Window | null = null;
  let notesStarted = Date.now();
  let notesTimer: number | undefined;
  const keyboard = { 70: () => void fullscreen(), 79: () => deck.toggleOverview(), 83: () => openNotes() };
  const deck = new Reveal(document.querySelector<HTMLElement>('.reveal')!, {
    width: 1440, height: 810, margin: 0, minScale: 0.05, maxScale: 2,
    center: false, controls: !printing, controlsTutorial: false, progress: false,
    hash: true, help: false, embedded: !printing, view: null, scrollActivationWidth: 0,
    transition: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'fade',
    backgroundTransition: 'fade', transitionSpeed: 'fast', autoAnimateDuration: 0.8,
    pdfSeparateFragments: false, pdfMaxPagesPerSlide: 1, plugins: [Markdown, Highlight],
    keyboard,
  });
  window.Reveal = deck;
  await deck.initialize();
  document.querySelectorAll('.slides .orbital-art').forEach(element => { element.innerHTML = themeArt(currentTheme); });
  renderMathInElement(document.querySelector<HTMLElement>('.slides')!, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
  await document.fonts.ready;
  deck.layout();

  const themePicker = createThemePicker({
    getTheme: () => currentTheme,
    onSelect: setTheme,
    onOpen: () => deck.configure({ keyboard: false }),
    onClose: () => deck.configure({ keyboard }),
  });
  function setTheme(theme: Theme) {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    rememberTheme(deckData.id, theme);
    document.querySelectorAll('.slides .orbital-art').forEach(element => { element.innerHTML = themeArt(theme); });
    syncNotesTheme();
    void document.fonts.ready.then(() => deck.layout());
  }
  function syncNotesTheme() {
    if (!notesWindow || notesWindow.closed) return;
    const palette = getComputedStyle(document.documentElement);
    for (const name of ['--bg', '--fg', '--line', '--accent', '--muted', '--surface']) {
      notesWindow.document.documentElement.style.setProperty(name, palette.getPropertyValue(name));
    }
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { status('浏览器未允许全屏，可使用浏览器的全屏菜单。'); }
    deck.layout();
  }
  document.addEventListener('fullscreenchange', () => deck.layout());

  function syncNotes() {
    if (!notesWindow || notesWindow.closed) {
      clearInterval(notesTimer);
      notesWindow = null;
      return;
    }
    const doc = notesWindow.document;
    const slides = deck.getSlides();
    const slide = deck.getCurrentSlide();
    const index = slides.indexOf(slide);
    const title = (element: HTMLElement | undefined) => element?.dataset.title || element?.querySelector('h1,h2,h3')?.textContent || '';
    doc.querySelector('#notes-count')!.textContent = `${index + 1} / ${slides.length}`;
    doc.querySelector('#notes-title')!.textContent = title(slide);
    doc.querySelector('#notes-content')!.innerHTML = deck.getSlideNotes(slide) || '<p>这一页没有演讲备注。</p>';
    doc.querySelector('#notes-next')!.textContent = title(slides[index + 1]) || '演示结束';
    updateClock();
  }

  function updateClock() {
    if (!notesWindow || notesWindow.closed) { clearInterval(notesTimer); return; }
    const seconds = Math.floor((Date.now() - notesStarted) / 1000);
    notesWindow.document.querySelector('#notes-clock')!.textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function openNotes() {
    if (notesWindow && !notesWindow.closed) { notesWindow.focus(); return; }
    // about:blank inherits its opener's origin, so file:// needs neither a server nor postMessage.
    notesWindow = window.open('', '', 'popup,width=800,height=680');
    if (!notesWindow) { status('请允许此文件打开弹窗，然后再次按 S。'); return; }
    const doc = notesWindow.document;
    doc.open();
    doc.write(`<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><title>演讲备注</title><style>
      *{box-sizing:border-box}body{margin:0;padding:32px;background:var(--bg);color:var(--fg);font:18px/1.7 system-ui,sans-serif}header,footer{display:flex;gap:16px;align-items:center;justify-content:space-between}header{border-bottom:1px solid var(--line);padding-bottom:20px}h1{font-size:28px;line-height:1.4;margin:25px 0}#notes-content{min-height:220px;font-size:22px}#notes-content p{margin:0 0 14px}.muted{color:var(--muted);font-size:14px}#notes-count,#notes-clock{font:21px monospace;color:var(--accent)}button{font:inherit;background:var(--surface);color:inherit;border:1px solid var(--line);border-radius:5px;padding:9px 16px;cursor:pointer}footer{margin-top:28px}#notes-next{font-size:19px}
      </style></head><body><header><span>演讲备注 <span id="notes-count"></span></span><span id="notes-clock">00:00</span><button id="reset-clock">计时归零</button></header><h1 id="notes-title"></h1><main id="notes-content"></main><div class="muted">下一页</div><div id="notes-next"></div><footer><button id="notes-prev">← 上一步</button><span class="muted">在此窗口也可以用方向键翻页</span><button id="notes-forward">下一步 →</button></footer></body></html>`);
    doc.close();
    syncNotesTheme();
    doc.querySelector('#notes-prev')!.addEventListener('click', () => deck.prev());
    doc.querySelector('#notes-forward')!.addEventListener('click', () => deck.next());
    doc.querySelector('#reset-clock')!.addEventListener('click', () => { notesStarted = Date.now(); updateClock(); });
    doc.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); deck.next(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); deck.prev(); }
    });
    notesStarted = Date.now();
    notesTimer = window.setInterval(updateClock, 1000);
    syncNotes();
  }
  deck.on('slidechanged', syncNotes);
  deck.on('fragmentshown', syncNotes);
  deck.on('fragmenthidden', syncNotes);
  window.addEventListener('pagehide', () => { clearInterval(notesTimer); notesWindow?.close(); });

  function openHelp() { deck.configure({ keyboard: false }); help.showModal(); }
  help.addEventListener('close', () => deck.configure({ keyboard }));
  document.addEventListener('click', event => {
    const action = (event.target as Element).closest<HTMLElement>('[data-portable]')?.dataset.portable;
    if (action === 'fullscreen') void fullscreen();
    if (action === 'notes') openNotes();
    if (action === 'themes') themePicker.open();
    if (action === 'help') openHelp();
    if (action === 'close') help.close();
  });
  document.addEventListener('keydown', event => {
    if (help.open || themePicker.isOpen() || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).matches('input,textarea,select,[contenteditable]')) return;
    if (event.key === '?') { event.preventDefault(); openHelp(); }
    if (event.key.toLowerCase() === 't') { event.preventDefault(); themePicker.open(); }
  });
  let hideTimer: number;
  const showTools = () => {
    document.body.classList.add('show-portable-tools');
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => document.body.classList.remove('show-portable-tools'), 2500);
  };
  document.addEventListener('pointermove', showTools);
  document.addEventListener('touchstart', showTools, { passive: true });
  showTools();
  window.__deckReady = true;
}

let statusTimer: ReturnType<typeof setTimeout>;
function status(message: string) {
  const element = document.querySelector<HTMLElement>('#portable-status')!;
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => element.classList.remove('visible'), 5000);
}

start().catch(error => {
  console.error(error);
  app.innerHTML = `<main class="error-page"><h1>演示未能打开</h1><p>${escapeHtml(String(error.message || error))}</p><p>请用较新的 Chrome、Edge 或 Firefox 浏览器打开这个 HTML 文件。</p></main>`;
});
