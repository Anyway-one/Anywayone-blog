import { SiteFooter } from "@/components/site-footer";
import styles from "./posts.module.css";

export default function PostsLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.heading}>
          <div>
            <p>WRITING / 文章</p>
            <h1>所思，所写<span>。</span></h1>
            <div className={styles.rule} aria-hidden="true" />
          </div>
        </header>
        <div className="sr-only" role="status">正在加载文章</div>
        <div className={styles.loadingList} aria-hidden="true">
          {[0, 1, 2].map((item) => (
            <div className={styles.loadingRow} key={item}>
              <span />
              <div><span /><strong /><span /></div>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
