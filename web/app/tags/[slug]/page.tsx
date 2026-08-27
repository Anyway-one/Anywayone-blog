import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePage } from "@/components/public-post-list";
import { TaxonomyPostPage } from "@/components/taxonomy-post-page";
import { getPublicTaxonomy, listPublicTaxonomyPosts } from "@/lib/public-posts";

type TagPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicTaxonomy("tag", slug);
  if (result.status !== "ready") {
    return { title: "标签未找到", robots: { index: false, follow: false } };
  }
  const description = result.data.description ?? `浏览带有“${result.data.name}”标签的文章。`;
  return {
    title: result.data.name,
    description,
    alternates: { canonical: `/tags/${result.data.slug}` },
    openGraph: { title: result.data.name, description, url: `/tags/${result.data.slug}` },
  };
}

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);
  const currentPage = parsePage(resolvedSearch.page);
  const [taxonomyResult, postsResult] = await Promise.all([
    getPublicTaxonomy("tag", slug),
    listPublicTaxonomyPosts("tag", slug, currentPage),
  ]);
  if (taxonomyResult.status === "not-found" || postsResult.status === "not-found") notFound();
  if (taxonomyResult.status !== "ready") {
    return <TaxonomyPostPage kind="tag" taxonomy={{ id: slug, slug, name: "标签", description: null, postCount: 0 }} result={postsResult} currentPage={currentPage} />;
  }
  return <TaxonomyPostPage kind="tag" taxonomy={taxonomyResult.data} result={postsResult} currentPage={currentPage} />;
}
