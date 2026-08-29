import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, RefreshCw } from "lucide-react";
import { ArticleBody } from "@/components/article-body";
import { SiteFooter } from "@/components/site-footer";
import { getPublicPost, type PublicPost } from "@/lib/public-posts";
import { getPublicSite, type PublicSiteData } from "@/lib/public-site";
import styles from "./post.module.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Shanghai",
});

type PostPageProps = {
  params: Promise<{ slug: string }>;
};

function descriptionFor(post: PublicPost) {
  return post.seoDescription ?? post.excerpt ?? "Anywayone 的文章。";
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [result, site] = await Promise.all([getPublicPost(slug), getPublicSite()]);
  if (result.status !== "ready") {
    return {
      title: result.status === "not-found" ? "文章未找到" : "文章暂时无法加载",
      robots: { index: false, follow: false },
    };
  }

  const post = result.data;
  const title = post.seoTitle ?? post.title;
  const description = descriptionFor(post);
  const canonical = post.canonicalUrl ?? `/posts/${post.slug}`;
  const authorName = site?.profile.publicName || "Anywayone";
  const socialImage = post.coverMedia ? [{
    url: post.coverMedia.publicUrl,
    width: post.coverMedia.width,
    height: post.coverMedia.height,
    alt: post.coverAlt ?? post.title,
  }] : undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title,
      description,
      publishedTime: post.publishedAt,
      authors: [authorName],
      images: socialImage,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImage?.map((image) => image.url),
    },
  };
}

function UnavailableArticle({ site }: { site: PublicSiteData | null }) {
  return (
    <main className={styles.page}>
      <section className={styles.unavailable}>
        <RefreshCw aria-hidden="true" />
        <p>SERVICE / RETRY</p>
        <h1>文章暂时无法显示<span>。</span></h1>
        <div>内容服务当前没有响应，请稍后重新加载。</div>
        <Link href="/posts"><ArrowLeft aria-hidden="true" />返回文章列表</Link>
      </section>
      <SiteFooter
        settings={site?.settings}
        socialLinks={site?.socialLinks}
        launchDate={site?.settings?.launchDate}
        copyrightOwner={site?.profile.publicName}
      />
    </main>
  );
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [result, site] = await Promise.all([getPublicPost(slug), getPublicSite()]);
  if (result.status === "not-found") notFound();
  if (result.status !== "ready") return <UnavailableArticle site={site} />;

  const post = result.data;
  const authorName = site?.profile.publicName || "Anywayone";
  const canonicalUrl = new URL(post.canonicalUrl ?? `/posts/${post.slug}`, siteUrl).toString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: descriptionFor(post),
    datePublished: post.publishedAt,
    mainEntityOfPage: canonicalUrl,
    url: canonicalUrl,
    author: { "@type": "Person", name: authorName },
    publisher: { "@type": "Person", name: authorName },
    ...(post.coverMedia ? { image: post.coverMedia.publicUrl } : {}),
    ...(post.category ? { articleSection: post.category.name } : {}),
    ...(post.tags.length ? { keywords: post.tags.map((tag) => tag.name) } : {}),
  };

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <Link className={styles.backLink} href="/posts">
          <ArrowLeft aria-hidden="true" />文章列表
        </Link>

        <header className={styles.articleHeader}>
          <div className={styles.articleTaxonomy}>
            {post.category ? (
              <Link href={`/categories/${post.category.slug}`}>{post.category.name}</Link>
            ) : <span>WRITING / ARTICLE</span>}
            {post.tags.map((tag) => (
              <Link key={tag.id} href={`/tags/${tag.slug}`}>#{tag.name}</Link>
            ))}
          </div>
          <h1>{post.title}<span>。</span></h1>
          {post.excerpt && <div className={styles.lead}>{post.excerpt}</div>}
          <div className={styles.meta}>
            <span>{authorName}</span>
            <time dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time>
            <span><Clock3 aria-hidden="true" />{post.readingTimeMinutes} 分钟阅读</span>
          </div>
        </header>

        {post.coverMedia && (
          <figure className={styles.cover}>
            <Image
              src={post.coverMedia.publicUrl}
              alt={post.coverAlt ?? post.title}
              width={post.coverMedia.width}
              height={post.coverMedia.height}
              sizes="(max-width: 767px) calc(100vw - 40px), 1200px"
              priority
            />
          </figure>
        )}

        <div className={styles.articleLayout}>
          <div className={styles.articleMain}>
            <ArticleBody html={post.renderedHtml} />
            <footer className={styles.articleEnd}>
              <span aria-hidden="true" />
              <p>END / 感谢阅读</p>
              <Link href="/posts"><ArrowLeft aria-hidden="true" />返回全部文章</Link>
            </footer>
          </div>

          {post.toc.length > 1 && (
            <aside className={styles.toc} aria-label="文章目录">
              <p>CONTENTS / 目录</p>
              <ol>
                {post.toc.map((item) => (
                  <li key={item.id} style={{ paddingLeft: `${Math.max(0, item.level - 2) * 12}px` }}>
                    <a href={`#${item.id}`}>{item.title}</a>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <SiteFooter
        settings={site?.settings}
        socialLinks={site?.socialLinks}
        launchDate={site?.settings?.launchDate}
        copyrightOwner={site?.profile.publicName}
      />
    </main>
  );
}
