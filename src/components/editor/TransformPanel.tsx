import React from 'react'

interface TransformPanelProps {
  selectedCount: number;
  onFlipX: () => void;
  onFlipY: () => void;
  onCopyExternal: () => void;
  canEditImageColors?: boolean;
  canEditSvgActions?: boolean;
}

const TransformPanel: React.FC<TransformPanelProps> = ({
  selectedCount,
  onFlipX,
  onFlipY,
  onCopyExternal,
}) => {


  return (
    <aside className="side-panel transform-scroll min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 overflow-y-auto overflow-x-hidden z-20">
      <div>
        <h2 className="text-lg font-semibold text-emerald-950">Transform</h2>
      </div>

      {/* Flip Controls */}
      <div className="flex flex-wrap gap-2 pt-2">
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


      {/* Clipboard */}
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

      {/* Selection Info */}
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
