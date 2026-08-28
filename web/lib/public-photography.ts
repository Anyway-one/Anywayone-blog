import { cache } from "react";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export interface PublicPhotoItem {
  id: string;
  mediaId: string;
  position: number;
  title: string | null;
  altText: string | null;
  caption: string | null;
  publicUrl: string;
  width: number;
  height: number;
  originalName: string;
}

export interface PublicPhotoCollectionListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverPublicUrl: string;
  coverWidth: number;
  coverHeight: number;
  capturedFrom: string | null;
  capturedTo: string | null;
  locationText: string | null;
  photoCount: number;
  publishedAt: string;
}

export interface PublicPhotoCollection extends Omit<PublicPhotoCollectionListItem, "coverPublicUrl" | "coverWidth" | "coverHeight" | "photoCount"> {
  items: PublicPhotoItem[];
}

interface DataResponse<T> { data: T }

async function request<T>(path: string): Promise<T | null> {
  if (!configuredApiBaseUrl) return null;
  try {
    const response = await fetch(`${configuredApiBaseUrl}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["public-photography"] },
    });
    if (!response.ok) return null;
    const body = await response.json() as DataResponse<T>;
    return body.data;
  } catch {
    return null;
  }
}

export const listPublicPhotography = cache(async () =>
  request<PublicPhotoCollectionListItem[]>("/public/photography"));

export const getPublicPhotography = cache(async (slug: string) =>
  request<PublicPhotoCollection>(`/public/photography/${encodeURIComponent(slug)}`));
