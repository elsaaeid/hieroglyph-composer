import type { GlyphDef, GlyphInstance } from './types'
import TransformStage from './TransformStage'

type TransformPanelProps = {
  selectedCount: number
  scaleValue: number | null
  onRotate: () => void
  onFlipX: () => void
  onFlipY: () => void
  onScale: (value: number) => void
  onCopyExternal: () => void
  selectedInstances: GlyphInstance[]
  glyphMap: Map<string, GlyphDef>
  cellStep: number
  onTranslate: (dx: number, dy: number) => void
  onSetRotate: (value: number) => void
  onSetScale: (value: number) => void
}

function TransformPanel({
  selectedCount,
  scaleValue,
  onRotate,
  onFlipX,
  onFlipY,
  onScale,
  onCopyExternal,
  selectedInstances,
  glyphMap,
  cellStep,
  onTranslate,
  onSetRotate,
  onSetScale,
}: TransformPanelProps) {
  return (
    <aside className="transform-scroll min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 sticky top-28 self-start max-h-[calc(100vh-140px)] overflow-y-auto overflow-x-hidden z-20 max-[1100px]:static max-[1100px]:max-h-none">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">Transform</h2>
        <p className="text-sm text-stone-600">Applies to selected glyphs.</p>
      </div>
      <TransformStage
        selected={selectedInstances}
        glyphMap={glyphMap}
        cellStep={cellStep}
        onTranslate={onTranslate}
        onSetRotate={onSetRotate}
        onSetScale={onSetScale}
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
          onClick={onRotate}
        >
          Rotate 90
        </button>
        <button
          className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
          onClick={onFlipX}
        >
          Flip H
        </button>
        <button
          className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
          onClick={onFlipY}
        >
          Flip V
        </button>
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
        Scale
        <input
          className="w-full rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
          type="range"
          min={0.5}
          max={1.8}
          step={0.05}
          value={scaleValue ?? 1}
          onChange={(event) => onScale(Number(event.target.value))}
          disabled={scaleValue === null}
        />
      </label>
      <div className="border-t border-emerald-900/15 pt-3">
        <h3 className="text-sm font-semibold text-emerald-950">Clipboard</h3>
        <p className="text-sm text-stone-600">Copying writes SVG markup to the clipboard.</p>
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
