type StatusBarProps = {
  status: string
  count: number
}

function StatusBar({ status, count }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between text-xs text-stone-600">
      <span>{status}</span>
      <span>{count} glyphs</span>
    </div>
  )
}

export default StatusBar
