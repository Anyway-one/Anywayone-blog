import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function AuthLoading() {
  return (
    <main className="auth-loading" role="status" aria-live="polite">
      <span className="auth-loading__mark">A.</span>
      <span>正在确认登录状态</span>
    </main>
  )
}

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <AuthLoading />
  if (status === 'anonymous') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    )
  }
  return <Outlet />
}

export function RequireAnonymous() {
  const { status } = useAuth()

  if (status === 'restoring') return <AuthLoading />
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Outlet />
}
