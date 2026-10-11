import { themePresets } from './themes';
import type { Theme } from './themes';
import { themeArt } from './theme-art';
import './theme-picker.css';

interface PickerOptions {
  getTheme: () => Theme;
  onSelect: (theme: Theme) => void;
  onOpen: () => void;
  onClose: () => void;
}

/** Shared by the workspace and the file:// presentation, with no network assets. */
export function createThemePicker(options: PickerOptions) {
  const dialog = document.createElement('dialog');
  dialog.id = 'theme-picker';
  dialog.className = 'theme-picker';
  dialog.setAttribute('aria-labelledby', 'theme-picker-title');
  dialog.innerHTML = `<div class="theme-picker-header"><div><span class="dialog-kicker">PRESENTATION STYLES</span><h2 id="theme-picker-title">给这次分享，选一种风格</h2><p>内容保持原样，字体、配色与封面一起换。</p></div><button class="theme-picker-close icon-button" aria-label="关闭风格选择">×</button></div>
    <div class="theme-filters" role="group" aria-label="筛选风格"><button data-theme-filter="all" aria-pressed="true">全部 <span>${themePresets.length}</span></button><button data-theme-filter="light" aria-pressed="false">浅色</button><button data-theme-filter="dark" aria-pressed="false">深色</button></div>
    <div class="theme-grid">${themePresets.map(preset => `<button class="theme-card" data-theme-choice="${preset.id}" data-theme-group="${preset.group}" aria-pressed="false" style="--preview-bg:${preset.colors[0]};--preview-fg:${preset.colors[1]};--preview-accent:${preset.colors[2]}">
      <span class="theme-thumbnail theme-preview-${preset.id}"><span class="theme-thumbnail-label">A FEW GOOD IDEAS</span><span class="theme-thumbnail-title">把想法，<br><em>慢慢讲清楚。</em></span><span class="theme-thumbnail-rule"></span><span class="theme-thumbnail-art">${themeArt(preset.id)}</span></span>
      <span class="theme-card-body"><span class="theme-card-heading"><strong>${preset.name}</strong><span>${preset.english}</span><span class="theme-selected-mark" aria-hidden="true">✓</span></span><span class="theme-description">${preset.description}</span><span class="theme-swatches" aria-hidden="true">${preset.colors.map(color => `<i style="background:${color}"></i>`).join('')}</span></span></button>`).join('')}</div>
    <div class="theme-picker-footer"><span>点击即应用 · 记住这份演示的选择</span><button class="theme-picker-done">完成</button></div>`;
  document.body.append(dialog);
  let previousFocus: HTMLElement | null = null;
  const refresh = () => {
    const current = options.getTheme();
    dialog.querySelectorAll<HTMLButtonElement>('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === current));
    });
  };
  const close = () => dialog.close();
  dialog.querySelector('.theme-picker-close')!.addEventListener('click', close);
  dialog.querySelector('.theme-picker-done')!.addEventListener('click', close);
  dialog.addEventListener('close', () => { options.onClose(); previousFocus?.focus(); });
  dialog.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-theme-choice],[data-theme-filter]');
    if (target?.dataset.themeChoice) {
      options.onSelect(target.dataset.themeChoice as Theme);
      refresh();
    } else if (target?.dataset.themeFilter) {
      const filter = target.dataset.themeFilter;
      dialog.querySelectorAll<HTMLElement>('[data-theme-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeFilter === filter)));
      dialog.querySelectorAll<HTMLElement>('[data-theme-choice]').forEach(card => { card.hidden = filter !== 'all' && card.dataset.themeGroup !== filter; });
    } else if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }
  });
  return {
    open() {
      if (dialog.open) return;
      previousFocus = document.activeElement as HTMLElement;
      refresh();
      options.onOpen();
      dialog.showModal();
    },
    isOpen: () => dialog.open,
    refresh,
  };
}
