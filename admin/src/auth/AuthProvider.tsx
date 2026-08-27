import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import type { AuthUser, LoginInput } from '../api/auth'
import { registerSessionRefresh, setAccessToken, subscribeToUnauthorized } from '../api/http'
import { AuthContext, type AuthStatus } from './AuthContext'

let pendingRefresh: Promise<authApi.LoginData> | null = null

function refreshOnce() {
  if (!pendingRefresh) {
    pendingRefresh = authApi.refresh().finally(() => {
      pendingRefresh = null
    })
  }
  return pendingRefresh
}

registerSessionRefresh(async () => {
  await refreshOnce()
})

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('restoring')
  const [user, setUser] = useState<AuthUser | null>(null)

  const clearSession = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  useEffect(() => subscribeToUnauthorized(clearSession), [clearSession])

  useEffect(() => {
    let active = true

    void refreshOnce()
      .then((session) => {
        if (!active) return
        setUser(session.user)
        setStatus('authenticated')
      })
      .catch(() => {
        if (active) clearSession()
      })

    return () => {
      active = false
    }
  }, [clearSession])

  const login = useCallback(async (input: LoginInput) => {
    const session = await authApi.login(input)
    setUser(session.user)
    setStatus('authenticated')
    return session.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const value = useMemo(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
