# action-studio

action-studio is a React + Vite editor for action-focused SVG composition. It combines JSesh-style glyph workflows with layer controls, transform tools, import/export actions, and selection-based image/SVG processing.

## Core Features

- SVG-first canvas with sharp zoom and per-item transforms
- Glyph library with search and paginated browsing
- Drag-and-drop placement onto rows
- Layer panel with reorder controls (bring to front/back, move up/down)
- Multi-select editing and keyboard shortcuts (undo/redo, zoom)
- Copy presets: Small, Large, WYSIWYG
- Paste support for SVG metadata, external SVG, and plain-text glyph IDs
- Import image files (including SVG, PNG, JPG, WEBP, GIF) as managed glyphs
- Export composition as SVG, PNG, JPG, or WEBP

## Editing Actions

- Geometry: rotate, flip X/Y, scale, skew, matrix values, offset X/Y
- Image/SVG actions: remove background, replace color/background color
- Selection tools: magic wand and pen/lasso region workflows
- Region operations: remove selected region and apply color adjustments to selection
- Tone and detail controls: brightness, contrast, exposure, hue, saturation, vibrance, blur, sharpen, noise

## Architecture Overview

- UI stack: React, TypeScript, Tailwind CSS
- Rendering: inline SVG symbols and grouped transforms for glyph instances
- Clipboard: writes SVG in `text/html` plus glyph IDs in `text/plain`
- Loading: JSesh glyph sources fetched in batches to keep startup manageable
- Image processing: canvas-based pixel operations for selection/mask workflows and raster export

## Run Locally

```bash
npm install
npm run dev
```

## Build and Preview

```bash
npm run build
npm run preview
```

## Quick Verification Checklist

- Collapse/expand sidebars and confirm layout behavior
- Copy Small/Large/WYSIWYG and paste into external apps
- Import an image, run magic wand or pen selection, and apply an action
- Reorder layers and verify visual stacking updates correctly
- Export to SVG, PNG, JPG, and WEBP and verify output files
