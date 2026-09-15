import { Link2, Trash2 } from 'lucide-react'
import type { Memory } from '../lib/api'

function importanceColor(importance: number) {
  if (importance >= 0.7) return 'border-l-signal-400'
  if (importance >= 0.4) return 'border-l-amber-400'
  return 'border-l-ink-600'
}

function formatDate(iso: string) {
  try {
    return iso.replace('T', ' ').slice(0, 16)
  } catch {
    return iso
  }
}

export default function MemoryCard({ memory, onDelete }: { memory: Memory; onDelete: (id: number) => void }) {
  return (
    <div className={`group rounded-md border border-ink-800 border-l-2 ${importanceColor(memory.importance)} bg-ink-900/40 px-4 py-3.5 hover:bg-ink-900/70 transition-colors`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-ink-500">
          <span className="text-ink-300">#{memory.id}</span>
          <span>·</span>
          <span>{formatDate(memory.created_at)}</span>
          {memory.source && (
            <>
              <span>·</span>
              <span className="truncate max-w-[10rem]">{memory.source}</span>
            </>
          )}
        </div>
        <button
          onClick={() => onDelete(memory.id)}
          className="opacity-0 group-hover:opacity-100 text-ink-600 hover:text-coral-400 transition-opacity shrink-0"
          aria-label={`Delete memory ${memory.id}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <p className="text-sm text-ink-200 mt-2 leading-relaxed">{memory.summary}</p>

      {(memory.topics.length > 0 || memory.entities.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {memory.topics.map((t) => (
            <span key={t} className="text-[11px] rounded border border-signal-600/30 text-signal-300 px-1.5 py-0.5">
              {t}
            </span>
          ))}
          {memory.entities.slice(0, 5).map((e) => (
            <span key={e} className="text-[11px] rounded border border-ink-700 text-ink-400 px-1.5 py-0.5">
              {e}
            </span>
          ))}
        </div>
      )}

      {memory.connections.length > 0 && (
        <div className="flex items-center gap-1 mt-2.5 text-[11px] text-ink-500">
          <Link2 size={11} />
          {memory.connections.length} connection{memory.connections.length === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}
