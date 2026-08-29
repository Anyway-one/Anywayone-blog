import { apiRequest } from './http'

interface DataResponse<T> {
  data: T
}

export type ContactType = 'WECHAT' | 'QQ' | 'WHATSAPP' | 'TELEGRAM' | 'PHONE' | 'EMAIL'
export type SocialPlatform =
  | 'GITHUB'
  | 'X'
  | 'WEIBO'
  | 'XIAOHONGSHU'
  | 'BILIBILI'
  | 'INSTAGRAM'
  | 'DOUYIN'
  | 'WECHAT_CHANNELS'
  | 'YOUTUBE'
  | 'WECHAT_OFFICIAL'

export interface SiteProfile {
  id: string | null
  avatarMediaId: string | null
  avatarPublicUrl: string | null
  publicName: string | null
  expertise: string | null
  occupation: string | null
  zodiacSign: string | null
  chineseZodiac: string | null
  bloodType: string | null
  interests: string[]
  location: string | null
  favoriteCities: string[]
  tags: string[]
  personalityType: string | null
  personalityName: string | null
  personalityDescription: string | null
  personalityPortraitMediaId: string | null
  personalityPortraitPublicUrl: string | null
  personalityTestDate: string | null
  personalityEnergyScore: number | null
  personalityMindScore: number | null
  personalityNatureScore: number | null
  personalityTacticsScore: number | null
  personalityIdentityScore: number | null
  personalityLearnMoreUrl: string | null
  motto: string | null
  bio: string | null
}

export type SiteProfileInput = Omit<
  SiteProfile,
  'id' | 'avatarPublicUrl' | 'personalityPortraitPublicUrl'
>

export interface SiteSettings {
  id: string | null
  siteName: string | null
  logoMode: 'TEXT' | 'IMAGE'
  logoText: string | null
  logoWebMediaId: string | null
  logoMobileMediaId: string | null
  logoAlt: string | null
  logoWebPublicUrl: string | null
  logoMobilePublicUrl: string | null
  heroEyebrow: string | null
  heroTitle: string | null
  copyrightOwner: string | null
  copyrightStartYear: number | null
  copyrightStatement: string | null
  footerNotice: string | null
  icpNumber: string | null
  policeRecord: string | null
  showRuntimeDays: boolean
  launchDate: string | null
  seoTitle: string | null
  seoDescription: string | null
  ogImageMediaId: string | null
  ogImagePublicUrl: string | null
}

export type SiteSettingsInput = Omit<
  SiteSettings,
  'id' | 'logoWebPublicUrl' | 'logoMobilePublicUrl' | 'ogImagePublicUrl'
>

export interface SiteHistoryEvent {
  id: string
  eventDate: string
  name: string
  description: string
  imageMediaId: string | null
  imagePublicUrl: string | null
  imageWidth: number | null
  imageHeight: number | null
}

export type SiteHistoryInput = Pick<
  SiteHistoryEvent,
  'eventDate' | 'name' | 'description' | 'imageMediaId'
>

export interface ContactMethod {
  id?: string
  contactType: ContactType
  value: string
  qrMediaId: string | null
  qrPublicUrl?: string | null
  sortOrder: number
  isEnabled: boolean
}

export interface SocialLink {
  id?: string
  platform: SocialPlatform
  accountName: string | null
  url: string | null
  sortOrder: number
  isEnabled: boolean
}

export async function getProfile() {
  const response = await apiRequest<DataResponse<SiteProfile>>('/admin/settings/profile')
  return response.data
}

export async function saveProfile(input: SiteProfileInput) {
  const response = await apiRequest<DataResponse<SiteProfile>>('/admin/settings/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getSiteSettings() {
  const response = await apiRequest<DataResponse<SiteSettings>>('/admin/settings/site')
  return response.data
}

export async function saveSiteSettings(input: SiteSettingsInput) {
  const response = await apiRequest<DataResponse<SiteSettings>>('/admin/settings/site', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getSiteHistory() {
  const response = await apiRequest<DataResponse<SiteHistoryEvent[]>>('/admin/settings/history')
  return response.data
}

export async function createSiteHistoryEvent(input: SiteHistoryInput) {
  const response = await apiRequest<DataResponse<SiteHistoryEvent>>('/admin/settings/history', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updateSiteHistoryEvent(id: string, input: SiteHistoryInput) {
  const response = await apiRequest<DataResponse<SiteHistoryEvent>>(`/admin/settings/history/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return response.data
}

export async function deleteSiteHistoryEvent(id: string) {
  await apiRequest(`/admin/settings/history/${id}`, { method: 'DELETE' })
}

export async function getContacts() {
  const response = await apiRequest<DataResponse<ContactMethod[]>>('/admin/settings/contacts')
  return response.data
}

export async function saveContacts(items: ContactMethod[]) {
  const response = await apiRequest<DataResponse<ContactMethod[]>>('/admin/settings/contacts', {
    method: 'PATCH',
    body: JSON.stringify({
      items: items.map(({ contactType, value, qrMediaId, sortOrder, isEnabled }) => ({
        contactType,
        value,
        qrMediaId,
        sortOrder,
        isEnabled,
      })),
    }),
  })
  return response.data
}

export async function getSocialLinks() {
  const response = await apiRequest<DataResponse<SocialLink[]>>('/admin/settings/social-links')
  return response.data
}

export async function saveSocialLinks(items: SocialLink[]) {
  const response = await apiRequest<DataResponse<SocialLink[]>>('/admin/settings/social-links', {
    method: 'PATCH',
    body: JSON.stringify({
      items: items.map(({ platform, accountName, url, sortOrder, isEnabled }) => ({
        platform,
        accountName,
        url,
        sortOrder,
        isEnabled,
      })),
    }),
  })
  return response.data
}
