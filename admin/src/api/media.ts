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
  originalName: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  altText: string | null
  createdAt: string
}

export async function listMedia(page = 1, pageSize = 100) {
  return apiRequest<PaginatedResponse<MediaItem>>(`/admin/media?page=${page}&pageSize=${pageSize}`)
}

export async function getMediaCount() {
  const response = await listMedia(1, 1)
  return response.meta.total
}

export async function uploadMedia(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await apiRequest<DataResponse<MediaItem>>('/admin/media', {
    method: 'POST',
    body,
  })
  return response.data
}

export async function deleteMedia(id: string) {
  await apiRequest(`/admin/media/${id}`, { method: 'DELETE' })
}
