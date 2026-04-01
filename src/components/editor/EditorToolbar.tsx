import * as React from 'react'
import {
  MdAdd,
  MdDelete,
  MdHistory,
  MdKeyboardArrowDown,
  MdOutlineLayers,
  MdOutlineSelectAll,
  MdRedo,
  MdRemove,
  MdUndo,
  MdZoomIn,
} from 'react-icons/md'

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
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: EditorToolbarProps) {
  const [openMenu, setOpenMenu] = React.useState<null | 'view' | 'rows' | 'history' | 'selection'>(null)
  const toolbarRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }

    if (openMenu) {
      document.addEventListener('mousedown', handleOutsideClick)
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [openMenu])

  const menuButtonClass =
    'flex items-center justify-center gap-1 rounded-full border border-emerald-900/30 bg-amber-50/60 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 lg:text-sm'

  const menuPanelClass =
      `absolute top-full mt-1 w-max rounded-xl border border-emerald-900/25 bg-white/90 p-3 shadow-lg z-10  `

  return (
    <div className="relative flex w-full flex-wrap items-center gap-2" ref={toolbarRef}>
      <div className="relative">
        <button
          type="button"
          className={menuButtonClass}
          onClick={() => setOpenMenu((prev) => (prev === 'view' ? null : 'view'))}
          aria-haspopup="true"
          aria-expanded={openMenu === 'view'}
        >
          <MdZoomIn size={18} />
          View
          <MdKeyboardArrowDown size={18} className={`transition-transform ${openMenu === 'view' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'view' && (
          <div className={menuPanelClass + 'left-0'}>
            <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
              Zoom
              <input
                className="w-28 rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
                type="number"
                step={0.05}
                min={0.1}
                max={1.6}
                value={Number(zoom.toFixed(2))}
                onChange={(event) => onZoomChange(Number(event.target.value) || 1)}
              />
            </label>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className={menuButtonClass}
          onClick={() => setOpenMenu((prev) => (prev === 'rows' ? null : 'rows'))}
          aria-haspopup="true"
          aria-expanded={openMenu === 'rows'}
        >
          <MdOutlineLayers size={18} />
          Rows
          <MdKeyboardArrowDown size={18} className={`transition-transform ${openMenu === 'rows' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'rows' && (
          <div className={menuPanelClass + 'left-0'}>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-700">
                Active Row
                <select
                  className="w-full rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
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
              <div className="flex gap-2">
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900"
                  onClick={onAddRow}
                  type="button"
                >
                  <MdAdd size={16} /> Add
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900"
                  onClick={onRemoveRow}
                  type="button"
                >
                  <MdRemove size={16} /> Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className={menuButtonClass}
          onClick={() => setOpenMenu((prev) => (prev === 'history' ? null : 'history'))}
          aria-haspopup="true"
          aria-expanded={openMenu === 'history'}
        >
          <MdHistory size={18} />
          History
          <MdKeyboardArrowDown size={18} className={`transition-transform ${openMenu === 'history' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'history' && (
          <div className={menuPanelClass + 'right-0 sm:left-0'}>
            <div className="flex gap-2">
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl/Cmd+Z)"
                type="button"
              >
                <MdUndo size={16} /> Undo
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl/Cmd+Shift+Z)"
                type="button"
              >
                <MdRedo size={16} /> Redo
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          className={menuButtonClass}
          onClick={() => setOpenMenu((prev) => (prev === 'selection' ? null : 'selection'))}
          aria-haspopup="true"
          aria-expanded={openMenu === 'selection'}
        >
          <MdOutlineSelectAll size={18} />
          Selection
          <MdKeyboardArrowDown size={18} className={`transition-transform ${openMenu === 'selection' ? 'rotate-180' : ''}`} />
        </button>
        {openMenu === 'selection' && (
          <div className={menuPanelClass + 'left-0'}>
            <div className="flex gap-2">
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900"
                onClick={onClearSelection}
                type="button"
              >
                <MdOutlineSelectAll size={16} /> Clear
              </button>
              <button
                className="flex flex-1 items-center justify-center gap-1 rounded-full border border-emerald-900/30 px-3 py-2 text-sm font-semibold text-emerald-900"
                onClick={onDelete}
                type="button"
              >
                <MdDelete size={16} /> Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditorToolbar
