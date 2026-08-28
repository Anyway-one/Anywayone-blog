import { useEffect, useRef, useState } from 'react'
import { Button, Input, Spin, Switch, message } from 'antd'
import { ArrowDown, ArrowUp, ImagePlus, Save, Trash2 } from 'lucide-react'
import { uploadMedia } from '../api/media'
import { getContacts, saveContacts, type ContactMethod, type ContactType } from '../api/site'
import { contactOptions } from '../app/site-options'
import PageHeader from '../components/PageHeader'
import PlatformIcon from '../components/PlatformIcon'

function blankContacts(): ContactMethod[] {
  return contactOptions.map((option, index) => ({
    contactType: option.type,
    value: '',
    qrMediaId: null,
    qrPublicUrl: null,
    sortOrder: index,
    isEnabled: false,
  }))
}

export default function ContactPage() {
  const uploadRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<ContactMethod[]>(blankContacts)
  const [qrTarget, setQrTarget] = useState<ContactType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    void getContacts()
      .then((saved) => {
        const configured = [...saved].sort((a, b) => a.sortOrder - b.sortOrder)
        const savedTypes = new Set(configured.map((item) => item.contactType))
        const remaining = blankContacts().filter((item) => !savedTypes.has(item.contactType))
        setItems([...configured, ...remaining].map((item, index) => ({ ...item, sortOrder: index })))
      })
      .catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '联系方式加载失败。'))
      .finally(() => setLoading(false))
  }, [messageApi])

  const update = (type: ContactType, changes: Partial<ContactMethod>) => {
    setItems((current) => current.map((item) => item.contactType === type ? { ...item, ...changes } : item))
  }

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    setItems((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const chooseQr = (type: ContactType) => {
    setQrTarget(type)
    uploadRef.current?.click()
  }

  const uploadQr = async (file: File) => {
    if (!qrTarget) return
    setUploading(true)
    try {
      const media = await uploadMedia(file)
      update(qrTarget, { qrMediaId: media.id, qrPublicUrl: media.publicUrl })
      void messageApi.success('二维码已上传，请保存联系方式')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '二维码上传失败。')
    } finally {
      setUploading(false)
      setQrTarget(null)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  const submit = async () => {
    const enabledWithoutValue = items.find((item) => item.isEnabled && !item.value.trim())
    if (enabledWithoutValue) {
      void messageApi.warning('公开展示前请先填写对应的联系方式。')
      return
    }
    setSaving(true)
    try {
      const configured = items
        .map((item, index) => ({ ...item, value: item.value.trim(), sortOrder: index }))
        .filter((item) => item.value)
      const saved = await saveContacts(configured)
      const savedByType = new Map(saved.map((item) => [item.contactType, item]))
      setItems(items.map((item, index) => savedByType.get(item.contactType) ?? { ...item, sortOrder: index }))
      void messageApi.success('联系方式已保存')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '保存失败。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack settings-page">
      {contextHolder}
      <PageHeader
        eyebrow="SITE / CONTACT"
        title="联系方式"
        description="填写直接联系渠道；微信、QQ、WhatsApp 和 Telegram 可附带二维码。"
        actions={<Button type="primary" icon={<Save size={17} />} loading={saving} onClick={() => void submit()}>保存联系方式</Button>}
      />
      <input ref={uploadRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadQr(file) }} />
      <Spin spinning={loading}>
        <section className="surface-panel platform-settings-list" aria-label="联系方式列表">
          {items.map((item, index) => {
            const option = contactOptions.find((candidate) => candidate.type === item.contactType)!
            return (
              <article className="platform-setting-row" key={item.contactType}>
                <div className="platform-setting-row__identity"><span className="platform-icon"><PlatformIcon platform={item.contactType} /></span><div><strong>{option.label}</strong><small>{item.isEnabled ? '公开展示' : '未公开'}</small></div></div>
                <Input value={item.value} placeholder={option.placeholder} type={item.contactType === 'EMAIL' ? 'email' : 'text'} onChange={(event) => update(item.contactType, { value: event.target.value })} />
                <div className="platform-setting-row__qr">
                  {option.supportsQr && (item.qrPublicUrl ? <button className="qr-preview" type="button" title="更换二维码" onClick={() => chooseQr(item.contactType)}><img src={item.qrPublicUrl} alt={`${option.label}二维码`} /></button> : <Button icon={<ImagePlus size={16} />} loading={uploading && qrTarget === item.contactType} onClick={() => chooseQr(item.contactType)}>二维码</Button>)}
                  {item.qrMediaId && <Button type="text" danger icon={<Trash2 size={15} />} aria-label={`移除${option.label}二维码`} onClick={() => update(item.contactType, { qrMediaId: null, qrPublicUrl: null })} />}
                </div>
                <Switch checked={item.isEnabled} checkedChildren="公开" unCheckedChildren="隐藏" onChange={(checked) => update(item.contactType, { isEnabled: checked })} />
                <div className="sort-actions"><Button type="text" icon={<ArrowUp size={15} />} disabled={index === 0} aria-label={`${option.label}上移`} onClick={() => move(index, -1)} /><Button type="text" icon={<ArrowDown size={15} />} disabled={index === items.length - 1} aria-label={`${option.label}下移`} onClick={() => move(index, 1)} /></div>
              </article>
            )
          })}
        </section>
      </Spin>
    </div>
  )
}
