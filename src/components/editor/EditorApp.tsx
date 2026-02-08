import { useEffect, useMemo, useState } from 'react'
import { JSESH_GLYPH_API_URL, PRESET_SCALES, QUADRAT, SAMPLE_EXTERNAL_SVG } from './glyphData'
import type { CopyPreset, GlyphDef, GlyphInstance } from './types'
import {
  buildExportSvg,
  fetchGlyphDefinitionsFromApi,
  parseSvgFromHtml,
  parseSvgMarkup,
  readClipboard,
  writeClipboard,
} from './svgUtils'
import EditorHeader from './EditorHeader'
import EditorToolbar from './EditorToolbar'
import GlyphLibrary from './GlyphLibrary'
import RowEditor from './RowEditor'
import StatusBar from './StatusBar'
import TransformPanel from './TransformPanel'

function EditorApp() {
  const [remoteGlyphs, setRemoteGlyphs] = useState<GlyphDef[]>([])
  const [customGlyphs, setCustomGlyphs] = useState<GlyphDef[]>([])
  const [rows, setRows] = useState<GlyphInstance[][]>([[]])
  const [rowTexts, setRowTexts] = useState<string[]>([''])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [zoom, setZoom] = useState(0.75)
  const [status, setStatus] = useState('Ready')
  const [isLoadingGlyphs, setIsLoadingGlyphs] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [toast, setToast] = useState<string | null>(null)
  const [activeRowIndex, setActiveRowIndex] = useState(0)

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
    return Math.max(1, ...rows.flat().map((instance: GlyphInstance) => instance.scale))
  }, [rows])
  const cellStep = QUADRAT * maxScale * 1.1
  const rowCount = Math.max(1, rows.length)

  const selectedInstances = useMemo(
    () => rows.flat().filter((instance: GlyphInstance) => selectedIds.includes(instance.id)),
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
    setRowTexts((prev) => prev.map((text, index) => (index === activeRowIndex ? '' : text)))
    setStatus(`Inserted ${glyphId}`)
  }

  const addRow = () => {
    setRows((prev) => [...prev, []])
    setRowTexts((prev) => [...prev, ''])
    setActiveRowIndex((prev) => prev + 1)
    setStatus('Added new row')
  }

  const applyToSelected = (updater: (instance: GlyphInstance) => GlyphInstance) => {
    if (selectedIds.length === 0) return
    setRows((prev) =>
      prev.map((row) => row.map((item) => (selectedIds.includes(item.id) ? updater(item) : item)))
    )
  }

  const handleRotate = () => {
    applyToSelected((item) => ({ ...item, rotate: (item.rotate + 90) % 360 }))
    setStatus('Rotate 90 deg')
  }

  const handleFlipX = () => {
    applyToSelected((item) => ({ ...item, flipX: !item.flipX }))
    setStatus('Flip horizontal')
  }

  const handleFlipY = () => {
    applyToSelected((item) => ({ ...item, flipY: !item.flipY }))
    setStatus('Flip vertical')
  }

  const handleScale = (value: number) => {
    applyToSelected((item) => ({ ...item, scale: value }))
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
    applyToSelected((item) => ({ ...item, scale: value }))
  }

  const handleDelete = () => {
    if (selectedIds.length === 0) return
    setRows((prev) => {
      const next = prev.map((row) => row.filter((item) => !selectedIds.includes(item.id)))
      setRowTexts((texts) => texts.map((text, index) => (next[index]?.length ? text : '')))
      return next
    })
    setSelectedIds([])
    setStatus('Deleted selection')
  }

  const handleRowTextChange = (rowIndex: number, value: string) => {
    setRowTexts((prev) => prev.map((text, index) => (index === rowIndex ? value : text)))
    const trimmed = value.trim()
    const rowGlyphId = `row-${rowIndex + 1}`

    if (!trimmed) {
      setRows((prev) => prev.map((row, index) => (index === rowIndex ? [] : row)))
      setCustomGlyphs((prev) => prev.filter((glyph) => glyph.id !== rowGlyphId))
      return
    }

    const parsed = parseSvgMarkup(trimmed, rowGlyphId)
    if (!parsed) {
      setStatus(`Row ${rowIndex + 1}: invalid SVG`)
      return
    }

    setCustomGlyphs((prev) => {
      const next = prev.filter((glyph) => glyph.id !== rowGlyphId)
      return [...next, parsed]
    })

    setRows((prev) =>
      prev.map((row, index) => {
        if (index !== rowIndex) return row
        const existing = row[0]
        if (existing?.glyphId === rowGlyphId) return [existing]
        return [createInstance(rowGlyphId)]
      })
    )
    setStatus(`Row ${rowIndex + 1} SVG updated`)
  }

  const handleCopy = async (preset: CopyPreset) => {
    const allInstances = rows.flat()
    const targets = selectedIds.length > 0 ? allInstances.filter((item) => selectedIds.includes(item.id)) : allInstances
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
      const mode = await writeClipboard(SAMPLE_EXTERNAL_SVG, 'external-svg')
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
            setRowTexts((prev) => prev.map((text, index) => (index === activeRowIndex ? '' : text)))
            setStatus(`Pasted ${validGlyphs.length} glyphs from SVG`)
            return
          }
        }
        if (parseResult?.importedGlyph) {
          const doc = new DOMParser().parseFromString(html, 'text/html')
          const svg = doc.querySelector('svg')
          if (svg) {
            handleRowTextChange(activeRowIndex, svg.outerHTML)
            setStatus('Pasted SVG into active row')
            return
          }
          setStatus('Paste contained no SVG')
          return
        }
      }

      if (text) {
        setStatus('Paste requires SVG markup')
        return
      }

      setStatus('Paste contained no SVG')
    } catch (error) {
      setStatus('Paste failed: clipboard blocked')
      console.error(error)
    }
  }

  return (
    <div
      className="relative min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(212,160,74,0.18),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(29,59,47,0.15),transparent_40%),linear-gradient(135deg,#f7f1e2_0%,#efe6d3_60%,#f4efe0_100%)] flex flex-col gap-6 px-8 pb-7 pt-28"
      dir="ltr"
    >
      <EditorHeader onCopy={handleCopy} onPaste={handlePaste} />
      <div className="mt-3 flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-72 lg:shrink-0">
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
        <main className="min-w-0 flex-2 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 min-h-0">
          <EditorToolbar
            zoom={zoom}
            onZoomChange={(value) => setZoom(value)}
            rowCount={rowCount}
            activeRow={activeRowIndex}
            onActiveRowChange={setActiveRowIndex}
            onAddRow={addRow}
            onClearSelection={clearSelection}
            onDelete={handleDelete}
          />
          <RowEditor
            rows={rows}
            rowTexts={rowTexts}
            glyphMap={glyphMap}
            selectedIds={selectedIds}
            activeRowIndex={activeRowIndex}
            onRowTextChange={handleRowTextChange}
            onSelect={setSelection}
            onActiveRowChange={setActiveRowIndex}
          />
          <StatusBar
            status={status}
            count={rows.reduce((total, row) => total + row.length, 0)}
          />
        </main>
        <div className="lg:w-80 lg:shrink-0">
          <TransformPanel
            selectedCount={selectedIds.length}
            scaleValue={primarySelection ? primarySelection.scale : null}
            onRotate={handleRotate}
            onFlipX={handleFlipX}
            onFlipY={handleFlipY}
            onScale={handleScale}
            onCopyExternal={handleCopyExternal}
            selectedInstances={selectedInstances}
            glyphMap={glyphMap}
            cellStep={cellStep}
            onTranslate={handleTranslate}
            onSetRotate={handleSetRotate}
            onSetScale={handleSetScale}
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
