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
