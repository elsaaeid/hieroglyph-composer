import type { CopyPreset } from './types'

export const QUADRAT = 1800

export const JSESH_GLYPH_API_URL =
  'https://api.github.com/repos/rosmord/jsesh/contents/jseshGlyphs/src/main/resources/jseshGlyphs?per_page=100'

export const SAMPLE_EXTERNAL_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200" width="320" height="200">
  <defs>
    <linearGradient id="river" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d3b2f" />
      <stop offset="100%" stop-color="#d4a04a" />
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="304" height="184" rx="18" fill="#f2efe7" stroke="#1d3b2f" stroke-width="6" />
  <path d="M26 130 C70 90 140 160 190 120 C230 90 270 120 294 100" fill="none" stroke="url(#river)" stroke-width="12" />
  <circle cx="88" cy="78" r="22" fill="#d4a04a" stroke="#1d3b2f" stroke-width="6" />
  <path d="M140 70 L170 40 L200 70" fill="none" stroke="#1d3b2f" stroke-width="10" />
</svg>
`.trim()

export const PRESET_SCALES: Record<CopyPreset, number> = {
  small: 0.78,
  large: 1.15,
  wysiwyg: 1,
}
