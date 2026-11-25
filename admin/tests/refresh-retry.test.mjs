import assert from 'node:assert/strict'
import test from 'node:test'

import { refreshThenRetry } from '../src/api/refresh-retry.ts'

test('刷新成功后，重试请求的业务错误不会触发登出', async () => {
  const businessError = new Error('409 conflict')
  let logoutCount = 0

  await assert.rejects(
    refreshThenRetry(
      async () => undefined,
      async () => { throw businessError },
      () => { logoutCount += 1 },
    ),
    businessError,
  )
  assert.equal(logoutCount, 0)
})

test('刷新失败时触发一次登出并保留原错误', async () => {
  const refreshError = new Error('refresh failed')
  let logoutCount = 0
  let retryCount = 0

  await assert.rejects(
    refreshThenRetry(
      async () => { throw refreshError },
      async () => { retryCount += 1 },
      () => { logoutCount += 1 },
    ),
    refreshError,
  )
  assert.equal(logoutCount, 1)
  assert.equal(retryCount, 0)
})
