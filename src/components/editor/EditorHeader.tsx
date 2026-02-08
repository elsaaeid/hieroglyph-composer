import type { CopyPreset } from './types'

type EditorHeaderProps = {
  onCopy: (preset: CopyPreset) => void
  onPaste: () => void
}

function EditorHeader({ onCopy, onPaste }: EditorHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-40 mx-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white/80 px-6 py-4 shadow-[0_20px_40px_rgba(27,26,23,0.08)] backdrop-blur">
      <div>
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-stone-500">JSesh-style SVG Editor MVP</p>
        <h1 className="mt-1 font-[Fraunces] text-3xl text-emerald-950">Vector-first Hieroglyph Composer</h1>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="relative group">
          <button
            className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
            onClick={() => onCopy('small')}
          >
            Copy Small
          </button>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-44 rounded-xl bg-emerald-950 px-3 py-2 text-xs text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Small copy preset.
          </div>
        </div>
        <div className="relative group">
          <button
            className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
            onClick={() => onCopy('large')}
          >
            Copy Large
          </button>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-44 rounded-xl bg-emerald-950 px-3 py-2 text-xs text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Large copy preset.
          </div>
        </div>
        <div className="relative group">
          <button
            className="cursor-pointer rounded-full bg-emerald-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow transition hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(29,59,47,0.2)]"
            onClick={() => onCopy('wysiwyg')}
          >
            Copy WYSIWYG
          </button>
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-52 rounded-xl bg-emerald-950 px-3 py-2 text-xs text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Uses the current zoom level.
          </div>
        </div>
        <div className="relative group">
          <button
            className="cursor-pointer rounded-full border border-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:-translate-y-0.5"
            onClick={onPaste}
          >
            Paste
          </button>
          <div className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-56 rounded-xl bg-emerald-950 px-3 py-2 text-xs text-amber-50 opacity-0 shadow-[0_16px_32px_rgba(27,26,23,0.3)] transition group-hover:opacity-100">
            Paste SVG first, else import SVG or read IDs.
          </div>
        </div>
      </div>
    </header>
  )
}

export default EditorHeader
