import Link from "next/link";
import { ArrowUpRight, History, ServerCog } from "lucide-react";
import type { PublicSystemStatus, ServiceCondition } from "@/lib/public-status";
import { siteVersion } from "@/lib/site-version";
import { runningDaysSince } from "./site-footer";
import styles from "./site-status-card.module.css";

function conditionLabel(condition: ServiceCondition) {
  return condition === "operational" ? "正常" : "异常";
}

export function SiteStatusCard({
  status,
  launchDate,
}: {
  status: PublicSystemStatus;
  launchDate?: string | null;
}) {
  const runningDays = launchDate ? runningDaysSince(launchDate) : null;
  const operational = status.overall === "operational";

  return (
    <article className={styles.card}>
      <ServerCog className={styles.watermark} aria-hidden="true" />
      <div className={styles.header}>
        <div>
          <span className={styles.kicker}>SYSTEM STATUS</span>
          <h3>站点状态</h3>
        </div>
        <span className={`${styles.state} ${operational ? styles.healthy : styles.degraded}`}>
          <i aria-hidden="true" />
          {operational ? "运行正常" : "部分服务异常"}
        </span>
      </div>

      <dl className={styles.metrics}>
        <div>
          <dt>软件版本</dt>
          <dd>v{siteVersion}</dd>
        </div>
        <div>
          <dt>API 服务</dt>
          <dd>{conditionLabel(status.api)}</dd>
        </div>
        <div>
          <dt>数据库</dt>
          <dd>{conditionLabel(status.database)}</dd>
        </div>
        <div>
          <dt>运行天数</dt>
          <dd>{runningDays === null ? "—" : `${runningDays} 天`}</dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <Link className={styles.action} href="/status">
          查看详情
          <ArrowUpRight aria-hidden="true" />
        </Link>
        <Link className={`${styles.action} ${styles.secondaryAction}`} href="/changelog">
          更新日志
          <History aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
