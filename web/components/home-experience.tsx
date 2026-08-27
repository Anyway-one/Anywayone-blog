"use client";

import Image from "next/image";
import {
  Activity,
  ArrowDown,
  ChartNoAxesColumnIncreasing,
  FileText,
  History,
  Monitor,
  Users,
  X,
} from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { SiteFooter } from "./site-footer";
import styles from "./home-experience.module.css";

const profileFields = [
  { label: "属性", value: "—" },
  { label: "职业", value: "—" },
  { label: "位置", value: "—" },
  { label: "装备", value: "—" },
];

const profileModules = [
  { overline: "TAGS / 标签", value: "—" },
  { overline: "PERSONALITY / 人格", value: "—" },
  { overline: "RUNNING / 跑步", value: "—" },
];

const siteLogItems = [
  { label: "站点状态", value: "—", icon: Activity },
  { label: "客户端环境", value: "—", icon: Monitor },
  { label: "文章 / 摄影", value: "— / —", icon: FileText },
  { label: "访问趋势", value: "暂未记录", icon: ChartNoAxesColumnIncreasing },
  { label: "访问统计", value: "—", icon: Users },
  { label: "站点历史", value: "暂未配置", icon: History },
];

type HomeTab = "profile" | "log";

export function HomeExperience() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("profile");
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const profileTabRef = useRef<HTMLButtonElement>(null);
  const logTabRef = useRef<HTMLButtonElement>(null);

  const closeDetails = () => {
    window.scrollTo({ top: 0 });
    setExpanded(false);
    requestAnimationFrame(() => moreButtonRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    if (!expanded) return;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [expanded]);

  const openDetails = () => {
    window.scrollTo({ top: 0 });
    setExpanded(true);
    requestAnimationFrame(() => {
      (activeTab === "profile" ? profileTabRef.current : logTabRef.current)?.focus({ preventScroll: true });
    });
  };

  const changeTab = (tab: HomeTab) => {
    setActiveTab(tab);
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: HomeTab) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = tab === "profile" ? "log" : "profile";
    changeTab(nextTab);
    (nextTab === "profile" ? profileTabRef.current : logTabRef.current)?.focus({ preventScroll: true });
  };

  return (
    <main className={`${styles.root} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>ANYWAY, BE YOUR ONE.</p>
              <h1 className={styles.heroTitle} id="home-title">
                不设限，
                <br />
                做唯一的自己<span>。</span>
              </h1>
              <button
                ref={moreButtonRef}
                className={styles.primaryAction}
                type="button"
                aria-expanded={expanded}
                aria-controls="home-details"
                onClick={openDetails}
              >
                了解更多
                <ArrowDown aria-hidden="true" />
              </button>
            </div>

            <p className={styles.mangaNote} aria-hidden="true">
              MY WAY / 01
            </p>
            <div className={styles.character}>
              <Image
                src="/brand/anywayone-character.png"
                alt="Anywayone 动漫 IP 全身形象"
                fill
                priority
                sizes="(max-width: 767px) 82vw, (max-width: 1199px) 40vw, 46vw"
              />
            </div>
          </div>
        </section>

        <section
          className={styles.details}
          id="home-details"
          aria-hidden={!expanded}
          aria-labelledby="details-title"
        >
          <div className={styles.detailsInner}>
            <div className={styles.detailsHeader}>
              <div>
                <p className={styles.sectionKicker}>PROFILE / SITE LOG</p>
                <h2 id="details-title">
                  认识 Anywayone<span>。</span>
                </h2>
              </div>

              <div className={styles.detailsActions}>
                <div className={styles.tabs} role="tablist" aria-label="首页信息">
                  <button
                    ref={profileTabRef}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "profile"}
                    aria-controls="profile-panel"
                    onClick={() => changeTab("profile")}
                    onKeyDown={(event) => handleTabKeyDown(event, "profile")}
                  >
                    关于我
                  </button>
                  <button
                    ref={logTabRef}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "log"}
                    aria-controls="log-panel"
                    onClick={() => changeTab("log")}
                    onKeyDown={(event) => handleTabKeyDown(event, "log")}
                  >
                    站点日志
                  </button>
                </div>
                <button className={styles.closeButton} type="button" aria-label="关闭并返回首屏" onClick={closeDetails}>
                  <X aria-hidden="true" />
                </button>
              </div>
            </div>

            {activeTab === "profile" ? (
              <div className={styles.profilePanel} id="profile-panel" role="tabpanel">
                <div className={styles.profileIntro}>
                  <Image
                    className={styles.avatar}
                    src="/brand/anywayone-avatar.png"
                    alt="Anywayone 头像"
                    width={132}
                    height={132}
                  />
                  <div>
                    <p className={styles.sectionKicker}>ABOUT ME</p>
                    <h3>个人简介待配置<span>。</span></h3>
                    <p className={styles.profileDescription}>
                      这里将承载真实的个人档案。配置完成后，可展示个人介绍、关注方向与长期记录。
                    </p>
                  </div>
                </div>

                <dl className={styles.profileFields}>
                  {profileFields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className={styles.profileModules}>
                  {profileModules.map((item) => (
                    <div key={item.overline}>
                      <span>{item.overline}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.logPanel} id="log-panel" role="tabpanel">
                {siteLogItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div className={styles.logItem} key={item.label}>
                      <div className={styles.logLabel}>
                        <Icon aria-hidden="true" />
                        {item.label}
                      </div>
                      <strong>{item.value}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <SiteFooter />
        </section>
      </div>
    </main>
  );
}
