import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

type LayerEntry = {
  id: string
  label: string
  zIndex: number
  selected: boolean
}

type LayerPanelProps = {
  layers: LayerEntry[]
  onSelectLayer: (id: string, multi: boolean) => void
  onBringToFront: () => void
  onBringForward: () => void
  onSendBackward: () => void
  onSendToBack: () => void
  onLayerSelectOnly: (id: string) => void
  onLayerBringToFront: (id: string) => void
  onLayerBringForward: (id: string) => void
  onLayerSendBackward: (id: string) => void
  onLayerSendToBack: (id: string) => void
  onLayerDelete: (id: string) => void
}

function LayerPanel({
  layers,
  onSelectLayer,
  onBringToFront,
  onBringForward,
  onSendBackward,
  onSendToBack,
  onLayerSelectOnly,
  onLayerBringToFront,
  onLayerBringForward,
  onLayerSendBackward,
  onLayerSendToBack,
  onLayerDelete,
}: LayerPanelProps) {
  const hasLayers = layers.length > 0
  const selectedCount = layers.filter((layer) => layer.selected).length
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dropPosition, setDropPosition] = useState<'above' | 'below' | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef({ clientY: 0 })

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    window.addEventListener('mousedown', handleOutside)
    return () => window.removeEventListener('mousedown', handleOutside)
  }, [])

  const handleLayerDragStart = (event: React.DragEvent<HTMLDivElement>, layerId: string) => {
    setDraggedId(layerId)
    dragStartRef.current.clientY = event.clientY
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', layerId)
  }

  const handleLayerDragOver = (event: React.DragEvent<HTMLDivElement>, layerId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (draggedId && draggedId !== layerId) {
      setDragOverId(layerId)
      const rect = event.currentTarget.getBoundingClientRect()
      const midpoint = rect.top + rect.height / 2
      setDropPosition(event.clientY < midpoint ? 'above' : 'below')
    }
  }

  const handleLayerDragLeave = () => {
    setDragOverId(null)
    setDropPosition(null)
  }

  const handleLayerDrop = (event: React.DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      setDropPosition(null)
      return
    }

    const draggedIndex = layers.findIndex((l) => l.id === draggedId)
    const targetIndex = layers.findIndex((l) => l.id === targetId)

    if (draggedIndex < targetIndex) {
      // Dragged layer is above target, moving down
      if (dropPosition === 'below') {
        // Move down one position past target
        const stepsNeeded = targetIndex - draggedIndex + 1
        for (let i = 0; i < stepsNeeded; i++) {
          onLayerSendBackward(draggedId)
        }
      } else {
        // Move down to just above target
        const stepsNeeded = targetIndex - draggedIndex
        for (let i = 0; i < stepsNeeded; i++) {
          onLayerSendBackward(draggedId)
        }
      }
    } else {
      // Dragged layer is below target, moving up
      if (dropPosition === 'above') {
        // Move up to just above target
        const stepsNeeded = draggedIndex - targetIndex
        for (let i = 0; i < stepsNeeded; i++) {
          onLayerBringForward(draggedId)
        }
      } else {
        // Move up to just below target
        const stepsNeeded = draggedIndex - targetIndex - 1
        for (let i = 0; i < stepsNeeded; i++) {
          onLayerBringForward(draggedId)
        }
      }
    }

    setDraggedId(null)
    setDragOverId(null)
    setDropPosition(null)
  }

  const handleLayerDragEnd = () => {
    setDraggedId(null)
    setDragOverId(null)
    setDropPosition(null)
  }

  const openLayerMenu = (event: ReactMouseEvent<HTMLElement>, layerId: string) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({ id: layerId, x: event.clientX, y: event.clientY })
  }

  const runMenuAction = (action: () => void) => {
    action()
    setContextMenu(null)
  }

  return (
    <aside className="side-panel min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 overflow-hidden relative">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-emerald-950">Layers</h2>
        <p className="text-xs text-stone-600">
          {hasLayers ? `${layers.length} items on artboard` : 'No layers yet'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          className="rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
          onClick={onBringToFront}
          disabled={selectedCount === 0}
          type="button"
        >
          To Top
        </button>
        <button
          className="rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
          onClick={onBringForward}
          disabled={selectedCount === 0}
          type="button"
        >
          Up
        </button>
        <button
          className="rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
          onClick={onSendBackward}
          disabled={selectedCount === 0}
          type="button"
        >
          Down
        </button>
        <button
          className="rounded-lg border border-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
          onClick={onSendToBack}
          disabled={selectedCount === 0}
          type="button"
        >
          To Bottom
        </button>
      </div>

      <div className="grid gap-2 overflow-auto pr-1">
        {layers.map((layer) => (
          <div
            key={layer.id}
            draggable
            onDragStart={(event) => handleLayerDragStart(event, layer.id)}
            onDragOver={(event) => handleLayerDragOver(event, layer.id)}
            onDragLeave={handleLayerDragLeave}
            onDrop={(event) => handleLayerDrop(event, layer.id)}
            onDragEnd={handleLayerDragEnd}
            onClick={(event) => onSelectLayer(layer.id, event.ctrlKey || event.metaKey || event.shiftKey)}
            onContextMenu={(event) => openLayerMenu(event, layer.id)}
            className={`w-full rounded-xl border px-3 py-2 text-left text-xs transition hover:-translate-y-0.5 cursor-move relative ${
              layer.selected ? 'border-emerald-900 bg-emerald-900 text-amber-50' : 'border-emerald-900/20 bg-[#fdfbf5] text-emerald-950'
            } ${draggedId === layer.id ? 'opacity-50' : ''} ${
              dragOverId === layer.id && dropPosition === 'above'
                ? 'border-t-2 border-t-amber-400'
                : dragOverId === layer.id && dropPosition === 'below'
                  ? 'border-b-2 border-b-amber-400'
                  : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{layer.label}</div>
                <div className={`${layer.selected ? 'text-amber-100/90' : 'text-stone-500'}`}>Layer {layer.zIndex}</div>
              </div>
              <button
                type="button"
                className={`h-7 w-7 rounded-full border text-sm leading-none transition ${layer.selected ? 'border-amber-100/50 text-amber-50' : 'border-emerald-900/30 text-emerald-900'}`}
                onClick={(event) => openLayerMenu(event, layer.id)}
                aria-label="Layer options"
              >
                ...
              </button>
            </div>
          </div>
        ))}
      </div>

      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 w-44 rounded-xl border border-emerald-900/20 bg-white p-1 shadow-[0_16px_32px_rgba(27,26,23,0.2)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-950 hover:bg-emerald-50" onClick={() => runMenuAction(() => onLayerSelectOnly(contextMenu.id))} type="button">Select Only</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-950 hover:bg-emerald-50" onClick={() => runMenuAction(() => onLayerBringToFront(contextMenu.id))} type="button">Bring To Top</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-950 hover:bg-emerald-50" onClick={() => runMenuAction(() => onLayerBringForward(contextMenu.id))} type="button">Bring Forward</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-950 hover:bg-emerald-50" onClick={() => runMenuAction(() => onLayerSendBackward(contextMenu.id))} type="button">Send Backward</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-emerald-950 hover:bg-emerald-50" onClick={() => runMenuAction(() => onLayerSendToBack(contextMenu.id))} type="button">Send To Bottom</button>
          <button className="w-full rounded-lg px-3 py-2 text-left text-xs text-red-700 hover:bg-red-50" onClick={() => runMenuAction(() => onLayerDelete(contextMenu.id))} type="button">Delete Layer</button>
        </div>
      )}
    </aside>
  )
}

export default LayerPanel
