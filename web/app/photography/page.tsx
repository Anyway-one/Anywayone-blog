import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Camera, Image as ImageIcon, MapPin } from "lucide-react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { listPublicPhotography, type PublicPhotoCollectionListItem } from "@/lib/public-photography";
import styles from "./photography.module.css";

export const metadata: Metadata = {
  title: "摄影",
  description: "Anywayone 的个人摄影作品集。",
};

export default function PhotographyPage() {
  return <PhotographyContent />;
}

async function PhotographyContent() {
  const collections = await listPublicPhotography();

  if (!collections) {
    return (
      <main className={styles.page} data-page-theme="dark">
        <div className={styles.content}>
          <PhotographyHeading />
          <section className={styles.empty} aria-labelledby="photography-error-title">
            <ImageIcon aria-hidden="true" />
            <h2 id="photography-error-title">摄影暂时无法加载</h2>
            <p>内容服务当前没有响应，稍后重新打开即可。</p>
            <Link href="/photography"><ArrowLeft aria-hidden="true" />重新加载</Link>
          </section>
        </div>
        <PublicSiteFooter dark />
      </main>
    );
  }

  return (
    <main className={styles.page} data-page-theme="dark">
      <div className={styles.content}>
        <PhotographyHeading />
        {collections.length > 0 ? <CollectionGrid collections={collections} /> : <EmptyPhotography />}
      </div>
      <PublicSiteFooter dark />
    </main>
  );
}

function PhotographyHeading() {
  return <header className={styles.heading}><p>PHOTOGRAPHY / 摄影</p><h1>光影，留存<span>。</span></h1><div aria-hidden="true" /></header>;
}

function EmptyPhotography() {
  return <section className={styles.empty} aria-labelledby="photography-empty-title"><Camera aria-hidden="true" /><h2 id="photography-empty-title">摄影作品尚未加入</h2><p>第一组摄影集发布后，这里会按主题展示照片、拍摄地点和时间。</p><Link href="/"><ArrowLeft aria-hidden="true" />返回首页</Link></section>;
}

function CollectionGrid({ collections }: { collections: PublicPhotoCollectionListItem[] }) {
  return <section className={styles.collectionGrid} aria-label="摄影集列表">{collections.map((collection, index) => {
    const date = collection.capturedFrom ? new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit" }).format(new Date(`${collection.capturedFrom}T00:00:00`)) : null;
    return <article className={styles.collection} key={collection.id}>
      <Link className={styles.collectionImage} href={`/photography/${collection.slug}`} aria-label={`查看摄影集：${collection.title}`}>
        <Image src={collection.coverPublicUrl} alt="" fill sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw" priority={index < 3} />
      </Link>
      <div className={styles.collectionMeta}><div><p>{String(index + 1).padStart(2, "0")} / COLLECTION</p><h2><Link href={`/photography/${collection.slug}`}>{collection.title}</Link></h2></div><span>{collection.photoCount} 张</span></div>
      {(date || collection.locationText) && <p className={styles.collectionInfo}>{date && <span>{date}</span>}{collection.locationText && <span><MapPin aria-hidden="true" />{collection.locationText}</span>}</p>}
      {collection.description && <p className={styles.collectionDescription}>{collection.description}</p>}
    </article>;
  })}</section>;
}
