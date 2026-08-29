"use client";

import Image from "next/image";
import {
  ArrowDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { SiteFooter } from "./site-footer";
import type { PublicSiteData } from "@/lib/public-site";
import type { PublicSystemStatus } from "@/lib/public-status";
import styles from "./home-experience.module.css";
import { VisitorAnalytics } from "./visitor-analytics";
import { SiteStatusCard } from "./site-status-card";

type HomeTab = "profile" | "log";

const personalityTraitDefinitions = [
  { key: "personalityEnergyScore", left: "外向", right: "内向", color: "#4298b4" },
  { key: "personalityMindScore", left: "直觉", right: "观察", color: "#d8952c" },
  { key: "personalityNatureScore", left: "思维", right: "感觉", color: "#33a474" },
  { key: "personalityTacticsScore", left: "评判", right: "勘探", color: "#88619a" },
  { key: "personalityIdentityScore", left: "自信", right: "湍流", color: "#d65458" },
] as const;

function getPersonalityDetailsUrl(type: string | null | undefined, configuredUrl: string | null | undefined) {
  if (configuredUrl) return configuredUrl;
  const baseType = type?.trim().slice(0, 4).toLowerCase();
  return baseType && /^[a-z]{4}$/.test(baseType)
    ? `https://www.16personalities.com/ch/${baseType}-人格`
    : "https://www.16personalities.com/ch/人格类型";
}

export function HomeExperience({
  site,
  status,
}: {
  site: PublicSiteData | null;
  status: PublicSystemStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("profile");
  const [historyScrollState, setHistoryScrollState] = useState({ canBack: false, canForward: false });
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const profileTabRef = useRef<HTMLButtonElement>(null);
  const logTabRef = useRef<HTMLButtonElement>(null);
  const historyTrackRef = useRef<HTMLDivElement>(null);
  const profile = site?.profile;
  const settings = site?.settings;
  const publicName = profile?.publicName || "Anywayone";
  const heroEyebrow = settings?.heroEyebrow || "ANYWAY, BE YOUR ONE.";
  const heroTitle = settings?.heroTitle || "不设限，做唯一的自己。";
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
    { overline: "INTERESTS / 兴趣爱好", value: profile?.interests.join(" · ") },
    { overline: "CITIES / 喜欢的城市", value: profile?.favoriteCities.join(" · ") },
  ].filter((item) => item.value);
  const personalityTraits = personalityTraitDefinitions.flatMap((trait) => {
    const score = profile?.[trait.key];
    if (score == null) return [];
    const position = Math.min(100, Math.max(0, score));
    const dominant = position > 50
      ? { label: trait.right, value: position }
      : { label: trait.left, value: 100 - position };
    const labelPosition = Math.min(80, Math.max(20, position));
    return [{ ...trait, position, labelPosition, dominant }];
  });
  const hasPersonality = Boolean(
    profile?.personalityType
    || profile?.personalityName
    || profile?.personalityDescription
    || profile?.personalityPortraitPublicUrl
    || profile?.personalityTestDate
    || personalityTraits.length,
  );
  const history = site?.history ?? [];

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

  useEffect(() => {
    if (activeTab !== "log") return;
    const track = historyTrackRef.current;
    if (!track) return;

    const updateScrollState = () => {
      const maximum = track.scrollWidth - track.clientWidth;
      setHistoryScrollState({
        canBack: track.scrollLeft > 2,
        canForward: track.scrollLeft < maximum - 2,
      });
    };
    const frame = window.requestAnimationFrame(updateScrollState);
    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.cancelAnimationFrame(frame);
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [activeTab, history.length]);

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

  const scrollHistory = (direction: -1 | 1) => {
    const track = historyTrackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.min(track.clientWidth * 0.78, 720), behavior: "smooth" });
  };

  return (
    <main className={`${styles.root} ${expanded ? styles.expanded : ""}`}>
      <div className={styles.shell}>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{heroEyebrow}</p>
              <h1 className={styles.heroTitle} id="home-title">
                {heroTitle.endsWith("。") ? <>{heroTitle.slice(0, -1)}<span>。</span></> : heroTitle}
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

        <div className={styles.widgetRoot}>
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

                  {hasPersonality && <section className={styles.personalityCard} aria-labelledby="personality-card-title">
                    <div className={`${styles.personalityBody} ${profile?.personalityPortraitPublicUrl ? "" : styles.personalityBodyWithoutPortrait}`}>
                      {profile?.personalityPortraitPublicUrl && <div className={styles.personalityPortrait}>
                        <Image
                          src={profile.personalityPortraitPublicUrl}
                          alt={`${profile.personalityName || profile.personalityType || "人格类型"}肖像`}
                          fill
                          sizes="(max-width: 767px) calc(100vw - 40px), 214px"
                        />
                      </div>}
                      <div className={styles.personalityContent}>
                        <p className={styles.sectionKicker}>PERSONALITY / 人格</p>
                        <div className={styles.personalityHeading}>
                          <h3 id="personality-card-title">
                            {profile?.personalityName || "人格类型"}
                            {profile?.personalityType && <span>({profile.personalityType})</span>}
                          </h3>
                          {profile?.personalityTestDate && <time dateTime={profile.personalityTestDate}>
                            测试于 {profile.personalityTestDate.replaceAll("-", ".")}
                          </time>}
                        </div>
                        {profile?.personalityDescription && <p className={styles.personalityDescription}>
                          {profile.personalityDescription}
                        </p>}

                        {personalityTraits.length > 0 && <div className={styles.personalityTraits} aria-label="人格维度">
                          {personalityTraits.map((trait) => <div className={styles.personalityTrait} key={trait.key}>
                            <span>{trait.left}</span>
                            <div className={styles.personalityTraitMeter}>
                              <strong style={{ left: `${trait.labelPosition}%` }}>{trait.dominant.value}% {trait.dominant.label}</strong>
                              <div className={styles.personalityTraitTrack} style={{ backgroundColor: trait.color }}>
                                <i
                                  className={styles.personalityTraitThumb}
                                  style={{ left: `${trait.position}%`, borderColor: trait.color }}
                                />
                              </div>
                            </div>
                            <span>{trait.right}</span>
                          </div>)}
                        </div>}
                      </div>
                    </div>
                    <footer className={styles.personalityFooter}>
                      <a
                        href={getPersonalityDetailsUrl(profile?.personalityType, profile?.personalityLearnMoreUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        了解更多
                        <ExternalLink aria-hidden="true" />
                      </a>
                      <a
                        className={styles.personalityOfficialLink}
                        href="https://www.16personalities.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="访问 16Personalities 官网"
                      >
                        <Image src="/personality/icon-16personalities.svg" alt="16Personalities" width={150} height={31} unoptimized />
                      </a>
                    </footer>
                  </section>}
                </div>
              ) : (
                <div className={styles.logContent} id="log-panel" role="tabpanel">
                  <SiteStatusCard status={status} launchDate={site?.settings?.launchDate} />
                  <VisitorAnalytics />

                  <section className={styles.historySection} aria-labelledby="site-history-title">
                    <div className={styles.historyHeader}>
                      <div>
                        <p className={styles.sectionKicker}>SITE CHRONICLE</p>
                        <h3 id="site-history-title">站点纪事<span>。</span></h3>
                      </div>
                      <div className={styles.historyControls}>
                        <span>{history.length > 0 ? `${history.length} 个节点` : "尚未记录"}</span>
                        {history.length > 1 && <div>
                          <button type="button" title="上一组纪事" aria-label="上一组纪事" disabled={!historyScrollState.canBack} onClick={() => scrollHistory(-1)}>
                            <ChevronLeft aria-hidden="true" />
                          </button>
                          <button type="button" title="下一组纪事" aria-label="下一组纪事" disabled={!historyScrollState.canForward} onClick={() => scrollHistory(1)}>
                            <ChevronRight aria-hidden="true" />
                          </button>
                        </div>}
                      </div>
                    </div>

                    {history.length > 0 ? (
                      <div className={styles.historyTrack} ref={historyTrackRef} tabIndex={0} aria-label="站点纪事时间线">
                        {history.map((item, index) => (
                          <article className={styles.historyCard} key={item.id}>
                            <div className={styles.historyCopy}>
                              <div className={styles.historyMeta}>
                                <time dateTime={item.eventDate}>{item.eventDate.replaceAll("-", ".")}</time>
                                <span>{String(index + 1).padStart(2, "0")}</span>
                              </div>
                              <h4>{item.name}</h4>
                              <p>{item.description}</p>
                            </div>
                            <div className={styles.historyImage}>
                              {item.imagePublicUrl ? (
                                <Image
                                  src={item.imagePublicUrl}
                                  alt=""
                                  fill
                                  sizes="(max-width: 767px) 82vw, 348px"
                                />
                              ) : <CalendarDays aria-hidden="true" />}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className={styles.historyEmpty}>
                        <CalendarDays aria-hidden="true" />
                        <p>尚未添加站点纪事。</p>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
            <SiteFooter
              settings={settings}
              socialLinks={site?.socialLinks}
              launchDate={site?.settings?.launchDate}
              copyrightOwner={site?.profile.publicName}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
