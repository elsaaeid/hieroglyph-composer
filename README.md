# JSesh-Style SVG Editor MVP

This is a frontend-only SVG editor MVP that mirrors JSesh copy/paste behavior while staying SVG-first. The editor composes glyphs as inline SVG, supports per-glyph transforms, and writes real SVG payloads to the clipboard.

## Features

- SVG-first composition: no canvas, no raster export, crisp at any zoom
- Glyph library picker with search (subset of JSesh glyph IDs)
- Horizontal flow with fixed quadrat sizing and adjustable wrap
- Select single or multiple glyphs (shift/ctrl click)
- Transform controls: rotate 90, flip horizontal/vertical, uniform scale
- Copy presets: Small, Large, WYSIWYG (writes SVG to `text/html`, ids to `text/plain`)
- Paste: reads SVG and reconstructs glyphs if metadata is present; otherwise imports SVG as a new glyph; accepts plain-text IDs
- Extra: Copy sample inline SVG to verify vector paste into Word/Google Docs
- UI built with Tailwind CSS utilities

## Architecture

### SVG Composition

- Each glyph has a base `viewBox` (default 1800 x 1800 quadrat) and body markup.
- The editor renders an inline `<svg>` with `<symbol>` definitions for glyphs.
- Each glyph instance is a `<g>` with a transform chain:
  1. translate to cell
  2. translate to quadrat center
  3. rotate
  4. flip and scale
  5. fit glyph viewBox into quadrat

This keeps all manipulation inside SVG transforms rather than CSS pixel scaling.

### Glyph Loading

- The app fetches the JSesh glyph directory via the GitHub API and then loads SVGs in batches.
- This keeps glyphs vector-native while avoiding a large committed asset set.

### Clipboard Implementation

- Copy writes:
  - `text/html`: inline `<svg>` with defs + `data-*` metadata per glyph
  - `text/plain`: glyph IDs (e.g. `A1 D36 G17`)
- Paste behavior:
  - If SVG contains `data-glyph-id`, rebuild instances with stored transform data
  - If SVG contains no metadata, import it as a new glyph (preserving its viewBox)
  - If only plain text exists, parse glyph IDs and insert known glyphs

### Transform Storage

Each glyph instance stores:

- `rotate` (degrees, per glyph/graph)
- `flipX`, `flipY` (booleans)
- `scale` (uniform)

Transforms are applied in the SVG `transform` attribute and included in clipboard metadata.

## Tradeoffs

- Loading the full JSesh set can be slow and may hit GitHub API rate limits.
- Imported SVGs are treated as a single glyph and scaled to fit the quadrat.
- Multi-row layout is a simple fixed wrap width for scope control.

## Run Locally

```bash
npm install
npm run dev
```

## Tailwind Notes

- Tailwind CSS is used for all UI styling.
- If you prefer a smaller glyph subset for MVP performance, replace the GitHub API fetch with a fixed list.

## Testing Checklist

- Copy Small / Large / WYSIWYG and paste into Word or Google Docs
- Paste SVG copied from a browser (or the Sample Inline SVG button)
- Ensure zoom retains sharp vector edges
