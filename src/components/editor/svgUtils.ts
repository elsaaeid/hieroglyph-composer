import type { GlyphDef, GlyphInstance, GlyphSource, LayoutItem } from './types'
import { QUADRAT } from './glyphData'

function ensureImageHrefCompatibility(markup: string): string {
  return markup.replace(/<image\b([^>]*)>/gi, (full, attrs: string) => {
    const hasHref = /\shref\s*=\s*"[^"]*"/i.test(attrs)
    const hasXlinkHref = /\sxlink:href\s*=\s*"[^"]*"/i.test(attrs)
    if (!hasHref || hasXlinkHref) return full
    const hrefMatch = attrs.match(/\shref\s*=\s*"([^"]*)"/i)
    if (!hrefMatch) return full
    const hrefValue = hrefMatch[1]
    return `<image${attrs} xlink:href="${hrefValue}">`
  })
}

export function layoutRows(rows: GlyphInstance[][], cellStep: number): LayoutItem[] {
  const items: LayoutItem[] = []
  rows.forEach((rowItems, rowIndex) => {
    rowItems.forEach((instance, colIndex) => {
      items.push({
        instance,
        row: rowIndex,
        col: colIndex,
        x: colIndex * cellStep,
        y: rowIndex * cellStep,
      })
    })
  })
  return items
}

export type SelectionCenter = {
  centerX: number
  centerY: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function calculateSelectionCenter(
  selectedItems: LayoutItem[],
  glyphMap: Map<string, GlyphDef>,
  cellStep: number
): SelectionCenter | null {
  if (selectedItems.length === 0) return null

  const offsetScale = cellStep / QUADRAT
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const item of selectedItems) {
    const glyph = glyphMap.get(item.instance.glyphId)
    if (!glyph) continue

    const fitScale = QUADRAT / Math.max(glyph.width, glyph.height)
    const offsetX = (item.instance.offsetX ?? 0) * offsetScale
    const offsetY = (item.instance.offsetY ?? 0) * offsetScale
    const scaleX = item.instance.scaleX ?? item.instance.scale
    const scaleY = item.instance.scaleY ?? item.instance.scale

    const glyphWidth = glyph.width * fitScale * scaleX
    const glyphHeight = glyph.height * fitScale * scaleY

    const centerX = item.x + cellStep / 2 + offsetX
    const centerY = item.y + cellStep / 2 + offsetY

    const left = centerX - glyphWidth / 2
    const right = centerX + glyphWidth / 2
    const top = centerY - glyphHeight / 2
    const bottom = centerY + glyphHeight / 2

    minX = Math.min(minX, left)
    maxX = Math.max(maxX, right)
    minY = Math.min(minY, top)
    maxY = Math.max(maxY, bottom)
  }

  const width = maxX - minX
  const height = maxY - minY
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2

  return { centerX, centerY, minX, minY, maxX, maxY, width, height }
}

