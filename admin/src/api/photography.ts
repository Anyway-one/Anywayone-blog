import { apiRequest } from './http'

export type PhotographyStatus = 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'

export interface PhotoItemInput {
  mediaId: string
  position: number
  title: string | null
  altText: string | null
  caption: string | null
}

export interface PhotoItem extends PhotoItemInput {
  id: string
  publicUrl: string
  width: number
  height: number
  originalName: string
}

export interface PhotographyListItem {
  id: string
  title: string
  slug: string
  description: string | null
  coverMediaId: string | null
  coverPublicUrl: string | null
  coverWidth: number | null
  coverHeight: number | null
  capturedFrom: string | null
  capturedTo: string | null
  locationText: string | null
  status: PhotographyStatus
  revision: number
  photoCount: number
  publishedAt: string | null
  updatedAt: string
}

export interface PhotographyCollection extends PhotographyListItem {
  authorId: string
  allowIndexing: boolean
  createdAt: string
  items: PhotoItem[]
}

interface DataResponse<T> { data: T }
interface PaginatedResponse<T> { data: T[]; meta: { total: number; totalPages: number; page: number; pageSize: number } }

export async function listPhotography(status?: PhotographyStatus, query?: string) {
  const params = new URLSearchParams({ page: '1', pageSize: '100' })
  if (status) params.set('status', status)
  if (query) params.set('q', query)
  const response = await apiRequest<PaginatedResponse<PhotographyListItem>>(`/admin/photography?${params}`)
  return response.data
}

export async function getPhotographyCount(status?: PhotographyStatus) {
  const params = new URLSearchParams({ page: '1', pageSize: '1' })
  if (status) params.set('status', status)
  const response = await apiRequest<PaginatedResponse<PhotographyListItem>>(`/admin/photography?${params}`)
  return response.meta.total
}

export async function getPhotography(id: string) {
  const response = await apiRequest<DataResponse<PhotographyCollection>>(`/admin/photography/${id}`)
  return response.data
}

export interface PhotographyDraftInput {
  title: string
  slug: string
  description: string | null
  coverMediaId: string | null
  capturedFrom: string | null
  capturedTo: string | null
  locationText: string | null
  items: PhotoItemInput[]
}

export async function createPhotography(input: PhotographyDraftInput) {
  const response = await apiRequest<DataResponse<PhotographyCollection>>('/admin/photography', { method: 'POST', body: JSON.stringify(input) })
  return response.data
}

export async function updatePhotography(id: string, input: PhotographyDraftInput & { revision: number }) {
  const response = await apiRequest<DataResponse<PhotographyCollection>>(`/admin/photography/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
  return response.data
}

export async function publishPhotography(id: string, revision: number) {
  const response = await apiRequest<DataResponse<PhotographyCollection>>(`/admin/photography/${id}/publish`, { method: 'POST', body: JSON.stringify({ revision }) })
  return response.data
}

export async function withdrawPhotography(id: string, revision: number) {
  const response = await apiRequest<DataResponse<PhotographyCollection>>(`/admin/photography/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ revision }) })
  return response.data
}

export async function deletePhotography(id: string) {
  await apiRequest(`/admin/photography/${id}`, { method: 'DELETE' })
}
