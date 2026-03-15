import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

type TransformPanelProps = {
  selectedCount: number
  canEditImageColors: boolean
  canEditSvgActions: boolean
  magicWandMode: boolean
  penToolMode: boolean
  offsetX: number | null
  offsetY: number | null
  rotateValue: number | null
  scaleValue: number | null
  skewXValue: number | null
  skewYValue: number | null
  matrixValue: [number, number, number, number, number, number] | null
  brightnessValue: number | null
  contrastValue: number | null
  exposureValue: number | null
  hueValue: number | null
  saturationValue: number | null
  vibranceValue: number | null
  blurValue: number | null
  sharpenValue: number | null
  noiseValue: number | null
  onOffsetXChange: (value: number) => void
  onOffsetYChange: (value: number) => void
  onRotateChange: (value: number) => void
  onRotate: () => void
  onFlipX: () => void
  onFlipY: () => void
  onScale: (value: number) => void
  onSkewXChange: (value: number) => void
  onSkewYChange: (value: number) => void
  onMatrixChange: (value: [number, number, number, number, number, number]) => void
  onBrightnessChange: (value: number) => void
  onContrastChange: (value: number) => void
  onExposureChange: (value: number) => void
  onHueChange: (value: number) => void
  onSaturationChange: (value: number) => void
  onVibranceChange: (value: number) => void
  onBlurChange: (value: number) => void
  onSharpenChange: (value: number) => void
  onNoiseChange: (value: number) => void
  onRemoveBackground: () => void
  onRemoveSelectedRegion: () => void
  onMagicWand: () => void
  onPenToolToggle: () => void
  onApplyMethodsToSelection: () => void
  onImageReflectX: () => void
  onImageReflectY: () => void
  onImageZoomIn: () => void
  onImageZoomOut: () => void
  onSvgReflectX: () => void
  onSvgReflectY: () => void
  onSvgZoomIn: () => void
  onSvgZoomOut: () => void
  onReplaceBackgroundColor: (sourceColor: string, targetColor: string, tolerance: number) => void
  onReplaceColor: (sourceColor: string, targetColor: string, tolerance: number) => void
  onCopyExternal: () => void
}

type PreviewDragState = {
  mode: 'rotate' | 'scale'
  pointerId: number
  startX: number
  startY: number
  startOffsetX: number
  startOffsetY: number
  startRotate: number
  startScale: number
  centerX: number
  centerY: number
  startDistance: number
}

