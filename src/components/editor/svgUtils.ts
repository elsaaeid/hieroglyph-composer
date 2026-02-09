import type { GlyphDef, GlyphInstance, GlyphSource, LayoutItem } from './types'
import { QUADRAT } from './glyphData'

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

export function buildTransform(item: LayoutItem, glyph: GlyphDef, cellStep: number): string {
  const centerX = glyph.width / 2
  const centerY = glyph.height / 2
  const fitScale = QUADRAT / Math.max(glyph.width, glyph.height)
  const flipX = item.instance.flipX ? -1 : 1
  const flipY = item.instance.flipY ? -1 : 1
  const userScale = item.instance.scale
  const offsetScale = cellStep / QUADRAT
  const offsetX = (item.instance.offsetX ?? 0) * offsetScale
  const offsetY = (item.instance.offsetY ?? 0) * offsetScale

  return [
    `translate(${item.x} ${item.y})`,
    `translate(${cellStep / 2} ${cellStep / 2})`,
    `translate(${offsetX} ${offsetY})`,
    `rotate(${item.instance.rotate})`,
    `scale(${flipX * userScale} ${flipY * userScale})`,
    `scale(${fitScale} ${fitScale})`,
    `translate(${-centerX} ${-centerY})`,
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

  const maxCol = Math.max(...layout.map((item) => item.col)) + 1
  const maxRow = Math.max(...layout.map((item) => item.row)) + 1
  const width = maxCol * cellStep
  const height = maxRow * cellStep

  const body = layout
    .map((item) => {
      const glyph = glyphMap.get(item.instance.glyphId)
      if (!glyph) return ''
      const transform = buildTransform(item, glyph, cellStep)
      return `
        <g
          transform="${transform}"
        >
          ${glyph.body}
        </g>
      `.trim()
    })
    .join('')

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 ${width} ${height}"
      width="${width * exportScale}"
      height="${height * exportScale}"
    >
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
          rotate: Number(group.getAttribute('data-rotate') ?? 0),
          flipX: group.getAttribute('data-flip-x') === 'true',
          flipY: group.getAttribute('data-flip-y') === 'true',
          scale: Number(group.getAttribute('data-scale') ?? 1),
          offsetX: Number(group.getAttribute('data-offset-x') ?? 0),
          offsetY: Number(group.getAttribute('data-offset-y') ?? 0),
        }
      })
      .filter(Boolean) as GlyphInstance[]
    return { glyphs }
  }

  const viewBox = svg.getAttribute('viewBox')
  const viewBoxParts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : Number(svg.getAttribute('width') ?? QUADRAT)
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : Number(svg.getAttribute('height') ?? QUADRAT)
  const importId = `IMPORTED_${Date.now()}`

  const importedGlyph: GlyphDef = {
    id: importId,
    name: 'Imported SVG',
    viewBox: viewBox || `0 0 ${width} ${height}`,
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

  const viewBox = svg.getAttribute('viewBox')
  const viewBoxParts = viewBox ? viewBox.split(/\s+/).map(Number) : []
  const rawWidth = svg.getAttribute('width')
  const rawHeight = svg.getAttribute('height')
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : parseNumber(rawWidth) || QUADRAT
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : parseNumber(rawHeight) || QUADRAT

  return {
    id,
    name: 'Imported SVG',
    viewBox: viewBox || `0 0 ${width} ${height}`,
    width: width || QUADRAT,
    height: height || QUADRAT,
    body: svg.innerHTML,
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
  const width = viewBoxParts.length === 4 ? viewBoxParts[2] : parseNumber(rawWidth) || QUADRAT
  const height = viewBoxParts.length === 4 ? viewBoxParts[3] : parseNumber(rawHeight) || QUADRAT

  return {
    id: source.id,
    name: source.name ?? source.id,
    viewBox: viewBox || `0 0 ${width} ${height}`,
    width,
    height,
    body: svg.innerHTML,
    source: 'builtin',
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
