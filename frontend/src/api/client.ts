const API_URL: string = import.meta.env.VITE_API_URL as string

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string, message?: string) {
    super(message ?? (detail !== '' ? detail : `HTTP ${status.toString()}`))
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export interface ApiFetchMeta {
  token?: string | null
  signal?: AbortSignal
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body' | 'headers' | 'signal'> {
  /** Cuerpo de la request. Si no es undefined se serializa con JSON.stringify y se setea Content-Type. */
  body?: unknown
  /** Headers adicionales (los headers de Authorization y Content-Type se añaden automáticamente). */
  headers?: Record<string, string>
}

async function _extractDetail(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json()
    if (data !== null && typeof data === 'object' && 'detail' in data) {
      const detail: unknown = (data as { detail: unknown }).detail
      if (typeof detail === 'string') return detail
    }
  } catch {
    // body no era JSON
  }
  return ''
}

/**
 * fetch crudo contra el backend. Devuelve la `Response` sin parsear.
 * Útil para descargas (blob) o streams (SSE).
 *
 * Lanza `ApiError` si !response.ok.
 */
export async function apiFetchRaw(
  path: string,
  options: ApiFetchOptions = {},
  meta: ApiFetchMeta = {},
): Promise<Response> {
  const { body, headers: extraHeaders, ...rest } = options

  const headers: Record<string, string> = { ...(extraHeaders ?? {}) }
  if (meta.token !== undefined && meta.token !== null && meta.token !== '') {
    headers.Authorization = `Bearer ${meta.token}`
  }

  let serializedBody: BodyInit | undefined
  if (body !== undefined) {
    serializedBody = JSON.stringify(body)
    if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json'
    }
  }

  const response: Response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: serializedBody,
    signal: meta.signal,
    // Necesario para que el navegador envíe la cookie HttpOnly de
    // refresh_token (Path=/auth) en cross-origin (Vercel ⇄ Render).
    credentials: 'include',
  })

  if (!response.ok) {
    const detail: string = await _extractDetail(response)
    throw new ApiError(response.status, detail)
  }

  return response
}

/**
 * Llama al backend y devuelve el JSON tipado. Lanza `ApiError` si !ok.
 *
 * Para 204 No Content devuelve `undefined as T`.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
  meta: ApiFetchMeta = {},
): Promise<T> {
  const response: Response = await apiFetchRaw(path, options, meta)
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}
