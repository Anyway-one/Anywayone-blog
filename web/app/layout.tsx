import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/site-header";
import { VisitorTracker } from "@/components/visitor-tracker";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Anywayone",
    template: "%s · Anywayone",
  },
  description: "Anywayone 的个人博客，记录技术、生活与摄影。",
  applicationName: "Anywayone",
  authors: [{ name: "Anywayone" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Anywayone",
    title: "Anywayone",
    description: "不设限，做唯一的自己。",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anywayone",
    description: "不设限，做唯一的自己。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F0EFEA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <SiteHeader />
        <VisitorTracker />
        {children}
      </body>
    </html>
  );
}
