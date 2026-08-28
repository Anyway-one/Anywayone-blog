import { cache } from "react";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");

export type ContactType = "WECHAT" | "QQ" | "WHATSAPP" | "TELEGRAM" | "PHONE" | "EMAIL";
export type SocialPlatform =
  | "GITHUB"
  | "X"
  | "WEIBO"
  | "XIAOHONGSHU"
  | "BILIBILI"
  | "INSTAGRAM"
  | "DOUYIN"
  | "WECHAT_CHANNELS"
  | "YOUTUBE"
  | "WECHAT_OFFICIAL";

export interface PublicProfile {
  id: string | null;
  avatarMediaId: string | null;
  avatarPublicUrl: string | null;
  publicName: string | null;
  expertise: string | null;
  occupation: string | null;
  zodiacSign: string | null;
  chineseZodiac: string | null;
  bloodType: string | null;
  interests: string[];
  location: string | null;
  favoriteCities: string[];
  tags: string[];
  personalityType: string | null;
  motto: string | null;
  bio: string | null;
}

export interface PublicContact {
  id: string;
  contactType: ContactType;
  value: string;
  qrMediaId: string | null;
  qrPublicUrl: string | null;
  href: string | null;
  sortOrder: number;
  isEnabled: boolean;
}

export interface PublicSocialLink {
  id: string;
  platform: SocialPlatform;
  accountName: string | null;
  url: string | null;
  sortOrder: number;
  isEnabled: boolean;
}

export interface PublicSiteData {
  profile: PublicProfile;
  contacts: PublicContact[];
  socialLinks: PublicSocialLink[];
}

interface DataResponse<T> {
  data: T;
}

export const getPublicSite = cache(async (): Promise<PublicSiteData | null> => {
  if (!configuredApiBaseUrl) return null;
  try {
    const response = await fetch(`${configuredApiBaseUrl}/public/site`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60, tags: ["public-site"] },
    });
    if (!response.ok) return null;
    const body = await response.json() as DataResponse<PublicSiteData>;
    return body.data;
  } catch {
    return null;
  }
});
