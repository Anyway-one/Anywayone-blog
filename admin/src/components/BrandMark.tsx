interface BrandMarkProps {
  compact?: boolean
}

export default function BrandMark({ compact = false }: BrandMarkProps) {
  return (
    <div className="brand-mark" aria-label="Anywayone Studio">
      <img src="/brand/anywayone-mark.svg" alt="" width="38" height="38" />
      {!compact && (
        <div className="brand-mark__text">
          <strong>Anywayone</strong>
          <span>CONTENT STUDIO</span>
        </div>
      )}
    </div>
  )
}
