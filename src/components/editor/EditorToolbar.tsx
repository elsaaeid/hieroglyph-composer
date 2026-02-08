type EditorToolbarProps = {
  zoom: number
  onZoomChange: (value: number) => void
  rowCount: number
  activeRow: number
  onActiveRowChange: (value: number) => void
  onAddRow: () => void
  onRemoveRow: () => void
  onClearSelection: () => void
  onDelete: () => void
}

function EditorToolbar({
  zoom,
  onZoomChange,
  rowCount,
  activeRow,
  onActiveRowChange,
  onAddRow,
  onRemoveRow,
  onClearSelection,
  onDelete,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
          Zoom
          <input
            className="w-24 rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
            type="number"
            step={0.05}
            min={0.4}
            max={1.6}
            value={Number(zoom.toFixed(2))}
            onChange={(event) => onZoomChange(Number(event.target.value) || 1)}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
          Row
          <select
            className="w-28 rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
            value={activeRow + 1}
            onChange={(event) => onActiveRowChange(Number(event.target.value) - 1)}
          >
            {Array.from({ length: rowCount }).map((_, index) => (
              <option key={`row-${index}`} value={index + 1}>
                Row {index + 1}
              </option>
            ))}
          </select>
        </label>
        <button
          className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
          onClick={onAddRow}
          type="button"
        >
          Add Row
        </button>
        <button
          className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
          onClick={onRemoveRow}
          type="button"
        >
          Remove Row
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
          onClick={onClearSelection}
        >
          Clear Selection
        </button>
        <button
          className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  )
}

export default EditorToolbar
