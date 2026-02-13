export type CopyPreset = 'small' | 'large' | 'wysiwyg'

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
  rotate: number
  flipX: boolean
  flipY: boolean
  scale: number
  scaleX: number
  scaleY: number
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
