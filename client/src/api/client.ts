const API_BASE = '/api'

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  return res.json()
}

export function createTaskStream(
  task: string,
  mock: boolean,
  onEvent: (event: { type: string; data: unknown }) => void,
  onComplete: () => void,
  onError: (err: Error) => void,
  apiKey?: string,
  baseUrl?: string,
): AbortController {
  const controller = new AbortController()

  fetch(`${API_BASE}/task/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, mock, apiKey, baseUrl }),
    signal: controller.signal,
  }).then(async response => {
    if (!response.ok) {
      onError(new Error(`HTTP ${response.status}`))
      return
    }
    const reader = response.body?.getReader()
    if (!reader) {
      onError(new Error('No response body'))
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            onEvent(parsed)
          } catch {
            // ignore malformed JSON
          }
        }
      }
    }

    onComplete()
  }).catch(err => {
    if (err.name !== 'AbortError') {
      onError(err)
    }
  })

  return controller
}