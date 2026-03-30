// Extend the Window interface to allow debug arrays
declare global {
  interface Window {
    _glyphSymbolIds?: any[];
    _glyphUseHrefs?: any[];
  }
}
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GlyphDef, LayoutItem } from './types'
import { QUADRAT } from './glyphData'

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
  onSetSelection: (ids: string[]) => void
  magicWandMode: boolean
  onMagicWandPick: (instanceId: string, localX: number, localY: number) => void
  penToolMode: boolean
  onPenSelectionComplete: (instanceId: string, points: Array<{ x: number; y: number }>) => void
  onPenNodeDragStart: () => void
  onPenNodeMove: (
    instanceId: string,
    pathIndex: number,
    pointIndex: number,
    x: number,
    y: number
  ) => void
  onPenNodeRemove: (instanceId: string, pathIndex: number, pointIndex: number) => void
  onDropGlyph: (glyphId: string, x: number, y: number) => void
  onDropFiles: (files: FileList, x: number, y: number) => void
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
  onSetSelection,
  magicWandMode,
  onMagicWandPick,
  penToolMode,
  onPenSelectionComplete,
  onPenNodeDragStart,
  onPenNodeMove,
  onPenNodeRemove,
  onDropGlyph,
  onDropFiles,
}: EditorCanvasProps) {
  const safeZoom = Math.max(0.1, zoom)
  const viewBoxWidth = viewWidth / safeZoom
  const viewBoxHeight = viewHeight / safeZoom
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const selectBoxRef = useRef<{ startX: number; startY: number } | null>(null)
  const penStrokeRef = useRef<{
    instanceId: string
    pointerId: number
    toLocal: DOMMatrix
  } | null>(null)
  const penNodeDragRef = useRef<{
    instanceId: string
    pathIndex: number
    pointIndex: number
    pointerId: number
    toLocal: DOMMatrix
  } | null>(null)
  const selectedGroupRef = useRef<SVGGElement | null>(null)
  const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(null)
  const [selectRect, setSelectRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [penDraft, setPenDraft] = useState<{
    instanceId: string
    points: Array<{ x: number; y: number }>
  } | null>(null)

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

  const handlePoint = (event: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const scale = Math.min(rect.width / viewBoxWidth, rect.height / viewBoxHeight)
    const x = (event.clientX - rect.left) / scale
    const y = (event.clientY - rect.top) / scale
    return { x, y }
  }

  const handlePointerMove = (event: PointerEvent<SVGElement>) => {
    if (penNodeDragRef.current && penNodeDragRef.current.pointerId === event.pointerId) {
      const drag = penNodeDragRef.current
      const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(drag.toLocal)
      onPenNodeMove(drag.instanceId, drag.pathIndex, drag.pointIndex, local.x, local.y)
      return
    }

    if (penStrokeRef.current && penStrokeRef.current.pointerId === event.pointerId) {
      const stroke = penStrokeRef.current
      const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(stroke.toLocal)
      setPenDraft((prev) => {
        if (!prev || prev.instanceId !== stroke.instanceId) return prev
        const last = prev.points[prev.points.length - 1]
        if (!last) return prev
        const minStep = 2.5
        if (Math.hypot(local.x - last.x, local.y - last.y) < minStep) return prev
        return {
          ...prev,
          points: [...prev.points, { x: local.x, y: local.y }],
        }
      })
      return
    }

    const point = handlePoint(event)
    if (!point) return

    if (selectBoxRef.current) {
      const start = selectBoxRef.current
      const x = Math.min(start.startX, point.x)
      const y = Math.min(start.startY, point.y)
      const width = Math.abs(point.x - start.startX)
      const height = Math.abs(point.y - start.startY)
      setSelectRect({ x, y, width, height })
      return
    }

    if (!dragRef.current || !selectedItem) return
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

  const endDrag = (event?: PointerEvent<SVGElement>) => {
    if (event && svgRef.current && penStrokeRef.current?.pointerId === event.pointerId) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
    if (event && svgRef.current && penNodeDragRef.current?.pointerId === event.pointerId) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    penStrokeRef.current = null
    penNodeDragRef.current = null
    if (selectBoxRef.current && selectRect) {
      const box = selectRect
      const ids = layout
        .filter((item) => {
          const left = item.x
          const top = item.y
          const right = item.x + cellStep
          const bottom = item.y + cellStep
          return !(right < box.x || left > box.x + box.width || bottom < box.y || top > box.y + box.height)
        })
        .map((item) => item.instance.id)
      onSetSelection(ids)
    }
    selectBoxRef.current = null
    setSelectRect(null)
  }

  const imageFilterSpecs = layout
    .map((item) => {
      const glyph = glyphMap.get(item.instance.glyphId)
      if (!glyph || glyph.source !== 'imported') return null

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

      if (!hasEffect) return null

      return {
        id: `img-filter-${item.instance.id}`,
        brightness,
        contrast,
        exposure,
        hue,
        saturation: Math.max(0, saturation + vibrance * 0.5),
        blur,
        sharpen,
        noise,
      }
    })
    .filter(Boolean) as Array<{
      id: string
      brightness: number
      contrast: number
      exposure: number
      hue: number
      saturation: number
      blur: number
      sharpen: number
      noise: number
    }>

  const imageFilterIdMap = new Map(imageFilterSpecs.map((spec) => [spec.id.replace('img-filter-', ''), spec.id]))

  const renderLayout = useMemo(
    () =>
      [...layout]
        .map((item, index) => ({ item, index, z: item.instance.zIndex ?? index }))
        .sort((a, b) => a.z - b.z || a.index - b.index)
        .map((entry) => entry.item),
    [layout]
  )

  const finalizePenDraft = (draft: { instanceId: string; points: Array<{ x: number; y: number }> } | null) => {
    if (!draft || draft.points.length < 3) return
    onPenSelectionComplete(draft.instanceId, draft.points)
  }

  const handleCanvasDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const point = (() => {
      if (!svgRef.current) return null
      const rect = svgRef.current.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      const scale = Math.min(rect.width / viewBoxWidth, rect.height / viewBoxHeight)
      const x = (event.clientX - rect.left) / scale
      const y = (event.clientY - rect.top) / scale
      return { x, y }
    })()

    if (!point) return

    // Handle file drop
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onDropFiles(event.dataTransfer.files, point.x, point.y)
      return
    }

    // Handle glyph drop from library
    const jsonData = event.dataTransfer.getData('application/json')
    if (jsonData) {
      try {
        const data = JSON.parse(jsonData)
        if (data.type === 'glyph' && data.glyphId) {
          onDropGlyph(data.glyphId, point.x, point.y)
        }
      } catch (error) {
        console.error('Failed to parse drop data:', error)
      }
    }
  }

  return (
    <div
      className="w-full overflow-x-auto overflow-y-auto rounded-2xl border border-emerald-900/20 bg-linear-to-br from-[#fdfbf5] to-[#f4efe1] min-h-[clamp(300px,58vh,640px)]"
      tabIndex={0}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
      onKeyDown={(event) => {
        if (penToolMode && penDraft) {
          if (event.key === 'Enter') {
            event.preventDefault()
            finalizePenDraft(penDraft)
            setPenDraft(null)
            return
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setPenDraft(null)
            return
          }
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          onAddRow()
        }
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return
        if (magicWandMode || penToolMode) return
        const point = handlePoint(event)
        if (!point) return
        onClearSelection()
        selectBoxRef.current = { startX: point.x, startY: point.y }
        setSelectRect({ x: point.x, y: point.y, width: 0, height: 0 })
      }}
    >
      <svg
        ref={svgRef}
        className={`block w-full h-auto max-w-full bg-[linear-gradient(rgba(29,59,47,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(29,59,47,0.12)_1px,transparent_1px)] [shape-rendering:geometricPrecision] ${magicWandMode || penToolMode ? 'cursor-crosshair' : ''}`}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMinYMin meet"
        xmlns="http://www.w3.org/2000/svg"
        style={{ backgroundSize: `${cellStep}px ${cellStep}px`, backgroundPosition: '0 0' }}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerLeave={() => endDrag()}
      >
        {/* Blue circle at transform border center */}
        {selectedItem && activeBounds && (
          <circle
            cx={activeBounds.centerX}
            cy={activeBounds.centerY}
            r={Math.max(8, cellStep * 0.08)}
            fill="#2196f3"
            stroke="#1565c0"
            strokeWidth={2}
            opacity={0.7}
          />
        )}
        {selectRect && (
          <rect
            x={selectRect.x}
            y={selectRect.y}
            width={selectRect.width}
            height={selectRect.height}
            fill="rgba(37,99,235,0.12)"
            stroke="#2563eb"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
        )}
        <defs>
          {glyphs.map((glyph) => {
            // Normalize id: always use 'glyph-' prefix and replace any non-alphanumeric with underscore
            const safeId = `glyph-${String(glyph.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            // Remove xmlns attribute from glyph body to avoid rendering issues
            const cleanBody = glyph.body ? glyph.body.replace(/xmlns="[^"]*"/g, "") : "";
            // Debug: log all generated symbol ids and body content
            window._glyphSymbolIds = window._glyphSymbolIds || [];
            window._glyphSymbolIds.push(safeId);
            // console.log('SYMBOL:', safeId, 'viewBox:', glyph.viewBox, 'body:', glyph.body);
            return (
              <symbol key={safeId} id={safeId} viewBox={glyph.viewBox}>
                {/* Debug rectangle to visualize symbol bounds */}
                <rect x={0} y={0} width={glyph.width} height={glyph.height} fill="none" stroke="#f00" strokeWidth={1} />
                <g dangerouslySetInnerHTML={{ __html: cleanBody }} />
              </symbol>
            );
          })}
          {imageFilterSpecs.map((spec) => {
            const exposureFactor = Math.pow(2, spec.exposure)
            const slope = spec.brightness * spec.contrast * exposureFactor
            const intercept = 0.5 * (1 - spec.contrast)
            return (
              <filter key={spec.id} id={spec.id} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
                <feColorMatrix in="SourceGraphic" type="hueRotate" values={String(spec.hue)} result="hue" />
                <feColorMatrix in="hue" type="saturate" values={String(spec.saturation)} result="sat" />
                <feComponentTransfer in="sat" result="tone">
                  <feFuncR type="linear" slope={slope} intercept={intercept} />
                  <feFuncG type="linear" slope={slope} intercept={intercept} />
                  <feFuncB type="linear" slope={slope} intercept={intercept} />
                </feComponentTransfer>
                <feGaussianBlur in="tone" stdDeviation={spec.blur} result="blurred" />
                <feConvolveMatrix
                  in="blurred"
                  order="3"
                  kernelMatrix="0 -1 0 -1 5 -1 0 -1 0"
                  divisor="1"
                  bias="0"
                  result="sharp"
                />
                <feComposite
                  in="sharp"
                  in2="blurred"
                  operator="arithmetic"
                  k1="0"
                  k2={1 + spec.sharpen}
                  k3={-spec.sharpen}
                  k4="0"
                  result="enhanced"
                />
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="7" result="noiseRaw" />
                <feColorMatrix
                  in="noiseRaw"
                  type="matrix"
                  values={`0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${spec.noise} 0`}
                  result="noiseAlpha"
                />
                <feBlend in="enhanced" in2="noiseAlpha" mode="overlay" />
              </filter>
            )
          })}
        </defs>
        {renderLayout.map((item) => {
          const glyph = glyphMap.get(item.instance.glyphId)
          if (!glyph) return null
          const isPrimary = selectedItem?.instance.id === item.instance.id
          // TEMP: Use only translate for transform to debug scaling issue
          const transform = `translate(${item.x}, ${item.y})`
          // Debug: log transform and glyph info for artboard rendering
          // console.log('ARTBOARD GLYPH', {
          //   id: item.instance.glyphId,
          //   transform,
          //   x: item.x,
          //   y: item.y,
          //   width: glyph.width,
          //   height: glyph.height,
          //   viewBox: glyph.viewBox,
          //   cellStep,
          //   fitScale: glyph ? (QUADRAT / Math.max(glyph.width, glyph.height)) : 1,
          //   scaleX: item.instance.scaleX ?? item.instance.scale,
          //   scaleY: item.instance.scaleY ?? item.instance.scale,
          // });
          // Normalize id for use reference
          const safeId = `glyph-${String(glyph.id).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          // Debug: log all <use> hrefs
          window._glyphUseHrefs = window._glyphUseHrefs || [];
          window._glyphUseHrefs.push(`#${safeId}`);
            console.log('USE:', `#${safeId}`);
          // After rendering, print both lists for comparison
          // if (window._glyphSymbolIds && window._glyphUseHrefs && window._glyphUseHrefs.length === renderLayout.length) {
          //   console.log('ALL SYMBOL IDS:', window._glyphSymbolIds);
          //   console.log('ALL USE HREFS:', window._glyphUseHrefs);
          // }
          return (
            <g
              key={item.instance.id}
              transform={transform}
              ref={isPrimary ? selectedGroupRef : undefined}
              data-glyph-id={item.instance.glyphId}
              data-z-index={item.instance.zIndex ?? 0}
              data-rotate={item.instance.rotate}
              data-flip-x={item.instance.flipX}
              data-flip-y={item.instance.flipY}
              data-scale={item.instance.scale}
              data-scale-x={item.instance.scaleX}
              data-scale-y={item.instance.scaleY}
              data-skew-x={item.instance.skewX ?? 0}
              data-skew-y={item.instance.skewY ?? 0}
              data-matrix-a={item.instance.matrixA ?? 1}
              data-matrix-b={item.instance.matrixB ?? 0}
              data-matrix-c={item.instance.matrixC ?? 0}
              data-matrix-d={item.instance.matrixD ?? 1}
              data-matrix-e={item.instance.matrixE ?? 0}
              data-matrix-f={item.instance.matrixF ?? 0}
              data-brightness={item.instance.brightness ?? 1}
              data-contrast={item.instance.contrast ?? 1}
              data-exposure={item.instance.exposure ?? 0}
              data-hue={item.instance.hue ?? 0}
              data-saturation={item.instance.saturation ?? 1}
              data-vibrance={item.instance.vibrance ?? 0}
              data-blur={item.instance.blur ?? 0}
              data-sharpen={item.instance.sharpen ?? 0}
              data-noise={item.instance.noise ?? 0}
              data-offset-x={item.instance.offsetX ?? 0}
              data-offset-y={item.instance.offsetY ?? 0}
              filter={imageFilterIdMap.has(item.instance.id) ? `url(#${imageFilterIdMap.get(item.instance.id)})` : undefined}
              onPointerDown={(event) => {
                event.stopPropagation()

                if (magicWandMode) {
                  onSelect(item.instance.id, false)
                  const group = event.currentTarget as SVGGElement
                  const matrix = group.getScreenCTM()
                  if (!matrix) return
                  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
                  onMagicWandPick(item.instance.id, local.x, local.y)
                  return
                }

                if (penToolMode) {
                  onSelect(item.instance.id, false)
                  const group = event.currentTarget as SVGGElement
                  const matrix = group.getScreenCTM()
                  if (!matrix || !svgRef.current) return
                  const toLocal = matrix.inverse()
                  const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(toLocal)
                  if (!penDraft || penDraft.instanceId !== item.instance.id) {
                    finalizePenDraft(penDraft)
                    setPenDraft({
                      instanceId: item.instance.id,
                      points: [{ x: local.x, y: local.y }],
                    })
                    penStrokeRef.current = {
                      instanceId: item.instance.id,
                      pointerId: event.pointerId,
                      toLocal,
                    }
                    svgRef.current.setPointerCapture(event.pointerId)
                    return
                  }

                  const first = penDraft.points[0]
                  const closeDistance = Math.hypot(local.x - first.x, local.y - first.y)
                  const closeThreshold = Math.max(glyph.width, glyph.height) * 0.04
                  if (penDraft.points.length >= 3 && closeDistance <= closeThreshold) {
                    finalizePenDraft(penDraft)
                    setPenDraft(null)
                    return
                  }

                  setPenDraft({
                    ...penDraft,
                    points: [...penDraft.points, { x: local.x, y: local.y }],
                  })
                  penStrokeRef.current = {
                    instanceId: item.instance.id,
                    pointerId: event.pointerId,
                    toLocal,
                  }
                  svgRef.current.setPointerCapture(event.pointerId)
                  return
                }

                onSelect(item.instance.id, event.shiftKey || event.ctrlKey)

                // Allow direct move drag on the artboard when the primary glyph is already selected.
                if (!isPrimary || event.shiftKey || event.ctrlKey) return
                const point = handlePoint(event)
                if (!point) return
                dragRef.current = {
                  mode: 'move',
                  lastX: point.x,
                  lastY: point.y,
                  startAngle: 0,
                  startRotate: item.instance.rotate,
                  startDistance: 1,
                  startScale: item.instance.scale,
                  startScaleX: item.instance.scaleX ?? item.instance.scale,
                  startScaleY: item.instance.scaleY ?? item.instance.scale,
                }
                svgRef.current?.setPointerCapture(event.pointerId)
              }}
            >
              <use href={`#${safeId}`} />
              {/* Debug: blue rectangle overlay for every glyph instance */}
              <rect
                x={0}
                y={0}
                width={glyph.width}
                height={glyph.height}
                fill="none"
                stroke="#2196f3"
                strokeWidth={1.5}
                pointerEvents="none"
                style={{ mixBlendMode: 'multiply' }}
              />
              {selectedIds.includes(item.instance.id) &&
                (item.instance.magicSelectionSeeds ??
                  (item.instance.magicSelectionSeed ? [item.instance.magicSelectionSeed] : [])).map(
                  (seed, index) => (
                    <g key={`magic-seed-${index}`}>
                      <circle
                        cx={seed.x}
                        cy={seed.y}
                        r={Math.max(glyph.width, glyph.height) * 0.018}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth={Math.max(glyph.width, glyph.height) * 0.008}
                      />
                      <line
                        x1={seed.x - Math.max(glyph.width, glyph.height) * 0.02}
                        y1={seed.y}
                        x2={seed.x + Math.max(glyph.width, glyph.height) * 0.02}
                        y2={seed.y}
                        stroke="#2563eb"
                        strokeWidth={Math.max(glyph.width, glyph.height) * 0.006}
                      />
                      <line
                        x1={seed.x}
                        y1={seed.y - Math.max(glyph.width, glyph.height) * 0.02}
                        x2={seed.x}
                        y2={seed.y + Math.max(glyph.width, glyph.height) * 0.02}
                        stroke="#2563eb"
                        strokeWidth={Math.max(glyph.width, glyph.height) * 0.006}
                      />
                    </g>
                  )
                )}
              {selectedIds.includes(item.instance.id) && item.instance.penSelectionPath && item.instance.penSelectionPath.length > 2 && (
                <g>
                  <polygon
                    points={item.instance.penSelectionPath.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="rgba(8,145,178,0.14)"
                    stroke="#0891b2"
                    strokeWidth={Math.max(glyph.width, glyph.height) * 0.008}
                    strokeDasharray="14 8"
                  />
                  {(item.instance.penSelectionPaths?.length ?? 0) === 0 &&
                    item.instance.penSelectionPath.map((point, pointIndex) => (
                      <circle
                        key={`pen-node-current-${pointIndex}`}
                        cx={point.x}
                        cy={point.y}
                        r={Math.max(glyph.width, glyph.height) * 0.012}
                        fill="#ffffff"
                        stroke="#0f766e"
                        strokeWidth={Math.max(glyph.width, glyph.height) * 0.004}
                        className="cursor-move"
                        onPointerDown={(event) => {
                          event.stopPropagation()
                          const matrix = event.currentTarget.getScreenCTM()
                          if (!matrix || !svgRef.current) return
                          onPenNodeDragStart()
                          penNodeDragRef.current = {
                            instanceId: item.instance.id,
                            pathIndex: -1,
                            pointIndex,
                            pointerId: event.pointerId,
                            toLocal: matrix.inverse(),
                          }
                          svgRef.current.setPointerCapture(event.pointerId)
                        }}
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          onPenNodeRemove(item.instance.id, -1, pointIndex)
                        }}
                      />
                    ))}
                </g>
              )}
              {selectedIds.includes(item.instance.id) &&
                (item.instance.penSelectionPaths ?? []).map((path, index) =>
                  path.length > 2 ? (
                    <g key={`pen-path-${index}`}>
                      <polygon
                        points={path.map((point) => `${point.x},${point.y}`).join(' ')}
                        fill="rgba(8,145,178,0.14)"
                        stroke="#0891b2"
                        strokeWidth={Math.max(glyph.width, glyph.height) * 0.008}
                        strokeDasharray="14 8"
                      />
                      {path.map((point, pointIndex) => (
                        <circle
                          key={`pen-node-${index}-${pointIndex}`}
                          cx={point.x}
                          cy={point.y}
                          r={Math.max(glyph.width, glyph.height) * 0.012}
                          fill="#ffffff"
                          stroke="#0f766e"
                          strokeWidth={Math.max(glyph.width, glyph.height) * 0.004}
                          className="cursor-move"
                          onPointerDown={(event) => {
                            event.stopPropagation()
                            const matrix = event.currentTarget.getScreenCTM()
                            if (!matrix || !svgRef.current) return
                            onPenNodeDragStart()
                            penNodeDragRef.current = {
                              instanceId: item.instance.id,
                              pathIndex: index,
                              pointIndex,
                              pointerId: event.pointerId,
                              toLocal: matrix.inverse(),
                            }
                            svgRef.current.setPointerCapture(event.pointerId)
                          }}
                          onDoubleClick={(event) => {
                            event.stopPropagation()
                            onPenNodeRemove(item.instance.id, index, pointIndex)
                          }}
                        />
                      ))}
                    </g>
                  ) : null
                )}
              {penDraft && penDraft.instanceId === item.instance.id && penDraft.points.length > 0 && (
                <g>
                  <polyline
                    points={penDraft.points.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke="#0891b2"
                    strokeWidth={Math.max(glyph.width, glyph.height) * 0.007}
                    strokeDasharray="10 6"
                  />
                  {penDraft.points.map((point, index) => (
                    <circle
                      key={`pen-point-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={Math.max(glyph.width, glyph.height) * 0.012}
                      fill={index === 0 ? '#f59e0b' : '#0891b2'}
                      opacity={0.9}
                    />
                  ))}
                </g>
              )}
              {penDraft && penDraft.instanceId === item.instance.id && penDraft.points.length > 2 && (
                <polyline
                  points={`${penDraft.points.map((point) => `${point.x},${point.y}`).join(' ')} ${penDraft.points[0].x},${penDraft.points[0].y}`}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={Math.max(glyph.width, glyph.height) * 0.005}
                  strokeDasharray="6 5"
                  opacity={0.75}
                />
              )}
            </g>
          )
        })}
        {/* Overlays for selected item are now handled in TransformPanel */}
      </svg>
    </div>
  )
}

export default EditorCanvas