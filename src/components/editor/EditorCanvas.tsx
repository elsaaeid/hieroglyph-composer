import { useLayoutEffect, useRef, useState } from 'react'
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
  onSetScaleX: (value: number) => void
  onSetScaleY: (value: number) => void
}

type DragState = {
  mode: 'move' | 'rotate' | 'scale' | 'scaleX' | 'scaleY'
  lastX: number
  lastY: number
  startAngle: number
  startRotate: number
  startDistance: number
  startScale: number
  startScaleX: number
  startScaleY: number
}

type SelectionBounds = {
  x: number
  y: number
  width: number
  height: number
  centerX: number
  centerY: number
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
  onSetScaleX,
  onSetScaleY,
}: EditorCanvasProps) {
  const safeZoom = Math.max(0.1, zoom)
  const viewBoxWidth = viewWidth / safeZoom
  const viewBoxHeight = viewHeight / safeZoom
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const selectedGroupRef = useRef<SVGGElement | null>(null)
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(null)

  const selectedItem = layout.find((item) => selectedIds.includes(item.instance.id)) ?? null
  const selectedInstance = selectedItem?.instance ?? null
  const selectedGlyph = selectedInstance ? glyphMap.get(selectedInstance.glyphId) : null
  const offsetScale = cellStep / QUADRAT
  const offsetX = selectedInstance ? (selectedInstance.offsetX ?? 0) * offsetScale : 0
  const offsetY = selectedInstance ? (selectedInstance.offsetY ?? 0) * offsetScale : 0
  const fitScale = selectedGlyph ? QUADRAT / Math.max(selectedGlyph.width, selectedGlyph.height) : 1
  const scaleX = selectedInstance ? selectedInstance.scaleX ?? selectedInstance.scale : 1
  const scaleY = selectedInstance ? selectedInstance.scaleY ?? selectedInstance.scale : 1
  const glyphWidth = selectedGlyph && selectedInstance ? selectedGlyph.width * fitScale * scaleX : cellStep
  const glyphHeight = selectedGlyph && selectedInstance ? selectedGlyph.height * fitScale * scaleY : cellStep
  const fallbackBounds: SelectionBounds = {
    x: selectedItem ? selectedItem.x + cellStep / 2 + offsetX - glyphWidth / 2 : 0,
    y: selectedItem ? selectedItem.y + cellStep / 2 + offsetY - glyphHeight / 2 : 0,
    width: glyphWidth,
    height: glyphHeight,
    centerX: selectedItem ? selectedItem.x + cellStep / 2 + offsetX : 0,
    centerY: selectedItem ? selectedItem.y + cellStep / 2 + offsetY : 0,
  }
  const activeBounds = selectionBounds ?? fallbackBounds
  const glyphCenterX = activeBounds.centerX
  const glyphCenterY = activeBounds.centerY
  const handleMargin = Math.max(cellStep * 0.08, activeBounds.height * 0.15)
  const handleSize = Math.max(cellStep * 0.06, 40)
  const handleHalf = handleSize / 2
  const cornerArm = handleSize * 0.6
  const rotateHandleAngle = (selectedItem?.instance.rotate ?? 0) + 45

  const getCornerPath = (key: string, x: number, y: number) => {
    switch (key) {
      case 'nw':
        return `M ${x} ${y + cornerArm} L ${x} ${y} L ${x + cornerArm} ${y}`
      case 'ne':
        return `M ${x - cornerArm} ${y} L ${x} ${y} L ${x} ${y + cornerArm}`
      case 'se':
        return `M ${x} ${y - cornerArm} L ${x} ${y} L ${x - cornerArm} ${y}`
      case 'sw':
        return `M ${x + cornerArm} ${y} L ${x} ${y} L ${x} ${y - cornerArm}`
      default:
        return ''
    }
  }

  useLayoutEffect(() => {
    if (!selectedItem || !selectedGroupRef.current || !svgRef.current) {
      setSelectionBounds(null)
      return
    }

    const group = selectedGroupRef.current
    const svg = svgRef.current
    const bbox = group.getBBox()
    const groupMatrix = group.getScreenCTM()
    const svgMatrix = svg.getScreenCTM()
    if (!groupMatrix || !svgMatrix) {
      setSelectionBounds(null)
      return
    }

    const toSvg = svgMatrix.inverse().multiply(groupMatrix)
    const corners = [
      new DOMPoint(bbox.x, bbox.y).matrixTransform(toSvg),
      new DOMPoint(bbox.x + bbox.width, bbox.y).matrixTransform(toSvg),
      new DOMPoint(bbox.x, bbox.y + bbox.height).matrixTransform(toSvg),
      new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(toSvg),
    ]
    const xs = corners.map((point) => point.x)
    const ys = corners.map((point) => point.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    setSelectionBounds({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2,
    })
  }, [
    selectedItem,
    selectedIds,
    zoom,
    cellStep,
    layout,
    offsetX,
    offsetY,
    scaleX,
    scaleY,
  ])

  const handlePoint = (event: PointerEvent<SVGElement>) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const scale = Math.min(rect.width / viewBoxWidth, rect.height / viewBoxHeight)
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
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
      return
    }

    if (drag.mode === 'scaleX') {
      const distance = Math.abs(point.x - centerX)
      const ratio = distance / drag.startDistance
      const nextScale = Math.min(1.8, Math.max(0.5, drag.startScaleX * ratio))
      onSetScaleX(Number(nextScale.toFixed(2)))
      return
    }

    if (drag.mode === 'scaleY') {
      const distance = Math.abs(point.y - centerY)
      const ratio = distance / drag.startDistance
      const nextScale = Math.min(1.8, Math.max(0.5, drag.startScaleY * ratio))
      onSetScaleY(Number(nextScale.toFixed(2)))
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
          const isPrimary = selectedItem?.instance.id === item.instance.id
          const transform = buildTransform(item, glyph, cellStep)
          return (
            <g
              key={item.instance.id}
              transform={transform}
              ref={isPrimary ? selectedGroupRef : undefined}
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
            </g>
          )
        })}
        {selectedItem && (
          <g>
            <rect
              x={activeBounds.x}
              y={activeBounds.y}
              width={activeBounds.width}
              height={activeBounds.height}
              fill="none"
              stroke="#d4a04a"
              strokeWidth={18}
              strokeDasharray="120 60"
            />
            <rect
              x={activeBounds.x}
              y={activeBounds.y}
              width={activeBounds.width}
              height={activeBounds.height}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={18}
            />
            <line
              x1={glyphCenterX}
              y1={glyphCenterY}
              x2={glyphCenterX}
              y2={glyphCenterY - activeBounds.height / 2 - handleMargin}
              stroke="#1d3b2f"
              strokeWidth={6}
              strokeLinecap="round"
            />
            <rect
              x={glyphCenterX - handleHalf}
              y={glyphCenterY - activeBounds.height / 2 - handleMargin - handleHalf}
              width={handleSize}
              height={handleSize}
              fill="#ffffff"
              stroke="#3b82f6"
              strokeWidth={8}
              className="cursor-grab"
              transform={`rotate(${rotateHandleAngle} ${glyphCenterX} ${glyphCenterY - activeBounds.height / 2 - handleMargin})`}
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
                  startScaleX: scaleX,
                  startScaleY: scaleY,
                }
              }}
            />
            {([
              { key: 'nw', x: activeBounds.x, y: activeBounds.y, cursor: 'cursor-nwse-resize', mode: 'scale' },
              { key: 'n', x: glyphCenterX, y: activeBounds.y, cursor: 'cursor-ns-resize', mode: 'scaleY' },
              { key: 'ne', x: activeBounds.x + activeBounds.width, y: activeBounds.y, cursor: 'cursor-nesw-resize', mode: 'scale' },
              { key: 'e', x: activeBounds.x + activeBounds.width, y: glyphCenterY, cursor: 'cursor-ew-resize', mode: 'scaleX' },
              { key: 'se', x: activeBounds.x + activeBounds.width, y: activeBounds.y + activeBounds.height, cursor: 'cursor-nwse-resize', mode: 'scale' },
              { key: 's', x: glyphCenterX, y: activeBounds.y + activeBounds.height, cursor: 'cursor-ns-resize', mode: 'scaleY' },
              { key: 'sw', x: activeBounds.x, y: activeBounds.y + activeBounds.height, cursor: 'cursor-nesw-resize', mode: 'scale' },
              { key: 'w', x: activeBounds.x, y: glyphCenterY, cursor: 'cursor-ew-resize', mode: 'scaleX' },
            ] as const satisfies ReadonlyArray<{
              key: string
              x: number
              y: number
              cursor: string
              mode: DragState['mode']
            }>).map((handle) => (
              (() => {
                const isCorner = ['nw', 'ne', 'se', 'sw'].includes(handle.key)
                const startDrag = (event: PointerEvent<SVGElement>) => {
                  event.stopPropagation()
                  const point = handlePoint(event)
                  if (!point) return
                  svgRef.current?.setPointerCapture(event.pointerId)
                  const startDistance =
                    handle.mode === 'scaleX'
                      ? Math.abs(point.x - glyphCenterX)
                      : handle.mode === 'scaleY'
                        ? Math.abs(point.y - glyphCenterY)
                        : Math.hypot(point.x - glyphCenterX, point.y - glyphCenterY)
                  dragRef.current = {
                    mode: handle.mode,
                    lastX: point.x,
                    lastY: point.y,
                    startAngle: 0,
                    startRotate: selectedItem.instance.rotate,
                    startDistance: startDistance || 1,
                    startScale: selectedItem.instance.scale,
                    startScaleX: scaleX,
                    startScaleY: scaleY,
                  }
                }

                if (!isCorner) {
                  return (
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
                      className={handle.cursor}
                      onPointerDown={startDrag}
                    />
                  )
                }

                return (
                  <g key={handle.key} className={handle.cursor} onPointerDown={startDrag}>
                    <rect
                      x={handle.x - handleHalf}
                      y={handle.y - handleHalf}
                      width={handleSize}
                      height={handleSize}
                      fill="transparent"
                    />
                    <path
                      d={getCornerPath(handle.key, handle.x, handle.y)}
                      stroke="#3b82f6"
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </g>
                )
              })()
            ))}
            <rect
              x={activeBounds.x}
              y={activeBounds.y}
              width={activeBounds.width}
              height={activeBounds.height}
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
                  startScaleX: scaleX,
                  startScaleY: scaleY,
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
