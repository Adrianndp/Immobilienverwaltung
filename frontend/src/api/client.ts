import { useCallback, useEffect, useState } from 'react'

const API_URL = '/api'

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  // Not logged in: DRF answers 403, send the user to Django's login page.
  if (res.status === 403) {
    window.location.href = `/api/auth/login/?next=${window.location.pathname}`
  }
  const body = await res.json().catch(() => undefined)
  if (!res.ok) {
    const detail = body?.detail ?? JSON.stringify(body) ?? res.statusText
    throw new Error(`${res.status}: ${detail}`)
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