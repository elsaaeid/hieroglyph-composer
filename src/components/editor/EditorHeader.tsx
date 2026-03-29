
import type { CopyPreset, ExportFormat } from './types'
import FileIcon from './icons/FileIcon'
import LibraryIcon from './icons/LibraryIcon'
import GlyphLibrary from './GlyphLibrary'
import CopyIcon from './icons/CopyIcon'
import PasteIcon from './icons/PasteIcon'
import ImportIcon from './icons/ImportIcon'
import ExportIcon from './icons/ExportIcon'
import ImageIcon from './icons/ImageIcon'
import * as React from 'react'
import EditIcon from './icons/EditIcon'

type EditorHeaderProps = {
  onCopy: (preset: CopyPreset) => void
  onPaste: () => void
  onImportImage: (files: FileList | null) => void
  onExport: (format: ExportFormat) => void
  // Image actions
  imageEditingEnabled: boolean
  magicWandMode: boolean
  penToolMode: boolean
  brightnessValue: number | null
  contrastValue: number | null
  exposureValue: number | null
  hueValue: number | null
  saturationValue: number | null
  vibranceValue: number | null
  blurValue: number | null
  sharpenValue: number | null
  noiseValue: number | null
  onBrightnessChange: (value: number) => void
  onContrastChange: (value: number) => void
  onExposureChange: (value: number) => void
  onHueChange: (value: number) => void
  onSaturationChange: (value: number) => void
  onVibranceChange: (value: number) => void
  onBlurChange: (value: number) => void
  onSharpenChange: (value: number) => void
  onNoiseChange: (value: number) => void
  onRemoveBackground: () => void
  onRemoveSelectedRegion: () => void
  // Edit actions
  offsetX: number | null
  offsetY: number | null
  rotateValue: number | null
  scaleValue: number | null
  skewXValue: number | null
  skewYValue: number | null
  onOffsetXChange: (value: number) => void
  onOffsetYChange: (value: number) => void
  onRotateChange: (value: number) => void
  onRotate: () => void
  onScale: (value: number) => void
  onSkewXChange: (value: number) => void
  onSkewYChange: (value: number) => void
  // Image actions (for dropdown)
  onMagicWand: () => void
  onPenToolToggle: () => void
  onApplyMethodsToSelection: () => void
  onImageReflectX: () => void
  onImageReflectY: () => void
  onImageZoomIn: () => void
  onImageZoomOut: () => void
  onCopyExternal: () => void
  // GlyphLibrary props
  glyphs: any[]
  search: string
  page: number
  pageCount: number
  totalCount: number
  isLoading: boolean
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onAddGlyph: (glyphId: string) => void
}

