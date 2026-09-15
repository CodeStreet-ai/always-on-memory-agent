export default function StatTile({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'signal' }) {
  const color = accent === 'amber' ? 'text-amber-300' : accent === 'signal' ? 'text-signal-400' : 'text-ink-100'
  return (
    <div className="flex items-baseline justify-between border-b border-ink-800 py-2 last:border-0">
      <span className="text-xs text-ink-400">{label}</span>
      <span className={`font-mono text-sm tabular-nums ${color}`}>{value}</span>
    </div>
  )
}
