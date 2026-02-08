import { useMemo, useRef } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import type { GlyphDef, GlyphInstance, LayoutItem } from './types'
import { QUADRAT } from './glyphData'
import { buildTransform } from './svgUtils'

type TransformStageProps = {
  selected: GlyphInstance[]
  glyphMap: Map<string, GlyphDef>
  cellStep: number
  onTranslate: (dx: number, dy: number) => void
  onSetRotate: (value: number) => void
  onSetScale: (value: number) => void
}

type DragState = {
  mode: 'move' | 'rotate' | 'scale'
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
  startRotate: number
  startScale: number
  startAngle: number
  startDistance: number
  lastX: number
  lastY: number
}

function TransformStage({ selected, glyphMap, cellStep, onTranslate, onSetRotate, onSetScale }: TransformStageProps) {
  const active = selected[0] ?? null
  const glyph = useMemo(() => (active ? glyphMap.get(active.glyphId) ?? null : null), [active, glyphMap])
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const activeRef = useRef<GlyphInstance | null>(null)
  activeRef.current = active

  const offsetScale = cellStep / QUADRAT
  const center = cellStep / 2
  const offsetX = (active?.offsetX ?? 0) * offsetScale
  const offsetY = (active?.offsetY ?? 0) * offsetScale

  const handlePoint = (event: PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const x = ((event.clientX - rect.left) / rect.width) * cellStep
    const y = ((event.clientY - rect.top) / rect.height) * cellStep
    return { x, y }
  }

  const snap = (value: number, step: number) => Math.round(value / step) * step

  const beginDrag = (event: PointerEvent<SVGElement>, mode: DragState['mode']) => {
    if (!active) return
    const point = handlePoint(event)
    if (!point) return
    svgRef.current?.setPointerCapture(event.pointerId)

    const angle = Math.atan2(point.y - (center + offsetY), point.x - (center + offsetX))
    const distance = Math.hypot(point.x - (center + offsetX), point.y - (center + offsetY))

    dragRef.current = {
      mode,
      startX: point.x,
      startY: point.y,
      startOffsetX: active.offsetX ?? 0,
      startOffsetY: active.offsetY ?? 0,
      startRotate: active.rotate ?? 0,
      startScale: active.scale ?? 1,
      startAngle: angle,
      startDistance: distance || 1,
      lastX: point.x,
      lastY: point.y,
    }
  }

  const handlePointerMove = (event: PointerEvent<SVGElement>) => {
    const current = activeRef.current
    if (!current || !dragRef.current) return
    const point = handlePoint(event)
    if (!point) return

    const drag = dragRef.current
    const deltaX = point.x - drag.lastX
    const deltaY = point.y - drag.lastY
    drag.lastX = point.x
    drag.lastY = point.y

    if (drag.mode === 'move') {
      const deltaXUnits = deltaX / offsetScale
      const deltaYUnits = deltaY / offsetScale
      const snapStep = QUADRAT / 4
      const nextOffsetX = snap(current.offsetX + deltaXUnits, snapStep)
      const nextOffsetY = snap(current.offsetY + deltaYUnits, snapStep)
      onTranslate(nextOffsetX - current.offsetX, nextOffsetY - current.offsetY)
      return
    }

    if (drag.mode === 'rotate') {
      const angle = Math.atan2(point.y - (center + offsetY), point.x - (center + offsetX))
      const deltaAngle = (angle - drag.startAngle) * (180 / Math.PI)
      const nextRotate = Math.round(drag.startRotate + deltaAngle)
      onSetRotate(nextRotate)
      return
    }

    if (drag.mode === 'scale') {
      const distance = Math.hypot(point.x - (center + offsetX), point.y - (center + offsetY))
      const ratio = distance / drag.startDistance
      const nextScale = Math.min(1.8, Math.max(0.5, drag.startScale * ratio))
      onSetScale(Number(nextScale.toFixed(2)))
    }
  }

  const endDrag = () => {
    dragRef.current = null
  }

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    const current = activeRef.current
    if (!current) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.05 : 0.05
    const nextScale = Math.min(1.8, Math.max(0.5, current.scale + delta))
    onSetScale(Number(nextScale.toFixed(2)))
  }

  const previewItem: LayoutItem | null = active
    ? {
        instance: active,
        row: 0,
        col: 0,
        x: 0,
        y: 0,
      }
    : null

  return (
    <div className="rounded-2xl border border-emerald-900/15 bg-amber-50/40 p-3">
      <div className="text-xs font-semibold text-emerald-950">Mouse Transform</div>
      <div className="mt-3 aspect-square w-full rounded-2xl border border-emerald-900/20 bg-[linear-gradient(rgba(29,59,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(29,59,47,0.12)_1px,transparent_1px)]" style={{ backgroundSize: `${cellStep / 4}px ${cellStep / 4}px` }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${cellStep} ${cellStep}`}
          className="h-full w-full"
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          onWheel={handleWheel}
        >
          {glyph && previewItem ? (
            <g>
              <g
                transform={buildTransform(previewItem, glyph, cellStep)}
                onPointerDown={(event) => beginDrag(event, 'move')}
                className="cursor-move"
              >
                <g dangerouslySetInnerHTML={{ __html: glyph.body }} />
              </g>
              <line
                x1={center + offsetX}
                y1={center + offsetY}
                x2={center + offsetX}
                y2={center + offsetY - cellStep * 0.35}
                stroke="#1d3b2f"
                strokeWidth={6}
                strokeLinecap="round"
              />
              <circle
                cx={center + offsetX}
                cy={center + offsetY - cellStep * 0.35}
                r={cellStep * 0.04}
                fill="#d4a04a"
                stroke="#1d3b2f"
                strokeWidth={6}
                className="cursor-[grab]"
                onPointerDown={(event) => beginDrag(event, 'rotate')}
              />
              <rect
                x={center + offsetX + cellStep * 0.28}
                y={center + offsetY + cellStep * 0.28}
                width={cellStep * 0.08}
                height={cellStep * 0.08}
                rx={cellStep * 0.02}
                fill="#d4a04a"
                stroke="#1d3b2f"
                strokeWidth={6}
                className="cursor-[nwse-resize]"
                onPointerDown={(event) => beginDrag(event, 'scale')}
              />
            </g>
          ) : (
            <text x={cellStep / 2} y={cellStep / 2} textAnchor="middle" className="fill-stone-500 text-[40px]">
              Select a glyph
            </text>
          )}
        </svg>
      </div>
      <p className="mt-2 text-xs text-stone-600">Drag to move, rotate handle to spin, corner to scale, wheel to scale.</p>
    </div>
  )
}

export default TransformStage
