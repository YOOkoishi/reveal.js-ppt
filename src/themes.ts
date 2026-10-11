import catalog from './themes.json';

export type Theme = 'ivory' | 'editorial' | 'mist' | 'sage' | 'rose' | 'material' | 'paper' | 'noir' | 'ember';
export interface ThemePreset {
  id: Theme;
  name: string;
  english: string;
  description: string;
  group: string;
  colors: string[];
}
export const themePresets = catalog as ThemePreset[];
export const themes: Theme[] = themePresets.map(preset => preset.id);
export const defaultTheme: Theme = 'ivory';

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && themes.includes(value as Theme);
}

/** Query override, then per-deck preference. Print/export always uses its explicit default. */
export function initialTheme(deckId: string, fallback: Theme, printing = false): Theme {
  const query = new URLSearchParams(location.search).get('theme');
  if (isTheme(query)) return query;
  if (!printing) {
    try {
      const saved = localStorage.getItem(`frame-theme:${deckId}`);
      if (isTheme(saved)) return saved;
    } catch { /* file:// and restricted browsers may disable storage. */ }
  }
  return isTheme(fallback) ? fallback : defaultTheme;
}

export function rememberTheme(deckId: string, theme: Theme) {
  try { localStorage.setItem(`frame-theme:${deckId}`, theme); } catch { /* Optional preference. */ }
}

export function themeOptions(selected?: Theme): string {
  return themePresets.map(preset => `<option value="${preset.id}"${preset.id === selected ? ' selected' : ''}>${preset.english} · ${preset.name}</option>`).join('');
}
