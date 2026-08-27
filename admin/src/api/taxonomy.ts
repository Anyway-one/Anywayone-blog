import { apiRequest } from './http'

interface DataResponse<T> {
  data: T
}

export interface TaxonomyItem {
  id: string
  name: string
  slug: string
  description: string | null
  postCount: number
  createdAt: string
  updatedAt: string
}

export interface CategoryItem extends TaxonomyItem {
  sortOrder: number
}

export interface TaxonomyInput {
  name: string
  slug: string
  description: string | null
}

export interface CategoryInput extends TaxonomyInput {
  sortOrder: number
}

export async function listCategories() {
  const response = await apiRequest<DataResponse<CategoryItem[]>>('/admin/categories')
  return response.data
}

export async function createCategory(input: CategoryInput) {
  const response = await apiRequest<DataResponse<CategoryItem>>('/admin/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  const response = await apiRequest<DataResponse<CategoryItem>>(`/admin/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function deleteCategory(id: string) {
  await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' })
}

export async function listTags() {
  const response = await apiRequest<DataResponse<TaxonomyItem[]>>('/admin/tags')
  return response.data
}

export async function createTag(input: TaxonomyInput) {
  const response = await apiRequest<DataResponse<TaxonomyItem>>('/admin/tags', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updateTag(id: string, input: Partial<TaxonomyInput>) {
  const response = await apiRequest<DataResponse<TaxonomyItem>>(`/admin/tags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function deleteTag(id: string) {
  await apiRequest(`/admin/tags/${id}`, { method: 'DELETE' })
}

export async function mergeTag(id: string, targetTagId: string) {
  await apiRequest(`/admin/tags/${id}/merge`, {
    method: 'POST',
    body: JSON.stringify({ targetTagId }),
  })
}
