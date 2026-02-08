import type { GlyphDef, LayoutItem } from './types'
import { buildTransform } from './svgUtils'

type EditorCanvasProps = {
  layout: LayoutItem[]
  glyphs: GlyphDef[]
  glyphMap: Map<string, GlyphDef>
  selectedIds: string[]
  viewWidth: number
  viewHeight: number
  zoom: number
  cellStep: number
  onAddRow: () => void
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
  cellStep,
  onAddRow,
  onSelect,
  onClearSelection,
}: EditorCanvasProps) {
  const safeZoom = Math.max(0.1, zoom)
  const viewBoxWidth = viewWidth / safeZoom
  const viewBoxHeight = viewHeight / safeZoom

  return (
    <div
      className="w-full overflow-x-auto overflow-y-auto rounded-2xl border border-emerald-900/20 bg-gradient-to-br from-[#fdfbf5] to-[#f4efe1] min-h-[clamp(220px,42vh,420px)]"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onAddRow()
        }
      }}
      onMouseDown={onClearSelection}
    >
      <svg
        className="block w-full h-auto max-w-full bg-[linear-gradient(rgba(29,59,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(29,59,47,0.12)_1px,transparent_1px)] [shape-rendering:geometricPrecision]"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMin meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ backgroundSize: `${cellStep}px ${cellStep}px`, backgroundPosition: '0 0' }}
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
          const transform = buildTransform(item, glyph, cellStep)
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
                  width={cellStep}
                  height={cellStep}
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
