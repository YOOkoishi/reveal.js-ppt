import Reveal from 'reveal.js';
import Markdown from 'reveal.js/plugin/markdown';
import Highlight from 'reveal.js/plugin/highlight';
import Notes from 'reveal.js/plugin/notes';
import renderMathInElement from 'katex/contrib/auto-render';
import '@fontsource-variable/manrope';
import '@fontsource/jetbrains-mono/400.css';
import 'reveal.js/reveal.css';
import 'reveal.js/plugin/highlight/monokai.css';
import 'katex/dist/katex.min.css';
import './styles.css';
import './presets.css';
import { getDecks, escapeHtml as esc } from './decks';
import { initialTheme, isTheme, rememberTheme, themeOptions } from './themes';
import type { Theme } from './themes';
import { themeArt } from './theme-art';
import { createThemePicker } from './theme-picker';

const icons: Record<string, string> = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  notes: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h5"/>',
  print: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  layers: '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
};
const icon = (name: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.grid}</svg>`;
const params = new URLSearchParams(location.search);
const printing = params.has('print-pdf');
const standalone = params.get('view') === 'slides' && !printing;
const requested = params.get('deck') || 'showcase';
const app = document.querySelector<HTMLDivElement>('#app')!;

async function start() {
  const decks = getDecks();
  const current = decks.find(d => d.id === requested);
  if (!current) {
    app.innerHTML = `<main class="error-page"><span class="wordmark">FRAME<span>®</span></span><h1>找不到这份演示</h1><p>没有名为 “${esc(requested)}” 的演示。可以从下面选择一份。</p>${decks.map(d => `<a class="deck-link" href="?deck=${encodeURIComponent(d.id)}">${esc(d.title)} ${icon('arrow')}</a>`).join('')}</main>`;
    return;
  }
  const theme = initialTheme(current.id, current.theme, printing);
  document.documentElement.dataset.theme = theme;
  document.body.classList.toggle('print-mode', printing);
  document.body.classList.toggle('slides-only', standalone);
  document.title = `${current.title} · FRAME`;
  const printParams = new URLSearchParams(params);
  printParams.set('deck', current.id);
  printParams.set('print-pdf', '');
  printParams.set('theme', theme);
  const standaloneParams = new URLSearchParams({ deck: current.id, view: 'slides', theme });
  app.innerHTML = `
    <header class="topbar">
      <a href="?deck=showcase" class="wordmark" aria-label="FRAME 首页"><img class="brand-symbol" src="./source.jpg" alt="" width="28" height="32">FRAME<span class="registered">®</span></a>
      <span class="topbar-label">一个属于你的演示空间</span>
      <div class="topbar-actions"><a data-action="standalone" class="text-button" href="?${standaloneParams}" target="_blank" rel="noopener">${icon('arrow')}<span>纯演示</span></a><span class="topbar-divider"></span><button data-action="help" class="text-button">${icon('help')}<span>使用指南</span></button><span class="topbar-divider"></span><button data-action="library" class="text-button">${icon('layers')}<span>我的演示</span><span class="count-badge">${decks.length}</span></button></div>
    </header>
    <main class="workspace">
      <div class="workspace-heading"><div class="deck-heading"><span class="live-dot"></span><span class="deck-heading-title">${esc(current.title)}</span><span class="subtle-tag">LIVE PREVIEW</span></div><div class="view-tools"><label class="theme-control" title="快速更换配色"><span class="theme-swatch"></span><span class="sr-only">主题</span><select id="theme-select" aria-label="主题">${themeOptions(theme)}</select></label><button data-action="themes" class="theme-gallery-button" title="选择风格（T）">风格</button><button data-action="overview" class="icon-button" title="幻灯片总览（O）" aria-label="幻灯片总览">${icon('grid')}</button><button data-action="fullscreen" class="present-button">${icon('fullscreen')}<span>开始演示</span></button></div></div>
      <div class="stage"><div class="stage-corner top-left"></div><div class="stage-corner bottom-right"></div><div class="reveal"><div class="slides"></div></div><div class="stage-watermark" aria-hidden="true">FRAME / PRESENTATION SYSTEM</div><button class="exit-present" data-action="fullscreen" aria-label="退出演示">${icon('close')} 退出演示</button></div>
      <footer class="deck-controls"><div class="slide-counter"><button data-action="outline" class="counter-button" title="打开目录"><strong id="slide-current">01</strong><span>/</span><span id="slide-total">01</span></button><span class="control-divider"></span><span id="slide-title" class="current-title"></span></div><div id="slide-dots" class="slide-dots" aria-label="幻灯片导航"></div><div class="navigation"><button data-action="notes" class="icon-button" title="演讲者视图（S）" aria-label="演讲者视图">${icon('notes')}</button><a data-action="print" class="icon-button" title="导出 PDF" aria-label="导出 PDF" href="?${printParams}" target="_blank" rel="noopener">${icon('print')}</a><span class="control-divider"></span><button data-action="prev" class="icon-button nav-arrow" aria-label="上一页">${icon('left')}</button><button data-action="next" class="icon-button nav-arrow next-arrow" aria-label="下一页">${icon('right')}</button></div></footer>
      <div class="workspace-footnote"><span>BUILT TO MAKE IDEAS SEEN.</span><span><kbd>←</kbd> <kbd>→</kbd> 翻页 <i></i><kbd>O</kbd> 总览 <i></i><kbd>?</kbd> 快捷键</span><span>REVEAL.JS <span class="tiny-cross">✳</span> FRAME</span></div>
    </main>
    <dialog id="panel"><div class="dialog-header"><span class="dialog-kicker">FRAME / STUDIO</span><button class="icon-button" data-action="close" aria-label="关闭">${icon('close')}</button></div><div id="panel-content"></div></dialog>
    <div class="print-toolbar"><span>PDF 预览</span><button id="print-now">打印 / 另存为 PDF</button><a href="?deck=${encodeURIComponent(current.id)}&theme=${theme}">返回演示</a></div>
    <div id="toast" class="toast" role="status"></div>`;

  const source = await current.load();
  const section = document.createElement('section');
  section.setAttribute('data-markdown', '');
  section.setAttribute('data-separator', '^---\\s*$');
  section.setAttribute('data-separator-vertical', '^--\\s*$');
  section.setAttribute('data-separator-notes', '^Note:');
  const template = document.createElement('script');
  template.type = 'text/template';
  template.textContent = source;
  section.append(template);
  document.querySelector('.slides')!.append(section);

  const deck = new Reveal(document.querySelector<HTMLElement>('.reveal')!, {
    width: 1440, height: 810, margin: 0, minScale: 0.05, maxScale: 2,
    center: false, controls: standalone, controlsTutorial: false, progress: false, hash: true,
    help: false, embedded: !printing, view: null, scrollActivationWidth: 0,
    transition: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'fade',
    backgroundTransition: 'fade', transitionSpeed: 'fast',
    autoAnimateDuration: 0.8, pdfSeparateFragments: false, pdfMaxPagesPerSlide: 1,
    plugins: [Markdown, Highlight, Notes],
    keyboard: { 70: () => void togglePresentation(), 79: () => deck.toggleOverview() },
  });
  window.Reveal = deck;
  await deck.initialize();
  document.querySelectorAll('.slides .orbital-art').forEach(el => { el.innerHTML = themeArt(theme); });
  renderMathInElement(document.querySelector<HTMLElement>('.slides')!, {
    delimiters: [{ left: '$$', right: '$$', display: true }, { left: '\\(', right: '\\)', display: false }],
    throwOnError: false,
  });
  await document.fonts.ready;
  deck.layout();
  const slides = deck.getSlides();
  const titleFor = (slide: HTMLElement, index: number) => slide.dataset.title || slide.querySelector('h1,h2,h3')?.textContent || `幻灯片 ${index + 1}`;
  const dots = document.querySelector('#slide-dots')!;
  dots.innerHTML = slides.map((slide, i) => `<button class="slide-dot" data-slide="${i}" aria-label="第 ${i + 1} 页：${esc(titleFor(slide, i))}" title="${esc(titleFor(slide, i))}"></button>`).join('');
  document.querySelector('#slide-total')!.textContent = String(slides.length).padStart(2, '0');
  const update = () => {
    const index = Math.max(0, slides.indexOf(deck.getCurrentSlide()));
    if (!slides[index]) return;
    document.querySelector('#slide-current')!.textContent = String(index + 1).padStart(2, '0');
    document.querySelector('#slide-title')!.textContent = titleFor(slides[index], index);
    dots.querySelectorAll('button').forEach((button, i) => { button.classList.toggle('active', i === index); button.setAttribute('aria-current', i === index ? 'step' : 'false'); });
    (document.querySelector('[data-action="prev"]') as HTMLButtonElement).disabled = index === 0 && !deck.availableFragments().prev;
    (document.querySelector('[data-action="next"]') as HTMLButtonElement).disabled = deck.isLastSlide() && !deck.availableFragments().next;
  };
  deck.on('slidechanged', update);
  deck.on('fragmentshown', update);
  deck.on('fragmenthidden', update);
  update();

  const select = document.querySelector<HTMLSelectElement>('#theme-select')!;
  select.value = theme;
  select.addEventListener('change', () => setTheme(select.value));
  function setTheme(value: string) {
    if (!isTheme(value)) return;
    document.documentElement.dataset.theme = value;
    select.value = value;
    rememberTheme(current!.id, value);
    document.querySelectorAll('.slides .orbital-art').forEach(el => { el.innerHTML = themeArt(value); });
    themePicker.refresh();
    void document.fonts.ready.then(() => deck.layout());
    const url = new URL(location.href);
    url.searchParams.set('theme', value);
    history.replaceState(null, '', url);
    const printLink = document.querySelector<HTMLAnchorElement>('[data-action="print"]')!;
    const printUrl = new URL(printLink.href);
    printUrl.searchParams.set('theme', value);
    printLink.href = printUrl.href;
    const standaloneLink = document.querySelector<HTMLAnchorElement>('[data-action="standalone"]')!;
    const standaloneUrl = new URL(standaloneLink.href);
    standaloneUrl.searchParams.set('theme', value);
    standaloneLink.href = standaloneUrl.href;
  }
  const themePicker = createThemePicker({
    getTheme: () => select.value as Theme,
    onSelect: setTheme,
    onOpen: () => deck.configure({ keyboard: false }),
    onClose: () => deck.configure({ keyboard: { 70: () => void togglePresentation(), 79: () => deck.toggleOverview() } }),
  });
  const dialog = document.querySelector<HTMLDialogElement>('#panel')!;
  let restoreFocus: HTMLElement | null = null;
  function openPanel(content: string) {
    restoreFocus = document.activeElement as HTMLElement;
    document.querySelector('#panel-content')!.innerHTML = content;
    deck.configure({ keyboard: false });
    dialog.showModal();
  }
  dialog.addEventListener('close', () => { deck.configure({ keyboard: { 70: () => void togglePresentation(), 79: () => deck.toggleOverview() } }); restoreFocus?.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  function help() {
    openPanel(`<h2>把注意力留给内容</h2><p class="panel-description">写 Markdown，浏览器里实时预览。需要更自由的版式时，直接使用 HTML。</p><div class="guide-command"><span>新建演示</span><code>npm run new -- my-talk</code></div><div class="shortcut-grid">${[['← / →', '上一页 / 下一页'], ['Space', '继续 / 展开内容'], ['O / Esc', '幻灯片总览'], ['F', '全屏演示'], ['S', '演讲者视图与备注'], ['T', '选择演示风格'], ['B', '黑屏 / 恢复'], ['?', '打开这份指南']].map(([key, label]) => `<div><kbd>${key}</kbd><span>${label}</span></div>`).join('')}</div><div class="guide-footer"><span>内容入口 <code>decks/${esc(current!.id)}/slides.md</code></span><a href="https://revealjs.com/markdown/" target="_blank" rel="noopener">reveal.js 文档 ${icon('arrow')}</a></div>`);
  }
  function library() {
    openPanel(`<h2>我的演示<span class="heading-count">${decks.length}</span></h2><p class="panel-description">从一份空白开始，或拆解样板里的每一个版式。</p><div class="library-grid">${decks.map((item, i) => `<a class="library-card" href="?deck=${encodeURIComponent(item.id)}"><div class="library-preview ${i % 2 ? 'preview-paper' : ''}"><span>FRAME / ${String(i + 1).padStart(2, '0')}</span><strong>${item.id === 'showcase' ? 'Ideas.<br>In frame.' : esc(item.title)}</strong><span class="preview-orbit"></span></div><div class="library-card-copy"><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><div>${(item.tags || []).map(tag => `<span class="library-tag">${esc(tag)}</span>`).join('')}${icon('arrow')}</div></div></a>`).join('')}</div><div class="guide-command"><span>开启下一份演示</span><code>npm run new -- my-talk</code></div>`);
  }
  function outline() {
    openPanel(`<h2>演示目录</h2><p class="panel-description">${esc(current!.title)} / ${slides.length} 页</p><nav class="outline-list">${slides.map((slide, i) => `<button data-slide="${i}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(titleFor(slide, i))}${icon('arrow')}</button>`).join('')}</nav>`);
  }
  async function togglePresentation() {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.body.classList.contains('presenting')) document.body.classList.remove('presenting');
    else {
      document.body.classList.add('presenting');
      try { await document.documentElement.requestFullscreen(); } catch { toast('已进入专注演示，按 Esc 退出'); }
    }
    deck.layout();
  }
  document.addEventListener('fullscreenchange', () => { document.body.classList.toggle('presenting', !!document.fullscreenElement); deck.layout(); });
  document.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-action], [data-slide]');
    if (!target) return;
    if (target.dataset.slide !== undefined) {
      const indices = deck.getIndices(slides[Number(target.dataset.slide)]);
      deck.slide(indices.h, indices.v);
      if (dialog.open) dialog.close();
      return;
    }
    switch (target.dataset.action) {
      case 'next': deck.next(); break;
      case 'prev': deck.prev(); break;
      case 'overview': deck.toggleOverview(); break;
      case 'library': library(); break;
      case 'help': help(); break;
      case 'themes': themePicker.open(); break;
      case 'outline': outline(); break;
      case 'close': dialog.close(); break;
      case 'fullscreen': void togglePresentation(); break;
      case 'notes': (deck.getPlugin('notes') as unknown as { open: () => void }).open(); break;
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('presenting') && !document.fullscreenElement) {
      document.body.classList.remove('presenting'); deck.layout(); return;
    }
    if (dialog.open || themePicker.isOpen() || event.ctrlKey || event.metaKey || event.altKey || (event.target as HTMLElement).matches('input,textarea,select,[contenteditable]')) return;
    if (event.key === '?') { event.preventDefault(); help(); }
    if (event.key.toLowerCase() === 't') { event.preventDefault(); themePicker.open(); }
  });
  document.querySelector('#print-now')!.addEventListener('click', () => window.print());
  window.__deckReady = true;
}

let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  const el = document.querySelector<HTMLElement>('#toast')!;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 4000);
}

start().catch(error => {
  console.error(error);
  app.innerHTML = `<main class="error-page"><span class="wordmark">FRAME</span><h1>演示加载失败</h1><p>${esc(String(error.message || error))}</p><a href="?deck=showcase">返回组件样板</a></main>`;
});
