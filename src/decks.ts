import { themes } from './themes';
import type { Theme } from './themes';
export { themes, isTheme } from './themes';
export type { Theme } from './themes';
export interface DeckMeta {
  title: string;
  description: string;
  author: string;
  date: string;
  theme: Theme;
  tags: string[];
}
export interface DeckEntry extends DeckMeta { id: string; load: () => Promise<string> }

const metadata = import.meta.glob<DeckMeta>('../decks/*/deck.json', { eager: true, import: 'default' });
const sources = import.meta.glob<string>('../decks/*/slides.md', { query: '?raw', import: 'default' });

// Validate inside start() so configuration errors reach the visible error page.
export function getDecks(): DeckEntry[] {
  return Object.entries(metadata).map(([path, meta]) => {
    const id = path.split('/')[2];
    const load = sources[`../decks/${id}/slides.md`];
    if (!load || !meta || typeof meta.title !== 'string' || !meta.title.trim() ||
        !themes.includes(meta.theme) || typeof meta.description !== 'string' ||
        typeof meta.author !== 'string' || typeof meta.date !== 'string' ||
        !Array.isArray(meta.tags) || !meta.tags.every(tag => typeof tag === 'string')) {
      throw new Error(`decks/${id}/deck.json 配置不完整，或缺少 slides.md。请按 README 检查 title、description、author、date、theme 和 tags。`);
    }
    return { ...meta, id, load };
  }).sort((a, b) => a.id === 'showcase' ? -1 : b.id === 'showcase' ? 1 : a.id.localeCompare(b.id));
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
