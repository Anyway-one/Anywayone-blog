import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { siteChangelog } from "@/lib/site-changelog";
import styles from "./changelog.module.css";

export const metadata: Metadata = {
  title: "更新日志",
  description: "查看 Anywayone 的站点更新记录。",
};

export default function ChangelogPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <p>CHANGELOG / 更新日志</p>
          <h1>更新日志<span>。</span></h1>
          <p className={styles.description}>记录站点功能、体验与内容能力的重要变化。</p>
        </header>

        <div className={styles.timeline}>
          {siteChangelog.map((entry, index) => (
            <article className={styles.entry} key={`${entry.date}-${entry.title}`}>
              <div className={styles.entryMeta}>
                <time dateTime={entry.date}>{entry.date.replaceAll("-", ".")}</time>
                <span>{String(siteChangelog.length - index).padStart(2, "0")}</span>
              </div>
              <div className={styles.entryContent}>
                <h2>{entry.title}</h2>
                <p>{entry.summary}</p>
                <ul>
                  {entry.changes.map((change) => <li key={change}>{change}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
