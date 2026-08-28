import {
  siBilibili,
  siGithub,
  siInstagram,
  siQq,
  siSinaweibo,
  siTelegram,
  siTiktok,
  siWhatsapp,
  siWechat,
  siX,
  siXiaohongshu,
  siYoutube,
  type SimpleIcon,
} from 'simple-icons'

const icons: Record<string, SimpleIcon> = {
  WECHAT: siWechat,
  QQ: siQq,
  WHATSAPP: siWhatsapp,
  TELEGRAM: siTelegram,
  GITHUB: siGithub,
  X: siX,
  WEIBO: siSinaweibo,
  XIAOHONGSHU: siXiaohongshu,
  BILIBILI: siBilibili,
  INSTAGRAM: siInstagram,
  DOUYIN: siTiktok,
  WECHAT_CHANNELS: siWechat,
  YOUTUBE: siYoutube,
  WECHAT_OFFICIAL: siWechat,
}

export default function PlatformIcon({ platform, size = 22 }: { platform: string; size?: number }) {
  if (platform === 'PHONE') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92z" /></svg>
  }
  if (platform === 'EMAIL') {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
  }
  const icon = icons[platform] ?? siWechat
  const variant = platform === 'WECHAT_CHANNELS' ? 'play' : platform === 'WECHAT_OFFICIAL' ? 'official' : null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
      {variant && <circle cx="18.5" cy="18.5" r="4.5" fill="white" stroke="currentColor" strokeWidth="1.4" />}
      {variant === 'play' && <path d="m17.4 16.2 3.1 2.3-3.1 2.3z" />}
      {variant === 'official' && <path d="M16.7 16.5h3.6v1.2h-3.6zm0 2.2h3.6v1.2h-3.6z" />}
    </svg>
  )
}