export function buildTransform(item: LayoutItem, glyph: GlyphDef, cellStep: number): string {
  // SVG glyph internal center point
  const svgCenterX = glyph.viewBoxMinX + glyph.width / 2
  const svgCenterY = glyph.viewBoxMinY + glyph.height / 2

  // Scaling factor to fit glyph into the standard cell size, clamped to avoid extreme scaling
  let fitScale = QUADRAT / Math.max(glyph.width, glyph.height)
  // Clamp fitScale to a visually reasonable range (e.g., 0.1 to 2)
  if (!Number.isFinite(fitScale) || fitScale < 0.1) fitScale = 0.1;
  if (fitScale > 2) fitScale = 2;

  // User-applied transforms
  const flipX = item.instance.flipX ? -1 : 1
  const flipY = item.instance.flipY ? -1 : 1
  const userScaleX = item.instance.scaleX ?? item.instance.scale
  const userScaleY = item.instance.scaleY ?? item.instance.scale
  const skewX = item.instance.skewX ?? 0
  const skewY = item.instance.skewY ?? 0
  const matrixA = item.instance.matrixA ?? 1
  const matrixB = item.instance.matrixB ?? 0
  const matrixC = item.instance.matrixC ?? 0
  const matrixD = item.instance.matrixD ?? 1
  const matrixE = item.instance.matrixE ?? 0
  const matrixF = item.instance.matrixF ?? 0

  // Convert offset from grid units to canvas units
  const offsetScale = cellStep / QUADRAT
  const offsetX = (item.instance.offsetX ?? 0) * offsetScale
  const offsetY = (item.instance.offsetY ?? 0) * offsetScale

  // Try to use transform border center if available
  let borderCenterX: number | null = null
  let borderCenterY: number | null = null
  if (item.instance.selectionCenter && typeof item.instance.selectionCenter.centerX === 'number' && typeof item.instance.selectionCenter.centerY === 'number') {
    borderCenterX = item.instance.selectionCenter.centerX
    borderCenterY = item.instance.selectionCenter.centerY
  }
  // Fallback to cell center
  const cellCenterX = item.x + cellStep / 2
  const cellCenterY = item.y + cellStep / 2
  const pivotX = borderCenterX ?? cellCenterX
  const pivotY = borderCenterY ?? cellCenterY

  // Transform sequence (applied right-to-left mathematically):
  // 1. Translate SVG content center to origin
  // 2. Scale to fit cell size
  // 3. Apply user scale and flip
  // 4. Translate to pivot position (transform border center or cell center)
  // 5. Rotate around the pivot
  // 6. Apply offset as final canvas translation (unaffected by rotation/scale)
  return [
    `translate(${offsetX} ${offsetY})`,
    `translate(${pivotX} ${pivotY})`,
    `matrix(${matrixA} ${matrixB} ${matrixC} ${matrixD} ${matrixE} ${matrixF})`,
    `skewY(${skewY})`,
    `skewX(${skewX})`,
    `rotate(${item.instance.rotate})`,
    `scale(${flipX * userScaleX} ${flipY * userScaleY})`,
    `scale(${fitScale} ${fitScale})`,
    `translate(${-svgCenterX} ${-svgCenterY})`,
  ].join(' ')
}

