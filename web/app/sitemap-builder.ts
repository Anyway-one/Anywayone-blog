import type { MetadataRoute } from "next";

interface SitemapPost {
  slug: string;
  publishedAt: string;
}

interface SitemapTaxonomy {
  slug: string;
}

interface SitemapPhotographyCollection {
  slug: string;
  publishedAt: string;
}

interface SitemapSource {
  siteUrl: string;
  posts: SitemapPost[];
  categories: SitemapTaxonomy[];
  tags: SitemapTaxonomy[];
  photography: SitemapPhotographyCollection[];
}

function validDate(value: string): Date | undefined {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function buildSitemap(source: SitemapSource): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/posts",
    "/photography",
    "/about",
    "/status",
    "/changelog",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${source.siteUrl}${path}`,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }));

  return [
    ...staticPages,
    ...source.posts.map((post) => {
      const lastModified = validDate(post.publishedAt);
      return {
        url: `${source.siteUrl}/posts/${post.slug}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    }),
    ...source.photography.map((collection) => {
      const lastModified = validDate(collection.publishedAt);
      return {
        url: `${source.siteUrl}/photography/${collection.slug}`,
        ...(lastModified ? { lastModified } : {}),
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    }),
    ...source.categories.map((category) => ({
      url: `${source.siteUrl}/categories/${category.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...source.tags.map((tag) => ({
      url: `${source.siteUrl}/tags/${tag.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
