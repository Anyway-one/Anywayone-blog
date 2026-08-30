"use client";

import Image from "next/image";
import {
  ArrowDown,
  BriefcaseBusiness,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  MapPin,
  Sparkles,
  Tags,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { SiteFooter } from "./site-footer";
import type { PublicSiteData } from "@/lib/public-site";
import type { PublicSystemStatus } from "@/lib/public-status";
import styles from "./home-experience.module.css";
import { VisitorAnalytics } from "./visitor-analytics";
import { SiteStatusCard } from "./site-status-card";
import { LocationMap } from "./location-map";

type HomeTab = "profile" | "log";

const BLINK_DELAY_MIN_MS = 2400;
const BLINK_DELAY_RANGE_MS = 4600;
const BLINK_DURATION_MIN_MS = 110;
const BLINK_DURATION_RANGE_MS = 60;

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

function BlinkingCharacter() {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    const scheduleBlink = () => {
      clearTimer();
      if (reducedMotion.matches || document.hidden) return;

      const delay = BLINK_DELAY_MIN_MS + Math.random() * BLINK_DELAY_RANGE_MS;
      timer = window.setTimeout(() => {
        setIsBlinking(true);
        const duration = BLINK_DURATION_MIN_MS + Math.random() * BLINK_DURATION_RANGE_MS;
        timer = window.setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, duration);
      }, delay);
    };

    const syncAnimation = () => {
      clearTimer();
      setIsBlinking(false);
      scheduleBlink();
    };

    scheduleBlink();
    reducedMotion.addEventListener("change", syncAnimation);
    document.addEventListener("visibilitychange", syncAnimation);

    return () => {
      clearTimer();
      reducedMotion.removeEventListener("change", syncAnimation);
      document.removeEventListener("visibilitychange", syncAnimation);
    };
  }, []);

  return (
    <div className={styles.character}>
      <Image
        src="/brand/anywayone-character.png"
        alt="Anywayone 动漫 IP 全身形象"
        fill
        priority
        sizes="(max-width: 767px) 82vw, (max-width: 1199px) 40vw, 46vw"
      />
      <Image
        className={`${styles.blinkOverlay} ${isBlinking ? styles.blinkOverlayVisible : ""}`}
        src="/brand/anywayone-character-close.png"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="(max-width: 767px) 82vw, (max-width: 1199px) 40vw, 46vw"
      />
    </div>
  );
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
  const equipment = profile?.equipment ?? [];
  const tags = profile?.tags ?? [];
  const favoriteCities = profile?.favoriteCities ?? [];
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
            <BlinkingCharacter />
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
                  <article className={`${styles.profileCard} ${styles.avatarCard}`}>
                    <div className={styles.cardHeading}><span>01 / ABOUT ME</span><UserRound aria-hidden="true" /></div>
                    <div className={styles.avatarCardBody}>
                      <Image className={styles.avatar} src={profile?.avatarPublicUrl || "/brand/anywayone-avatar.png"} alt={`${publicName} 头像`} width={118} height={118} />
                      <div><h3>{publicName}<span>。</span></h3><p>{profile?.motto || "个人简介待配置"}</p></div>
                    </div>
                    {profile?.bio && <p className={styles.cardDescription}>{profile.bio}</p>}
                  </article>

                  <article className={styles.profileCard}>
                    <div className={styles.cardHeading}><span>02 / ATTRIBUTES</span><Sparkles aria-hidden="true" /></div>
                    <div className={styles.statList}>
                      <div><span>星座</span><strong>{profile?.zodiacSign || "—"}</strong></div>
                      <div><span>生肖</span><strong>{profile?.chineseZodiac || "—"}</strong></div>
                      <div><span>血型</span><strong>{profile?.bloodType ? `${profile.bloodType} 型` : "—"}</strong></div>
                    </div>
                  </article>

                  <article className={styles.profileCard}>
                    <div className={styles.cardHeading}><span>03 / CAREER</span><BriefcaseBusiness aria-hidden="true" /></div>
                    <div className={styles.careerCopy}>
                      <div className={styles.careerRow}><span>专业</span><strong>{profile?.expertise || "—"}</strong></div>
                      <div className={styles.careerRow}><span>岗位</span><strong>{profile?.occupation || "—"}</strong></div>
                    </div>
                  </article>

                  <article className={`${styles.profileCard} ${styles.locationCard}`}>
                    <div className={styles.cardHeading}><span>04 / LOCATION</span><MapPin aria-hidden="true" /></div>
                    <div className={styles.locationCardBody}>
                      <div className={styles.locationCopy}>
                        <span>CURRENT BASE</span>
                        <strong>{profile?.location || "位置待配置"}</strong>
                        {favoriteCities.length > 0 && <p>喜欢的城市 · {favoriteCities.join(" / ")}</p>}
                      </div>
                      <LocationMap location={profile?.location} />
                    </div>
                  </article>

                  <article className={`${styles.profileCard} ${styles.equipmentCard}`}>
                    <div className={styles.cardHeading}><span>05 / EQUIPMENT</span><Wrench aria-hidden="true" /></div>
                    {equipment.length > 0 ? <div className={styles.equipmentGrid}>
                      {equipment.map((item, index) => <div className={styles.equipmentItem} key={`${item.icon}-${item.name}-${index}`}>
                        <Image src={`/equipment/icon-${item.icon}.svg`} alt="" width={34} height={34} unoptimized />
                        <div><strong>{item.name}</strong>{item.detail && <span>{item.detail}</span>}</div>
                      </div>)}
                    </div> : <p className={styles.cardEmpty}>装备清单待配置。</p>}
                  </article>

                  <article className={`${styles.profileCard} ${styles.tagsCard}`}>
                    <div className={styles.cardHeading}><span>06 / PERSONAL TAGS</span><Tags aria-hidden="true" /></div>
                    {tags.length > 0 ? <div className={styles.tagList}>{tags.map((tag) => <span key={tag}>{tag}</span>)}</div> : <p className={styles.cardEmpty}>个性标签待配置。</p>}
                  </article>

                  {hasPersonality && <section className={`${styles.profileCard} ${styles.personalityCard}`} aria-labelledby="personality-card-title">
                    <div className={styles.cardHeading}><span>07 / PERSONALITY</span><Heart aria-hidden="true" /></div>
                    <div className={`${styles.personalityCardBody} ${profile?.personalityPortraitPublicUrl ? "" : styles.personalityCardBodyWithoutPortrait}`}>
                      {profile?.personalityPortraitPublicUrl && <div className={styles.personalityCompactPortrait}>
                        <Image
                          src={profile.personalityPortraitPublicUrl}
                          alt={`${profile.personalityName || profile.personalityType || "人格类型"}肖像`}
                          fill
                          sizes="(max-width: 767px) calc(100vw - 76px), 180px"
                        />
                      </div>}
                      <div className={styles.personalityCardContent}>
                        <div className={styles.personalityCompactHeading}>
                          <h3 id="personality-card-title">{profile?.personalityName || "人格类型"}</h3>
                          {profile?.personalityType && <strong>{profile.personalityType}</strong>}
                        </div>
                        {profile?.personalityDescription && <p className={styles.cardDescription}>{profile.personalityDescription}</p>}
                        {personalityTraits.length > 0 && <div className={styles.personalityTraits} aria-label="人格维度">
                          {personalityTraits.map((trait) => <div className={styles.personalityTrait} key={trait.key}>
                            <span>{trait.left}</span><div className={styles.personalityTraitMeter}><strong style={{ left: `${trait.labelPosition}%` }}>{trait.dominant.value}%</strong><div className={styles.personalityTraitTrack} style={{ backgroundColor: trait.color }}><i className={styles.personalityTraitThumb} style={{ left: `${trait.position}%`, borderColor: trait.color }} /></div></div><span>{trait.right}</span>
                          </div>)}
                        </div>}
                        <a className={styles.personalityMoreLink} href={getPersonalityDetailsUrl(profile?.personalityType, profile?.personalityLearnMoreUrl)} target="_blank" rel="noopener noreferrer">了解更多 <ExternalLink aria-hidden="true" /></a>
                      </div>
                    </div>
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
