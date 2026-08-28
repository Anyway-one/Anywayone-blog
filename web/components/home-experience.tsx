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
import type { PublicSiteData } from "@/lib/public-site";
import styles from "./home-experience.module.css";

const siteLogItems = [
  { label: "站点状态", value: "—", icon: Activity },
  { label: "客户端环境", value: "—", icon: Monitor },
  { label: "文章 / 摄影", value: "— / —", icon: FileText },
  { label: "访问趋势", value: "暂未记录", icon: ChartNoAxesColumnIncreasing },
  { label: "访问统计", value: "—", icon: Users },
  { label: "站点历史", value: "暂未配置", icon: History },
];

type HomeTab = "profile" | "log";

export function HomeExperience({ site }: { site: PublicSiteData | null }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("profile");
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const profileTabRef = useRef<HTMLButtonElement>(null);
  const logTabRef = useRef<HTMLButtonElement>(null);
  const profile = site?.profile;
  const publicName = profile?.publicName || "Anywayone";
  const profileFields = [
    { label: "专业领域", value: profile?.expertise },
    { label: "职业", value: profile?.occupation },
    { label: "所在地", value: profile?.location },
    { label: "星座", value: profile?.zodiacSign },
    { label: "生肖", value: profile?.chineseZodiac },
    { label: "血型", value: profile?.bloodType ? `${profile.bloodType} 型` : null },
  ].filter((field) => field.value);
  const profileModules = [
    { overline: "TAGS / 个人标签", value: profile?.tags.join(" · ") },
    { overline: "PERSONALITY / 人格类型", value: profile?.personalityType },
    { overline: "INTERESTS / 兴趣爱好", value: profile?.interests.join(" · ") },
    { overline: "CITIES / 喜欢的城市", value: profile?.favoriteCities.join(" · ") },
  ].filter((item) => item.value);

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
                  认识 {publicName}<span>。</span>
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
                    src={profile?.avatarPublicUrl || "/brand/anywayone-avatar.png"}
                    alt={`${publicName} 头像`}
                    width={132}
                    height={132}
                  />
                  <div>
                    <p className={styles.sectionKicker}>ABOUT ME</p>
                    <h3>{profile?.motto || "个人简介待配置"}<span>。</span></h3>
                    <p className={styles.profileDescription}>
                      {profile?.bio || "作者尚未配置公开个人简介。"}
                    </p>
                  </div>
                </div>

                {profileFields.length > 0 ? <dl className={styles.profileFields}>
                  {profileFields.map((field) => (
                    <div key={field.label}>
                      <dt>{field.label}</dt>
                      <dd>{field.value}</dd>
                    </div>
                  ))}
                </dl> : <p className={styles.profileEmpty}>更多个人信息暂未公开。</p>}

                {profileModules.length > 0 && <div className={styles.profileModules}>
                  {profileModules.map((item) => (
                    <div key={item.overline}>
                      <span>{item.overline}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>}
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
          <SiteFooter socialLinks={site?.socialLinks} />
        </section>
      </div>
    </main>
  );
}