function TransformPanel({
  selectedCount,
  canEditImageColors,
  canEditSvgActions,
  magicWandMode,
  penToolMode,
  offsetX,
  offsetY,
  rotateValue,
  scaleValue,
  skewXValue,
  skewYValue,
  matrixValue,
  brightnessValue,
  contrastValue,
  exposureValue,
  hueValue,
  saturationValue,
  vibranceValue,
  blurValue,
  sharpenValue,
  noiseValue,
  onOffsetXChange,
  onOffsetYChange,
  onRotateChange,
  onRotate,
  onFlipX,
  onFlipY,
  onScale,
  onSkewXChange,
  onSkewYChange,
  onMatrixChange,
  onBrightnessChange,
  onContrastChange,
  onExposureChange,
  onHueChange,
  onSaturationChange,
  onVibranceChange,
  onBlurChange,
  onSharpenChange,
  onNoiseChange,
  onRemoveBackground,
  onRemoveSelectedRegion,
  onMagicWand,
  onPenToolToggle,
  onApplyMethodsToSelection,
  onImageReflectX,
  onImageReflectY,
  onImageZoomIn,
  onImageZoomOut,
  onSvgReflectX,
  onSvgReflectY,
  onSvgZoomIn,
  onSvgZoomOut,
  onReplaceBackgroundColor,
  onReplaceColor,
  onCopyExternal,
}: TransformPanelProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const borderRef = useRef<SVGRectElement | null>(null)
  const dragRef = useRef<PreviewDragState | null>(null)
  const previewCx = 90
  const previewCy = 90
  const rawOffsetX = offsetX ?? 0
  const rawOffsetY = offsetY ?? 0
  const previewOffsetX = Math.max(-36, Math.min(36, rawOffsetX * 0.35))
  const previewOffsetY = Math.max(-36, Math.min(36, rawOffsetY * 0.35))
  const matrix = matrixValue ?? [1, 0, 0, 1, 0, 0]
  const previewTransform = `translate(${previewOffsetX} ${previewOffsetY}) translate(${previewCx} ${previewCy}) matrix(${matrix.join(' ')}) skewY(${skewYValue ?? 0}) skewX(${skewXValue ?? 0}) rotate(${rotateValue ?? 0}) scale(${scaleValue ?? 1}) translate(${-previewCx} ${-previewCy})`

  const detectPreviewCenter = () => {
    const svg = svgRef.current
    const border = borderRef.current
    if (!svg || !border) {
      return {
        x: previewCx + previewOffsetX,
        y: previewCy + previewOffsetY,
      }
    }

    const bbox = border.getBBox()
    const borderMatrix = border.getScreenCTM()
    const svgMatrix = svg.getScreenCTM()
    if (!borderMatrix || !svgMatrix) {
      return {
        x: previewCx + previewOffsetX,
        y: previewCy + previewOffsetY,
      }
    }

    const toSvg = svgMatrix.inverse().multiply(borderMatrix)
    const corners = [
      new DOMPoint(bbox.x, bbox.y).matrixTransform(toSvg),
      new DOMPoint(bbox.x + bbox.width, bbox.y).matrixTransform(toSvg),
      new DOMPoint(bbox.x, bbox.y + bbox.height).matrixTransform(toSvg),
      new DOMPoint(bbox.x + bbox.width, bbox.y + bbox.height).matrixTransform(toSvg),
    ]
    const xs = corners.map((p) => p.x)
    const ys = corners.map((p) => p.y)
    return {
      x: (Math.min(...xs) + Math.max(...xs)) / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2,
    }
  }

  const getSvgPoint = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    if (!rect.width || !rect.height) return null
    const scaleX = 180 / rect.width
    const scaleY = 180 / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const startDrag = (
    event: ReactPointerEvent<SVGElement>,
    mode: PreviewDragState['mode']
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const svgEvent = event as unknown as ReactPointerEvent<SVGSVGElement>
    const point = getSvgPoint(svgEvent)
    const currentOffsetX = previewOffsetX
    const currentOffsetY = previewOffsetY
    const currentRotate = rotateValue ?? 0
    const currentScale = scaleValue ?? 1
    const detectedCenter = detectPreviewCenter()
    const centerX = detectedCenter.x
    const centerY = detectedCenter.y
    if (!point || !svgRef.current) return

    dragRef.current = {
      mode,
      pointerId: event.pointerId,
      startX: point.x,
      startY: point.y,
      startOffsetX: currentOffsetX,
      startOffsetY: currentOffsetY,
      startRotate: currentRotate,
      startScale: currentScale,
      centerX,
      centerY,
      startDistance: Math.max(1, Math.hypot(point.x - centerX, point.y - centerY)),
    }

    svgRef.current.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = getSvgPoint(event)
    if (!point) return

    if (drag.mode === 'rotate') {
      // Rotate by pointer movement directly to avoid center-angle coupling.
      const delta = (point.x - drag.startX) + (drag.startY - point.y)
      const next = ((drag.startRotate + delta) % 360 + 360) % 360
      onRotateChange(Math.round(next))
      return
    }

    const distance = Math.max(1, Math.hypot(point.x - drag.centerX, point.y - drag.centerY))
    const ratio = distance / drag.startDistance
    const nextScale = Math.min(1.8, Math.max(0.5, drag.startScale * ratio))
    onScale(Number(nextScale.toFixed(2)))
  }

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (svgRef.current && dragRef.current?.pointerId === event.pointerId) {
      svgRef.current.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
  }

  const hasSelection = selectedCount > 0
  const imageEditingEnabled = hasSelection && canEditImageColors
  const svgActionsEnabled = hasSelection && canEditSvgActions
  const [isImageActionsOpen, setIsImageActionsOpen] = useState(false)
  const [isSvgActionsOpen, setIsSvgActionsOpen] = useState(false)
  const [sourceColor, setSourceColor] = useState('#ffffff')
  const [targetColor, setTargetColor] = useState('#000000')
  const [colorTolerance, setColorTolerance] = useState(42)
  const updateMatrixAt = (index: number, value: number) => {
    const next = [...(matrixValue ?? [1, 0, 0, 1, 0, 0])] as [number, number, number, number, number, number]
    next[index] = value
    onMatrixChange(next)
  }

  return (
    <aside className="side-panel transform-scroll min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 overflow-y-auto overflow-x-hidden z-20">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">Transform</h2>
      </div>

      {/* Visual Transform Preview */}
      <div className="flex justify-center items-center py-4">
        <svg
          ref={svgRef}
          width="180"
          height="180"
          viewBox="0 0 180 180"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Border */}
          <rect
            ref={borderRef}
            x="30"
            y="30"
            width="120"
            height="120"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            rx="4"
            transform={previewTransform}
          />
          {/* Center point */}
          <circle
            cx="90"
            cy="90"
            r="8"
            fill="#2196f3"
            stroke="#1565c0"
            strokeWidth="2"
            opacity="0.7"
            transform={previewTransform}
          />
          {/* Axis guides */}
          <line
            x1="56"
            y1="90"
            x2="124"
            y2="90"
            stroke="#2563eb"
            strokeWidth="4"
            strokeLinecap="round"
            transform={previewTransform}
          />
          <line
            x1="90"
            y1="56"
            x2="90"
            y2="124"
            stroke="#0891b2"
            strokeWidth="4"
            strokeLinecap="round"
            transform={previewTransform}
          />
          {/* Rotation handle */}
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="40"
            stroke="#1d3b2f"
            strokeWidth="6"
            strokeLinecap="round"
            transform={previewTransform}
          />
          <rect
            x="80"
            y="25"
            width="20"
            height="20"
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth="8"
            rx="4"
            className="cursor-grab"
            transform={previewTransform}
            onPointerDown={(event) => {
              if (!hasSelection) return
              startDrag(event, 'rotate')
            }}
          />
          {/* Flip handles */}
          <rect
            x="25"
            y="80"
            width="20"
            height="20"
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth="8"
            rx="4"
            className="cursor-ew-resize"
            transform={previewTransform}
            onPointerDown={(event) => {
              if (!hasSelection) return
              startDrag(event, 'scale')
            }}
          />
          <rect
            x="135"
            y="80"
            width="20"
            height="20"
            fill="#fff"
            stroke="#3b82f6"
            strokeWidth="8"
            rx="4"
            className="cursor-ew-resize"
            transform={previewTransform}
            onPointerDown={(event) => {
              if (!hasSelection) return
              startDrag(event, 'scale')
            }}
          />
        </svg>
      </div>

      {/* Position Controls - X, Y */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-stone-700">X</span>
          <input
            type="number"
            value={Math.round((offsetX ?? 0) * 100) / 100}
            onChange={(e) => {
              const val = Math.min(100, Math.max(-100, Number(e.target.value)))
              onOffsetXChange(val)
            }}
            disabled={offsetX === null}
            className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            placeholder="X"
            min="-100"
            max="100"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-stone-700">Y</span>
          <input
            type="number"
            value={Math.round((offsetY ?? 0) * 100) / 100}
            onChange={(e) => {
              const val = Math.min(100, Math.max(-100, Number(e.target.value)))
              onOffsetYChange(val)
            }}
            disabled={offsetY === null}
            className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            placeholder="Y"
            min="-100"
            max="100"
          />
        </label>
      </div>

      {/* Rotation Control */}
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-700">Rotation</span>
          <span className="text-xs text-stone-500">°</span>
        </div>
        <input
          type="number"
          value={Math.round(rotateValue ?? 0)}
          onChange={(e) => {
            const val = ((Number(e.target.value) % 360) + 360) % 360
            onRotateChange(val)
          }}
          disabled={rotateValue === null}
          className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
          placeholder="0°"
          min="0"
          max="360"
        />
      </label>

      {/* Scale Control */}
      <label className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-700">Scale</span>
          <span className="text-xs text-stone-500">{((scaleValue ?? 1) * 100).toFixed(0)}%</span>
        </div>
        <input
          className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs text-emerald-900"
          type="range"
          min={0.5}
          max={1.8}
          step={0.05}
          value={scaleValue ?? 1}
          onChange={(event) => onScale(Number(event.target.value))}
          disabled={scaleValue === null}
        />
      </label>

      {/* Skew Controls */}
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-stone-700">SkewX</span>
          <input
            type="number"
            value={Math.round((skewXValue ?? 0) * 100) / 100}
            onChange={(e) => onSkewXChange(Number(e.target.value))}
            disabled={skewXValue === null}
            className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-stone-700">SkewY</span>
          <input
            type="number"
            value={Math.round((skewYValue ?? 0) * 100) / 100}
            onChange={(e) => onSkewYChange(Number(e.target.value))}
            disabled={skewYValue === null}
            className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
            placeholder="0"
          />
        </label>
      </div>

      {/* Matrix Control */}
      <div className="flex flex-col gap-2 rounded-xl border border-emerald-900/15 p-3">
        <div className="text-xs font-semibold text-stone-700">Matrix (a b c d e f)</div>
        <div className="grid grid-cols-3 gap-2">
          {['a', 'b', 'c', 'd', 'e', 'f'].map((label, index) => (
            <label key={label} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase text-stone-500">{label}</span>
              <input
                type="number"
                step="0.01"
                value={Math.round(((matrixValue ?? [1, 0, 0, 1, 0, 0])[index] ?? 0) * 100) / 100}
                onChange={(e) => updateMatrixAt(index, Number(e.target.value))}
                disabled={matrixValue === null}
                className="w-full rounded-lg border border-emerald-900/25 bg-amber-50/40 px-2 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
              />
            </label>
          ))}
        </div>
      </div>

      {/* Image actions */}
      <div className="border-t border-emerald-900/15 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">Image Actions</h3>
            <p className="text-xs text-stone-600">
              {imageEditingEnabled
                ? 'Use these controls for imported image editing and color operations.'
                : 'Select an imported image on the artboard to enable actions.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-emerald-900/30 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={() => setIsImageActionsOpen((prev) => !prev)}
            aria-expanded={isImageActionsOpen}
            title={isImageActionsOpen ? 'Hide image actions' : 'Show image actions'}
          >
            {isImageActionsOpen ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isImageActionsOpen && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Brightness</span>
              <input type="range" min={0} max={2} step={0.05} value={brightnessValue ?? 1} onChange={(e) => onBrightnessChange(Number(e.target.value))} disabled={brightnessValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Contrast</span>
              <input type="range" min={0} max={2} step={0.05} value={contrastValue ?? 1} onChange={(e) => onContrastChange(Number(e.target.value))} disabled={contrastValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Exposure</span>
              <input type="range" min={-1} max={1} step={0.05} value={exposureValue ?? 0} onChange={(e) => onExposureChange(Number(e.target.value))} disabled={exposureValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Hue</span>
              <input type="range" min={-180} max={180} step={1} value={hueValue ?? 0} onChange={(e) => onHueChange(Number(e.target.value))} disabled={hueValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Saturation</span>
              <input type="range" min={0} max={2} step={0.05} value={saturationValue ?? 1} onChange={(e) => onSaturationChange(Number(e.target.value))} disabled={saturationValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Vibrance</span>
              <input type="range" min={-1} max={1} step={0.05} value={vibranceValue ?? 0} onChange={(e) => onVibranceChange(Number(e.target.value))} disabled={vibranceValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Blur</span>
              <input type="range" min={0} max={20} step={0.5} value={blurValue ?? 0} onChange={(e) => onBlurChange(Number(e.target.value))} disabled={blurValue === null || !imageEditingEnabled} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Sharpen</span>
              <input type="range" min={0} max={2} step={0.05} value={sharpenValue ?? 0} onChange={(e) => onSharpenChange(Number(e.target.value))} disabled={sharpenValue === null || !imageEditingEnabled} />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="text-xs font-semibold text-stone-700">Noise</span>
              <input type="range" min={0} max={1} step={0.05} value={noiseValue ?? 0} onChange={(e) => onNoiseChange(Number(e.target.value))} disabled={noiseValue === null || !imageEditingEnabled} />
            </label>
          </div>

          <div className="rounded-xl border border-emerald-900/15 bg-amber-50/30 p-3 text-xs text-stone-600">
            AI subject/background, pen/lasso masks, layered compositing, and retouch brushes still require a dedicated image editor engine.
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onRemoveBackground}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Remove Background
            </button>
            <button
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${magicWandMode ? 'border-emerald-900 bg-emerald-900 text-amber-50' : 'border-emerald-900/30 text-emerald-900'}`}
              onClick={onMagicWand}
              disabled={false}
              type="button"
            >
              {magicWandMode ? 'Magic Wand: ON' : 'Magic Wand'}
            </button>
            <button
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:-translate-y-0.5 ${penToolMode ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-emerald-900/30 text-emerald-900'}`}
              onClick={onPenToolToggle}
              type="button"
            >
              {penToolMode ? 'Pen Tool: ON' : 'Pen Tool'}
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onRemoveSelectedRegion}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Remove Wand Selection
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onApplyMethodsToSelection}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Apply Light/Color To Selection
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onImageReflectX}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Reflect Image X
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onImageReflectY}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Reflect Image Y
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onImageZoomIn}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Image Zoom +
            </button>
            <button
              className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
              onClick={onImageZoomOut}
              disabled={!imageEditingEnabled}
              type="button"
            >
              Image Zoom -
            </button>
          </div>

          <div className="rounded-xl border border-emerald-900/15 p-3">
            <h4 className="text-xs font-semibold text-stone-700">Color Selection & Change</h4>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-stone-700">Source Color</span>
                <input
                  type="color"
                  value={sourceColor}
                  onChange={(e) => setSourceColor(e.target.value)}
                  disabled={!imageEditingEnabled}
                  className="h-9 w-full rounded-lg border border-emerald-900/25 bg-white"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-stone-700">Target Color</span>
                <input
                  type="color"
                  value={targetColor}
                  onChange={(e) => setTargetColor(e.target.value)}
                  disabled={!imageEditingEnabled}
                  className="h-9 w-full rounded-lg border border-emerald-900/25 bg-white"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-semibold text-stone-700">Tolerance: {colorTolerance}</span>
                <input
                  type="range"
                  min={0}
                  max={255}
                  step={1}
                  value={colorTolerance}
                  onChange={(e) => setColorTolerance(Number(e.target.value))}
                  disabled={!imageEditingEnabled}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
                onClick={() => onReplaceBackgroundColor(sourceColor, targetColor, colorTolerance)}
                disabled={!imageEditingEnabled}
                type="button"
              >
                Replace Background Color
              </button>
              <button
                className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
                onClick={() => onReplaceColor(sourceColor, targetColor, colorTolerance)}
                disabled={!imageEditingEnabled}
                type="button"
              >
                Replace Selected Color
              </button>
            </div>
          </div>
        </>
      )}

      {/* SVG actions */}
      <div className="border-t border-emerald-900/15 pt-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">SVG Actions</h3>
            <p className="text-xs text-stone-600">
              {svgActionsEnabled
                ? 'Use these controls for imported SVG transform-style actions.'
                : 'Select an imported SVG on the artboard to enable actions.'}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-emerald-900/30 px-3 py-1.5 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={() => setIsSvgActionsOpen((prev) => !prev)}
            aria-expanded={isSvgActionsOpen}
            title={isSvgActionsOpen ? 'Hide SVG actions' : 'Show SVG actions'}
          >
            {isSvgActionsOpen ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {isSvgActionsOpen && (
        <div className="flex flex-wrap gap-2">
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgReflectX}
            disabled={!svgActionsEnabled}
            type="button"
          >
            Reflect SVG Selection X
          </button>
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgReflectY}
            disabled={!svgActionsEnabled}
            type="button"
          >
            Reflect SVG Selection Y
          </button>
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgReflectX}
            disabled={!svgActionsEnabled}
            type="button"
          >
            Reflect SVG X
          </button>
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgReflectY}
            disabled={!svgActionsEnabled}
            type="button"
          >
            Reflect SVG Y
          </button>
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgZoomIn}
            disabled={!svgActionsEnabled}
            type="button"
            title="Ctrl/Cmd +"
          >
            SVG Zoom +
          </button>
          <button
            className="flex-1 rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onSvgZoomOut}
            disabled={!svgActionsEnabled}
            type="button"
            title="Ctrl/Cmd -"
          >
            SVG Zoom -
          </button>
        </div>
      )}

      {/* Transform Buttons - Row */}
      <div className="flex flex-wrap gap-2 pt-2">
        <button
          className="flex-1 rounded-lg bg-emerald-900 px-2 py-1.5 text-xs font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(29,59,47,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onRotate}
          disabled={selectedCount === 0}
          title="Rotate 90°"
        >
          ↻
        </button>
        <button
          className="flex-1 rounded-lg bg-emerald-900 px-2 py-1.5 text-xs font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(29,59,47,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onFlipX}
          disabled={selectedCount === 0}
          title="Flip horizontal"
        >
          ←→
        </button>
        <button
          className="flex-1 rounded-lg bg-emerald-900 px-2 py-1.5 text-xs font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_6px_12px_rgba(29,59,47,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onFlipY}
          disabled={selectedCount === 0}
          title="Flip vertical"
        >
          ↕
        </button>
      </div>
      <div className="border-t border-emerald-900/15 pt-3">
        <h3 className="text-sm font-semibold text-emerald-950">Clipboard</h3>
        <p className="text-sm text-stone-600">Copying writes SVG plus plain-text glyph ids.</p>
        <button
          className="mt-2 cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
          onClick={onCopyExternal}
        >
          Copy Sample Inline SVG
        </button>
      </div>
      <div className="border-t border-emerald-900/15 pt-3">
        <h3 className="text-sm font-semibold text-emerald-950">Selection</h3>
        <p className="text-sm text-stone-600">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Shift-click to multi-select glyphs.'}
        </p>
      </div>
    </aside>
  )
}

export default TransformPanel
