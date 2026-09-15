import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Inbox, MessageCircleQuestion, Database } from 'lucide-react'
import Ingest from './pages/Ingest'
import QueryPage from './pages/Query'
import Memories from './pages/Memories'
import Logo from './components/Logo'
import StatusPulse from './components/StatusPulse'
import StatTile from './components/StatTile'
import { api, type Stats } from './lib/api'
import { ToastProvider } from './components/Toast'

const NAV = [
  { to: '/', label: 'Ingest', icon: Inbox },
  { to: '/query', label: 'Query', icon: MessageCircleQuestion },
  { to: '/memories', label: 'Memory bank', icon: Database },
]

function useAgentStatus() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [online, setOnline] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const data = await api.status()
        if (!cancelled) {
          setStats(data)
          setOnline(true)
        }
      } catch {
        if (!cancelled) setOnline(false)
      }
    }
    poll()
    const id = setInterval(poll, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return { stats, online }
}

function Sidebar({ stats, online }: { stats: Stats | null; online: boolean | null }) {
  return (
    <aside className="lg:w-60 shrink-0 border-b lg:border-b-0 lg:border-r border-ink-800 bg-ink-950">
      <div className="lg:h-screen lg:sticky lg:top-0 flex lg:flex-col">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-ink-800 w-full">
          <Logo />
          <div className="leading-tight">
            <p className="font-display font-semibold text-sm text-ink-100">Memory Agent</p>
            <StatusPulse online={online} />
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 px-3 py-3 overflow-x-auto lg:overflow-visible">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors border-l-2 ${
                  isActive
                    ? 'bg-ink-900 text-ink-100 border-signal-400'
                    : 'text-ink-400 border-transparent hover:text-ink-100 hover:bg-ink-900/60'
                }`
              }
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block mt-auto px-5 py-4 border-t border-ink-800">
          <p className="text-[11px] uppercase tracking-wide text-ink-500 mb-1">Memory</p>
          <StatTile label="Stored" value={stats?.total_memories ?? 0} />
          <StatTile label="Pending" value={stats?.unconsolidated ?? 0} accent="amber" />
          <StatTile label="Consolidations" value={stats?.consolidations ?? 0} accent="signal" />
        </div>
      </div>
    </aside>
  )
}

export default function App() {
  const { stats, online } = useAgentStatus()

  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col lg:flex-row">
          <Sidebar stats={stats} online={online} />
          <main className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto px-6 py-10">
              <Routes>
                <Route path="/" element={<Ingest />} />
                <Route path="/query" element={<QueryPage />} />
                <Route path="/memories" element={<Memories />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  )
}
