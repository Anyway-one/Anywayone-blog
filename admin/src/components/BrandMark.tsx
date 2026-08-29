import type { SiteSettings } from '../api/site'

interface BrandMarkProps {
  compact?: boolean
  settings?: SiteSettings | null
}

export default function BrandMark({ compact = false, settings }: BrandMarkProps) {
  const imageUrl = settings?.logoMode === 'IMAGE' ? (settings.logoWebPublicUrl || settings.logoMobilePublicUrl) : null
  const name = settings?.siteName || 'Anywayone'
  return (
    <div className="brand-mark" aria-label={`${name} Studio`}>
      {imageUrl ? <img className="brand-mark__image" src={imageUrl} alt={settings?.logoAlt || name} /> : <img src="/brand/anywayone-mark.svg" alt="" width="38" height="38" />}
      {!compact && !imageUrl && (
        <div className="brand-mark__text">
          <strong>{name}</strong>
          <span>CONTENT STUDIO</span>
        </div>
      )}
    </div>
  )
}
