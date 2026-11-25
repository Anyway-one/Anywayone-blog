import assert from "node:assert/strict";
import test from "node:test";

import { buildSitemap } from "../app/sitemap-builder.ts";

test("sitemap 收录文章、分类、标签和已发布摄影集", () => {
  const sitemap = buildSitemap({
    siteUrl: "https://www.anywayone.com",
    posts: [{ slug: "hello", publishedAt: "2026-11-01T00:00:00Z" }],
    categories: [{ slug: "build" }],
    tags: [{ slug: "ai" }],
    photography: [{ slug: "shanghai", publishedAt: "2026-11-02T00:00:00Z" }],
  });
  const urls = sitemap.map((entry) => entry.url);

  assert.ok(urls.includes("https://www.anywayone.com/posts/hello"));
  assert.ok(urls.includes("https://www.anywayone.com/categories/build"));
  assert.ok(urls.includes("https://www.anywayone.com/tags/ai"));
  assert.ok(urls.includes("https://www.anywayone.com/photography/shanghai"));
});

test("sitemap 遇到非法发布日期时省略 lastModified", () => {
  const sitemap = buildSitemap({
    siteUrl: "https://www.anywayone.com",
    posts: [{ slug: "invalid-post-date", publishedAt: "not-a-date" }],
    categories: [],
    tags: [],
    photography: [{ slug: "invalid-photo-date", publishedAt: "" }],
  });

  const post = sitemap.find((entry) => entry.url.endsWith("/posts/invalid-post-date"));
  const photography = sitemap.find((entry) => entry.url.endsWith("/photography/invalid-photo-date"));
  assert.ok(post);
  assert.ok(photography);
  assert.equal("lastModified" in post, false);
  assert.equal("lastModified" in photography, false);
});
