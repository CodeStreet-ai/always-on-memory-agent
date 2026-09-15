import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import MemoryCard from '../components/MemoryCard'
import { api, ApiError, type Memory } from '../lib/api'
import { useToast } from '../components/Toast'

export default function Memories() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [dangerOpen, setDangerOpen] = useState(false)
  const notify = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.memories()
      setMemories(data.memories)
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Could not load memories', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const del = async (id: number) => {
    if (!confirm(`Delete memory #${id}? This can't be undone.`)) return
    try {
      await api.deleteMemory(id)
      setMemories((m) => m.filter((x) => x.id !== id))
      notify(`Deleted memory #${id}`)
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Delete failed', 'error')
    }
  }

  const clearAll = async () => {
    if (!confirm('This permanently deletes every memory, consolidation, and inbox file. Continue?')) return
    try {
      const data = await api.clearAll()
      setMemories([])
      notify(`Cleared ${data.memories_deleted} memories, ${data.files_deleted} inbox files`)
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Clear failed', 'error')
    }
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return memories
    return memories.filter(
      (m) =>
        m.summary.toLowerCase().includes(q) ||
        m.topics.some((t) => t.toLowerCase().includes(q)) ||
        m.entities.some((e) => e.toLowerCase().includes(q))
    )
  }, [memories, filter])

  return (
    <div>
      <PageHeader title="Memory bank" description={`${memories.length} memories stored, ordered by most recent.`} />

      {memories.length > 0 && (
        <div className="relative mb-5">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            className="w-full bg-ink-900 border border-ink-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none transition-colors"
            placeholder="Filter by summary, topic, or entity…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-md border border-ink-800 bg-ink-900/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink-800 py-16 text-center">
          <p className="text-sm text-ink-400">
            {memories.length === 0 ? 'No memories yet.' : 'Nothing matches that filter.'}
          </p>
          {memories.length === 0 && <p className="text-xs text-ink-600 mt-1">Ingest some text or drop a file to get started.</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((m) => (
            <MemoryCard key={m.id} memory={m} onDelete={del} />
          ))}
        </div>
      )}

      {memories.length > 0 && (
        <div className="mt-10 border-t border-ink-800 pt-5">
          <button
            onClick={() => setDangerOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-300"
          >
            <AlertTriangle size={12} />
            Danger zone
          </button>
          {dangerOpen && (
            <div className="mt-3 rounded-lg border border-coral-600/30 bg-coral-500/[0.04] p-4">
              <p className="text-xs text-ink-400 leading-relaxed mb-3">
                Permanently deletes every memory, consolidation, processed-file record, and file in the inbox folder.
              </p>
              <Button variant="danger" onClick={clearAll}>
                Clear all memories
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
