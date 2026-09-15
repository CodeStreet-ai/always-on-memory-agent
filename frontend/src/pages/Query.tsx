import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'

const SAMPLES = [
  'What are the main themes across everything you remember?',
  'What connections do you see between different memories?',
  'What should I focus on based on what you know?',
  'Summarize everything in three points.',
]

const BRACKETED_GROUP = /\[((?:Memory \d+)(?:,\s*Memory \d+)*)\]/g
const CITATION = /Memory (\d+)/g

function renderWithCitations(answer: string): ReactNode[] {
  // Unwrap "[Memory 1, Memory 2]" to "Memory 1, Memory 2" so brackets
  // don't clutter the inline badges rendered below.
  const flattened = answer.replace(BRACKETED_GROUP, '$1')
  const parts: ReactNode[] = []
  let last = 0
  let match: RegExpExecArray | null
  CITATION.lastIndex = 0
  while ((match = CITATION.exec(flattened))) {
    if (match.index > last) parts.push(flattened.slice(last, match.index))
    parts.push(
      <Link
        key={match.index}
        to="/memories"
        className="inline-flex items-center rounded border border-signal-600/40 bg-signal-500/10 px-1.5 py-0.5 text-xs font-mono text-signal-300 hover:bg-signal-500/20 align-middle mx-0.5"
      >
        #{match[1]}
      </Link>
    )
    last = match.index + match[0].length
  }
  parts.push(flattened.slice(last))
  return parts
}

export default function QueryPage() {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const [asked, setAsked] = useState('')
  const [loading, setLoading] = useState(false)
  const notify = useToast()

  const ask = async (question: string) => {
    if (!question.trim() || loading) return
    setLoading(true)
    setAnswer('')
    try {
      const data = await api.query(question)
      setAsked(question)
      setAnswer(data.answer)
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Query failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader title="Ask" description="Search across every stored memory and consolidated insight — answers cite the memories they draw from." />

      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
          <input
            className="w-full bg-ink-900 border border-ink-700 rounded-lg pl-10 pr-4 py-3 text-sm text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none transition-colors"
            placeholder="What do you know about AI agents?"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(q)}
          />
        </div>
        <Button variant="primary" onClick={() => ask(q)} disabled={loading || !q.trim()}>
          {loading ? <Loader2 size={15} className="animate-spin" /> : 'Ask'}
        </Button>
      </div>

      {!answer && !loading && (
        <div className="mt-4 grid sm:grid-cols-2 gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setQ(s)
                ask(s)
              }}
              className="text-left text-xs px-3.5 py-2.5 rounded-md border border-ink-800 bg-ink-900/40 text-ink-400 hover:border-ink-600 hover:text-ink-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="mt-6 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 size={14} className="animate-spin" />
          Reading memory bank…
        </div>
      )}

      {answer && !loading && (
        <div className="mt-6 rounded-lg border border-ink-800 bg-ink-900/50 p-5 animate-fade-in">
          <p className="text-xs text-ink-500 mb-2 font-mono">{asked}</p>
          <p className="text-[15px] text-ink-100 leading-relaxed whitespace-pre-wrap">{renderWithCitations(answer)}</p>
        </div>
      )}
    </div>
  )
}
