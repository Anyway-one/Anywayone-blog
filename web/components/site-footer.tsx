import Link from "next/link";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  dark?: boolean;
};

export function SiteFooter({ dark = false }: SiteFooterProps) {
  return (
    <footer className={`${styles.footer} ${dark ? styles.dark : ""}`}>
      <span>Anywayone · ANYWAY, BE YOUR ONE.</span>
      <nav aria-label="页脚导航">
        <Link href="/posts">文章</Link>
        <Link href="/photography">摄影</Link>
        <Link href="/about">联系</Link>
      </nav>
    </footer>
  );
}
