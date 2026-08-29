"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PublicSiteSettings } from "@/lib/public-site";
import styles from "./site-header.module.css";

const navigation = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "文章" },
  { href: "/photography", label: "摄影" },
  { href: "/about", label: "关于我" },
];

function isCurrentPath(pathname: string, href: string) {
  if (href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({ settings }: { settings?: PublicSiteSettings | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstMobileLinkRef = useRef<HTMLAnchorElement>(null);
  const dark = pathname.startsWith("/photography");
  const siteName = settings?.siteName || "Anywayone";
  const logoAlt = settings?.logoAlt || siteName;
  const useImageLogo = settings?.logoMode === "IMAGE";
  const webLogo = useImageLogo && settings?.logoWebPublicUrl ? settings.logoWebPublicUrl : null;
  const mobileLogo = useImageLogo && (settings?.logoMobilePublicUrl || webLogo)
    ? settings?.logoMobilePublicUrl || webLogo
    : null;

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    const nextOpen = !menuOpen;
    setMenuOpen(nextOpen);
    if (nextOpen) requestAnimationFrame(() => firstMobileLinkRef.current?.focus({ preventScroll: true }));
  };

  return (
    <header className={`${styles.header} ${dark ? styles.dark : ""}`}>
      <Link className={styles.brand} href="/" aria-label={`${siteName} 首页`}>
        {webLogo ? <Image className={styles.wordmark} src={webLogo} alt={logoAlt} width={2380} height={480} priority unoptimized /> : <span className={styles.wordmarkText}>{settings?.logoText || siteName}</span>}
        {mobileLogo ? <Image className={styles.mark} src={mobileLogo} alt={logoAlt} width={34} height={34} priority unoptimized /> : <Image className={styles.mark} src="/brand/anywayone-mark.svg" alt="" width={34} height={34} priority />}
      </Link>

      <nav className={styles.desktopNav} aria-label="主导航">
        {navigation.map((item) => (
          <Link
            key={item.href}
            className={styles.navLink}
            href={item.href}
            aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        ref={menuButtonRef}
        className={styles.menuButton}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label={menuOpen ? "关闭导航" : "打开导航"}
        onClick={toggleMenu}
      >
        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
      </button>

      <nav
        className={styles.mobileNav}
        id="mobile-navigation"
        aria-label="移动端主导航"
        hidden={!menuOpen}
      >
        {navigation.map((item, index) => (
          <Link
            key={item.href}
            ref={index === 0 ? firstMobileLinkRef : undefined}
            className={styles.mobileLink}
            href={item.href}
            aria-current={isCurrentPath(pathname, item.href) ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <span>0{index + 1}</span>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
