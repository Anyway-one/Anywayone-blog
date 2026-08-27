"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import styles from "./status-page.module.css";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className={styles.page}>
      <section className={styles.content}>
        <TriangleAlert aria-hidden="true" />
        <p>ERROR / 500</p>
        <h1>页面暂时无法显示<span>。</span></h1>
        <div>请稍后重试。若问题持续出现，可记录当前页面地址以便排查。</div>
        <button type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" />
          重新加载
        </button>
      </section>
    </main>
  );
}
