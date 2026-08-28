import type { ContactType, SocialPlatform } from '../api/site'

export const contactOptions: Array<{
  type: ContactType
  label: string
  placeholder: string
  supportsQr: boolean
}> = [
  { type: 'WECHAT', label: '微信', placeholder: '微信号', supportsQr: true },
  { type: 'QQ', label: 'QQ', placeholder: 'QQ 号', supportsQr: true },
  { type: 'WHATSAPP', label: 'WhatsApp', placeholder: '包含国家区号的手机号', supportsQr: true },
  { type: 'TELEGRAM', label: 'Telegram', placeholder: '@username', supportsQr: true },
  { type: 'PHONE', label: '电话', placeholder: '电话号码', supportsQr: false },
  { type: 'EMAIL', label: '邮箱', placeholder: 'name@example.com', supportsQr: false },
]

export const socialOptions: Array<{ platform: SocialPlatform; label: string; placeholder: string }> = [
  { platform: 'GITHUB', label: 'GitHub', placeholder: 'https://github.com/username' },
  { platform: 'X', label: 'X', placeholder: 'https://x.com/username' },
  { platform: 'WEIBO', label: '微博', placeholder: '微博个人主页链接' },
  { platform: 'XIAOHONGSHU', label: '小红书', placeholder: '小红书个人主页链接' },
  { platform: 'BILIBILI', label: 'Bilibili', placeholder: 'Bilibili 个人空间链接' },
  { platform: 'INSTAGRAM', label: 'Instagram', placeholder: 'https://instagram.com/username' },
  { platform: 'DOUYIN', label: '抖音', placeholder: '抖音个人主页链接' },
  { platform: 'WECHAT_CHANNELS', label: '视频号', placeholder: '可选公开链接' },
  { platform: 'YOUTUBE', label: 'YouTube', placeholder: 'YouTube 频道链接' },
  { platform: 'WECHAT_OFFICIAL', label: '公众号', placeholder: '可选公开链接' },
]
