const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export const apiBaseUrl = configuredApiBaseUrl.replace(/\/$/, '')

interface ErrorBody {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
  meta?: {
    requestId?: string
  }
}

interface RequestOptions extends RequestInit {
  authenticated?: boolean
  retryOnUnauthorized?: boolean
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown
  readonly requestId?: string

  constructor({
    status,
    code,
    message,
    details,
    requestId,
  }: {
    status: number
    code: string
    message: string
    details?: unknown
    requestId?: string
  }) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.requestId = requestId
  }
}

let accessToken: string | null = null
let refreshSession: (() => Promise<void>) | null = null
const unauthorizedListeners = new Set<() => void>()

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function registerSessionRefresh(refresh: () => Promise<void>) {
  refreshSession = refresh
}

export function subscribeToUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

function notifyUnauthorized() {
  unauthorizedListeners.forEach((listener) => listener())
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  if (!contentType?.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}

function toApiError(response: Response, body: unknown) {
  const errorBody = body as ErrorBody | null
  return new ApiError({
    status: response.status,
    code: errorBody?.error?.code || 'REQUEST_FAILED',
    message: errorBody?.error?.message || '请求失败，请稍后重试。',
    details: errorBody?.error?.details,
    requestId: errorBody?.meta?.requestId,
  })
}

async function sendRequest<T>(path: string, options: RequestOptions): Promise<T> {
  const { authenticated = true, retryOnUnauthorized = true, headers, ...requestInit } = options
  const requestHeaders = new Headers(headers)

  if (requestInit.body && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (authenticated && accessToken) {
    requestHeaders.set('Authorization', `Bearer ${accessToken}`)
  }

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...requestInit,
      headers: requestHeaders,
      credentials: 'include',
    })
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: '无法连接到服务，请检查网络或稍后重试。',
    })
  }

  const body = await readResponseBody(response)
  if (response.ok) return body as T

  if (response.status === 401 && authenticated && retryOnUnauthorized && refreshSession) {
    try {
      await refreshSession()
      return await sendRequest<T>(path, { ...options, retryOnUnauthorized: false })
    } catch (error) {
      setAccessToken(null)
      notifyUnauthorized()
      throw error
    }
  }

  throw toApiError(response, body)
}

export function apiRequest<T>(path: string, options: RequestOptions = {}) {
  return sendRequest<T>(path, options)
}
