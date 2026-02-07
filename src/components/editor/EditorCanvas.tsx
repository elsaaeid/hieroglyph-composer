import type { GlyphDef, LayoutItem } from './types'
import { QUADRAT } from './glyphData'
import { buildTransform } from './svgUtils'

type EditorCanvasProps = {
  layout: LayoutItem[]
  glyphs: GlyphDef[]
  glyphMap: Map<string, GlyphDef>
  selectedIds: string[]
  viewWidth: number
  viewHeight: number
  zoom: number
  onSelect: (id: string, multi: boolean) => void
  onClearSelection: () => void
}

function EditorCanvas({
  layout,
  glyphs,
  glyphMap,
  selectedIds,
  viewWidth,
  viewHeight,
  zoom,
  onSelect,
  onClearSelection,
}: EditorCanvasProps) {
  return (
    <div
      className="w-full overflow-x-hidden overflow-y-auto rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-[#fdfbf5] to-[#f4efe1] p-2 min-h-[clamp(220px,42vh,420px)]"
      onMouseDown={onClearSelection}
    >
      <svg
        className="block max-w-full [background-image:linear-gradient(rgba(29,59,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(29,59,47,0.12)_1px,transparent_1px)] [background-size:180px_180px] [shape-rendering:geometricPrecision]"
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width={viewWidth * zoom}
        height={viewHeight * zoom}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {glyphs.map((glyph) => (
            <symbol key={glyph.id} id={`glyph-${glyph.id}`} viewBox={glyph.viewBox}>
              <g dangerouslySetInnerHTML={{ __html: glyph.body }} />
            </symbol>
          ))}
        </defs>
        {layout.map((item) => {
          const glyph = glyphMap.get(item.instance.glyphId)
          if (!glyph) return null
          const isSelected = selectedIds.includes(item.instance.id)
          const transform = buildTransform(item, glyph)
          return (
            <g
              key={item.instance.id}
              transform={transform}
              data-glyph-id={item.instance.glyphId}
              data-rotate={item.instance.rotate}
              data-flip-x={item.instance.flipX}
              data-flip-y={item.instance.flipY}
              data-scale={item.instance.scale}
              onMouseDown={(event) => {
                event.stopPropagation()
                onSelect(item.instance.id, event.shiftKey || event.ctrlKey)
              }}
            >
              <use href={`#glyph-${glyph.id}`} />
              {isSelected && (
                <rect
                  x={0}
                  y={0}
                  width={QUADRAT}
                  height={QUADRAT}
                  fill="none"
                  stroke="#d4a04a"
                  strokeWidth={40}
                  strokeDasharray="120 60"
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default EditorCanvas
