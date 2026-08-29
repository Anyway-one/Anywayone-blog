import { apiRequest, setAccessToken } from './http'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  status: 'active' | 'disabled'
  avatarMediaId: string | null
  avatarPublicUrl: string | null
}

export interface LoginData {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: AuthUser
}

interface DataResponse<T> {
  data: T
  meta: {
    requestId: string
  }
}

export interface LoginInput {
  email: string
  password: string
}

function storeLoginData(response: DataResponse<LoginData>) {
  setAccessToken(response.data.accessToken)
  return response.data
}

export async function login(input: LoginInput) {
  const response = await apiRequest<DataResponse<LoginData>>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
    authenticated: false,
    retryOnUnauthorized: false,
  })
  return storeLoginData(response)
}

export async function refresh() {
  const response = await apiRequest<DataResponse<LoginData>>('/auth/refresh', {
    method: 'POST',
    authenticated: false,
    retryOnUnauthorized: false,
  })
  return storeLoginData(response)
}

export async function logout() {
  try {
    await apiRequest<DataResponse<{ message: string }>>('/auth/logout', {
      method: 'POST',
      authenticated: false,
      retryOnUnauthorized: false,
    })
  } finally {
    setAccessToken(null)
  }
}

export async function updateMe(input: { avatarMediaId: string | null }) {
  const response = await apiRequest<DataResponse<AuthUser>>('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}
