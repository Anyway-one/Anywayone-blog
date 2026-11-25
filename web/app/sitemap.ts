import type { MetadataRoute } from "next";
import { buildSitemap } from "./sitemap-builder";
import { listPublicPhotography } from "@/lib/public-photography";
import { listAllPublicPosts, listPublicTaxonomies } from "@/lib/public-posts";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [postsResult, categoriesResult, tagsResult, photographyResult] = await Promise.all([
    listAllPublicPosts(),
    listPublicTaxonomies("category"),
    listPublicTaxonomies("tag"),
    listPublicPhotography(),
  ]);

  return buildSitemap({
    siteUrl,
    posts: postsResult.status === "ready" ? postsResult.data : [],
    categories: categoriesResult.status === "ready" ? categoriesResult.data : [],
    tags: tagsResult.status === "ready" ? tagsResult.data : [],
    photography: photographyResult ?? [],
  });
}
