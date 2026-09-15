export default function StatusPulse({ online }: { online: boolean | null }) {
  const label = online === null ? 'checking' : online ? 'online' : 'offline'
  const dot = online === null ? 'bg-ink-500' : online ? 'bg-signal-400' : 'bg-coral-500'
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        {online && <span className={`absolute inline-flex h-full w-full rounded-full ${dot} animate-pulse-ring`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span className="text-xs text-ink-400 font-mono">{label}</span>
    </div>
  )
}