function EditorHeader({
  onCopy, onPaste, onImportImage, onExport,
  imageEditingEnabled, magicWandMode, penToolMode,
  brightnessValue, contrastValue, exposureValue, hueValue, saturationValue, vibranceValue, blurValue, sharpenValue, noiseValue,
  onBrightnessChange, onContrastChange, onExposureChange, onHueChange, onSaturationChange, onVibranceChange, onBlurChange, onSharpenChange, onNoiseChange,
  onRemoveBackground, onRemoveSelectedRegion,
  // Image actions
  onMagicWand, onPenToolToggle, onApplyMethodsToSelection, onImageReflectX, onImageReflectY, onImageZoomIn, onImageZoomOut,
  // Edit actions
  offsetX, offsetY, rotateValue, scaleValue, skewXValue, skewYValue,
  onOffsetXChange, onOffsetYChange, onRotateChange, onRotate, onScale, onSkewXChange, onSkewYChange,
  // SVG Actions
  canEditSvgActions, onSvgReflectX, onSvgReflectY, onSvgZoomIn, onSvgZoomOut,
  onCopyExternal,
  // GlyphLibrary props
  glyphs, search, page, pageCount, totalCount, isLoading, onSearchChange, onPageChange, onAddGlyph
}: EditorHeaderProps & { canEditSvgActions?: boolean, onSvgReflectX?: () => void, onSvgReflectY?: () => void, onSvgZoomIn?: () => void, onSvgZoomOut?: () => void }) {


  const [dropdownOpen, setDropdownOpen] = React.useState(false)
  const [imageDropdownOpen, setImageDropdownOpen] = React.useState(false)
  const [editDropdownOpen, setEditDropdownOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const imageDropdownRef = React.useRef<HTMLDivElement>(null)
  const editDropdownRef = React.useRef<HTMLDivElement>(null)
  const libraryDropdownRef = React.useRef<HTMLDivElement>(null)
  const [libraryDropdownOpen, setLibraryDropdownOpen] = React.useState(false)


  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
      if (imageDropdownRef.current && !imageDropdownRef.current.contains(event.target as Node)) {
        setImageDropdownOpen(false)
      }
      if (editDropdownRef.current && !editDropdownRef.current.contains(event.target as Node)) {
        setEditDropdownOpen(false)
      }
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(event.target as Node)) {
        setLibraryDropdownOpen(false)
      }
    }
    if (dropdownOpen || imageDropdownOpen || editDropdownOpen || libraryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      document.removeEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen, imageDropdownOpen, editDropdownOpen, libraryDropdownOpen])

  return (
    <header className="fixed inset-x-2 top-0 z-40 flex flex-col gap-3 rounded-bl-2xl rounded-br-2xl bg-white/85 px-3 py-3 shadow-[0_20px_40px_rgba(27,26,23,0.08)] backdrop-blur sm:inset-x-4 sm:px-4 sm:py-4 lg:inset-x-8 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6">
      <div className="min-w-0">
        <p className="header-kicker uppercase tracking-[0.18em] text-stone-500">action-studio</p>
        <h1 className="header-title mt-1 truncate font-[Fraunces] text-base text-emerald-950 sm:text-lg lg:text-xl">Action Composer</h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
        {/* Row for File, Image, Edit, and Library dropdowns */}
        <div className="flex flex-row flex-wrap gap-2">
          <button
            className="header-button flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            <FileIcon width={20} height={20} />
            File
            <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 min-w-50 rounded-xl bg-white shadow-lg ring-1 ring-emerald-900/10">
              <ul className="py-2">
                <li>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50"
                    onClick={() => { onCopy('small'); setDropdownOpen(false) }}
                  >
                    <CopyIcon width={18} height={18} />Copy Small
                  </button>
                </li>
                <li>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50"
                    onClick={() => { onCopy('large'); setDropdownOpen(false) }}
                  >
                    <CopyIcon width={18} height={18} />Copy Large
                  </button>
                </li>
                <li>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50"
                    onClick={() => { onCopy('wysiwyg'); setDropdownOpen(false) }}
                  >
                    <CopyIcon width={18} height={18} />Copy WYSIWYG
                  </button>
                </li>
                <li>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50"
                    onClick={() => { onPaste(); setDropdownOpen(false) }}
                  >
                    <PasteIcon width={18} height={18} />Paste
                  </button>
                </li>
                <li>
                  <label className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50 cursor-pointer">
                    <ImportIcon width={18} height={18} />Import
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        onImportImage(event.target.files)
                        event.currentTarget.value = ''
                        setDropdownOpen(false)
                      }}
                    />
                  </label>
                </li>
                <li>
                  <div className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900">
                    <ExportIcon width={18} height={18} />
                    <select
                      className="w-32 rounded-full border border-emerald-900/30 bg-amber-50/40 px-3 py-1 text-sm text-emerald-900"
                      defaultValue=""
                      onChange={(event) => {
                        const value = event.target.value as ExportFormat | ''
                        if (!value) return
                        onExport(value)
                        event.currentTarget.value = ''
                        setDropdownOpen(false)
                      }}
                    >
                      <option value="" disabled>
                        Export as...
                      </option>
                      <option value="svg">SVG</option>
                      <option value="png">PNG</option>
                      <option value="jpg">JPG</option>
                      <option value="webp">WEBP</option>
                    </select>
                  </div>
                </li>
                <li>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-emerald-900 hover:bg-emerald-50"
                    onClick={onCopyExternal}
                  >
                    <CopyIcon width={18} height={18} />Copy Sample Inline SVG
                  </button>
                </li>
              </ul>
            </div>
          )}
          {/* Library Dropdown */}
          <div className="relative" ref={libraryDropdownRef}>
            <button
              className="header-button flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.08)]"
              onClick={() => setLibraryDropdownOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={libraryDropdownOpen}
            >
              <LibraryIcon width={20} height={20} />
              Library
              <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {libraryDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-85 max-w-105 w-95 rounded-xl bg-white shadow-lg ring-1 ring-emerald-900/10">
                <GlyphLibrary
                  glyphs={glyphs}
                  search={search}
                  page={page}
                  pageCount={pageCount}
                  totalCount={totalCount}
                  isLoading={isLoading}
                  onSearchChange={onSearchChange}
                  onPageChange={onPageChange}
                  onAddGlyph={onAddGlyph}
                />
              </div>
            )}
          </div>
          {/* Image Dropdown */}
          <div className="relative" ref={imageDropdownRef}>
            <button
              className="header-button flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.08)]"
              onClick={() => setImageDropdownOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={imageDropdownOpen}
            >
              <ImageIcon width={20} height={20} />
              Image
              <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {imageDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-50 rounded-xl bg-white shadow-lg ring-1 ring-emerald-900/10 overflow-auto max-h-96">
                <ul className="py-2">
                  <li className="px-4 py-2 text-xs text-stone-600">
                    {imageEditingEnabled ? 'Image editing and color operations.' : 'Select an imported image to enable.'}
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Brightness
                      <input type="range" min={0} max={2} step={0.05} value={brightnessValue ?? 1} onChange={e => onBrightnessChange(Number(e.target.value))} disabled={brightnessValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Contrast
                      <input type="range" min={0} max={2} step={0.05} value={contrastValue ?? 1} onChange={e => onContrastChange(Number(e.target.value))} disabled={contrastValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Exposure
                      <input type="range" min={-1} max={1} step={0.05} value={exposureValue ?? 0} onChange={e => onExposureChange(Number(e.target.value))} disabled={exposureValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Hue
                      <input type="range" min={-180} max={180} step={1} value={hueValue ?? 0} onChange={e => onHueChange(Number(e.target.value))} disabled={hueValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Saturation
                      <input type="range" min={0} max={2} step={0.05} value={saturationValue ?? 1} onChange={e => onSaturationChange(Number(e.target.value))} disabled={saturationValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Vibrance
                      <input type="range" min={-1} max={1} step={0.05} value={vibranceValue ?? 0} onChange={e => onVibranceChange(Number(e.target.value))} disabled={vibranceValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Blur
                      <input type="range" min={0} max={20} step={0.5} value={blurValue ?? 0} onChange={e => onBlurChange(Number(e.target.value))} disabled={blurValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Sharpen
                      <input type="range" min={0} max={2} step={0.05} value={sharpenValue ?? 0} onChange={e => onSharpenChange(Number(e.target.value))} disabled={sharpenValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Noise
                      <input type="range" min={0} max={1} step={0.05} value={noiseValue ?? 0} onChange={e => onNoiseChange(Number(e.target.value))} disabled={noiseValue === null || !imageEditingEnabled} className="w-full" />
                    </label>
                  </li>
                  <li className="flex flex-wrap gap-2 px-4 py-2">
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onRemoveBackground} disabled={!imageEditingEnabled} type="button">Remove Background</button>
                    <button className={`flex-1 rounded-lg border px-2 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${magicWandMode ? 'border-emerald-900 bg-emerald-900 text-amber-50' : 'border-emerald-900/30 text-emerald-900'}`} onClick={onMagicWand} type="button">{magicWandMode ? 'Magic Wand: ON' : 'Magic Wand'}</button>
                    <button className={`flex-1 rounded-lg border px-2 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${penToolMode ? 'border-cyan-700 bg-cyan-700 text-white' : 'border-emerald-900/30 text-emerald-900'}`} onClick={onPenToolToggle} type="button">{penToolMode ? 'Pen Tool: ON' : 'Pen Tool'}</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onRemoveSelectedRegion} disabled={!imageEditingEnabled} type="button">Remove Wand Selection</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onApplyMethodsToSelection} disabled={!imageEditingEnabled} type="button">Apply Light/Color To Selection</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onImageReflectX} disabled={!imageEditingEnabled} type="button">Reflect Image X</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onImageReflectY} disabled={!imageEditingEnabled} type="button">Reflect Image Y</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onImageZoomIn} disabled={!imageEditingEnabled} type="button">Image Zoom +</button>
                    <button className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5" onClick={onImageZoomOut} disabled={!imageEditingEnabled} type="button">Image Zoom -</button>
                  </li>
                  {/* Color replace UI can be added here if needed */}
                </ul>
              </div>
            )}
          </div>
          {/* Edit Dropdown */}
          <div className="relative" ref={editDropdownRef}>
            <button
              className="header-button flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.08)]"
              onClick={() => setEditDropdownOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={editDropdownOpen}
            >
              <EditIcon width={20} height={20} />
              Edit
              <svg className="ml-1 h-4 w-4" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {editDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 min-w-50 rounded-xl bg-white shadow-lg ring-1 ring-emerald-900/10">
                <ul className="py-2">
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Transform (X, Y)
                      <div className="flex gap-2 mt-1">
                        <input type="number" placeholder="X" className="w-16 rounded border px-2 py-1 text-xs" value={offsetX ?? ''} onChange={e => onOffsetXChange(Number(e.target.value))} />
                        <input type="number" placeholder="Y" className="w-16 rounded border px-2 py-1 text-xs" value={offsetY ?? ''} onChange={e => onOffsetYChange(Number(e.target.value))} />
                      </div>
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Rotation
                      <div className="flex gap-2 mt-1">
                        <input type="number" placeholder="0°" className="w-20 rounded border px-2 py-1 text-xs" value={rotateValue ?? ''} onChange={e => onRotateChange(Number(e.target.value))} />
                        <button className="ml-2 rounded bg-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-900" onClick={onRotate} type="button">+90°</button>
                      </div>
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Scale
                      <input type="range" min={0.5} max={1.8} step={0.05} className="w-full mt-1" value={scaleValue ?? 1} onChange={e => onScale(Number(e.target.value))} />
                    </label>
                  </li>
                  <li className="px-4 py-2">
                    <label className="block text-xs font-semibold text-stone-700">Skew
                      <div className="flex gap-2 mt-1">
                        <input type="number" placeholder="SkewX" className="w-16 rounded border px-2 py-1 text-xs" value={skewXValue ?? ''} onChange={e => onSkewXChange(Number(e.target.value))} />
                        <input type="number" placeholder="SkewY" className="w-16 rounded border px-2 py-1 text-xs" value={skewYValue ?? ''} onChange={e => onSkewYChange(Number(e.target.value))} />
                      </div>
                    </label>
                  </li>
                  {/* SVG Actions */}
                  <li className="px-4 py-2 border-t border-emerald-100 mt-2">
                    <div className="block text-xs font-semibold text-stone-700 mb-1">SVG Actions</div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                        onClick={onSvgReflectX}
                        disabled={!canEditSvgActions}
                        type="button"
                      >
                        Reflect SVG X
                      </button>
                      <button
                        className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                        onClick={onSvgReflectY}
                        disabled={!canEditSvgActions}
                        type="button"
                      >
                        Reflect SVG Y
                      </button>
                      <button
                        className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                        onClick={onSvgZoomIn}
                        disabled={!canEditSvgActions}
                        type="button"
                      >
                        SVG Zoom +
                      </button>
                      <button
                        className="flex-1 rounded-lg border border-emerald-900/30 px-2 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50"
                        onClick={onSvgZoomOut}
                        disabled={!canEditSvgActions}
                        type="button"
                      >
                        SVG Zoom -
                      </button>
                    </div>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default EditorHeader
