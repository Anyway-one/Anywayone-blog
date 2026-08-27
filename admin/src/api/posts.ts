import { apiRequest } from './http'

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'WITHDRAWN' | 'ARCHIVED'
export type PostVisibility = 'PUBLIC' | 'UNLISTED'

export interface TaxonomySummary {
  id: string
  name: string
  slug: string
}

export interface CoverMediaSummary {
  id: string
  publicUrl: string
  width: number
  height: number
}

interface ResponseMeta {
  requestId: string
}

interface DataResponse<T> {
  data: T
  meta: ResponseMeta
}

export interface PageMeta extends ResponseMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface PaginatedResponse<T> {
  data: T[]
  meta: PageMeta
}

export interface PostListItem {
  id: string
  title: string
  slug: string
  excerpt: string | null
  category: TaxonomySummary | null
  tags: TaxonomySummary[]
  coverMedia: CoverMediaSummary | null
  coverAlt: string | null
  status: PostStatus
  visibility: PostVisibility
  revision: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PostRead extends PostListItem {
  authorId: string
  categoryId: string | null
  coverMediaId: string | null
  markdown: string
  renderedHtml: string
  toc: Record<string, unknown>[]
  isPinned: boolean
  allowIndexing: boolean
  seoTitle: string | null
  seoDescription: string | null
  canonicalUrl: string | null
  readingTimeMinutes: number
  scheduledAt: string | null
}

export interface PostDraftInput {
  title: string
  slug: string
  markdown: string
  excerpt: string | null
  categoryId: string | null
  tagIds: string[]
  coverMediaId: string | null
  coverAlt: string | null
}

export interface PostUpdateInput extends PostDraftInput {
  revision: number
  visibility: PostVisibility
  isPinned: boolean
}

export interface PublicationIssue {
  field: string
  message: string
}

export interface PublicationValidation {
  valid: boolean
  issues: PublicationIssue[]
}

export interface ListPostsInput {
  page?: number
  pageSize?: number
  status?: PostStatus
  query?: string
  signal?: AbortSignal
}

export async function listPosts({
  page = 1,
  pageSize = 20,
  status,
  query,
  signal,
}: ListPostsInput = {}) {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (status) search.set('status', status)
  if (query?.trim()) search.set('q', query.trim())

  return apiRequest<PaginatedResponse<PostListItem>>(`/admin/posts?${search.toString()}`, {
    signal,
  })
}

export async function getPost(postId: string, signal?: AbortSignal) {
  const response = await apiRequest<DataResponse<PostRead>>(`/admin/posts/${postId}`, { signal })
  return response.data
}

export async function createPost(input: PostDraftInput) {
  const response = await apiRequest<DataResponse<PostRead>>('/admin/posts', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updatePost(postId: string, input: PostUpdateInput) {
  const response = await apiRequest<DataResponse<PostRead>>(`/admin/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function validatePublication(postId: string) {
  const response = await apiRequest<DataResponse<PublicationValidation>>(
    `/admin/posts/${postId}/validate-publication`,
    { method: 'POST' },
  )
  return response.data
}

export async function publishPost(postId: string, revision: number) {
  const response = await apiRequest<DataResponse<PostRead>>(`/admin/posts/${postId}/publish`, {
    method: 'POST',
    body: JSON.stringify({ revision }),
  })
  return response.data
}

export async function withdrawPost(postId: string, revision: number) {
  const response = await apiRequest<DataResponse<PostRead>>(`/admin/posts/${postId}/withdraw`, {
    method: 'POST',
    body: JSON.stringify({ revision }),
  })
  return response.data
}
