export type Memory = {
  id: number
  source: string
  summary: string
  entities: string[]
  topics: string[]
  importance: number
  connections: { linked_to: number; relationship: string }[]
  created_at: string
  consolidated: boolean
  raw_text?: string | null
}

export type Stats = {
  total_memories: number
  unconsolidated: number
  consolidations: number
}

class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, init)
  } catch {
    throw new ApiError('Agent is unreachable. Is it running?')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(body?.detail || body?.reason || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export const api = {
  status: () => request<Stats>('/api/status'),
  memories: (limit = 100) => request<{ memories: Memory[]; count: number }>(`/api/memories?limit=${limit}`),
  ingest: (text: string, source = 'dashboard') =>
    request<{ status: string; response: string }>('/api/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    }),
  query: (q: string) => request<{ question: string; answer: string }>(`/api/query?q=${encodeURIComponent(q)}`),
  consolidate: () => request<{ status: string; response: string }>('/api/consolidate', { method: 'POST' }),
  deleteMemory: (id: number) =>
    request<{ status: string }>('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_id: id }),
    }),
  clearAll: () => request<{ status: string; memories_deleted: number; files_deleted: number }>('/api/clear', { method: 'POST' }),
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ status: string; filename: string }>('/api/upload', { method: 'POST', body: form })
  },
}

export { ApiError }
