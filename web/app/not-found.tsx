import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import styles from "./status-page.module.css";

export default function NotFound() {
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <SearchX aria-hidden="true" />
        <p>ERROR / 404</p>
        <h1>页面没有找到<span>。</span></h1>
        <div>链接可能已经变更，或页面尚未公开。</div>
        <Link href="/">
          <ArrowLeft aria-hidden="true" />
          返回首页
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
