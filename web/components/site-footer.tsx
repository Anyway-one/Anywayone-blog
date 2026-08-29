import Link from "next/link";
import type { PublicSiteSettings, PublicSocialLink, SocialPlatform } from "@/lib/public-site";
import { PlatformIcon } from "./platform-icon";
import styles from "./site-footer.module.css";

type SiteFooterProps = {
  dark?: boolean;
  settings?: PublicSiteSettings | null;
  socialLinks?: PublicSocialLink[];
  launchDate?: string | null;
  copyrightOwner?: string | null;
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

const millisecondsPerDay = 24 * 60 * 60 * 1000;

function shanghaiDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return [Number(values.year), Number(values.month), Number(values.day)] as const;
}

export function runningDaysSince(launchDate: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(launchDate);
  if (!match) return null;
  const launch = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const [year, month, day] = shanghaiDateParts(now);
  const today = Date.UTC(year, month - 1, day);
  if (launch > today) return null;
  return Math.floor((today - launch) / millisecondsPerDay) + 1;
}

export function SiteFooter({
  dark = false,
  settings,
  socialLinks = [],
  launchDate,
  copyrightOwner,
}: SiteFooterProps) {
  const currentYear = shanghaiDateParts(new Date())[0];
  const runningDays = launchDate ? runningDaysSince(launchDate) : null;
  const owner = copyrightOwner || settings?.copyrightOwner || settings?.siteName || "Anywayone";
  const startYear = settings?.copyrightStartYear;
  const yearLabel = startYear && startYear < currentYear ? `${startYear}-${currentYear}` : `${currentYear}`;
  const statement = settings?.copyrightStatement || "保留所有权利。";
  const showRuntimeDays = settings?.showRuntimeDays ?? true;

  return (
    <footer className={`${styles.footer} ${dark ? styles.dark : ""}`}>
      <div className={styles.meta}>
        <span>© {yearLabel} {owner}. {statement}</span>
        {settings?.footerNotice && <span>{settings.footerNotice}</span>}
        {settings?.icpNumber && <span>{settings.icpNumber}</span>}
        {settings?.policeRecord && <span>{settings.policeRecord}</span>}
        {showRuntimeDays && runningDays !== null && <span className={styles.runtime}>本站已运行 <strong>{runningDays}</strong> 天</span>}
      </div>

      <div className={styles.actions}>
        <nav aria-label="法律信息">
          <Link href="/privacy">隐私政策</Link>
          <Link href="/terms">服务条款</Link>
        </nav>
        {socialLinks.length > 0 && (
          <div className={styles.social} aria-label="社交平台">
            {socialLinks.map((item) => item.url ? (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${socialLabels[item.platform]}${item.accountName ? `：${item.accountName}` : ""}`}
                data-tooltip={item.accountName || socialLabels[item.platform]}
              >
                <PlatformIcon platform={item.platform} size={18} />
              </a>
            ) : (
              <span
                key={item.id}
                role="img"
                tabIndex={0}
                aria-label={`${socialLabels[item.platform]}：${item.accountName || socialLabels[item.platform]}`}
                data-tooltip={item.accountName || socialLabels[item.platform]}
              >
                <PlatformIcon platform={item.platform} size={18} />
              </span>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
