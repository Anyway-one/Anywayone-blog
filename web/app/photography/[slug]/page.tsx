import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicPhotography } from "@/lib/public-photography";
import { PhotographyViewer } from "@/components/photography-viewer";
import styles from "../photography.module.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const collection = await getPublicPhotography((await params).slug);
  return collection ? { title: collection.title, description: collection.description ?? "Anywayone 的摄影集。" } : { title: "摄影集" };
}

export default async function PhotographyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const collection = await getPublicPhotography((await params).slug);
  if (!collection) notFound();
  const date = collection.capturedFrom ? collection.capturedTo && collection.capturedTo !== collection.capturedFrom ? `${collection.capturedFrom} — ${collection.capturedTo}` : collection.capturedFrom : null;
  return <main className={styles.page} data-page-theme="dark"><div className={styles.content}>
    <Link className={styles.backLink} href="/photography"><ArrowLeft aria-hidden="true" />返回摄影</Link>
    <header className={styles.detailHeading}><p>PHOTOGRAPHY / COLLECTION</p><h1>{collection.title}<span>。</span></h1>{collection.description && <p className={styles.detailDescription}>{collection.description}</p>}<div className={styles.detailInfo}>{date && <span><CalendarDays aria-hidden="true" />{date}</span>}{collection.locationText && <span><MapPin aria-hidden="true" />{collection.locationText}</span>}<span>{collection.items.length} 张照片</span></div></header>
    <PhotographyViewer items={collection.items} />
  </div><PublicSiteFooter dark /></main>;
}
