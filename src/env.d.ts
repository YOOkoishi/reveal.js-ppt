/// <reference types="vite/client" />

declare module 'virtual:frame-deck' {
  const deckData: {
    id: string;
    meta: { title: string; description: string; author: string; date: string; theme: import('./themes').Theme };
    markdown: string;
  };
  export default deckData;
}

interface Window {
  Reveal: import('reveal.js').Api;
  __deckReady: boolean;
}
