import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import styles from "./photography.module.css";

export const metadata: Metadata = {
  title: "摄影",
  description: "Anywayone 的个人摄影作品集。",
};

export default function PhotographyPage() {
  return (
    <main className={styles.page} data-page-theme="dark">
      <div className={styles.content}>
        <header className={styles.heading}>
          <p>PHOTOGRAPHY / 摄影</p>
          <h1>光影，留存<span>。</span></h1>
          <div aria-hidden="true" />
        </header>

        <section className={styles.empty} aria-labelledby="photography-empty-title">
          <ImageIcon aria-hidden="true" />
          <h2 id="photography-empty-title">摄影作品尚未加入</h2>
          <p>真实摄影作品加入后，这里将以兼容横图和竖图的稳定编辑式网格呈现。本站不会使用图库图或 IP 素材冒充作品。</p>
          <Link href="/">
            <ArrowLeft aria-hidden="true" />
            返回首页
          </Link>
        </section>
      </div>
      <SiteFooter dark />
    </main>
  );
}
