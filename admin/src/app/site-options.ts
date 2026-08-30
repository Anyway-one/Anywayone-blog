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

const cityGroups: Record<string, string[]> = {
  北京: ['北京'], 天津: ['天津'], 河北: ['石家庄'], 山西: ['太原'], 内蒙古: ['呼和浩特'],
  辽宁: ['沈阳', '大连'], 吉林: ['长春'], 黑龙江: ['哈尔滨'], 上海: ['上海'],
  江苏: ['南京', '苏州', '无锡', '常州'], 浙江: ['杭州', '宁波', '温州'], 安徽: ['合肥'],
  福建: ['福州', '厦门', '泉州'], 江西: ['南昌'], 山东: ['济南', '青岛', '烟台'], 河南: ['郑州'],
  湖北: ['武汉'], 湖南: ['长沙'], 广东: ['广州', '深圳', '东莞', '佛山', '珠海'],
  广西: ['南宁', '桂林'], 海南: ['海口', '三亚'], 重庆: ['重庆'], 四川: ['成都'],
  贵州: ['贵阳'], 云南: ['昆明'], 西藏: ['拉萨'], 陕西: ['西安'], 甘肃: ['兰州'],
  青海: ['西宁'], 宁夏: ['银川'], 新疆: ['乌鲁木齐'], 台湾: ['台北'], 香港: ['香港'], 澳门: ['澳门'],
}

export const chinaLocationOptions = Object.entries(cityGroups).flatMap(([region, cities]) =>
  cities.map((city) => {
    const value = region === city ? `中国 · ${city}` : `中国 · ${region} · ${city}`
    return { value, label: value }
  }),
)
