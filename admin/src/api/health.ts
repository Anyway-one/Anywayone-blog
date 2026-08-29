import { apiBaseUrl } from './http'

export type ServiceCondition = 'ok' | 'unavailable'

export interface HealthStatus {
  status: ServiceCondition
  database: ServiceCondition | null
}

export async function getHealthStatus() {
  try {
    const healthUrl = new URL('/health/ready', `${apiBaseUrl}/`)
    const response = await fetch(healthUrl, { headers: { Accept: 'application/json' }, credentials: 'include' })
    const body = await response.json() as { data?: HealthStatus }
    if (body.data) return body.data
  } catch {
    // A failed health request is represented as an unavailable service.
  }
  return { status: 'unavailable', database: 'unavailable' } satisfies HealthStatus
}
