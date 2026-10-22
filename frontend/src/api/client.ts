import { useCallback, useEffect, useState } from 'react'

const API_URL = '/api'

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

// Keeps the parsed response body, e.g. DRF validation errors ({ feld: ['Meldung'] }).
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown, message: string) {
    super(message)
    this.status = status
    this.body = body
  }
}

// Flattens a DRF 400 body into { 'feld': 'Meldung', 'mieter.vorname': 'Meldung', ... }.
// Returns undefined for anything that is not a validation error.
export function validierungsFehler(error: unknown): Record<string, string> | undefined {
  if (!(error instanceof ApiError) || error.status !== 400) return undefined
  if (!error.body || typeof error.body !== 'object') return undefined
  const ergebnis: Record<string, string> = {}
  function sammeln(wert: unknown, pfad: string) {
    if (Array.isArray(wert) && wert.every((w) => typeof w === 'string')) ergebnis[pfad] = wert.join(' ')
    else if (typeof wert === 'string') ergebnis[pfad] = wert
    else if (wert && typeof wert === 'object')
      for (const [k, v] of Object.entries(wert)) sammeln(v, pfad ? `${pfad}.${k}` : k)
  }
  sammeln(error.body, '')
  return ergebnis
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  // Not logged in: DRF answers 403, send the user to the login page and back afterwards.
  if (res.status === 403 && window.location.pathname !== '/login') {
    const next = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?next=${next}`
  }
  const body = await res.json().catch(() => undefined)
  if (!res.ok) {
    const detail = body?.detail ?? JSON.stringify(body) ?? res.statusText
    throw new ApiError(res.status, body, `${res.status}: ${detail}`)
  }
  return body as T
}

export async function apiRequest<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken') ?? '',
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  })
  return parseResponse<T>(res)
}

// Multipart upload: no Content-Type header, the browser sets it including the boundary.
export async function apiUpload<T>(path: string, data: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'X-CSRFToken': getCookie('csrftoken') ?? '' },
    body: data,
  })
  return parseResponse<T>(res)
}

interface ApiResult<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
  reload: () => void
}

export function useApi<T>(path: string): ApiResult<T> {
  const [result, setResult] = useState<{ path: string; data?: T; error?: Error }>()
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_URL}${path}`, { signal: controller.signal, credentials: 'same-origin' })
      .then((res) => parseResponse<T>(res))
      .then((data) => setResult({ path, data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setResult({ path, error: error instanceof Error ? error : new Error(String(error)) })
      })

    return () => controller.abort()
  }, [path, version])

  const current = result?.path === path ? result : undefined
  return { data: current?.data, error: current?.error, loading: !current, reload }
}