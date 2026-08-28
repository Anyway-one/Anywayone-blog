import Link from "next/link";
import type { PublicSocialLink, SocialPlatform } from "@/lib/public-site";
import { PlatformIcon } from "./platform-icon";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  dark?: boolean;
  socialLinks?: PublicSocialLink[];
};

const socialLabels: Record<SocialPlatform, string> = {
  GITHUB: "GitHub",
  X: "X",
  WEIBO: "微博",
  XIAOHONGSHU: "小红书",
  BILIBILI: "Bilibili",
  INSTAGRAM: "Instagram",
  DOUYIN: "抖音",
  WECHAT_CHANNELS: "视频号",
  YOUTUBE: "YouTube",
  WECHAT_OFFICIAL: "公众号",
};

export function SiteFooter({ dark = false, socialLinks = [] }: SiteFooterProps) {
  return (
    <footer className={`${styles.footer} ${dark ? styles.dark : ""}`}>
      <span>Anywayone · ANYWAY, BE YOUR ONE.</span>
      <nav aria-label="页脚导航">
        <Link href="/posts">文章</Link>
        <Link href="/photography">摄影</Link>
        <Link href="/about">联系</Link>
      </nav>
      {socialLinks.length > 0 && (
        <div className={styles.social} aria-label="社交平台">
          {socialLinks.map((item) => item.url ? (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" aria-label={socialLabels[item.platform]} title={item.accountName || socialLabels[item.platform]}>
              <PlatformIcon platform={item.platform} size={18} />
            </a>
          ) : (
            <span key={item.id} aria-label={socialLabels[item.platform]} title={item.accountName || socialLabels[item.platform]}>
              <PlatformIcon platform={item.platform} size={18} />
            </span>
          ))}
        </div>
      )}
    </footer>
  );
}
