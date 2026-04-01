import { useEffect, useMemo, useRef, useState } from 'react'
import { JSESH_GLYPH_API_URL, PRESET_SCALES, QUADRAT, SAMPLE_EXTERNAL_SVG } from './glyphData'
import type { CopyPreset, ExportFormat, GlyphDef, GlyphInstance } from './types'
import {
  buildExportSvg,
  fetchGlyphDefinitionsFromApi,
  layoutRows,
  parseSvgFromHtml,
  parseSvgMarkup,
  readClipboard,
  writeClipboard,
  calculateSelectionCenter,
} from './svgUtils'
import EditorHeader from './EditorHeader'
import EditorToolbar from './EditorToolbar'
import EditorCanvas from './EditorCanvas.tsx'
import StatusBar from './StatusBar'
import LayerPanel from './LayerPanel'

function EditorApp() {
  type EditorSnapshot = {
    rows: GlyphInstance[][]
    customGlyphs: GlyphDef[]
    selectedIds: string[]
    activeRowIndex: number
  }

  const HISTORY_LIMIT = 80
  const [remoteGlyphs, setRemoteGlyphs] = useState<GlyphDef[]>([])
  const [customGlyphs, setCustomGlyphs] = useState<GlyphDef[]>([])
  const [rows, setRows] = useState<GlyphInstance[][]>([[]])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(0.34)
  const [status, setStatus] = useState('Ready')
  const [isLoadingGlyphs, setIsLoadingGlyphs] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [toast, setToast] = useState<string | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState(0)
  const [showPasteFallback, setShowPasteFallback] = useState(false)
  const [pasteFallbackText, setPasteFallbackText] = useState('')
  // Removed unused leftSidebarTab state
  const [magicWandMode, setMagicWandMode] = useState(false)
  const [penToolMode, setPenToolMode] = useState(false)
  const [undoStack, setUndoStack] = useState<EditorSnapshot[]>([])
  const [redoStack, setRedoStack] = useState<EditorSnapshot[]>([])
  // Removed unused isLeftSidebarCollapsed state
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(true)
  const applyingHistoryRef = useRef(false)
  const lastCheckpointRef = useRef<number>(0)
  const checkpointDebounceMs = 300
  const manualHistoryCommitRef = useRef(false)
  const lastSnapshotRef = useRef<EditorSnapshot | null>(null)
  const nextZIndexRef = useRef(1)

  const cloneValue = <T,>(value: T): T => {
    if (typeof structuredClone === 'function') {
      return structuredClone(value)
    }
    return JSON.parse(JSON.stringify(value)) as T
  }

  const createSnapshot = (): EditorSnapshot => ({
    rows: cloneValue(rows),
    customGlyphs: cloneValue(customGlyphs),
    selectedIds: [...selectedIds],
    activeRowIndex,
  })

  const applySnapshot = (snapshot: EditorSnapshot) => {
    applyingHistoryRef.current = true
    setRows(cloneValue(snapshot.rows))
    setCustomGlyphs(cloneValue(snapshot.customGlyphs))
    setSelectedIds([...snapshot.selectedIds])
    setActiveRowIndex(snapshot.activeRowIndex)
    lastSnapshotRef.current = cloneValue(snapshot)
  }

  const recordHistoryCheckpoint = () => {
    const baseline = cloneValue(lastSnapshotRef.current ?? createSnapshot())
    setUndoStack((prev) => {
      const next = [...prev, baseline]
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
    })
    setRedoStack([])
    manualHistoryCommitRef.current = true
    lastCheckpointRef.current = Date.now()
  }

  const recordHistoryCheckpointIfNeeded = () => {
    const now = Date.now()
    if (now - lastCheckpointRef.current > checkpointDebounceMs) {
      recordHistoryCheckpoint()
    }
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current))
    }, 2600)
  }

  useEffect(() => {
    let isMounted = true

    const loadGlyphs = async () => {
      try {
        setIsLoadingGlyphs(true)
        setStatus('Loading JSesh glyph list...')
        const loaded = await fetchGlyphDefinitionsFromApi(JSESH_GLYPH_API_URL, {
          batchSize: 24,
          onProgress: (count, total) => {
            setStatus(`Loaded ${count} of ${total} JSesh glyphs`)
          },
        })
        if (isMounted) {
          setRemoteGlyphs(loaded)
          setStatus(`Loaded ${loaded.length} JSesh glyphs`)
        }
      } catch (error) {
        if (isMounted) {
          setStatus('Failed to load JSesh glyphs')
        }
        console.error(error)
      } finally {
        if (isMounted) {
          setIsLoadingGlyphs(false)
        }
      }
    }

    loadGlyphs()
    return () => {
      isMounted = false
    }
  }, [])

  const glyphs = useMemo(() => [...remoteGlyphs, ...customGlyphs], [remoteGlyphs, customGlyphs])
  const glyphMap = useMemo(() => new Map(glyphs.map((glyph) => [glyph.id, glyph])), [glyphs])

  const filteredGlyphs = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return glyphs
    return glyphs.filter((glyph) => `${glyph.id} ${glyph.name}`.toLowerCase().includes(term))
  }, [glyphs, search])

  const pageCount = Math.max(1, Math.ceil(filteredGlyphs.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * pageSize
  const pagedGlyphs = filteredGlyphs.slice(pageStart, pageStart + pageSize)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (!lastSnapshotRef.current) {
      lastSnapshotRef.current = createSnapshot()
      return
    }

    if (applyingHistoryRef.current) {
      applyingHistoryRef.current = false
      return
    }

    if (manualHistoryCommitRef.current) {
      manualHistoryCommitRef.current = false
      lastSnapshotRef.current = createSnapshot()
      return
    }

    setUndoStack((prev) => {
      const baseline = cloneValue(lastSnapshotRef.current as EditorSnapshot)
      const next = [...prev, baseline]
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
    })
    setRedoStack([])
    lastSnapshotRef.current = createSnapshot()
    // Track content and selection context for undo/redo.
  }, [rows, customGlyphs, selectedIds, activeRowIndex])

  const handleUndo = () => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev
      const snapshot = prev[prev.length - 1]
      const remaining = prev.slice(0, -1)
      const current = createSnapshot()
      setRedoStack((redoPrev) => {
        const next = [...redoPrev, current]
        return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
      })
      applySnapshot(snapshot)
      return remaining
    })
  }

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev
      const snapshot = prev[prev.length - 1]
      const remaining = prev.slice(0, -1)
      const current = createSnapshot()
      setUndoStack((undoPrev) => {
        const next = [...undoPrev, current]
        return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
      })
      applySnapshot(snapshot)
      return remaining
    })
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasCtrl = event.ctrlKey || event.metaKey
      if (!hasCtrl) return
      const key = event.key.toLowerCase()
      const code = event.code
      const isZ = key === 'z' || code === 'KeyZ'
      const isY = key === 'y' || code === 'KeyY'

      if (isZ && event.shiftKey) {
        event.preventDefault()
        handleRedo()
        return
      }

      if (isZ) {
        event.preventDefault()
        handleUndo()
        return
      }

      if (isY) {
        event.preventDefault()
        handleRedo()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleUndo, handleRedo])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  const maxScale = useMemo(() => {
    if (rows.length === 0) return 1
    return Math.max(
      1,
      ...rows.flat().map((instance) => Math.max(instance.scale, instance.scaleX, instance.scaleY))
    )
  }, [rows])
  const cellStep = QUADRAT * maxScale * 1.1
  const layout = useMemo(() => layoutRows(rows, cellStep), [rows, cellStep])
  const rowCount = Math.max(1, rows.length)
  const colCount = Math.max(1, ...rows.map((row) => row.length))
  const minimumArtboardCols = 7
  const minimumArtboardRows = 5
  const viewWidth = Math.max(colCount, minimumArtboardCols) * cellStep
  const viewHeight = Math.max(rowCount, minimumArtboardRows) * cellStep

  const selectedInstances = useMemo(
    () => rows.flat().filter((instance) => selectedIds.includes(instance.id)),
    [rows, selectedIds]
  )

  useEffect(() => {
    const maxZ = rows.flat().reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0)
    if (nextZIndexRef.current <= maxZ) {
      nextZIndexRef.current = maxZ + 1
    }
  }, [rows])
  const primarySelection = selectedInstances[0]
  const isRasterImportedGlyph = (glyph: GlyphDef | undefined) => {
    if (!glyph || glyph.source !== 'imported') return false
    return /<image[\s>]/i.test(glyph.body)
  }

  const canEditImageColors = useMemo(() => {
    if (!primarySelection) return false
    const glyph = glyphMap.get(primarySelection.glyphId)
    return isRasterImportedGlyph(glyph)
  }, [primarySelection, glyphMap])

  const canEditSvgActions = useMemo(() => {
    return Boolean(primarySelection)
  }, [primarySelection])

  const newInstanceId = () => `instance-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createInstance = (glyphId: string): GlyphInstance => {
    // Check glyph size and auto-scale if too large
    const glyph = glyphMap.get(glyphId)
    let initialScale = 1
    
    if (glyph) {
      const fitScale = QUADRAT / Math.max(glyph.width, glyph.height)
      const glyphWidth = glyph.width * fitScale
      const glyphHeight = glyph.height * fitScale
      
      // If glyph is larger than 50% of the artboard, scale it down
      const maxAllowedSize = Math.max(glyphWidth, glyphHeight)
      const artboardSize = Math.min(1200, 800) // Reasonable artboard max size
      
      if (maxAllowedSize > artboardSize * 0.5) {
        initialScale = (artboardSize * 0.5) / maxAllowedSize
        initialScale = Math.max(0.1, Math.min(1, initialScale)) // Clamp between 0.1 and 1
      }
    }
    
    return {
      id: newInstanceId(),
      glyphId,
      zIndex: nextZIndexRef.current++,
      rotate: 0,
      flipX: false,
      flipY: false,
      scale: initialScale,
      scaleX: initialScale,
      scaleY: initialScale,
      skewX: 0,
      skewY: 0,
      matrixA: 1,
      matrixB: 0,
      matrixC: 0,
      matrixD: 1,
      matrixE: 0,
      matrixF: 0,
      brightness: 1,
      contrast: 1,
      exposure: 0,
      hue: 0,
      saturation: 1,
      vibrance: 0,
      blur: 0,
      sharpen: 0,
      noise: 0,
      offsetX: 0,
      offsetY: 0,
    }
  }

  const shortenLayerLabel = (label: string, maxLength = 20) => {
    const clean = label.trim()
    if (clean.length <= maxLength) return clean
    const head = Math.max(8, Math.floor((maxLength - 3) * 0.65))
    const tail = Math.max(4, maxLength - 3 - head)
    return `${clean.slice(0, head)}...${clean.slice(-tail)}`
  }

  const layerEntries = useMemo(() => {
    return rows
      .flat()
      .map((instance, index) => {
        const glyph = glyphMap.get(instance.glyphId)
        const importedName = glyph?.source === 'imported'
          ? (glyph.name || glyph.id).replace(/\.[a-zA-Z0-9]{2,5}$/u, '')
          : null
        const baseLabel = importedName
          ? importedName
          : glyph
            ? `${glyph.id}${glyph.name ? ` - ${glyph.name}` : ''}`
            : instance.glyphId
        return {
          id: instance.id,
          label: shortenLayerLabel(baseLabel),
          zIndex: instance.zIndex ?? index,
          sortIndex: index,
          selected: selectedIds.includes(instance.id),
        }
      })
      .sort((a, b) => b.zIndex - a.zIndex || b.sortIndex - a.sortIndex)
  }, [rows, glyphMap, selectedIds])

  const reorderLayersByIds = (ids: string[], mode: 'top' | 'up' | 'down' | 'bottom') => {
    recordHistoryCheckpoint()
    if (ids.length === 0) return
    const selectedSet = new Set(ids)

    setRows((prev) => {
      const ordered = prev
        .flat()
        .map((item, index) => ({ id: item.id, zIndex: item.zIndex ?? index, index }))
        .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index)
        .map((entry) => entry.id)

      let nextOrder = [...ordered]
      if (mode === 'top') {
        nextOrder = [
          ...ordered.filter((id) => !selectedSet.has(id)),
          ...ordered.filter((id) => selectedSet.has(id)),
        ]
      } else if (mode === 'bottom') {
        nextOrder = [
          ...ordered.filter((id) => selectedSet.has(id)),
          ...ordered.filter((id) => !selectedSet.has(id)),
        ]
      } else if (mode === 'up') {
        for (let i = nextOrder.length - 2; i >= 0; i -= 1) {
          const currentSelected = selectedSet.has(nextOrder[i])
          const nextSelected = selectedSet.has(nextOrder[i + 1])
          if (currentSelected && !nextSelected) {
            ;[nextOrder[i], nextOrder[i + 1]] = [nextOrder[i + 1], nextOrder[i]]
          }
        }
      } else {
        for (let i = 1; i < nextOrder.length; i += 1) {
          const currentSelected = selectedSet.has(nextOrder[i])
          const previousSelected = selectedSet.has(nextOrder[i - 1])
          if (currentSelected && !previousSelected) {
            ;[nextOrder[i], nextOrder[i - 1]] = [nextOrder[i - 1], nextOrder[i]]
          }
        }
      }

      const zById = new Map(nextOrder.map((id, index) => [id, index + 1]))
      return prev.map((row) =>
        row.map((item) => ({
          ...item,
          zIndex: zById.get(item.id) ?? item.zIndex ?? 0,
        }))
      )
    })

    if (mode === 'top') setStatus('Moved layer to top')
    else if (mode === 'bottom') setStatus('Moved layer to bottom')
    else if (mode === 'up') setStatus('Moved layer up')
    else setStatus('Moved layer down')
  }

  const reorderSelectedLayers = (mode: 'top' | 'up' | 'down' | 'bottom') => {
    reorderLayersByIds(selectedIds, mode)
  }

  const handleBringLayerToTop = () => reorderSelectedLayers('top')
  const handleBringLayerUp = () => reorderSelectedLayers('up')
  const handleBringLayerDown = () => reorderSelectedLayers('down')
  const handleSendLayerToBottom = () => reorderSelectedLayers('bottom')

  const handleLayerBringToFront = (layerId: string) => reorderLayersByIds([layerId], 'top')
  const handleLayerBringForward = (layerId: string) => reorderLayersByIds([layerId], 'up')
  const handleLayerSendBackward = (layerId: string) => reorderLayersByIds([layerId], 'down')
  const handleLayerSendToBack = (layerId: string) => reorderLayersByIds([layerId], 'bottom')

  const handleLayerDelete = (layerId: string) => {
    setRows((prev) => prev.map((row) => row.filter((item) => item.id !== layerId)))
    setSelectedIds((prev) => prev.filter((id) => id !== layerId))
    setStatus('Layer deleted')
  }

  const handleLayerSelectOnly = (layerId: string) => {
    setSelectedIds([layerId])
  }


  const setSelection = (id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi) {
        if (prev.includes(id)) return prev.filter((item) => item !== id)
        return [...prev, id]
      }
      return [id]
    })
  }

  const setSelectionIds = (ids: string[]) => {
    setSelectedIds(ids)
  }

  const clearSelection = () => setSelectedIds([])

  const addGlyph = (glyphId: string) => {
    recordHistoryCheckpoint()
    setRows((prev) =>
      prev.map((row, index) => (index === activeRowIndex ? [...row, createInstance(glyphId)] : row))
    )
    setStatus(`Inserted ${glyphId}`)
  }

  const handleDropGlyph = (glyphId: string, _dropX: number, dropY: number) => {
    const rowIndex = Math.max(0, Math.round(dropY / cellStep))

    setRows((prev) => {
      const next = [...prev]
      // Ensure enough rows exist
      while (next.length <= rowIndex) {
        next.push([])
      }
      // Add the glyph instance to the target row
      next[rowIndex] = [...next[rowIndex], createInstance(glyphId)]
      return next
    })
    setStatus(`Dropped ${glyphId}`)
  }

  const handleDropFiles = async (files: FileList, _dropX: number, dropY: number) => {
    const rowIndex = Math.max(0, Math.round(dropY / cellStep))

    try {
      const list = Array.from(files)
      const imported = (await Promise.all(list.map((file) => importImageFile(file)))).filter(Boolean) as GlyphDef[]
      if (imported.length === 0) {
        setStatus('No importable image files selected')
        return
      }

      recordHistoryCheckpoint()
      setCustomGlyphs((prev) => [...prev, ...imported])
      setRows((prev) => {
        const next = [...prev]
        // Ensure enough rows exist
        while (next.length <= rowIndex) {
          next.push([])
        }
        // Add imported glyphs to the target row
        const newInstances = imported.map((glyph) => createInstance(glyph.id))
        next[rowIndex] = [...next[rowIndex], ...newInstances]
        return next
      })

      const message = `Imported ${imported.length} image file${imported.length > 1 ? 's' : ''}`
      setStatus(message)
      showToast(message)
    } catch (error) {
      setStatus('File import failed')
      showToast('File import failed')
      console.error(error)
    }
  }

  const addRow = () => {
    setRows((prev) => [...prev, []])
    setActiveRowIndex((prev) => prev + 1)
    setStatus('Added new row')
  }

  const removeRow = () => {
    setRows((prev) => {
      if (prev.length <= 1) return prev
      const next = prev.filter((_, index) => index !== activeRowIndex)
      return next.length > 0 ? next : [[]]
    })
    setActiveRowIndex((prev) => (prev > 0 ? prev - 1 : 0))
    setStatus('Removed row')
  }

  const applyToSelected = (updater: (instance: GlyphInstance) => GlyphInstance) => {
    if (selectedIds.length === 0) return
    // Calculate selection center for selected items
    const selectedLayoutItems = layout.filter((item) => selectedIds.includes(item.instance.id))
    const selectionCenter = selectedLayoutItems.length > 0 ? calculateSelectionCenter(selectedLayoutItems, glyphMap, cellStep) : null
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (selectedIds.includes(item.id)) {
            // Attach selectionCenter to instance for transform
            return {
              ...updater(item),
              selectionCenter: selectionCenter || undefined,
            }
          }
          return item
        })
      )
    )
  }

  const handleRotate = () => {
    recordHistoryCheckpoint()
    applyToSelected((item) => ({
      ...item,
      rotate: (item.rotate + 90) % 360,
    }))
    setStatus('Rotate 90°')
  }



  const handleTranslate = (deltaX: number, deltaY: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({
      ...item,
      offsetX: (item.offsetX ?? 0) + deltaX,
      offsetY: (item.offsetY ?? 0) + deltaY,
    }))
  }

  const handleSetRotate = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, rotate: value }))
  }

  const handleSetScale = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({
      ...item,
      scale: value,
      scaleX: value,
      scaleY: value,
    }))
  }

  const handleSetScaleX = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, scaleX: value }))
  }

  const handleSetScaleY = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, scaleY: value }))
  }

  const handleSetOffsetX = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, offsetX: value }))
  }

  const handleSetOffsetY = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, offsetY: value }))
  }

  const handleSetSkewX = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, skewX: value }))
  }

  const handleSetSkewY = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, skewY: value }))
  }



  const handleSetBrightness = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, brightness: value }))
  }

  const handleSetContrast = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, contrast: value }))
  }

  const handleSetExposure = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, exposure: value }))
  }

  const handleSetHue = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, hue: value }))
  }

  const handleSetSaturation = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, saturation: value }))
  }

  const handleSetVibrance = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, vibrance: value }))
  }

  const handleSetBlur = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, blur: value }))
  }

  const handleSetSharpen = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, sharpen: value }))
  }

  const handleSetNoise = (value: number) => {
    recordHistoryCheckpointIfNeeded()
    applyToSelected((item) => ({ ...item, noise: value }))
  }

  const getSelectedImportedImageIds = () =>
    new Set(
      rows
        .flat()
        .filter((instance) => selectedIds.includes(instance.id))
        .filter((instance) => {
          const glyph = glyphMap.get(instance.glyphId)
          return isRasterImportedGlyph(glyph)
        })
        .map((instance) => instance.id)
    )

  const applyToSelectedImages = (
    update: (item: GlyphInstance) => GlyphInstance,
    actionLabel: string
  ) => {
    const selectedImageIds = getSelectedImportedImageIds()
    if (selectedImageIds.size === 0) {
      setStatus('Select an imported image glyph first')
      return
    }

    recordHistoryCheckpoint()
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (!selectedImageIds.has(item.id)) return item
          const updated = update(item)
          // Avoid using stale multi-selection pivot which can make media appear to drift.
          return {
            ...updated,
            selectionCenter: undefined,
          }
        })
      )
    )
    setStatus(actionLabel)
  }

  const handleImageReflectX = () => {
    applyToSelectedImages((item) => ({ ...item, flipX: !item.flipX }), 'Image reflection X applied')
  }

  const handleImageReflectY = () => {
    applyToSelectedImages((item) => ({ ...item, flipY: !item.flipY }), 'Image reflection Y applied')
  }

  const zoomSelectedImages = (factor: number) => {
    const clampScale = (value: number) => Math.max(0.1, Math.min(8, Number(value.toFixed(3))))
    applyToSelectedImages(
      (item) => ({
        ...item,
        scale: clampScale((item.scale ?? 1) * factor),
        scaleX: clampScale((item.scaleX ?? item.scale ?? 1) * factor),
        scaleY: clampScale((item.scaleY ?? item.scale ?? 1) * factor),
      }),
      `Image zoom ${factor > 1 ? 'in' : 'out'} applied`
    )
  }

  const handleZoomImageIn = () => {
    zoomSelectedImages(1.1)
  }

  const handleZoomImageOut = () => {
    zoomSelectedImages(1 / 1.1)
  }

  const getSelectedSvgIds = () =>
    new Set(
      rows
        .flat()
        .filter((instance) => selectedIds.includes(instance.id))
        .map((instance) => instance.id)
    )

  const applyToSelectedSvgs = (
    update: (item: GlyphInstance) => GlyphInstance,
    actionLabel: string
  ) => {
    const selectedSvgIds = getSelectedSvgIds()
    if (selectedSvgIds.size === 0) {
      setStatus('Select a glyph first')
      return
    }

    recordHistoryCheckpoint()
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (!selectedSvgIds.has(item.id)) return item
          const updated = update(item)
          // Avoid using stale multi-selection pivot which can make media appear to drift.
          return {
            ...updated,
            selectionCenter: undefined,
          }
        })
      )
    )
    setStatus(actionLabel)
  }

  const handleSvgReflectX = () => {
    applyToSelectedSvgs((item) => ({ ...item, flipX: !item.flipX }), 'SVG reflection X applied')
  }

  const handleSvgReflectY = () => {
    applyToSelectedSvgs((item) => ({ ...item, flipY: !item.flipY }), 'SVG reflection Y applied')
  }

  const zoomSelectedSvgs = (factor: number) => {
    const clampScale = (value: number) => Math.max(0.1, Math.min(8, Number(value.toFixed(3))))
    applyToSelectedSvgs(
      (item) => ({
        ...item,
        scale: clampScale((item.scale ?? 1) * factor),
        scaleX: clampScale((item.scaleX ?? item.scale ?? 1) * factor),
        scaleY: clampScale((item.scaleY ?? item.scale ?? 1) * factor),
      }),
      `SVG zoom ${factor > 1 ? 'in' : 'out'} applied`
    )
  }

  const handleSvgZoomIn = () => {
    zoomSelectedSvgs(1.1)
  }

  const handleSvgZoomOut = () => {
    zoomSelectedSvgs(1 / 1.1)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hasCtrl = event.ctrlKey || event.metaKey
      if (!hasCtrl) return

      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      const key = event.key
      const isZoomIn = key === '+' || (key === '=' && event.shiftKey) || event.code === 'NumpadAdd'
      const isZoomOut = key === '-' || key === '_' || event.code === 'NumpadSubtract'

      if (isZoomIn) {
        event.preventDefault()
        if (getSelectedImportedImageIds().size > 0) {
          handleZoomImageIn()
        } else {
          handleSvgZoomIn()
        }
        return
      }

      if (isZoomOut) {
        event.preventDefault()
        if (getSelectedImportedImageIds().size > 0) {
          handleZoomImageOut()
        } else {
          handleSvgZoomOut()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [rows, selectedIds, glyphMap])

  const getImageHref = (body: string): string | null => {
    const match = body.match(/href\s*=\s*"([^"]+)"/i)
    return match?.[1] ?? null
  }

  const buildGlyphSvgMarkup = (glyph: GlyphDef) => {
    const width = Math.max(1, glyph.width || glyph.contentWidth || 1)
    const height = Math.max(1, glyph.height || glyph.contentHeight || 1)
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${glyph.viewBox}" width="${width}" height="${height}">
        ${glyph.body}
      </svg>
    `.trim()
  }

  const getProcessableGlyphDataUrl = (glyph: GlyphDef): string | null => {
    const href = getImageHref(glyph.body)
    if (href && href.startsWith('data:image')) {
      return href
    }
    if (glyph.source !== 'imported') {
      return null
    }
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildGlyphSvgMarkup(glyph))}`
  }

  const buildProcessedImageGlyph = (glyph: GlyphDef, nextGlyphId: string, nextUrl: string): GlyphDef => {
    const width = Math.max(1, glyph.width || glyph.contentWidth || 1)
    const height = Math.max(1, glyph.height || glyph.contentHeight || 1)
    return {
      ...glyph,
      id: nextGlyphId,
      body: `<image href="${nextUrl}" xlink:href="${nextUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`,
      source: 'imported',
    }
  }

  const processImageDataUrl = async (
    dataUrl: string,
    processor: (ctx: CanvasRenderingContext2D, width: number, height: number) => void
  ) => {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Failed to decode selected image'))
      image.src = dataUrl
    })

    const width = Math.max(1, img.naturalWidth)
    const height = Math.max(1, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context unavailable')
    ctx.drawImage(img, 0, 0, width, height)
    processor(ctx, width, height)
    return canvas.toDataURL('image/png')
  }

  const buildMagicSelectionMask = (
    instance: GlyphInstance,
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { mask: Uint8Array; bounds?: { x: number; y: number; width: number; height: number } } | null => {
    const idx = (x: number, y: number) => (y * width + x) * 4
    const seeds =
      instance.magicSelectionSeeds && instance.magicSelectionSeeds.length > 0
        ? instance.magicSelectionSeeds
        : instance.magicSelectionSeed
          ? [instance.magicSelectionSeed]
          : []
    if (seeds.length === 0) return null

    const mask = new Uint8Array(width * height)
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (const seed of seeds) {
      const seedX = Math.max(0, Math.min(width - 1, Math.round(seed.x)))
      const seedY = Math.max(0, Math.min(height - 1, Math.round(seed.y)))
      const seedIdx = idx(seedX, seedY)
      const sr = data[seedIdx]
      const sg = data[seedIdx + 1]
      const sb = data[seedIdx + 2]

      const visited = new Uint8Array(width * height)
      const stack: Array<[number, number]> = [[seedX, seedY]]

      while (stack.length > 0) {
        const [x, y] = stack.pop() as [number, number]
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        const vi = y * width + x
        if (visited[vi]) continue
        visited[vi] = 1
        const i = idx(x, y)
        if (data[i + 3] === 0) continue
        const dist = Math.hypot(data[i] - sr, data[i + 1] - sg, data[i + 2] - sb)
        if (dist > seed.tolerance) continue

        mask[vi] = 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)

        stack.push([x + 1, y])
        stack.push([x - 1, y])
        stack.push([x, y + 1])
        stack.push([x, y - 1])
      }
    }

    const bounds =
      maxX >= minX && maxY >= minY
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : undefined

    return { mask, bounds }
  }

  const buildPenSelectionMask = (
    instance: GlyphInstance,
    width: number,
    height: number
  ): { mask: Uint8Array; bounds?: { x: number; y: number; width: number; height: number } } | null => {
    const paths = [
      ...(instance.penSelectionPaths ?? []),
      ...(instance.penSelectionPath && instance.penSelectionPath.length > 2
        ? [instance.penSelectionPath]
        : []),
    ].filter((path) => path.length > 2)
    if (paths.length === 0) return null

    const pointInPolygon = (path: Array<{ x: number; y: number }>, x: number, y: number) => {
      let inside = false
      for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
        const xi = path[i].x
        const yi = path[i].y
        const xj = path[j].x
        const yj = path[j].y
        const intersect =
          yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi
        if (intersect) inside = !inside
      }
      return inside
    }

    const mask = new Uint8Array(width * height)
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const isInsideAnyPath = paths.some((path) => pointInPolygon(path, x + 0.5, y + 0.5))
        if (!isInsideAnyPath) continue
        const vi = y * width + x
        mask[vi] = 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }

    const bounds =
      maxX >= minX && maxY >= minY
        ? {
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
          }
        : undefined

    return { mask, bounds }
  }

  const combineMasks = (a: Uint8Array | null, b: Uint8Array | null): Uint8Array | null => {
    if (!a && !b) return null
    if (a && !b) return a
    if (!a && b) return b
    const out = new Uint8Array(a!.length)
    for (let i = 0; i < out.length; i += 1) {
      out[i] = a![i] || b![i] ? 1 : 0
    }
    return out
  }

  const applyImageProcessorToSelection = async (
    processor: (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      instance: GlyphInstance,
      mask: Uint8Array | null
    ) => void,
    actionLabel: string,
    options?: { requireSelectionMask?: boolean }
  ) => {
    const selectedImageInstances = selectedInstances.filter((instance) => {
      const glyph = glyphMap.get(instance.glyphId)
      return Boolean(glyph && glyph.source === 'imported')
    })

    if (selectedImageInstances.length === 0) {
      setStatus('Select an imported image or SVG glyph first')
      return
    }

    try {
      const updates = await Promise.all(
        selectedImageInstances.map(async (instance) => {
          const glyph = glyphMap.get(instance.glyphId)
          if (!glyph) return null
          const href = getProcessableGlyphDataUrl(glyph)
          if (!href) return null

          let nextBounds: { x: number; y: number; width: number; height: number } | undefined
          const nextUrl = await processImageDataUrl(href, (ctx, width, height) => {
            const imageData = ctx.getImageData(0, 0, width, height)
            const magicMaskInfo = buildMagicSelectionMask(instance, imageData.data, width, height)
            const penMaskInfo = buildPenSelectionMask(instance, width, height)
            const mergedMask = combineMasks(magicMaskInfo?.mask ?? null, penMaskInfo?.mask ?? null)
            const mergedBounds =
              magicMaskInfo?.bounds ??
              penMaskInfo?.bounds ??
              instance.magicSelectionBounds
            if (options?.requireSelectionMask && !mergedMask) {
              return
            }
            nextBounds = mergedBounds
            processor(ctx, width, height, instance, mergedMask)
          })

          const newGlyphId = `IMG_EDIT_${Date.now()}_${Math.random().toString(16).slice(2)}`
          const updatedGlyph = buildProcessedImageGlyph(glyph, newGlyphId, nextUrl)

          return {
            instanceId: instance.id,
            glyph: updatedGlyph,
            bounds: nextBounds,
            seed: instance.magicSelectionSeed,
          }
        })
      )

      const valid = updates.filter(Boolean) as Array<{
        instanceId: string
        glyph: GlyphDef
        bounds?: { x: number; y: number; width: number; height: number }
        seed?: { x: number; y: number; tolerance: number }
      }>

      if (valid.length === 0) {
        if (options?.requireSelectionMask) {
          setStatus('Create a magic or pen selection on the imported image or SVG first')
        } else {
          setStatus('No editable imported image or SVG found in selection')
        }
        return
      }

      const glyphIdByInstanceId = new Map(valid.map((u) => [u.instanceId, u.glyph.id]))
      const boundsByInstanceId = new Map(valid.map((u) => [u.instanceId, u.bounds]))
      const seedByInstanceId = new Map(valid.map((u) => [u.instanceId, u.seed]))

      setCustomGlyphs((prev) => [...prev, ...valid.map((u) => u.glyph)])
      setRows((prev) =>
        prev.map((row) =>
          row.map((item) => {
            if (!glyphIdByInstanceId.has(item.id)) return item
            return {
              ...item,
              glyphId: glyphIdByInstanceId.get(item.id) as string,
              magicSelectionBounds: boundsByInstanceId.get(item.id),
              magicSelectionSeed: seedByInstanceId.get(item.id),
            }
          })
        )
      )

      const message = `${actionLabel} applied`
      setStatus(message)
      showToast(message)
    } catch (error) {
      setStatus(`${actionLabel} failed`)
      showToast(`${actionLabel} failed`)
      console.error(error)
    }
  }

  const handleRemoveBackground = async () => {
    recordHistoryCheckpoint()
    await applyImageProcessorToSelection((ctx, width, height) => {
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data
      const sample = (x: number, y: number) => {
        const i = (y * width + x) * 4
        return [data[i], data[i + 1], data[i + 2]]
      }
      const corners = [sample(0, 0), sample(width - 1, 0), sample(0, height - 1), sample(width - 1, height - 1)]
      const bg = corners.reduce((acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]], [0, 0, 0]).map((v) => v / 4)
      const threshold = 46
      for (let i = 0; i < data.length; i += 4) {
        const dist = Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2])
        if (dist < threshold) data[i + 3] = 0
      }
      ctx.putImageData(imageData, 0, 0)
    }, 'Background removal')
  }

  const handleMagicWand = () => {
    setPenToolMode(false)
    setMagicWandMode((prev) => {
      const next = !prev
      setStatus(next ? 'Magic wand mode enabled: click a point on an imported image' : 'Magic wand mode disabled')
      return next
    })
  }

  const handlePenToolToggle = () => {
    setMagicWandMode(false)
    setPenToolMode((prev) => {
      const next = !prev
      setStatus(next ? 'Pen tool mode enabled: draw on imported image to select region' : 'Pen tool mode disabled')
      return next
    })
  }

  const handlePenSelectionComplete = (instanceId: string, points: Array<{ x: number; y: number }>) => {
    recordHistoryCheckpoint()
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (item.id !== instanceId) return item
          const existing = item.penSelectionPaths ?? []
          return {
            ...item,
            penSelectionPath: points,
            penSelectionPaths: [...existing, points],
          }
        })
      )
    )
    setSelectedIds([instanceId])
    setStatus('Pen selection updated')
  }

  const handlePenNodeDragStart = () => {
    recordHistoryCheckpoint()
  }

  const handlePenNodeMove = (
    instanceId: string,
    pathIndex: number,
    pointIndex: number,
    x: number,
    y: number
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (item.id !== instanceId) return item

          if (pathIndex >= 0) {
            const paths = [...(item.penSelectionPaths ?? [])]
            const targetPath = paths[pathIndex]
            if (!targetPath || !targetPath[pointIndex]) return item
            const updatedPath = targetPath.map((point, index) =>
              index === pointIndex ? { x, y } : point
            )
            paths[pathIndex] = updatedPath
            const shouldSyncCurrent =
              item.penSelectionPath && pathIndex === paths.length - 1
            return {
              ...item,
              penSelectionPaths: paths,
              penSelectionPath: shouldSyncCurrent ? updatedPath : item.penSelectionPath,
            }
          }

          if (!item.penSelectionPath || !item.penSelectionPath[pointIndex]) return item
          const updatedCurrent = item.penSelectionPath.map((point, index) =>
            index === pointIndex ? { x, y } : point
          )
          return {
            ...item,
            penSelectionPath: updatedCurrent,
          }
        })
      )
    )
  }

  const handlePenNodeRemove = (instanceId: string, pathIndex: number, pointIndex: number) => {
    recordHistoryCheckpoint()
    setRows((prev) =>
      prev.map((row) =>
        row.map((item) => {
          if (item.id !== instanceId) return item

          if (pathIndex >= 0) {
            const paths = [...(item.penSelectionPaths ?? [])]
            const targetPath = paths[pathIndex]
            if (!targetPath || targetPath.length <= 3) return item
            const updatedPath = targetPath.filter((_, index) => index !== pointIndex)
            paths[pathIndex] = updatedPath
            const shouldSyncCurrent =
              item.penSelectionPath && pathIndex === paths.length - 1
            return {
              ...item,
              penSelectionPaths: paths,
              penSelectionPath: shouldSyncCurrent ? updatedPath : item.penSelectionPath,
            }
          }

          if (!item.penSelectionPath || item.penSelectionPath.length <= 3) return item
          return {
            ...item,
            penSelectionPath: item.penSelectionPath.filter((_, index) => index !== pointIndex),
          }
        })
      )
    )
  }

  const handleMagicWandPick = async (instanceId: string, localX: number, localY: number) => {
    const targetInstance = rows.flat().find((instance) => instance.id === instanceId)
    if (!targetInstance) return
    const glyph = glyphMap.get(targetInstance.glyphId)
    if (!glyph || glyph.source !== 'imported') {
      setStatus('Magic wand works on imported image or SVG glyphs only')
      return
    }

    try {
      const href = getProcessableGlyphDataUrl(glyph)
      if (!href) return

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve(image)
        image.onerror = () => reject(new Error('Failed to decode selected image'))
        image.src = href
      })

      const width = Math.max(1, img.naturalWidth)
      const height = Math.max(1, img.naturalHeight)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const seedInfo = {
        x: Math.max(0, Math.min(width - 1, Math.round(localX))),
        y: Math.max(0, Math.min(height - 1, Math.round(localY))),
        tolerance: 42,
      }

      const existingSeeds =
        targetInstance.magicSelectionSeeds && targetInstance.magicSelectionSeeds.length > 0
          ? targetInstance.magicSelectionSeeds
          : targetInstance.magicSelectionSeed
            ? [targetInstance.magicSelectionSeed]
            : []
      const nextSeeds = [...existingSeeds, seedInfo]

      const maskInfo = buildMagicSelectionMask(
        {
          ...targetInstance,
          magicSelectionSeed: seedInfo,
          magicSelectionSeeds: nextSeeds,
        },
        imageData.data,
        width,
        height
      )

      const bounds = maskInfo?.bounds
      recordHistoryCheckpoint()
      setRows((prev) =>
        prev.map((row) =>
          row.map((item) => {
            if (item.id !== instanceId) return { ...item, magicSelectionBounds: undefined }
            return {
              ...item,
              magicSelectionBounds: bounds,
              magicSelectionSeed: seedInfo,
              magicSelectionSeeds: nextSeeds,
            }
          })
        )
      )
      setSelectedIds([instanceId])
      setStatus('Magic wand selection updated')
    } catch (error) {
      setStatus('Magic wand failed')
      showToast('Magic wand failed')
      console.error(error)
    }
  }



  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const l = (max + min) / 2
    const d = max - min
    if (d === 0) return [0, 0, l]
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    let h = 0
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h /= 6
    return [h * 360, s, l]
  }

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    const hue = ((h % 360) + 360) % 360 / 360
    if (s === 0) {
      const gray = Math.round(l * 255)
      return [gray, gray, gray]
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = (t: number) => {
      let tt = t
      if (tt < 0) tt += 1
      if (tt > 1) tt -= 1
      if (tt < 1 / 6) return p + (q - p) * 6 * tt
      if (tt < 1 / 2) return q
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
      return p
    }
    return [
      Math.round(hue2rgb(hue + 1 / 3) * 255),
      Math.round(hue2rgb(hue) * 255),
      Math.round(hue2rgb(hue - 1 / 3) * 255),
    ]
  }

  const handleApplyMethodsToSelection = async () => {
    recordHistoryCheckpoint()
    await applyImageProcessorToSelection((ctx, width, height, instance, mask) => {
      if (!mask) return
      const brightness = instance.brightness ?? 1
      const contrast = instance.contrast ?? 1
      const exposure = instance.exposure ?? 0
      const hueShift = instance.hue ?? 0
      const saturation = Math.max(0, instance.saturation ?? 1)
      const vibrance = instance.vibrance ?? 0
      const exposureFactor = Math.pow(2, exposure)

      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        const vi = i / 4
        if (!mask[vi] || data[i + 3] === 0) continue

        let r = data[i]
        let g = data[i + 1]
        let b = data[i + 2]

        r = (r - 128) * contrast + 128
        g = (g - 128) * contrast + 128
        b = (b - 128) * contrast + 128

        r *= brightness * exposureFactor
        g *= brightness * exposureFactor
        b *= brightness * exposureFactor

        let [h, s, l] = rgbToHsl(
          Math.max(0, Math.min(255, r)),
          Math.max(0, Math.min(255, g)),
          Math.max(0, Math.min(255, b))
        )
        h += hueShift
        s = Math.max(0, Math.min(2, s * saturation))
        s = Math.max(0, Math.min(1, s + (1 - s) * vibrance * 0.5))
        const [nr, ng, nb] = hslToRgb(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, l)))

        data[i] = nr
        data[i + 1] = ng
        data[i + 2] = nb
      }

      ctx.putImageData(imageData, 0, 0)
    }, 'Selection methods', { requireSelectionMask: true })
  }





  const handleRemoveSelectedRegion = async () => {
    await applyImageProcessorToSelection((ctx, width, height, _instance, mask) => {
      void _instance
      if (!mask) return
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data
      for (let i = 0; i < data.length; i += 4) {
        if (mask[i / 4]) {
          data[i + 3] = 0
        }
      }
      ctx.putImageData(imageData, 0, 0)
    }, 'Selected region removal', { requireSelectionMask: true })
  }

  const handleDelete = () => {
    if (selectedIds.length === 0) return
    setRows((prev) => prev.map((row) => row.filter((item) => !selectedIds.includes(item.id))))
    setSelectedIds([])
    setStatus('Deleted selection')
  }

  const handlePasteTextInput = (text: string): boolean => {
    if (text.includes('<svg')) {
      const customId = `IMPORTED_${Date.now()}`
      const parsed = parseSvgMarkup(text, customId)
      if (parsed) {
        setCustomGlyphs((prev) => [...prev, parsed])
        setRows((prev) =>
          prev.map((row, index) =>
            index === activeRowIndex ? [...row, createInstance(parsed.id)] : row
          )
        )
        setStatus('Imported SVG markup as a glyph')
        return true
      }
    }

    const ids = text
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
    const knownIds = ids.filter((id) => glyphMap.has(id))
    if (knownIds.length > 0) {
      setRows((prev) =>
        prev.map((row, index) =>
          index === activeRowIndex ? [...row, ...knownIds.map((glyphId) => createInstance(glyphId))] : row
        )
      )
      setStatus(`Pasted ${knownIds.length} glyph ids`)
      return true
    }

    setStatus('Paste contained no recognized glyphs')
    return false
  }

  const handleCopy = async (preset: CopyPreset) => {
    const allInstances = rows.flat()
    const targets =
      selectedIds.length > 0 ? allInstances.filter((item) => selectedIds.includes(item.id)) : allInstances
    if (targets.length === 0) {
      setStatus('Nothing to copy')
      return
    }

    const exportScale = preset === 'wysiwyg' ? zoom : PRESET_SCALES[preset]
    const svg = buildExportSvg(rows, glyphMap, cellStep, exportScale, selectedIds)
    const text = ''

    try {
      const mode = await writeClipboard(svg, text)
      if (mode === 'html') {
        const message = `Copied ${targets.length} glyphs (${preset})`
        setStatus(message)
        showToast(message)
      } else {
        const message = 'Copied plain text only (clipboard does not allow SVG here)'
        setStatus(message)
        showToast(message)
      }
    } catch (error) {
      const message = 'Copy failed: clipboard blocked or insecure context'
      setStatus(message)
      showToast(message)
      console.error(error)
    }
  }

  const handleCopyExternal = async () => {
    try {
      const mode = await writeClipboard(SAMPLE_EXTERNAL_SVG, '')
      if (mode === 'html') {
        const message = 'Copied inline SVG sample to clipboard'
        setStatus(message)
        showToast(message)
      } else {
        const message = 'Copied sample as text only (clipboard does not allow SVG here)'
        setStatus(message)
        showToast(message)
      }
    } catch (error) {
      const message = 'Copy failed: clipboard blocked or insecure context'
      setStatus(message)
      showToast(message)
      console.error(error)
    }
  }

  const handlePaste = async () => {
    try {
      const { html, text } = await readClipboard()

      if (html) {
        const parseResult = parseSvgFromHtml(html)
        if (parseResult?.glyphs.length) {
          const validGlyphs = parseResult.glyphs.filter((item) => glyphMap.has(item.glyphId))
          if (validGlyphs.length > 0) {
            setRows((prev) =>
              prev.map((row, index) => (index === activeRowIndex ? [...row, ...validGlyphs] : row))
            )
            setStatus(`Pasted ${validGlyphs.length} glyphs from SVG`)
            return
          }
        }
        if (parseResult?.importedGlyph) {
          const importedGlyph = parseResult.importedGlyph
          setCustomGlyphs((prev) => [...prev, importedGlyph])
          setRows((prev) =>
            prev.map((row, index) =>
              index === activeRowIndex ? [...row, createInstance(importedGlyph.id)] : row
            )
          )
          setStatus('Imported external SVG as a glyph')
          return
        }
      }

      if (text) {
        if (handlePasteTextInput(text)) return
      }

      setStatus('Paste contained no recognized glyphs')
    } catch (error) {
      setShowPasteFallback(true)
      setStatus('Clipboard blocked. Paste manually below.')
      console.error(error)
    }
  }

  const importImageFile = async (file: File): Promise<GlyphDef | null> => {

    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      const text = await file.text()
      const id = `IMPORTED_${Date.now()}_${Math.random().toString(16).slice(2)}`
      const parsed = parseSvgMarkup(text, id)
      return parsed
    }

    if (!file.type.startsWith('image/')) {
      return null
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = String(reader.result ?? '')
        // Validate data URL
        if (!result.startsWith('data:image/')) {
          reject(new Error(`Invalid image data URL for file: ${file.name}`))
        } else {
          resolve(result)
        }
      }
      reader.onerror = () => reject(new Error(`Failed to read image: ${file.name}`))
      reader.readAsDataURL(file)
    })

    const imageMeta = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 })
      image.onerror = () => reject(new Error(`Failed to decode image: ${file.name}`))
      image.src = dataUrl
    })

    const width = Math.max(1, imageMeta.width)
    const height = Math.max(1, imageMeta.height)
    const id = `IMG_${Date.now()}_${Math.random().toString(16).slice(2)}`

    return {
      id,
      name: file.name,
      viewBox: `0 0 ${width} ${height}`,
      viewBoxMinX: 0,
      viewBoxMinY: 0,
      contentMinX: 0,
      contentMinY: 0,
      contentWidth: width,
      contentHeight: height,
      width,
      height,
      body: `<image href="${dataUrl}" xlink:href="${dataUrl}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`,
      source: 'imported',
    }
  }

  const handleImportImage = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const list = Array.from(files)
      const imported = (await Promise.all(list.map((file) => importImageFile(file)))).filter(Boolean) as GlyphDef[]
      if (imported.length === 0) {
        setStatus('No importable image files selected')
        return
      }

      setCustomGlyphs((prev) => [...prev, ...imported])
      setRows((prev) =>
        prev.map((row, index) =>
          index === activeRowIndex ? [...row, ...imported.map((glyph) => createInstance(glyph.id))] : row
        )
      )

      const message = `Imported ${imported.length} image file${imported.length > 1 ? 's' : ''}`
      setStatus(message)
      showToast(message)
    } catch (error) {
      setStatus('Image import failed')
      showToast('Image import failed')
      console.error(error)
    }
  }

  const triggerDownload = (blob: Blob, extension: string) => {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `action-studio-${Date.now()}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const renderRasterFromSvg = async (svgMarkup: string, format: 'png' | 'jpg' | 'webp') => {
    const blobToDataUrl = (blob: Blob) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = () => reject(new Error('Failed to convert blob to data URL'))
        reader.readAsDataURL(blob)
      })

    const inlineExternalImageHrefs = async (markup: string) => {
      const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
      const svgRoot = doc.querySelector('svg')
      if (!svgRoot) return markup

      const cache = new Map<string, string>()
      const images = Array.from(doc.querySelectorAll('image'))

      for (const image of images) {
        const href = image.getAttribute('href') ?? image.getAttribute('xlink:href') ?? ''
        if (!href) continue
        if (href.startsWith('data:')) continue
        if (href.startsWith('#')) continue

        let dataUrl = cache.get(href)
        if (!dataUrl) {
          try {
            const response = await fetch(href)
            if (!response.ok) continue
            const blob = await response.blob()
            dataUrl = await blobToDataUrl(blob)
            cache.set(href, dataUrl)
          } catch {
            continue
          }
        }

        image.setAttribute('href', dataUrl)
        image.setAttribute('xlink:href', dataUrl)
      }

      return new XMLSerializer().serializeToString(svgRoot)
    }

    const hasVisiblePixels = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] !== 0) return true
      }
      return false
    }

    const removeImageFilters = (markup: string) => {
      const withoutFilterAttrs = markup.replace(/\sfilter="url\(#img-filter-[^)]+\)"/g, '')
      return withoutFilterAttrs.replace(/<filter\s+id="img-filter-[^"]+"[\s\S]*?<\/filter>/g, '')
    }

    const rasterizeSvg = async (markup: string) => {
      const svgBlob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            if (img.naturalWidth === 0 || img.naturalHeight === 0) {
              reject(new Error('SVG rendered image is empty (zero size).'))
            } else {
              resolve(img)
            }
          }
          img.onerror = () => reject(new Error('Failed to render SVG for raster export'))
          img.src = svgUrl
        })

        const sourceWidth = Math.max(1, image.naturalWidth || 1024)
        const sourceHeight = Math.max(1, image.naturalHeight || 1024)
        const maxRasterDimension = 8192
        const downscale = Math.min(1, maxRasterDimension / Math.max(sourceWidth, sourceHeight))
        const width = Math.max(1, Math.round(sourceWidth * downscale))
        const height = Math.max(1, Math.round(sourceHeight * downscale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Canvas context unavailable')
        }

        if (format === 'jpg') {
          context.fillStyle = '#ffffff'
          context.fillRect(0, 0, width, height)
        }

        context.drawImage(image, 0, 0, width, height)

        return { canvas, context, width, height }
      } finally {
        URL.revokeObjectURL(svgUrl)
      }
    }

    try {
      const normalizedSvgMarkup = await inlineExternalImageHrefs(svgMarkup)
      let { canvas, context, width, height } = await rasterizeSvg(normalizedSvgMarkup)

      if (!hasVisiblePixels(context, width, height)) {
        const fallbackMarkup = removeImageFilters(normalizedSvgMarkup)
        const fallback = await rasterizeSvg(fallbackMarkup)
        canvas = fallback.canvas
        context = fallback.context
        width = fallback.width
        height = fallback.height
      }

      if (!hasVisiblePixels(context, width, height)) {
        throw new Error('Raster export produced an empty image. Try exporting as SVG to inspect source content.')
      }

      const mime = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png'
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, mime, 0.92)
      })
      if (!blob) {
        throw new Error(`Failed to create ${format.toUpperCase()} blob`)
      }
      return blob
    } catch (err) {
      // Show error in status/toast if available
      if (typeof setStatus === 'function') setStatus(String(err))
      if (typeof showToast === 'function') showToast(String(err))
      throw err
    }
  }

  const handleExport = async (format: ExportFormat) => {
    const svg = buildExportSvg(rows, glyphMap, cellStep, PRESET_SCALES.large, selectedIds)
    if (!svg) {
      setStatus('Nothing to export')
      return
    }

    try {
      if (format === 'svg') {
        const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        triggerDownload(blob, 'svg')
      } else {
        const blob = await renderRasterFromSvg(svg, format)
        triggerDownload(blob, format)
      }

      const message = `Exported ${format.toUpperCase()}`
      setStatus(message)
      showToast(message)
    } catch (error) {
      setStatus(`Export ${format.toUpperCase()} failed`)
      showToast(`Export ${format.toUpperCase()} failed`)
      console.error(error)
    }
  }

  return (
    <div
      className="app-shell relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,74,0.18),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(29,59,47,0.15),transparent_40%),linear-gradient(135deg,#f7f1e2_0%,#efe6d3_60%,#f4efe0_100%)] flex flex-col gap-6"
      dir="ltr"
    >
      <EditorHeader
        onCopy={handleCopy}
        onPaste={handlePaste}
        onImportImage={handleImportImage}
        onExport={handleExport}
        imageEditingEnabled={canEditImageColors}
        magicWandMode={magicWandMode}
        penToolMode={penToolMode}
        brightnessValue={primarySelection?.brightness ?? null}
        contrastValue={primarySelection?.contrast ?? null}
        exposureValue={primarySelection?.exposure ?? null}
        hueValue={primarySelection?.hue ?? null}
        saturationValue={primarySelection?.saturation ?? null}
        vibranceValue={primarySelection?.vibrance ?? null}
        blurValue={primarySelection?.blur ?? null}
        sharpenValue={primarySelection?.sharpen ?? null}
        noiseValue={primarySelection?.noise ?? null}
        onBrightnessChange={handleSetBrightness}
        onContrastChange={handleSetContrast}
        onExposureChange={handleSetExposure}
        onHueChange={handleSetHue}
        onSaturationChange={handleSetSaturation}
        onVibranceChange={handleSetVibrance}
        onBlurChange={handleSetBlur}
        onSharpenChange={handleSetSharpen}
        onNoiseChange={handleSetNoise}
        onRemoveBackground={handleRemoveBackground}
        onRemoveSelectedRegion={handleRemoveSelectedRegion}
        // Edit controls
        offsetX={primarySelection?.offsetX ?? null}
        offsetY={primarySelection?.offsetY ?? null}
        rotateValue={primarySelection?.rotate ?? null}
        scaleValue={primarySelection ? Math.max(primarySelection.scale, primarySelection.scaleX, primarySelection.scaleY) : null}
        skewXValue={primarySelection?.skewX ?? null}
        skewYValue={primarySelection?.skewY ?? null}
        onOffsetXChange={handleSetOffsetX}
        onOffsetYChange={handleSetOffsetY}
        onRotateChange={handleSetRotate}
        onRotate={handleRotate}
        onScale={handleSetScale}
        onSkewXChange={handleSetSkewX}
        onSkewYChange={handleSetSkewY}
        // Image actions for dropdown
        onMagicWand={handleMagicWand}
        onPenToolToggle={handlePenToolToggle}
        onApplyMethodsToSelection={handleApplyMethodsToSelection}
        onImageReflectX={handleImageReflectX}
        onImageReflectY={handleImageReflectY}
        onImageZoomIn={handleZoomImageIn}
        onImageZoomOut={handleZoomImageOut}
        // SVG Actions for Edit dropdown
        canEditSvgActions={canEditSvgActions}
        onSvgReflectX={handleSvgReflectX}
        onSvgReflectY={handleSvgReflectY}
        onSvgZoomIn={handleSvgZoomIn}
        onSvgZoomOut={handleSvgZoomOut}
        onCopyExternal={handleCopyExternal}
        glyphs={pagedGlyphs}
        search={search}
        page={safePage}
        pageCount={pageCount}
        totalCount={filteredGlyphs.length}
        isLoading={isLoadingGlyphs}
        onSearchChange={setSearch}
        onPageChange={(nextPage) => setPage(Math.min(Math.max(1, nextPage), pageCount))}
        onAddGlyph={addGlyph}
      />
      <div className="app-main-row flex flex-row gap-4 w-full">
        {/* Mobile: Sidebar inside artboard (above toolbar/canvas), Desktop: Sidebar right */}
        <main className="app-canvas min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 min-h-0 flex-1 relative">
          {/* Mobile sidebar (above artboard content) */}
          <div className="block sm:hidden mb-4">
            <div className={`app-sidebar-right ${isRightSidebarCollapsed ? 'collapsed' : ''}`}> 
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                  className="sidebar-collapse-button"
                  title={isRightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isRightSidebarCollapsed ? '◀' : '▶'}
                </button>
                {!isRightSidebarCollapsed && (
                  <LayerPanel
                    layers={layerEntries}
                    onSelectLayer={setSelection}
                    onBringToFront={handleBringLayerToTop}
                    onBringForward={handleBringLayerUp}
                    onSendBackward={handleBringLayerDown}
                    onSendToBack={handleSendLayerToBottom}
                    onLayerSelectOnly={handleLayerSelectOnly}
                    onLayerBringToFront={handleLayerBringToFront}
                    onLayerBringForward={handleLayerBringForward}
                    onLayerSendBackward={handleLayerSendBackward}
                    onLayerSendToBack={handleLayerSendToBack}
                    onLayerDelete={handleLayerDelete}
                  />
                )}
              </div>
            </div>
          </div>
          <EditorToolbar
            zoom={zoom}
            onZoomChange={(value) => setZoom(value)}
            rowCount={rowCount}
            activeRow={activeRowIndex}
            onActiveRowChange={setActiveRowIndex}
            onAddRow={addRow}
            onRemoveRow={removeRow}
            onClearSelection={clearSelection}
            onDelete={handleDelete}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
          />
          {showPasteFallback && (
            <section className="rounded-2xl border border-emerald-900/15 bg-white/80 p-4 shadow-sm">
              <div className="flex items-center justify-between text-sm font-semibold text-emerald-950">
                <span>Paste Fallback</span>
                <button
                  className="text-xs font-semibold text-emerald-900"
                  onClick={() => setShowPasteFallback(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
              <p className="mt-1 text-xs text-stone-600">
                Clipboard access was blocked. Paste SVG markup or glyph IDs below.
              </p>
              <textarea
                className="mt-3 w-full resize-none rounded-xl border border-emerald-900/20 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900 focus:outline-none focus:ring-2 focus:ring-amber-300"
                rows={4}
                value={pasteFallbackText}
                placeholder="<svg ...>...</svg> or A1 D36 G17"
                onChange={(event) => setPasteFallbackText(event.target.value)}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
                  onClick={() => {
                    if (handlePasteTextInput(pasteFallbackText)) {
                      setPasteFallbackText('')
                      setShowPasteFallback(false)
                    }
                  }}
                  type="button"
                >
                  Import Paste
                </button>
                <button
                  className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
                  onClick={() => setPasteFallbackText('')}
                  type="button"
                >
                  Clear
                </button>
              </div>
            </section>
          )}
          <EditorCanvas
            layout={layout}
            glyphs={glyphs}
            glyphMap={glyphMap}
            selectedIds={selectedIds}
            viewWidth={viewWidth}
            viewHeight={viewHeight}
            zoom={zoom}
            cellStep={cellStep}
            onAddRow={addRow}
            onSelect={setSelection}
            onClearSelection={clearSelection}
            onTranslate={handleTranslate}
            onSetRotate={handleSetRotate}
            onSetScale={handleSetScale}
            onSetScaleX={handleSetScaleX}
            onSetScaleY={handleSetScaleY}
            onSetSelection={setSelectionIds}
            magicWandMode={magicWandMode}
            onMagicWandPick={handleMagicWandPick}
            penToolMode={penToolMode}
            onPenSelectionComplete={handlePenSelectionComplete}
            onPenNodeDragStart={handlePenNodeDragStart}
            onPenNodeMove={handlePenNodeMove}
            onPenNodeRemove={handlePenNodeRemove}
            onDropGlyph={handleDropGlyph}
            onDropFiles={handleDropFiles}
          />
          <StatusBar
            status={status}
            count={rows.reduce((total, row) => total + row.length, 0)}
          />
        </main>
        {/* Desktop sidebar (right of artboard) */}
        <div
          className={`app-sidebar-right hidden sm:block ${isRightSidebarCollapsed ? 'collapsed' : ''}`}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
              className="absolute right-5 top-5 z-10 sidebar-collapse-button"
              title={isRightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isRightSidebarCollapsed ? '◀' : '▶'}
            </button>
            {!isRightSidebarCollapsed && (
              <LayerPanel
                layers={layerEntries}
                onSelectLayer={setSelection}
                onBringToFront={handleBringLayerToTop}
                onBringForward={handleBringLayerUp}
                onSendBackward={handleBringLayerDown}
                onSendToBack={handleSendLayerToBottom}
                onLayerSelectOnly={handleLayerSelectOnly}
                onLayerBringToFront={handleLayerBringToFront}
                onLayerBringForward={handleLayerBringForward}
                onLayerSendBackward={handleLayerSendBackward}
                onLayerSendToBack={handleLayerSendToBack}
                onLayerDelete={handleLayerDelete}
              />
            )}
          </div>
        </div>
      </div>
      {toast && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 rounded-2xl bg-emerald-950 px-4 py-3 text-sm font-semibold text-amber-50 shadow-[0_18px_36px_rgba(27,26,23,0.28)]">
          {toast}
        </div>
      )}
    </div>
  )
}

export default EditorApp