export function buildExportSvg(
  rows: GlyphInstance[][],
  glyphMap: Map<string, GlyphDef>,
  cellStep: number,
  exportScale: number,
  selectedIds?: string[]
): string {
  const layout = layoutRows(rows, cellStep).filter((item) =>
    selectedIds && selectedIds.length > 0 ? selectedIds.includes(item.instance.id) : true
  )
  if (layout.length === 0) {
    return ''
  }

  const layoutByLayer = layout
    .map((item, index) => ({
      item,
      index,
      z: item.instance.zIndex ?? index,
    }))
    .sort((a, b) => a.z - b.z || a.index - b.index)
    .map((entry) => entry.item)

  const minX = Math.min(...layoutByLayer.map((item) => item.x))
  const minY = Math.min(...layoutByLayer.map((item) => item.y))
  const maxX = Math.max(...layoutByLayer.map((item) => item.x + cellStep))
  const maxY = Math.max(...layoutByLayer.map((item) => item.y + cellStep))
  const exportPadding = cellStep * 0.5
  const width = Math.max(cellStep, maxX - minX + exportPadding * 2)
  const height = Math.max(cellStep, maxY - minY + exportPadding * 2)

  const filterDefs = layoutByLayer
    .map((item) => {
      const glyph = glyphMap.get(item.instance.glyphId)
      if (!glyph || glyph.source !== 'imported') return ''
      const brightness = item.instance.brightness ?? 1
      const contrast = item.instance.contrast ?? 1
      const exposure = item.instance.exposure ?? 0
      const hue = item.instance.hue ?? 0
      const saturation = item.instance.saturation ?? 1
      const vibrance = item.instance.vibrance ?? 0
      const blur = item.instance.blur ?? 0
      const sharpen = item.instance.sharpen ?? 0
      const noise = item.instance.noise ?? 0
      const hasEffect =
        Math.abs(brightness - 1) > 0.001 ||
        Math.abs(contrast - 1) > 0.001 ||
        Math.abs(exposure) > 0.001 ||
        Math.abs(hue) > 0.001 ||
        Math.abs(saturation - 1) > 0.001 ||
        Math.abs(vibrance) > 0.001 ||
        blur > 0.001 ||
        sharpen > 0.001 ||
        noise > 0.001
      if (!hasEffect) return ''

      const saturationMix = Math.max(0, saturation + vibrance * 0.5)
      const exposureFactor = Math.pow(2, exposure)
      const slope = brightness * contrast * exposureFactor
      const intercept = 0.5 * (1 - contrast)
      const filterId = `img-filter-${item.instance.id}`
      return `
        <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
          <feColorMatrix in="SourceGraphic" type="hueRotate" values="${hue}" result="hue" />
          <feColorMatrix in="hue" type="saturate" values="${saturationMix}" result="sat" />
          <feComponentTransfer in="sat" result="tone">
            <feFuncR type="linear" slope="${slope}" intercept="${intercept}" />
            <feFuncG type="linear" slope="${slope}" intercept="${intercept}" />
            <feFuncB type="linear" slope="${slope}" intercept="${intercept}" />
          </feComponentTransfer>
          <feGaussianBlur in="tone" stdDeviation="${blur}" result="blurred" />
          <feConvolveMatrix in="blurred" order="3" kernelMatrix="0 -1 0 -1 5 -1 0 -1 0" divisor="1" bias="0" result="sharp" />
          <feComposite in="sharp" in2="blurred" operator="arithmetic" k1="0" k2="${1 + sharpen}" k3="${-sharpen}" k4="0" result="enhanced" />
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="noiseRaw" />
          <feColorMatrix in="noiseRaw" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${noise} 0" result="noiseAlpha" />
          <feBlend in="enhanced" in2="noiseAlpha" mode="overlay" />
        </filter>
      `.trim()
    })
    .filter(Boolean)
    .join('')

  let customViewBox = null;
  let singleLetterGlyph = null;
  let customWidth = width;
  let customHeight = height;
  if (layoutByLayer.length === 1) {
    const glyph = glyphMap.get(layoutByLayer[0].instance.glyphId);
    if (glyph && /^[a-zA-Z]/.test(String(glyph.id))) {
      singleLetterGlyph = glyph;
      // Match artboard: export at cellStep x cellStep, scale and center glyph
      customWidth = cellStep;
      customHeight = cellStep;
      customViewBox = `0 0 ${cellStep} ${cellStep}`;
    }
  }

  const body = layoutByLayer
    .map((item) => {
      const glyph = glyphMap.get(item.instance.glyphId)
      if (!glyph) return ''
      let normalizedBody = ensureImageHrefCompatibility(glyph.body);
      // For single letter-ID glyph, scale and center to fit cellStep (like artboard)
      if (singleLetterGlyph && glyph.id === singleLetterGlyph.id) {
        // Compute fitScale and center
        const fitScale = cellStep / Math.max(glyph.width, glyph.height);
        const centerX = cellStep / 2;
        const centerY = cellStep / 2;
        const svgCenterX = glyph.viewBoxMinX + glyph.width / 2;
        const svgCenterY = glyph.viewBoxMinY + glyph.height / 2;
        return `
          <g transform="translate(${centerX},${centerY}) scale(${fitScale}) translate(${-svgCenterX},${-svgCenterY})">
            ${normalizedBody}
          </g>
        `.trim();
      }
      const exportItem: LayoutItem = {
        ...item,
        x: item.x - minX + exportPadding,
        y: item.y - minY + exportPadding,
      }
      let transform: string = buildTransform(exportItem, glyph, cellStep);
      const filterId = `img-filter-${item.instance.id}`
      const hasFilter = filterDefs.includes(`id="${filterId}"`)
      return `
        <g
          transform="${transform}"
          ${hasFilter ? `filter=\"url(#${filterId})\"` : ''}
        >
          ${normalizedBody}
        </g>
      `.trim()
    })
    .join('')

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      viewBox="${customViewBox ? customViewBox : `0 0 ${width} ${height}`}"
      width="${customWidth * exportScale}"
      height="${customHeight * exportScale}"
    >
      ${filterDefs ? `<defs>${filterDefs}</defs>` : ''}
      ${body}
    </svg>
  `.trim()
}

export async function writeClipboard(
  svgMarkup: string,
  plainText: string
): Promise<'html' | 'text'> {
  const canWriteRich =
    typeof ClipboardItem !== 'undefined' &&
    Boolean(navigator.clipboard?.write) &&
    Boolean(window.isSecureContext)

  const svgDataUri = svgMarkup
    ? `data:image/svg+xml;base64,${toBase64(svgMarkup)}`
    : ''

  if (canWriteRich) {
    const htmlPayload = `<!doctype html><html><body>${
      svgDataUri ? `<img src="${svgDataUri}" alt="" />` : ''
    }</body></html>`
    const htmlBlob = new Blob([htmlPayload], { type: 'text/html' })
    const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml' })
    const textBlob = new Blob([plainText], { type: 'text/plain' })
    const item = new ClipboardItem({
      'text/html': htmlBlob,
      'image/svg+xml': svgBlob,
      'text/plain': textBlob,
    })
    await navigator.clipboard.write([item])
    return 'html'
  }

  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API unavailable')
  }

  const fallbackText = svgMarkup || plainText
  await navigator.clipboard.writeText(fallbackText)
  return 'text'
}

function toBase64(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
}

export async function readClipboard(): Promise<{ html?: string; text?: string }> {
  if (!navigator.clipboard?.read) {
    const text = await navigator.clipboard.readText()
    return { text }
  }

  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      const htmlType = item.types.find((type) => type === 'text/html')
      const textType = item.types.find((type) => type === 'text/plain')
      const html = htmlType ? await blobToText(await item.getType(htmlType)) : undefined
      const text = textType ? await blobToText(await item.getType(textType)) : undefined
      return { html, text }
    }
    return {}
  } catch (error) {
    const text = await navigator.clipboard.readText()
    return { text }
  }
}

