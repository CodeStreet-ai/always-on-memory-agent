import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

type Toast = { id: number; kind: 'success' | 'error'; message: string }
type ToastFn = (message: string, kind?: Toast['kind']) => void

const ToastContext = createContext<ToastFn>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const notify = useCallback<ToastFn>((message, kind = 'success') => {
    const id = nextId.current++
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm shadow-lg shadow-black/30 backdrop-blur-sm animate-fade-in ${
              t.kind === 'success'
                ? 'bg-ink-900/95 border-signal-600/40 text-ink-100'
                : 'bg-ink-900/95 border-coral-600/40 text-ink-100'
            }`}
          >
            {t.kind === 'success' ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal-400" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0 text-coral-400" />
            )}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button
              onClick={() => setToasts((cur) => cur.filter((x) => x.id !== t.id))}
              className="shrink-0 text-ink-400 hover:text-ink-100"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
