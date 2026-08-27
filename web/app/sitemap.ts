import type { MetadataRoute } from "next";
import { listAllPublicPosts, listPublicTaxonomies } from "@/lib/public-posts";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = ["", "/posts", "/photography", "/about"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));
  const [postsResult, categoriesResult, tagsResult] = await Promise.all([
    listAllPublicPosts(),
    listPublicTaxonomies("category"),
    listPublicTaxonomies("tag"),
  ]);

  return [
    ...staticPages,
    ...(postsResult.status === "ready" ? postsResult.data : []).map((post) => ({
      url: `${siteUrl}/posts/${post.slug}`,
      lastModified: new Date(post.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...(categoriesResult.status === "ready" ? categoriesResult.data : []).map((category) => ({
      url: `${siteUrl}/categories/${category.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...(tagsResult.status === "ready" ? tagsResult.data : []).map((tag) => ({
      url: `${siteUrl}/tags/${tag.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
