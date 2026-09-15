import { useRef, useState } from 'react'
import { Loader2, RefreshCcw, UploadCloud, FileText, Image, Music, Film, File as FileIcon } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Button from '../components/Button'
import { api, ApiError } from '../lib/api'
import { useToast } from '../components/Toast'

const SAMPLES = [
  {
    title: 'AI agents in production',
    text: 'Anthropic released a report showing that 62% of Claude usage is now code-related, with AI agents being the fastest growing category. Companies are deploying agents for customer support, code review, and data analysis. The key challenge remains reliability: agents fail silently and need human oversight loops.',
  },
  {
    title: 'Meeting notes: Q1 planning',
    text: 'Discussed Q1 priorities: 1) Ship the new API by March 15, 2) Hire two backend engineers, 3) Reduce inference costs by 40% by switching to smaller models for routing tasks. Sarah will lead the API project. Budget approved for $50k in cloud compute.',
  },
  {
    title: 'Research: memory in LLM systems',
    text: 'Current approaches to LLM memory: vector databases with RAG are good for retrieval but do no active processing; conversation summarization loses detail over time; knowledge graphs are expensive to maintain. The gap: no system actively consolidates and connects information the way human memory does.',
  },
]

const ICONS: Record<string, typeof FileText> = {
  image: Image,
  audio: Music,
  video: Film,
  application: FileIcon,
  text: FileText,
}

function iconFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return ICONS.image
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return ICONS.audio
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext)) return ICONS.video
  if (ext === 'pdf') return ICONS.application
  return ICONS.text
}

export default function Ingest() {
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [consolidating, setConsolidating] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [uploaded, setUploaded] = useState<string[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const notify = useToast()

  const runIngest = async (payload: string, source = 'dashboard') => {
    if (!payload.trim()) return
    setLoading(true)
    setResult('')
    try {
      const data = await api.ingest(payload, source)
      setResult(data.response)
      notify('Memory stored')
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Ingest failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleConsolidate = async () => {
    setConsolidating(true)
    try {
      const data = await api.consolidate()
      notify(data.response?.slice(0, 140) || 'Consolidation complete')
    } catch (e) {
      notify(e instanceof ApiError ? e.message : 'Consolidation failed', 'error')
    } finally {
      setConsolidating(false)
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    for (const file of Array.from(files)) {
      try {
        await api.upload(file)
        setUploaded((u) => [file.name, ...u].slice(0, 6))
        notify(`${file.name} queued for processing`)
      } catch (e) {
        notify(e instanceof ApiError ? e.message : `Failed to upload ${file.name}`, 'error')
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Capture"
        description="Paste text or drop a file. The ingest agent reads it, extracts entities and topics, and files it away."
      />

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="space-y-4">
          <textarea
            className="w-full h-44 resize-y bg-ink-900 border border-ink-700 rounded-lg p-4 text-sm text-ink-100 placeholder:text-ink-500 focus:border-signal-500 focus:outline-none transition-colors"
            placeholder="Paste an article, note, transcript, anything worth remembering…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Button variant="primary" onClick={() => runIngest(text)} disabled={loading || !text.trim()}>
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Processing…' : 'Process into memory'}
            </Button>
            {text && (
              <button className="text-xs text-ink-500 hover:text-ink-300" onClick={() => setText('')}>
                Clear
              </button>
            )}
          </div>

          {result && (
            <div className="rounded-lg border border-signal-600/30 bg-signal-500/[0.04] p-4 text-sm text-ink-200 leading-relaxed whitespace-pre-wrap animate-fade-in">
              {result}
            </div>
          )}

          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              handleFiles(e.dataTransfer.files)
            }}
            onClick={() => fileInput.current?.click()}
            className={`rounded-lg border border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-signal-400 bg-signal-500/[0.06]' : 'border-ink-700 hover:border-ink-600'
            }`}
          >
            <UploadCloud size={20} className="mx-auto mb-2 text-ink-500" />
            <p className="text-sm text-ink-300">Drop a file, or click to browse</p>
            <p className="text-xs text-ink-500 mt-1">Images, audio, video, PDF, or text — saved to the inbox and picked up automatically</p>
            <input
              ref={fileInput}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {uploaded.length > 0 && (
            <ul className="text-xs text-ink-400 space-y-1">
              {uploaded.map((name, i) => {
                const Icon = iconFor(name)
                return (
                  <li key={`${name}-${i}`} className="flex items-center gap-2">
                    <Icon size={13} className="text-ink-500" />
                    {name}
                    <span className="text-ink-600">queued</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-4">
            <p className="text-xs text-ink-400 mb-3">Try a sample</p>
            <div className="space-y-2">
              {SAMPLES.map((s) => (
                <button
                  key={s.title}
                  onClick={() => runIngest(s.text, s.title)}
                  disabled={loading}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-md border border-ink-800 bg-ink-950/60 text-ink-300 hover:border-ink-600 hover:text-ink-100 transition-colors disabled:opacity-50"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-ink-800 bg-ink-900/50 p-4">
            <p className="text-xs text-ink-400 mb-3">Consolidation</p>
            <p className="text-xs text-ink-500 mb-3 leading-relaxed">
              Runs automatically every 30 minutes. Trigger it now to merge pending memories into connected insights.
            </p>
            <Button variant="secondary" className="w-full" onClick={handleConsolidate} disabled={consolidating}>
              {consolidating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
              {consolidating ? 'Consolidating…' : 'Run now'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
