import { cache } from "react";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export interface TaxonomySummary {
  id: string;
  name: string;
  slug: string;
}

export interface CoverMediaSummary {
  id: string;
  publicUrl: string;
  width: number;
  height: number;
}

export interface PublicPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: TaxonomySummary | null;
  tags: TaxonomySummary[];
  coverMedia: CoverMediaSummary | null;
  coverAlt: string | null;
  readingTimeMinutes: number;
  publishedAt: string;
}

export interface PublicTaxonomy extends TaxonomySummary {
  description: string | null;
  postCount: number;
}

export type TaxonomyKind = "category" | "tag";

export interface TableOfContentsItem {
  id: string;
  title: string;
  level: number;
}

export interface PublicPost extends PublicPostListItem {
  renderedHtml: string;
  toc: TableOfContentsItem[];
  seoTitle: string | null;
  seoDescription: string | null;
  canonicalUrl: string | null;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  requestId: string;
}

export type PublicApiResult<T> =
  | { status: "ready"; data: T }
  | { status: "unconfigured" }
  | { status: "not-found" }
  | { status: "unavailable" };

interface DataResponse<T> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

async function request<T>(path: string, tags: string[]): Promise<PublicApiResult<T>> {
  if (!configuredApiBaseUrl) return { status: "unconfigured" };

  try {
    const response = await fetch(`${configuredApiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags },
    });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "unavailable" };
    return { status: "ready", data: await response.json() as T };
  } catch {
    return { status: "unavailable" };
  }
}

export async function listPublicPosts(
  page = 1,
  pageSize = 20,
): Promise<PublicApiResult<PaginatedResponse<PublicPostListItem>>> {
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request<PaginatedResponse<PublicPostListItem>>(
    `/public/posts?${search.toString()}`,
    ["public-posts"],
  );
}

export async function listPublicTaxonomies(
  kind: TaxonomyKind,
): Promise<PublicApiResult<PublicTaxonomy[]>> {
  const segment = kind === "category" ? "categories" : "tags";
  const response = await request<DataResponse<PublicTaxonomy[]>>(
    `/public/${segment}`,
    ["public-posts", `public-${segment}`],
  );
  if (response.status !== "ready") return response;
  return { status: "ready", data: response.data.data };
}

export const getPublicTaxonomy = cache(async (
  kind: TaxonomyKind,
  slug: string,
): Promise<PublicApiResult<PublicTaxonomy>> => {
  const response = await listPublicTaxonomies(kind);
  if (response.status !== "ready") return response;
  const item = response.data.find((candidate) => candidate.slug === slug);
  return item ? { status: "ready", data: item } : { status: "not-found" };
});

export async function listPublicTaxonomyPosts(
  kind: TaxonomyKind,
  slug: string,
  page = 1,
  pageSize = 20,
): Promise<PublicApiResult<PaginatedResponse<PublicPostListItem>>> {
  const segment = kind === "category" ? "categories" : "tags";
  const search = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return request<PaginatedResponse<PublicPostListItem>>(
    `/public/${segment}/${encodeURIComponent(slug)}/posts?${search.toString()}`,
    ["public-posts", `public-${segment}`, `public-${kind}:${slug}`],
  );
}

export const getPublicPost = cache(async (slug: string): Promise<PublicApiResult<PublicPost>> => {
  const response = await request<DataResponse<PublicPost>>(
    `/public/posts/${encodeURIComponent(slug)}`,
    ["public-posts", `public-post:${slug}`],
  );
  if (response.status !== "ready") return response;
  return { status: "ready", data: response.data.data };
});

export async function listAllPublicPosts(): Promise<PublicApiResult<PublicPostListItem[]>> {
  const firstPage = await listPublicPosts(1, 100);
  if (firstPage.status !== "ready") return firstPage;

  const posts = [...firstPage.data.data];
  for (let page = 2; page <= firstPage.data.meta.totalPages; page += 1) {
    const nextPage = await listPublicPosts(page, 100);
    if (nextPage.status !== "ready") return nextPage;
    posts.push(...nextPage.data.data);
  }
  return { status: "ready", data: posts };
}
