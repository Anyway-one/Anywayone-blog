import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parsePage } from "@/components/public-post-list";
import { TaxonomyPostPage } from "@/components/taxonomy-post-page";
import { getPublicTaxonomy, listPublicTaxonomyPosts } from "@/lib/public-posts";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
};

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicTaxonomy("category", slug);
  if (result.status !== "ready") {
    return { title: "分类未找到", robots: { index: false, follow: false } };
  }
  const description = result.data.description ?? `浏览“${result.data.name}”分类下的文章。`;
  return {
    title: result.data.name,
    description,
    alternates: { canonical: `/categories/${result.data.slug}` },
    openGraph: { title: result.data.name, description, url: `/categories/${result.data.slug}` },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);
  const currentPage = parsePage(resolvedSearch.page);
  const [taxonomyResult, postsResult] = await Promise.all([
    getPublicTaxonomy("category", slug),
    listPublicTaxonomyPosts("category", slug, currentPage),
  ]);
  if (taxonomyResult.status === "not-found" || postsResult.status === "not-found") notFound();
  if (taxonomyResult.status !== "ready") {
    return <TaxonomyPostPage kind="category" taxonomy={{ id: slug, slug, name: "分类", description: null, postCount: 0 }} result={postsResult} currentPage={currentPage} />;
  }
  return <TaxonomyPostPage kind="category" taxonomy={taxonomyResult.data} result={postsResult} currentPage={currentPage} />;
}
