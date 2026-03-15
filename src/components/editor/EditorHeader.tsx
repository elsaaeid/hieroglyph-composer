import type { CopyPreset, ExportFormat } from './types'

type EditorHeaderProps = {
  onCopy: (preset: CopyPreset) => void
  onPaste: () => void
  onImportImage: (files: FileList | null) => void
  onExport: (format: ExportFormat) => void
}

function EditorHeader({ onCopy, onPaste, onImportImage, onExport }: EditorHeaderProps) {
  return (
    <header className="fixed inset-x-2 top-0 z-40 flex flex-col gap-3 rounded-2xl bg-white/85 px-3 py-3 shadow-[0_20px_40px_rgba(27,26,23,0.08)] backdrop-blur sm:inset-x-4 sm:px-4 sm:py-4 lg:inset-x-8 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6">
      <div className="min-w-0">
        <p className="header-kicker uppercase tracking-[0.18em] text-stone-500">
          JSesh-style SVG Editor MVP
        </p>
        <h1 className="header-title mt-1 truncate font-[Fraunces] text-base text-emerald-950 sm:text-lg lg:text-xl">
          Vector-first Hieroglyph Composer
        </h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
        <div className="relative group">
          <button
            className="header-button cursor-pointer rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)] sm:px-4 sm:py-2"
            onClick={() => onCopy('small')}
          >
            Copy Small
          </button>
          <div className="header-tooltip pointer-events-none absolute left-0 top-full z-50 mt-2 w-44 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Small copy preset.
          </div>
        </div>
        <div className="relative group">
          <button
            className="header-button cursor-pointer rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)] sm:px-4 sm:py-2"
            onClick={() => onCopy('large')}
          >
            Copy Large
          </button>
          <div className="header-tooltip pointer-events-none absolute left-0 top-full z-50 mt-2 w-44 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Large copy preset.
          </div>
        </div>
        <div className="relative group">
          <button
            className="header-button cursor-pointer rounded-full bg-emerald-900 px-3 py-1.5 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)] sm:px-4 sm:py-2"
            onClick={() => onCopy('wysiwyg')}
          >
            Copy WYSIWYG
          </button>
          <div className="header-tooltip pointer-events-none absolute left-0 top-full z-50 mt-2 w-52 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Uses the current zoom level.
          </div>
        </div>
        <div className="relative group">
          <button
            className="header-button cursor-pointer rounded-full border border-emerald-900/30 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 sm:px-4 sm:py-2"
            onClick={onPaste}
          >
            Paste
          </button>
          <div className="header-tooltip pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Paste SVG first, else import SVG or read IDs.
          </div>
        </div>
        <div className="relative group">
          <label className="header-button cursor-pointer rounded-full border border-emerald-900/30 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 sm:px-4 sm:py-2">
            Import
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                onImportImage(event.target.files)
                event.currentTarget.value = ''
              }}
            />
          </label>
          <div className="header-tooltip pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Import PNG/JPG/WebP/GIF/SVG as managed glyphs.
          </div>
        </div>
        <div className="relative group">
          <label className="flex w-full items-center justify-between gap-2 rounded-full border border-emerald-900/30 bg-white px-3 py-1.5 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5 sm:w-auto sm:justify-start sm:px-4 sm:py-2">
            <span>Export</span>
            <select
              className="w-32 rounded-full border border-emerald-900/30 bg-amber-50/40 px-3 py-1 text-sm text-emerald-900"
              defaultValue=""
              onChange={(event) => {
                const value = event.target.value as ExportFormat | ''
                if (!value) return
                onExport(value)
                event.currentTarget.value = ''
              }}
            >
              <option value="" disabled>
                Select format
              </option>
              <option value="svg">SVG</option>
              <option value="png">PNG</option>
              <option value="jpg">JPG</option>
              <option value="webp">WEBP</option>
            </select>
          </label>
          <div className="header-tooltip pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-emerald-950 px-3 py-2 text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Export current composition as SVG, PNG, JPG, or WEBP.
          </div>
        </div>
      </div>
    </header>
  )
}

export default EditorHeader
