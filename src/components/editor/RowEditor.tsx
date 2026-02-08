import type { GlyphDef, GlyphInstance, LayoutItem } from './types'
import { QUADRAT } from './glyphData'
import { buildTransform } from './svgUtils'

type RowEditorProps = {
  rows: GlyphInstance[][]
  rowTexts: string[]
  glyphMap: Map<string, GlyphDef>
  selectedIds: string[]
  activeRowIndex: number
  onRowTextChange: (rowIndex: number, value: string) => void
  onSelect: (id: string, multi: boolean) => void
  onActiveRowChange: (rowIndex: number) => void
}

function RowEditor({
  rows,
  rowTexts,
  glyphMap,
  selectedIds,
  activeRowIndex,
  onRowTextChange,
  onSelect,
  onActiveRowChange,
}: RowEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((row, rowIndex) => (
        <section
          key={`row-${rowIndex}`}
          className="rounded-2xl border border-emerald-900/15 bg-white/80 p-4 shadow-sm"
        >
          <div className="flex items-center justify-between text-sm font-semibold text-emerald-950">
            <span>Row {rowIndex + 1}</span>
            {activeRowIndex === rowIndex && (
              <span className="rounded-full bg-emerald-900/10 px-3 py-1 text-xs font-semibold text-emerald-900">
                Active
              </span>
            )}
          </div>
          <textarea
            className="mt-3 w-full resize-none rounded-xl border border-emerald-900/20 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
            rows={2}
            value={rowTexts[rowIndex] ?? ''}
            placeholder="Paste full SVG markup for this row"
            onChange={(event) => onRowTextChange(rowIndex, event.target.value)}
            onFocus={() => onActiveRowChange(rowIndex)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {row.length === 0 && (
              <span className="text-xs text-stone-500">Empty row</span>
            )}
            {row.map((instance) => {
              const glyph = glyphMap.get(instance.glyphId)
              const isSelected = selectedIds.includes(instance.id)
              const previewItem: LayoutItem = {
                instance,
                row: 0,
                col: 0,
                x: 0,
                y: 0,
              }

              return (
                <button
                  key={instance.id}
                  type="button"
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? 'border-amber-400 bg-amber-100 text-emerald-900'
                      : 'border-emerald-900/20 bg-white text-emerald-900 hover:-translate-y-0.5'
                  }`}
                  onMouseDown={(event) => {
                    event.stopPropagation()
                    onSelect(instance.id, event.shiftKey || event.ctrlKey)
                  }}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-900/5">
                    {glyph ? (
                      <svg
                        viewBox={`0 0 ${QUADRAT} ${QUADRAT}`}
                        width="20"
                        height="20"
                        aria-hidden="true"
                        className="text-emerald-950"
                      >
                        <g transform={buildTransform(previewItem, glyph, QUADRAT)}>
                          <g dangerouslySetInnerHTML={{ __html: glyph.body }} />
                        </g>
                      </svg>
                    ) : (
                      <span className="text-[10px] text-stone-400">?</span>
                    )}
                  </span>
                  <span>{instance.glyphId}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export default RowEditor
