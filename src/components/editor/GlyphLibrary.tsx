import type { GlyphDef } from './types'

type GlyphLibraryProps = {
  glyphs: GlyphDef[]
  search: string
  page: number
  pageCount: number
  totalCount: number
  isLoading: boolean
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
  onAddGlyph: (glyphId: string) => void
}

function GlyphLibrary({
  glyphs,
  search,
  page,
  pageCount,
  totalCount,
  isLoading,
  onSearchChange,
  onPageChange,
  onAddGlyph,
}: GlyphLibraryProps) {
  const canPrev = page > 1
  const canNext = page < pageCount

  return (
    <aside className="side-panel min-w-0 rounded-2xl bg-white/90 p-5 shadow-[0_18px_36px_rgba(27,26,23,0.12)] flex flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-emerald-950">Glyph Library</h2>
        <input
          className="rounded-xl border border-emerald-900/25 bg-amber-50/40 px-3 py-2 text-sm text-emerald-900"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search A1, D36, G17"
        />
        <div className="flex flex-col gap-2">
          <span className="text-xs text-stone-600">{totalCount} glyphs</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="cursor-pointer rounded-full border border-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev}
            >
              Prev
            </button>
            <span className="text-xs font-medium text-emerald-950">
              Page {page} / {pageCount}
            </span>
            <button
              className="cursor-pointer rounded-full border border-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-900 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
            >
              Next
            </button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3 overflow-auto pr-1">
        {isLoading
          ? Array.from({ length: 12 }).map((_, index) => (
              <div
                key={`glyph-skeleton-${index}`}
                className="rounded-2xl border border-emerald-900/10 bg-[#fdfbf5] p-2"
              >
                <div className="h-3 w-10 rounded-full bg-stone-200 animate-pulse" />
                <div className="mt-2 h-2 w-16 rounded-full bg-stone-200 animate-pulse" />
                <div className="mt-3 h-[70px] w-full rounded-xl bg-stone-200/80 animate-pulse" />
              </div>
            ))
          : glyphs.map((glyph) => (
              <button
                key={glyph.id}
                className="cursor-pointer rounded-2xl border border-emerald-900/20 bg-[#fdfbf5] p-2 text-left transition hover:-translate-y-0.5 hover:shadow-[0_12px_18px_rgba(27,26,23,0.1)]"
                onClick={() => onAddGlyph(glyph.id)}
              >
                <div className="font-semibold text-emerald-950">{glyph.id}</div>
                <div className="mb-1 text-[0.7rem] text-stone-500">{glyph.name}</div>
                <svg viewBox={glyph.viewBox} className="h-[70px] w-full" aria-hidden>
                  <g dangerouslySetInnerHTML={{ __html: glyph.body }} />
                </svg>
              </button>
            ))}
      </div>
    </aside>
  )
}

export default GlyphLibrary
