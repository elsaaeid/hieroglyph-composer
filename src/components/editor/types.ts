export type CopyPreset = 'small' | 'large' | 'wysiwyg'
export type ExportFormat = 'svg' | 'png' | 'jpg' | 'webp'

export type GlyphDef = {
  id: string
  name: string
  viewBox: string
  viewBoxMinX: number
  viewBoxMinY: number
  contentMinX: number
  contentMinY: number
  contentWidth: number
  contentHeight: number
  width: number
  height: number
  body: string
  source: 'builtin' | 'imported'
}

export type GlyphInstance = {
  id: string
  glyphId: string
  zIndex: number
  rotate: number
  flipX: boolean
  flipY: boolean
  scale: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
  matrixA: number
  matrixB: number
  matrixC: number
  matrixD: number
  matrixE: number
  matrixF: number
  brightness: number
  contrast: number
  exposure: number
  hue: number
  saturation: number
  vibrance: number
  blur: number
  sharpen: number
  noise: number
  magicSelectionBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  magicSelectionSeed?: {
    x: number
    y: number
    tolerance: number
  }
  magicSelectionSeeds?: Array<{
    x: number
    y: number
    tolerance: number
  }>
  penSelectionPath?: Array<{
    x: number
    y: number
  }>
  penSelectionPaths?: Array<
    Array<{
      x: number
      y: number
    }>
  >
  offsetX: number
  offsetY: number
  selectionCenter?: import('./svgUtils').SelectionCenter
}

export type LayoutItem = {
  instance: GlyphInstance
  x: number
  y: number
  row: number
  col: number
}

export type FlowDirection = 'row' | 'column'

export type GlyphSource = {
  id: string
  name?: string
  url: string
}
