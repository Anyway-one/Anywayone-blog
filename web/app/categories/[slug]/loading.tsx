import styles from "@/app/posts/posts.module.css";

export default function CategoryLoading() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <div className={styles.loadingList} aria-label="正在加载分类文章">
          {[0, 1, 2].map((item) => (
            <div className={styles.loadingRow} key={item}><span /><div><span /><strong /><span /></div></div>
          ))}
        </div>
      </div>
    </main>
  );
}
