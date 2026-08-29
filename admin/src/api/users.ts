import { apiRequest } from './http'

interface DataResponse<T> {
  data: T
}

export type UserStatus = 'ACTIVE' | 'LOCKED' | 'DISABLED'

export interface AdminUser {
  id: string
  email: string
  displayName: string
  status: UserStatus
  avatarMediaId: string | null
  avatarPublicUrl: string | null
  createdAt: string
  lastLoginAt: string | null
  passwordChangedAt: string | null
}

export interface CreateUserInput {
  email: string
  displayName: string
  password: string
  avatarMediaId?: string | null
}

export interface UpdateUserInput {
  email?: string
  displayName?: string
  password?: string
  status?: UserStatus
  avatarMediaId?: string | null
}

export async function listUsers() {
  const response = await apiRequest<DataResponse<AdminUser[]>>('/admin/users')
  return response.data
}

export async function createUser(input: CreateUserInput) {
  const response = await apiRequest<DataResponse<AdminUser>>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const response = await apiRequest<DataResponse<AdminUser>>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}
