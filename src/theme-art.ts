import { orbitalArt } from './art';

type Palette = { accent: string; paper: string; fill: string; line: string; secondary: string };

// Each SVG carries its own palette so a picker can display different presets side by side.
// Flat fills and paths need no image files, fonts, gradients, or document-wide IDs.
function svg(theme: string, palette: Palette, content: string): string {
  return `<svg class="theme-art theme-art-${theme}" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="--art-accent:${palette.accent};--art-paper:${palette.paper};--art-fill:${palette.fill};--art-line:${palette.line};--art-secondary:${palette.secondary}">${content}</svg>`;
}

const artwork: Record<string, () => string> = {
  ivory: () => svg('ivory', {
    accent: '#956044', paper: '#f7f2e8', fill: '#e8ddcb', line: '#c8b89f', secondary: '#c4a68c',
  }, `
    <ellipse cx="305" cy="483" rx="205" ry="28" fill="var(--art-fill)" opacity=".42"/>
    <g transform="rotate(-11 304 290)">
      <rect x="125" y="102" width="316" height="398" rx="14" fill="var(--art-fill)"/>
      <rect x="141" y="92" width="316" height="398" rx="14" fill="var(--art-paper)" stroke="var(--art-line)" stroke-width="1.4"/>
      <path d="M161 130H430M161 452H430" stroke="var(--art-line)"/>
    </g>
    <g transform="rotate(9 314 284)">
      <rect x="153" y="78" width="302" height="386" rx="12" fill="var(--art-paper)" stroke="var(--art-line)" stroke-width="1.5"/>
      <rect x="177" y="103" width="254" height="336" rx="4" stroke="var(--art-line)"/>
      <path d="M212 365V221C212 166 242 142 280 142H327C365 142 394 166 394 221V365" fill="var(--art-fill)"/>
      <path d="M240 365V227C240 182 259 166 284 166H324C349 166 367 182 367 227V365" stroke="var(--art-accent)" stroke-width="1.6"/>
      <circle cx="304" cy="252" r="49" fill="var(--art-secondary)" opacity=".54"/>
      <path d="M213 390H330M213 403H290" stroke="var(--art-line)" stroke-width="2"/>
    </g>
    <path d="M107 187H80M94 174V201" stroke="var(--art-secondary)" stroke-width="1.4"/>
  `),
  editorial: () => svg('editorial', {
    accent: '#57564c', paper: '#faf7f0', fill: '#e8e3d6', line: '#aaa798', secondary: '#c9c2b0',
  }, `
    <path d="M91 462H509M111 479H489" stroke="var(--art-line)" stroke-width="1.2"/>
    <path d="M139 151L300 98L461 151V408L300 457L139 408V151Z" fill="var(--art-fill)" opacity=".42"/>
    <path d="M113 165L281 124C288 122 295 123 300 128C305 123 312 122 319 124L487 165V439L319 397C312 395 305 397 300 402C295 397 288 395 281 397L113 439V165Z" fill="var(--art-paper)" stroke="var(--art-accent)" stroke-width="1.6"/>
    <path d="M300 128V402M130 184L283 146V377L130 415V184ZM317 146L470 184V415L317 377V146Z" stroke="var(--art-line)" stroke-width="1.1"/>
    <path d="M153 213L259 187M153 230L259 204M153 247L237 226M153 286L259 260M153 303L259 277M153 320L233 300M153 358L259 332" stroke="var(--art-line)" stroke-width="1.3"/>
    <path d="M341 324V231C341 191 447 214 447 256V350L341 324Z" fill="var(--art-fill)"/>
    <path d="M360 327V241C360 214 429 230 429 260V344M341 356L447 383" stroke="var(--art-accent)" stroke-width="1.2"/>
    <path d="M139 111V89H170M430 89H461V111M78 165H96M504 165H522" stroke="var(--art-line)"/>
  `),
  mist: () => svg('mist', {
    accent: '#3e689a', paper: '#f4f7fb', fill: '#dce8f3', line: '#a9bfd7', secondary: '#7597bd',
  }, `
    <path d="M120 100V500M200 100V500M280 100V500M360 100V500M440 100V500M80 140H500M80 220H500M80 300H500M80 380H500M80 460H500" stroke="var(--art-line)" stroke-width=".8" opacity=".32"/>
    <rect x="141" y="121" width="320" height="338" rx="4" fill="var(--art-paper)" stroke="var(--art-line)" stroke-width="1.2"/>
    <path d="M141 161H461M161 141H198M216 141H228" stroke="var(--art-line)" stroke-width="1.2"/>
    <circle cx="301" cy="304" r="112" fill="var(--art-fill)"/>
    <circle cx="301" cy="304" r="80" stroke="var(--art-accent)" stroke-width="1.8"/>
    <circle cx="301" cy="304" r="44" stroke="var(--art-secondary)" stroke-width="1.4"/>
    <path d="M189 304H413M301 192V416" stroke="var(--art-line)" stroke-width="1.1"/>
    <path d="M218 377L355 240L398 275" stroke="var(--art-accent)" stroke-width="2"/>
    <circle cx="355" cy="240" r="6" fill="var(--art-accent)"/>
    <circle cx="218" cy="377" r="4" fill="var(--art-paper)" stroke="var(--art-accent)" stroke-width="1.6"/>
    <path d="M112 121H96V137M461 488H477V472" stroke="var(--art-accent)" stroke-width="1.3"/>
    <rect x="393" y="413" width="48" height="25" rx="2" fill="var(--art-fill)"/>
  `),
  sage: () => svg('sage', {
    accent: '#576f4b', paper: '#f2f4eb', fill: '#dfe7d3', line: '#b8c6a8', secondary: '#96ab83',
  }, `
    <path d="M110 356C77 237 179 117 316 109C451 101 521 228 482 353C445 471 316 510 204 463C163 446 125 407 110 356Z" fill="var(--art-fill)" opacity=".75"/>
    <path d="M296 453C304 387 302 323 324 262C342 212 369 174 405 142" stroke="var(--art-accent)" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M314 349C241 353 183 310 172 249C243 245 304 278 314 349Z" fill="var(--art-secondary)" opacity=".72"/>
    <path d="M325 288C330 218 366 174 426 169C428 231 391 283 325 288Z" fill="var(--art-accent)" opacity=".27"/>
    <path d="M302 414C238 406 207 370 205 324C262 328 300 363 302 414Z" fill="var(--art-accent)" opacity=".38"/>
    <path d="M309 368C367 350 415 363 447 405C393 434 338 416 309 368Z" fill="var(--art-secondary)" opacity=".6"/>
    <path d="M188 262C238 281 282 311 313 349M336 275C363 245 390 209 415 183M215 335C251 359 280 385 301 412M321 373C361 383 395 393 435 403" stroke="var(--art-paper)" stroke-width="1.3"/>
    <path d="M141 393C175 443 229 470 286 477M452 166C472 188 485 217 489 242" stroke="var(--art-line)" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="167" cy="168" r="7" fill="var(--art-secondary)" opacity=".6"/>
  `),
  rose: () => svg('rose', {
    accent: '#9a5868', paper: '#fcf4f2', fill: '#ecd5d9', line: '#c9a4ae', secondary: '#cfa6ae',
  }, `
    <circle cx="286" cy="294" r="203" fill="var(--art-fill)" opacity=".32"/>
    <g transform="rotate(-13 250 293)">
      <rect x="122" y="145" width="248" height="306" rx="112" fill="var(--art-fill)"/>
      <rect x="143" y="164" width="206" height="269" rx="94" stroke="var(--art-line)" stroke-width="1.3"/>
    </g>
    <g transform="rotate(15 369 300)">
      <rect x="254" y="137" width="217" height="313" rx="105" fill="var(--art-paper)" stroke="var(--art-line)" stroke-width="1.4"/>
      <rect x="276" y="159" width="173" height="269" rx="84" fill="var(--art-secondary)" opacity=".47"/>
      <path d="M293 343V247C293 213 319 187 353 187H369C403 187 429 213 429 247V343" stroke="var(--art-accent)" stroke-width="1.5"/>
    </g>
    <circle cx="246" cy="350" r="61" fill="var(--art-accent)" opacity=".42"/>
    <path d="M139 487H447" stroke="var(--art-line)" stroke-width="1.1"/>
    <circle cx="446" cy="101" r="9" fill="var(--art-secondary)" opacity=".6"/>
  `),
  material: () => svg('material', {
    accent: '#6950a1', paper: '#f8f5ff', fill: '#e4d9f5', line: '#b5a4d0', secondary: '#b6a0d6',
  }, `
    <rect x="101" y="120" width="378" height="378" rx="68" fill="var(--art-fill)" opacity=".62"/>
    <rect x="128" y="100" width="346" height="346" rx="58" fill="var(--art-paper)" stroke="var(--art-line)" stroke-width="1.2"/>
    <path d="M175 257C175 208 214 169 263 169H304V257C304 306 265 345 216 345H175V257Z" fill="var(--art-secondary)"/>
    <path d="M311 178H356C399 178 434 213 434 256V301H389C346 301 311 266 311 223V178Z" fill="var(--art-fill)"/>
    <rect x="297" y="315" width="137" height="77" rx="38.5" fill="var(--art-accent)" opacity=".8"/>
    <circle cx="366" cy="244" r="29" fill="var(--art-paper)"/>
    <circle cx="215" cy="389" r="23" fill="var(--art-fill)"/>
    <path d="M202 250H273M237 215V285" stroke="var(--art-paper)" stroke-width="2" stroke-linecap="round"/>
    <path d="M340 354H387M378 345L387 354L378 363" stroke="var(--art-paper)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  `),
};

export function themeArt(theme: string): string {
  return artwork[theme]?.() ?? orbitalArt();
}
