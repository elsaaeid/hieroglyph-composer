type TransformPanelProps = {
  selectedCount: number
  offsetX: number | null
  offsetY: number | null
  rotateValue: number | null
  scaleValue: number | null
  onOffsetXChange: (value: number) => void
  onOffsetYChange: (value: number) => void
  onRotateChange: (value: number) => void
  onRotate: () => void
  onFlipX: () => void
  onFlipY: () => void
  onScale: (value: number) => void
  onCopyExternal: () => void
}

function TransformPanel({
  selectedCount,
  offsetX,
  offsetY,
  rotateValue,
  scaleValue,
  onOffsetXChange,
  onOffsetYChange,
  onRotateChange,
  onRotate,
  onFlipX,
  onFlipY,
  onScale,
  onCopyExternal,
}: TransformPanelProps) {
  return (
    <aside className="side-panel transform-scroll min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 overflow-y-auto overflow-x-hidden z-20">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">Transform</h2>
        <p className="text-xs text-stone-500">In-place transforms - no drift</p>
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
