import styles from "./post.module.css";

export default function PostLoading() {
  return (
    <main className={styles.page}>
      <div className="sr-only" role="status">正在加载文章正文</div>
      <article className={`${styles.article} ${styles.loadingArticle}`} aria-hidden="true">
        <span className={styles.loadingBack} />
        <header className={styles.loadingHeader}>
          <span />
          <strong />
          <strong />
          <span />
        </header>
        <div className={styles.loadingBody}>
          {[0, 1, 2, 3, 4].map((item) => <span key={item} />)}
        </div>
      </article>
    </main>
  );
}
