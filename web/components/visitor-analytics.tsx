"use client";

import { Activity, BarChart3, FileText, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getPublicVisitorStats, type VisitorStats } from "@/lib/public-analytics";
import styles from "./visitor-analytics.module.css";

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function TrendChart({ data }: { data: VisitorStats["trend"] }) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!element) return;
    let disposed = false;
    let chart: { setOption: (option: unknown) => void; resize: () => void; dispose: () => void } | null = null;
    let observer: ResizeObserver | null = null;
    void import("echarts").then(({ init }) => {
      if (disposed) return;
      chart = init(element);
      chart.setOption({
        animation: false,
        grid: { left: 34, right: 12, top: 18, bottom: 28 },
        tooltip: { trigger: "axis" },
        xAxis: { type: "category", boundaryGap: false, data: data.map((point) => point.date.slice(5)), axisLine: { lineStyle: { color: "#d5d2c8" } }, axisLabel: { color: "#8d8d8d", fontSize: 10 } },
        yAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eeeae1" } }, axisLabel: { color: "#8d8d8d", fontSize: 10 } },
        series: [
          { name: "浏览量", type: "line", smooth: true, showSymbol: false, data: data.map((point) => point.pageViews), lineStyle: { width: 2, color: "#e6a01f" }, areaStyle: { color: "rgba(230,160,31,0.12)" } },
          { name: "访客数", type: "line", smooth: true, showSymbol: false, data: data.map((point) => point.visitors), lineStyle: { width: 2, color: "#1a1a1a" } },
        ],
      });
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(element);
    });
    return () => { disposed = true; observer?.disconnect(); chart?.dispose(); };
  }, [element, data]);
  return <div className={styles.chart} ref={setElement} aria-label="浏览量和访客数趋势图" role="img" />;
}

export function VisitorAnalytics() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  useEffect(() => { void getPublicVisitorStats().then(setStats); }, []);
  const trend = stats?.trend ?? [];
  const latest = trend.at(-1);

  return (
    <div className={styles.grid}>
      <article className={`${styles.card} ${styles.blogCard}`}>
        <div className={styles.cardLabel}><FileText aria-hidden="true" />博客</div>
        <strong>即将开放</strong>
        <p>文章阅读统计将在内容数据接入后显示。</p>
      </article>
      <article className={`${styles.card} ${styles.summaryCard}`}>
        <div className={styles.cardLabel}><Users aria-hidden="true" />访客统计 <span>近 {stats?.rangeDays ?? 30} 天</span></div>
        <div className={styles.summaryValues}>
          <div><strong>{formatNumber(stats?.visitors ?? 0)}</strong><span>访客数</span></div>
          <div><strong>{formatNumber(stats?.pageViews ?? 0)}</strong><span>浏览量</span></div>
        </div>
        <p><Activity aria-hidden="true" />今日 {formatNumber(stats?.todayVisitors ?? 0)} 位访客 · {formatNumber(stats?.todayPageViews ?? 0)} 次浏览</p>
      </article>
      <article className={`${styles.card} ${styles.trendCard}`}>
        <div className={styles.trendHeader}><div className={styles.cardLabel}><BarChart3 aria-hidden="true" />访客趋势</div><span>近 {stats?.rangeDays ?? 30} 天</span></div>
        {trend.length > 0 ? <TrendChart data={trend} /> : <div className={styles.emptyChart}>正在收集访问数据</div>}
        <div className={styles.legend}><span><i className={styles.legendViews} />浏览量 {latest ? formatNumber(latest.pageViews) : "0"}</span><span><i className={styles.legendVisitors} />访客数 {latest ? formatNumber(latest.visitors) : "0"}</span></div>
      </article>
    </div>
  );
}
