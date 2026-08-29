import type { Metadata } from "next";
import { AlertTriangle, Check, Database, Globe2, Server } from "lucide-react";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { getPublicSystemStatus, type ServiceCondition } from "@/lib/public-status";
import { siteVersion } from "@/lib/site-version";
import styles from "./status.module.css";

export const metadata: Metadata = {
  title: "站点状态",
  description: "查看 Anywayone 公开服务的当前运行状态。",
};

function statusLabel(condition: ServiceCondition) {
  return condition === "operational" ? "正常" : "异常";
}

function StatusMark({ condition }: { condition: ServiceCondition }) {
  return (
    <span className={`${styles.serviceState} ${condition === "operational" ? styles.operational : styles.unavailable}`}>
      <i aria-hidden="true" />
      {statusLabel(condition)}
    </span>
  );
}

export default async function StatusPage() {
  const status = await getPublicSystemStatus();
  const operational = status.overall === "operational";
  const checkedAt = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(status.checkedAt));

  const services = [
    { name: "Anywayone 展示端", description: `v${siteVersion} · www.anywayone.com`, icon: Globe2, condition: "operational" as const },
    { name: "API 服务", description: "api.anywayone.com", icon: Server, condition: status.api },
    { name: "PostgreSQL 数据库", description: "内容与站点数据", icon: Database, condition: status.database },
  ];

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <p>STATUS / 服务状态</p>
          <h1>站点状态<span>。</span></h1>
          <p className={styles.description}>Anywayone 公开服务的当前运行状态。</p>
          <span className={styles.version}>软件版本 v{siteVersion}</span>
        </header>

        <section className={`${styles.summary} ${operational ? styles.summaryHealthy : styles.summaryDegraded}`} aria-live="polite">
          <div className={styles.summaryIcon}>
            {operational ? <Check aria-hidden="true" /> : <AlertTriangle aria-hidden="true" />}
          </div>
          <div>
            <strong>{operational ? "所有公开服务运行正常" : "部分公开服务出现异常"}</strong>
            <span>{operational ? "当前未发现服务中断。" : "展示端仍可访问，部分依赖服务暂时不可用。"}</span>
          </div>
        </section>

        <section className={styles.services} aria-labelledby="services-title">
          <div className={styles.sectionHeader}>
            <div>
              <span>PUBLIC SERVICES</span>
              <h2 id="services-title">公开服务</h2>
            </div>
            <span>当前状态</span>
          </div>
          <div className={styles.serviceList}>
            {services.map(({ name, description, icon: Icon, condition }) => (
              <div className={styles.serviceRow} key={name}>
                <div className={styles.serviceIdentity}>
                  <Icon aria-hidden="true" />
                  <div>
                    <strong>{name}</strong>
                    <span>{description}</span>
                  </div>
                </div>
                <StatusMark condition={condition} />
              </div>
            ))}
          </div>
        </section>

        <p className={styles.checkedAt}>
          最后检查时间：<time dateTime={status.checkedAt}>{checkedAt}</time>
        </p>
      </div>
      <PublicSiteFooter />
    </main>
  );
}
