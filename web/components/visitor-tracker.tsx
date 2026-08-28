"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recordPublicVisit } from "@/lib/public-analytics";

function getSessionId() {
  const key = "anywayone-visitor-session";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

function detectDevice() {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser() {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  return "Other";
}

function detectOs() {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os|macintosh/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export function VisitorTracker() {
  const pathname = usePathname();

  useEffect(() => {
    void recordPublicVisit({
      session_id: getSessionId(),
      path: pathname || "/",
      referrer: document.referrer || null,
      country: null,
      region: null,
      city: null,
      device_type: detectDevice(),
      browser: detectBrowser(),
      os: detectOs(),
    });
  }, [pathname]);

  return null;
}