export async function fetchGlyphDefinitions(sources: GlyphSource[]): Promise<GlyphDef[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      const response = await fetch(source.url)
      if (!response.ok) {
        throw new Error(`Failed to load ${source.id}`)
      }
      const markup = await response.text()
      return parseGlyphFromSvg(markup, source)
    })
  )
  return results
}

export async function fetchGlyphDefinitionsFromApi(
  apiUrl: string,
  options?: {
    batchSize?: number
    onProgress?: (loaded: number, total: number) => void
  }
): Promise<GlyphDef[]> {
  const sources = await fetchGlyphSourcesFromApi(apiUrl)
  const batchSize = options?.batchSize ?? 24
  const results: GlyphDef[] = []

  for (let index = 0; index < sources.length; index += batchSize) {
    const batch = sources.slice(index, index + batchSize)
    const batchResults = await fetchGlyphDefinitions(batch)
    results.push(...batchResults)
    if (options?.onProgress) {
      options.onProgress(results.length, sources.length)
    }
  }

  return results
}

export function parseSvgFromHtml(
  html: string
): { glyphs: GlyphInstance[]; importedGlyph?: GlyphDef } | null {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const svg = doc.querySelector('svg')
  if (!svg) return null

  const groups = Array.from(svg.querySelectorAll('g[data-glyph-id]'))
  if (groups.length > 0) {
    const glyphs = groups
      .map((group) => {
        const glyphId = group.getAttribute('data-glyph-id') ?? ''
        if (!glyphId) return null
        return {
          id: `instance-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          glyphId,
          zIndex: Number(group.getAttribute('data-z-index') ?? 0),
          rotate: Number(group.getAttribute('data-rotate') ?? 0),
          flipX: group.getAttribute('data-flip-x') === 'true',
          flipY: group.getAttribute('data-flip-y') === 'true',
          scale: Number(group.getAttribute('data-scale') ?? 1),
          scaleX: Number(group.getAttribute('data-scale-x') ?? 1),
          scaleY: Number(group.getAttribute('data-scale-y') ?? 1),
          skewX: Number(group.getAttribute('data-skew-x') ?? 0),
          skewY: Number(group.getAttribute('data-skew-y') ?? 0),
          matrixA: Number(group.getAttribute('data-matrix-a') ?? 1),
          matrixB: Number(group.getAttribute('data-matrix-b') ?? 0),
          matrixC: Number(group.getAttribute('data-matrix-c') ?? 0),
          matrixD: Number(group.getAttribute('data-matrix-d') ?? 1),
          matrixE: Number(group.getAttribute('data-matrix-e') ?? 0),
          matrixF: Number(group.getAttribute('data-matrix-f') ?? 0),
          brightness: Number(group.getAttribute('data-brightness') ?? 1),
          contrast: Number(group.getAttribute('data-contrast') ?? 1),
          exposure: Number(group.getAttribute('data-exposure') ?? 0),
          hue: Number(group.getAttribute('data-hue') ?? 0),
          saturation: Number(group.getAttribute('data-saturation') ?? 1),
          vibrance: Number(group.getAttribute('data-vibrance') ?? 0),
          blur: Number(group.getAttribute('data-blur') ?? 0),
          sharpen: Number(group.getAttribute('data-sharpen') ?? 0),
          noise: Number(group.getAttribute('data-noise') ?? 0),
          offsetX: Number(group.getAttribute('data-offset-x') ?? 0),
          offsetY: Number(group.getAttribute('data-offset-y') ?? 0),
        }
      })
      .filter(Boolean) as GlyphInstance[]
    return { glyphs }
  }

  const viewBox = svg.getAttribute('viewBox')
  const viewBoxParts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  const minX = viewBoxParts.length === 4 ? viewBoxParts[0] : 0
  const minY = viewBoxParts.length === 4 ? viewBoxParts[1] : 0
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : Number(svg.getAttribute('width') ?? QUADRAT)
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : Number(svg.getAttribute('height') ?? QUADRAT)
  const safeViewBox = normalizeViewBox(viewBox, minX, minY, width, height)
  svg.setAttribute('viewBox', safeViewBox)
  const contentBox = measureSvgContent(svg)
  const importId = `IMPORTED_${Date.now()}`

  const importedGlyph: GlyphDef = {
    id: importId,
    name: 'Imported SVG',
    viewBox: safeViewBox,
    viewBoxMinX: minX,
    viewBoxMinY: minY,
    contentMinX: contentBox?.minX ?? minX,
    contentMinY: contentBox?.minY ?? minY,
    contentWidth: contentBox?.width ?? width,
    contentHeight: contentBox?.height ?? height,
    width: width || QUADRAT,
    height: height || QUADRAT,
    body: svg.innerHTML,
    source: 'imported',
  }

  return {
    glyphs: [],
    importedGlyph,
  }
}

export function parseSvgMarkup(svgMarkup: string, id: string): GlyphDef | null {
  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return null

  let viewBox = svg.getAttribute('viewBox')
  let viewBoxParts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  let rawWidth = svg.getAttribute('width')
  let rawHeight = svg.getAttribute('height')
  let minX = viewBoxParts.length === 4 ? viewBoxParts[0] : 0
  let minY = viewBoxParts.length === 4 ? viewBoxParts[1] : 0
  let width = viewBoxParts.length === 4 ? viewBoxParts[2] : parseNumber(rawWidth) || 0
  let height = viewBoxParts.length === 4 ? viewBoxParts[3] : parseNumber(rawHeight) || 0
  let contentBox = measureSvgContent(svg)

  // If width/height/viewBox are missing or zero, use bounding box
  if ((!viewBox || viewBoxParts.length !== 4 || width === 0 || height === 0) && contentBox) {
    minX = contentBox.minX
    minY = contentBox.minY
    width = contentBox.width
    height = contentBox.height
    viewBox = `${minX} ${minY} ${width} ${height}`
    svg.setAttribute('viewBox', viewBox)
    viewBoxParts = [minX, minY, width, height]
  } else {
    const safeViewBox = normalizeViewBox(viewBox, minX, minY, width || QUADRAT, height || QUADRAT)
    svg.setAttribute('viewBox', safeViewBox)
    viewBox = safeViewBox
  }

  // Warn if SVG is empty or invisible
  if (!contentBox || contentBox.width === 0 || contentBox.height === 0) {
    if (typeof window !== 'undefined' && window.alert) {
      window.alert('Warning: Imported SVG appears empty or invisible.')
    }
    // Optionally, return null to skip empty SVGs
    // return null
  }

  // Auto-center and fit SVG content to (0,0) by wrapping in a <g> with a transform
  let body = svg.innerHTML
  if (contentBox && (contentBox.minX !== 0 || contentBox.minY !== 0)) {
    body = `<g transform="translate(${-contentBox.minX},${-contentBox.minY})">${svg.innerHTML}</g>`
  }

  return {
    id,
    name: 'Imported SVG',
    viewBox: viewBox,
    viewBoxMinX: minX,
    viewBoxMinY: minY,
    contentMinX: contentBox?.minX ?? minX,
    contentMinY: contentBox?.minY ?? minY,
    contentWidth: contentBox?.width ?? width,
    contentHeight: contentBox?.height ?? height,
    width: width || QUADRAT,
    height: height || QUADRAT,
    body,
    source: 'imported',
  }
}


async function fetchGlyphSourcesFromApi(apiUrl: string): Promise<GlyphSource[]> {
  const sources: GlyphSource[] = []
  let nextUrl: string | null = apiUrl

  while (nextUrl) {
    const response = await fetch(nextUrl, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
    if (!response.ok) {
      throw new Error('Failed to load JSesh glyph list')
    }
    const data = (await response.json()) as Array<{
      name: string
      type: string
      download_url: string | null
    }>

    data
      .filter((item) => item.type === 'file' && item.name.toLowerCase().endsWith('.svg') && item.download_url)
      .forEach((item) => {
        const id = item.name.replace(/\.svg$/i, '')
        sources.push({ id, name: id, url: item.download_url as string })
      })

    nextUrl = getNextLink(response.headers.get('Link'))
  }

  return sources
}

function parseGlyphFromSvg(svgMarkup: string, source: GlyphSource): GlyphDef {
  const doc = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) {
    throw new Error(`Missing svg element for ${source.id}`)
  }

  const viewBox = svg.getAttribute('viewBox')
  const viewBoxParts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  const rawWidth = svg.getAttribute('width')
  const rawHeight = svg.getAttribute('height')
  const minX = viewBoxParts.length === 4 ? viewBoxParts[0] : 0
  const minY = viewBoxParts.length === 4 ? viewBoxParts[1] : 0
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : parseNumber(rawWidth) || QUADRAT
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : parseNumber(rawHeight) || QUADRAT
  const safeViewBox = normalizeViewBox(viewBox, minX, minY, width, height)
  svg.setAttribute('viewBox', safeViewBox)
  const contentBox = measureSvgContent(svg)

  return {
    id: source.id,
    name: source.name ?? source.id,
    viewBox: safeViewBox,
    viewBoxMinX: minX,
    viewBoxMinY: minY,
    contentMinX: contentBox?.minX ?? minX,
    contentMinY: contentBox?.minY ?? minY,
    contentWidth: contentBox?.width ?? width,
    contentHeight: contentBox?.height ?? height,
    width,
    height,
    body: svg.innerHTML,
    source: 'builtin',
  }
}

function measureSvgContent(svg: SVGSVGElement): { minX: number; minY: number; width: number; height: number } | null {
  if (typeof document === 'undefined') return null

  const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  group.innerHTML = svg.innerHTML
  const rawViewBox = svg.getAttribute('viewBox')
  const rawParts = rawViewBox ? rawViewBox.split(/\s+/).map(Number) : []
  const minX = rawParts.length === 4 ? rawParts[0] : 0
  const minY = rawParts.length === 4 ? rawParts[1] : 0
  const width = rawParts.length === 4 ? rawParts[2] : parseNumber(svg.getAttribute('width')) || QUADRAT
  const height = rawParts.length === 4 ? rawParts[3] : parseNumber(svg.getAttribute('height')) || QUADRAT
  tempSvg.setAttribute('viewBox', normalizeViewBox(rawViewBox, minX, minY, width, height))
  tempSvg.setAttribute('width', '0')
  tempSvg.setAttribute('height', '0')
  tempSvg.style.position = 'absolute'
  tempSvg.style.left = '-10000px'
  tempSvg.style.top = '-10000px'
  tempSvg.style.visibility = 'hidden'
  tempSvg.style.overflow = 'visible'
  tempSvg.appendChild(group)
  document.body.appendChild(tempSvg)

  try {
    const box = group.getBBox()
    return { minX: box.x, minY: box.y, width: box.width, height: box.height }
  } catch (error) {
    return null
  } finally {
    tempSvg.remove()
  }
}

async function blobToText(blob: Blob) {
  return await blob.text()
}

function getNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const links = linkHeader.split(',').map((part) => part.trim())
  const nextLink = links.find((part) => part.endsWith('rel="next"'))
  if (!nextLink) return null
  const match = nextLink.match(/<([^>]+)>/)
  return match ? match[1] : null
}

function parseNumber(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeViewBox(
  viewBox: string | null,
  minX: number,
  minY: number,
  width: number,
  height: number
): string {
  const parts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  if (parts.length === 4 && parts.every((value) => Number.isFinite(value))) {
    return viewBox as string
  }
  const safeWidth = Number.isFinite(width) && width > 0 ? width : QUADRAT
  const safeHeight = Number.isFinite(height) && height > 0 ? height : QUADRAT
  const safeMinX = Number.isFinite(minX) ? minX : 0
  const safeMinY = Number.isFinite(minY) ? minY : 0
  return `${safeMinX} ${safeMinY} ${safeWidth} ${safeHeight}`
}
