import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { VisitorTracker } from "@/components/visitor-tracker";
import { getPublicSite } from "@/lib/public-site";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite();
  const settings = site?.settings;
  const profile = site?.profile;
  const siteName = settings?.siteName || "Anywayone";
  const title = settings?.seoTitle || siteName;
  const description = settings?.seoDescription || "Anywayone 的个人博客，记录技术、生活与摄影。";
  const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s · ${siteName}` },
    description,
    applicationName: siteName,
    authors: [{ name: profile?.publicName || siteName }],
    openGraph: { type: "website", locale: "zh_CN", siteName, title, description },
    twitter: { card: "summary_large_image", title, description },
  };
  if (settings?.ogImagePublicUrl) {
    metadata.openGraph = { ...metadata.openGraph, images: [settings.ogImagePublicUrl] };
    metadata.twitter = { ...metadata.twitter, images: [settings.ogImagePublicUrl] };
  }
  return metadata;
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F0EFEA",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const site = await getPublicSite();
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <SiteHeader settings={site?.settings} />
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
