import { apiRequest } from './http'

interface DataResponse<T> {
  data: T
}

interface PaginatedResponse<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface MediaItem {
  id: string
  publicUrl: string
  category: MediaCategory
  originalName: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  altText: string | null
  createdAt: string
  usageCount: number
  usageLabels: string[]
}

export type MediaCategory = 'general' | 'post-cover' | 'photography' | 'site' | 'profile' | 'contact'

export async function listMedia(page = 1, pageSize = 100, options?: { category?: MediaCategory; query?: string; unused?: boolean }) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (options?.category) params.set('category', options.category)
  if (options?.query) params.set('q', options.query)
  if (options?.unused) params.set('unused', 'true')
  return apiRequest<PaginatedResponse<MediaItem>>(`/admin/media?${params}`)
}

export async function getMediaCount() {
  const response = await listMedia(1, 1)
  return response.meta.total
}

export async function uploadMedia(file: File, category: MediaCategory = 'general') {
  const body = new FormData()
  body.append('file', file)
  body.append('category', category)
  const response = await apiRequest<DataResponse<MediaItem>>('/admin/media', {
    method: 'POST',
    body,
  })
  return response.data
}

export async function deleteMedia(id: string) {
  await apiRequest(`/admin/media/${id}`, { method: 'DELETE' })
}

export async function bulkDeleteMedia(ids: string[]) {
  const response = await apiRequest<DataResponse<{ deletedCount: number; blockedCount: number; blockedNames: string[] }>>('/admin/media/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
  return response.data
}
