import { useRef } from 'react'
import type { PointerEvent } from 'react'
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
  cellStep: number
  onAddRow: () => void
  onSelect: (id: string, multi: boolean) => void
  onClearSelection: () => void
  onTranslate: (dx: number, dy: number) => void
  onSetRotate: (value: number) => void
  onSetScale: (value: number) => void
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
  onTranslate,
  onSetRotate,
  onSetScale,
}: EditorCanvasProps) {
  const safeZoom = Math.max(0.1, zoom)
  const viewBoxWidth = viewWidth / safeZoom
  const viewBoxHeight = viewHeight / safeZoom
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<{ mode: 'move' | 'rotate' | 'scale'; lastX: number; lastY: number; startAngle: number; startRotate: number; startDistance: number; startScale: number } | null>(null)

  const selectedItem = layout.find((item) => selectedIds.includes(item.instance.id)) ?? null
  const selectedInstance = selectedItem?.instance ?? null
  const selectedGlyph = selectedInstance ? glyphMap.get(selectedInstance.glyphId) : null
  const offsetScale = cellStep / QUADRAT
  const offsetX = selectedInstance ? (selectedInstance.offsetX ?? 0) * offsetScale : 0
  const offsetY = selectedInstance ? (selectedInstance.offsetY ?? 0) * offsetScale : 0
  const fitScale = selectedGlyph ? QUADRAT / Math.max(selectedGlyph.width, selectedGlyph.height) : 1
  const glyphWidth = selectedGlyph && selectedInstance ? selectedGlyph.width * fitScale * selectedInstance.scale : cellStep
  const glyphHeight = selectedGlyph && selectedInstance ? selectedGlyph.height * fitScale * selectedInstance.scale : cellStep
  const glyphCenterX = selectedItem ? selectedItem.x + cellStep / 2 + offsetX : 0
  const glyphCenterY = selectedItem ? selectedItem.y + cellStep / 2 + offsetY : 0
  const handleMargin = Math.max(cellStep * 0.08, glyphHeight * 0.15)
  const handleSize = Math.max(cellStep * 0.06, 40)
  const handleHalf = handleSize / 2

  const handlePoint = (event: PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const x = ((event.clientX - rect.left) / rect.width) * viewBoxWidth
    const y = ((event.clientY - rect.top) / rect.height) * viewBoxHeight
    return { x, y }
  }

  const handlePointerMove = (event: PointerEvent<SVGElement>) => {
    if (!dragRef.current || !selectedItem) return
    const point = handlePoint(event)
    if (!point) return
    const drag = dragRef.current
    const centerX = selectedItem.x + cellStep / 2 + offsetX
    const centerY = selectedItem.y + cellStep / 2 + offsetY

    if (drag.mode === 'move') {
      const deltaX = point.x - drag.lastX
      const deltaY = point.y - drag.lastY
      drag.lastX = point.x
      drag.lastY = point.y
      onTranslate(deltaX / offsetScale, deltaY / offsetScale)
      return
    }

    if (drag.mode === 'rotate') {
      const angle = Math.atan2(point.y - centerY, point.x - centerX)
      const delta = (angle - drag.startAngle) * (180 / Math.PI)
      onSetRotate(Math.round(drag.startRotate + delta))
      return
    }

    if (drag.mode === 'scale') {
      const distance = Math.hypot(point.x - centerX, point.y - centerY)
      const ratio = distance / drag.startDistance
      const nextScale = Math.min(1.8, Math.max(0.5, drag.startScale * ratio))
      onSetScale(Number(nextScale.toFixed(2)))
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  return (
    <div
      className="w-full overflow-x-auto overflow-y-auto rounded-2xl border border-emerald-900/20 bg-linear-to-br from-[#fdfbf5] to-[#f4efe1] min-h-[clamp(220px,42vh,420px)]"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onAddRow()
        }
      }}
      onPointerDown={onClearSelection}
    >
      <svg
        ref={svgRef}
        className="block w-full h-auto max-w-full bg-[linear-gradient(rgba(29,59,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(29,59,47,0.12)_1px,transparent_1px)] [shape-rendering:geometricPrecision]"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMin meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ backgroundSize: `${cellStep}px ${cellStep}px`, backgroundPosition: '0 0' }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
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
              onPointerDown={(event) => {
                event.stopPropagation()
                onSelect(item.instance.id, event.shiftKey || event.ctrlKey)
              }}
            >
              <use href={`#glyph-${glyph.id}`} />
              {isSelected && (
                <rect
                  x={0}
                  y={0}
                  width={glyph.width}
                  height={glyph.height}
                  fill="none"
                  stroke="#d4a04a"
                  strokeWidth={40}
                  strokeDasharray="120 60"
                />
              )}
            </g>
          )
        })}
        {selectedItem && (
          <g>
            <rect
              x={glyphCenterX - glyphWidth / 2}
              y={glyphCenterY - glyphHeight / 2}
              width={glyphWidth}
              height={glyphHeight}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={18}
            />
            <line
              x1={glyphCenterX}
              y1={glyphCenterY}
              x2={glyphCenterX}
              y2={glyphCenterY - glyphHeight / 2 - handleMargin}
              stroke="#1d3b2f"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <circle
              cx={glyphCenterX}
              cy={glyphCenterY - glyphHeight / 2 - handleMargin}
              r={handleSize / 2}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={8}
              className="cursor-grab"
              onPointerDown={(event) => {
                event.stopPropagation()
                const point = handlePoint(event)
                if (!point) return
                svgRef.current?.setPointerCapture(event.pointerId)
                dragRef.current = {
                  mode: 'rotate',
                  lastX: point.x,
                  lastY: point.y,
                  startAngle: Math.atan2(point.y - glyphCenterY, point.x - glyphCenterX),
                  startRotate: selectedItem.instance.rotate,
                  startDistance: 1,
                  startScale: selectedItem.instance.scale,
                }
              }}
            />
            {[
              { key: 'nw', x: glyphCenterX - glyphWidth / 2, y: glyphCenterY - glyphHeight / 2 },
              { key: 'n', x: glyphCenterX, y: glyphCenterY - glyphHeight / 2 },
              { key: 'ne', x: glyphCenterX + glyphWidth / 2, y: glyphCenterY - glyphHeight / 2 },
              { key: 'e', x: glyphCenterX + glyphWidth / 2, y: glyphCenterY },
              { key: 'se', x: glyphCenterX + glyphWidth / 2, y: glyphCenterY + glyphHeight / 2 },
              { key: 's', x: glyphCenterX, y: glyphCenterY + glyphHeight / 2 },
              { key: 'sw', x: glyphCenterX - glyphWidth / 2, y: glyphCenterY + glyphHeight / 2 },
              { key: 'w', x: glyphCenterX - glyphWidth / 2, y: glyphCenterY },
            ].map((handle) => (
              <rect
                key={handle.key}
                x={handle.x - handleHalf}
                y={handle.y - handleHalf}
                width={handleSize}
                height={handleSize}
                rx={handleSize * 0.2}
                fill="#ffffff"
                stroke="#3b82f6"
                strokeWidth={8}
                className="cursor-nwse-resize"
                onPointerDown={(event) => {
                  event.stopPropagation()
                  const point = handlePoint(event)
                  if (!point) return
                  svgRef.current?.setPointerCapture(event.pointerId)
                  dragRef.current = {
                    mode: 'scale',
                    lastX: point.x,
                    lastY: point.y,
                    startAngle: 0,
                    startRotate: selectedItem.instance.rotate,
                    startDistance: Math.hypot(point.x - glyphCenterX, point.y - glyphCenterY) || 1,
                    startScale: selectedItem.instance.scale,
                  }
                }}
              />
            ))}
            <rect
              x={glyphCenterX - glyphWidth / 2}
              y={glyphCenterY - glyphHeight / 2}
              width={glyphWidth}
              height={glyphHeight}
              fill="transparent"
              onPointerDown={(event) => {
                event.stopPropagation()
                onSelect(selectedItem.instance.id, event.shiftKey || event.ctrlKey)
                const point = handlePoint(event)
                if (!point) return
                svgRef.current?.setPointerCapture(event.pointerId)
                dragRef.current = {
                  mode: 'move',
                  lastX: point.x,
                  lastY: point.y,
                  startAngle: 0,
                  startRotate: selectedItem.instance.rotate,
                  startDistance: 1,
                  startScale: selectedItem.instance.scale,
                }
              }}
            />
          </g>
        )}
      </svg>
    </div>
  )
}

export default EditorCanvas
