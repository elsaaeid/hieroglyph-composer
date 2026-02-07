export type CopyPreset = 'small' | 'large' | 'wysiwyg'

export type GlyphDef = {
  id: string
  name: string
  viewBox: string
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
}

export type LayoutItem = {
  instance: GlyphInstance
  x: number
  y: number
  row: number
  col: number
}

export type GlyphSource = {
  id: string
  name?: string
  url: string
}
