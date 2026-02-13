import { useEffect, useMemo, useState } from 'react'
import { JSESH_GLYPH_API_URL, PRESET_SCALES, QUADRAT, SAMPLE_EXTERNAL_SVG } from './glyphData'
import type { CopyPreset, GlyphDef, GlyphInstance } from './types'
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
import GlyphLibrary from './GlyphLibrary.tsx'
import EditorCanvas from './EditorCanvas.tsx'
import StatusBar from './StatusBar'
import TransformPanel from './TransformPanel'

function EditorApp() {
  const [remoteGlyphs, setRemoteGlyphs] = useState<GlyphDef[]>([])
  const [customGlyphs, setCustomGlyphs] = useState<GlyphDef[]>([])
  const [rows, setRows] = useState<GlyphInstance[][]>([[]])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(0.3)
  const [status, setStatus] = useState('Ready')
  const [isLoadingGlyphs, setIsLoadingGlyphs] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [toast, setToast] = useState<string | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState(0)
  const [showPasteFallback, setShowPasteFallback] = useState(false)
  const [pasteFallbackText, setPasteFallbackText] = useState('')

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
  const viewWidth = Math.max(colCount, 1) * cellStep
  const viewHeight = rowCount * cellStep

  const selectedInstances = useMemo(
    () => rows.flat().filter((instance) => selectedIds.includes(instance.id)),
    [rows, selectedIds]
  )
  const primarySelection = selectedInstances[0]

  const newInstanceId = () => `instance-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const createInstance = (glyphId: string): GlyphInstance => ({
    id: newInstanceId(),
    glyphId,
    rotate: 0,
    flipX: false,
    flipY: false,
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  })


  const setSelection = (id: string, multi: boolean) => {
    setSelectedIds((prev) => {
      if (multi) {
        if (prev.includes(id)) return prev.filter((item) => item !== id)
        return [...prev, id]
      }
      return [id]
    })
  }

  const clearSelection = () => setSelectedIds([])

  const addGlyph = (glyphId: string) => {
    setRows((prev) =>
      prev.map((row, index) => (index === activeRowIndex ? [...row, createInstance(glyphId)] : row))
    )
    setStatus(`Inserted ${glyphId}`)
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
    applyToSelected((item) => ({
      ...item,
      rotate: (item.rotate + 90) % 360,
    }))
    setStatus('Rotate 90°')
  }

  const handleFlipX = () => {
    applyToSelected((item) => ({
      ...item,
      flipX: !item.flipX,
    }))
    setStatus('Flip horizontal')
  }

  const handleFlipY = () => {
    applyToSelected((item) => ({
      ...item,
      flipY: !item.flipY,
    }))
    setStatus('Flip vertical')
  }

  const handleScale = (value: number) => {
    applyToSelected((item) => ({
      ...item,
      scale: value,
      scaleX: value,
      scaleY: value,
    }))
  }

  const handleTranslate = (deltaX: number, deltaY: number) => {
    applyToSelected((item) => ({
      ...item,
      offsetX: (item.offsetX ?? 0) + deltaX,
      offsetY: (item.offsetY ?? 0) + deltaY,
    }))
  }

  const handleSetRotate = (value: number) => {
    applyToSelected((item) => ({ ...item, rotate: value }))
  }

  const handleSetScale = (value: number) => {
    applyToSelected((item) => ({
      ...item,
      scale: value,
      scaleX: value,
      scaleY: value,
    }))
  }

  const handleSetScaleX = (value: number) => {
    applyToSelected((item) => ({ ...item, scaleX: value }))
  }

  const handleSetScaleY = (value: number) => {
    applyToSelected((item) => ({ ...item, scaleY: value }))
  }

  const handleSetOffsetX = (value: number) => {
    applyToSelected((item) => ({ ...item, offsetX: value }))
  }

  const handleSetOffsetY = (value: number) => {
    applyToSelected((item) => ({ ...item, offsetY: value }))
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

  return (
    <div
      className="app-shell relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,74,0.18),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(29,59,47,0.15),transparent_40%),linear-gradient(135deg,#f7f1e2_0%,#efe6d3_60%,#f4efe0_100%)] flex flex-col gap-6"
      dir="ltr"
    >
      <EditorHeader onCopy={handleCopy} onPaste={handlePaste} />
      <div className="app-main-row">
        <div className="app-sidebar-left">
          <GlyphLibrary
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
        </div>
        <main className="app-canvas min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 min-h-0">
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
          />
          <StatusBar
            status={status}
            count={rows.reduce((total, row) => total + row.length, 0)}
          />
        </main>
        <div className="app-sidebar-right">
          <TransformPanel
            selectedCount={selectedIds.length}
            offsetX={primarySelection?.offsetX ?? null}
            offsetY={primarySelection?.offsetY ?? null}
            rotateValue={primarySelection?.rotate ?? null}
            scaleValue={primarySelection ? Math.max(primarySelection.scale, primarySelection.scaleX, primarySelection.scaleY) : null}
            onOffsetXChange={handleSetOffsetX}
            onOffsetYChange={handleSetOffsetY}
            onRotateChange={handleSetRotate}
            onRotate={handleRotate}
            onFlipX={handleFlipX}
            onFlipY={handleFlipY}
            onScale={handleScale}
            onCopyExternal={handleCopyExternal}
          />
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