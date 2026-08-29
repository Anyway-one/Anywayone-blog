import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Radio, Spin, Switch, message } from 'antd'
import { ImagePlus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { uploadMedia } from '../api/media'
import { getSiteSettings, saveSiteSettings, type SiteSettingsInput } from '../api/site'
import PageHeader from '../components/PageHeader'

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const defaults: SiteSettingsInput = {
  siteName: 'Anywayone',
  logoMode: 'TEXT',
  logoText: 'Anywayone',
  logoWebMediaId: null,
  logoMobileMediaId: null,
  logoAlt: 'Anywayone',
  heroEyebrow: 'ANYWAY, BE YOUR ONE.',
  heroTitle: '不设限，做唯一的自己。',
  copyrightOwner: null,
  copyrightStartYear: null,
  copyrightStatement: 'All rights reserved.',
  footerNotice: null,
  icpNumber: null,
  policeRecord: null,
  showRuntimeDays: true,
  launchDate: null,
  seoTitle: null,
  seoDescription: null,
  ogImageMediaId: null,
}

type MediaField = 'logoWeb' | 'logoMobile' | 'ogImage'

function normalize(value: string | null | undefined) {
  return value?.trim() || null
}

export default function SettingsPage() {
  const [form] = Form.useForm<SiteSettingsInput>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<MediaField | null>(null)
  const [media, setMedia] = useState({
    logoWeb: { id: null as string | null, url: null as string | null },
    logoMobile: { id: null as string | null, url: null as string | null },
    ogImage: { id: null as string | null, url: null as string | null },
  })
  const inputRefs = {
    logoWeb: useRef<HTMLInputElement>(null),
    logoMobile: useRef<HTMLInputElement>(null),
    ogImage: useRef<HTMLInputElement>(null),
  }
  const [messageApi, contextHolder] = message.useMessage()
  const logoMode = Form.useWatch('logoMode', form) ?? defaults.logoMode

  useEffect(() => {
    void getSiteSettings()
      .then((settings) => {
        form.setFieldsValue(settings)
        setMedia({
          logoWeb: { id: settings.logoWebMediaId, url: settings.logoWebPublicUrl },
          logoMobile: { id: settings.logoMobileMediaId, url: settings.logoMobilePublicUrl },
          ogImage: { id: settings.ogImageMediaId, url: settings.ogImagePublicUrl },
        })
      })
      .catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '站点设置加载失败。'))
      .finally(() => setLoading(false))
  }, [form, messageApi])

  const upload = async (field: MediaField, file: File) => {
    setUploading(field)
    try {
      const item = await uploadMedia(file)
      setMedia((current) => ({ ...current, [field]: { id: item.id, url: item.publicUrl } }))
      void messageApi.success('图片已上传，请保存设置')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '图片上传失败。')
    } finally {
      setUploading(null)
      if (inputRefs[field].current) inputRefs[field].current!.value = ''
    }
  }

  const resetDefaults = () => {
    form.setFieldsValue(defaults)
    setMedia({
      logoWeb: { id: null, url: null },
      logoMobile: { id: null, url: null },
      ogImage: { id: null, url: null },
    })
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      if (values.logoMode === 'IMAGE' && !media.logoWeb.id) {
        void messageApi.warning('图片 Logo 模式请先上传 Web Logo。')
        return
      }
      setSaving(true)
      const payload: SiteSettingsInput = {
        ...values,
        siteName: normalize(values.siteName),
        logoText: normalize(values.logoText),
        logoAlt: normalize(values.logoAlt),
        heroEyebrow: normalize(values.heroEyebrow),
        heroTitle: normalize(values.heroTitle),
        copyrightOwner: normalize(values.copyrightOwner),
        copyrightStatement: 'All rights reserved.',
        footerNotice: normalize(values.footerNotice),
        icpNumber: normalize(values.icpNumber),
        policeRecord: normalize(values.policeRecord),
        seoTitle: normalize(values.seoTitle),
        seoDescription: normalize(values.seoDescription),
        logoWebMediaId: media.logoWeb.id,
        logoMobileMediaId: media.logoMobile.id,
        ogImageMediaId: media.ogImage.id,
        launchDate: values.launchDate || null,
        copyrightStartYear: values.copyrightStartYear || null,
      }
      const settings = await saveSiteSettings(payload)
      form.setFieldsValue(settings)
      setMedia({
        logoWeb: { id: settings.logoWebMediaId, url: settings.logoWebPublicUrl },
        logoMobile: { id: settings.logoMobileMediaId, url: settings.logoMobilePublicUrl },
        ogImage: { id: settings.ogImageMediaId, url: settings.ogImagePublicUrl },
      })
      void messageApi.success('站点设置已保存')
    } catch (error) {
      if (error instanceof Error) void messageApi.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const mediaPicker = (field: MediaField, label: string, hint: string) => {
    const item = media[field]
    return (
      <div className="site-media-field">
        <div className={`site-media-preview${field === 'logoMobile' ? ' site-media-preview--square' : ''}`}>
          {item.url ? <img src={item.url} alt={`${label}预览`} /> : <ImagePlus size={22} aria-hidden="true" />}
        </div>
        <div className="site-media-copy">
          <strong>{label}</strong>
          <span>{hint}</span>
          <div className="site-media-actions">
            <input
              ref={inputRefs[field]}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void upload(field, file)
              }}
            />
            <Button icon={<ImagePlus size={16} />} loading={uploading === field} onClick={() => inputRefs[field].current?.click()}>
              {item.url ? '更换图片' : '上传图片'}
            </Button>
            {item.id && <Button type="text" danger icon={<Trash2 size={15} />} aria-label={`移除${label}`} onClick={() => setMedia((current) => ({ ...current, [field]: { id: null, url: null } }))}>移除</Button>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-stack settings-page">
      {contextHolder}
      <PageHeader
        eyebrow="SITE / SETTINGS"
        title="站点设置"
        description="维护网站品牌、首页首屏、页脚运营信息和默认 SEO。"
        actions={<div className="page-heading__actions-group"><Button icon={<RotateCcw size={16} />} onClick={resetDefaults}>恢复默认</Button><Button type="primary" icon={<Save size={17} />} loading={saving} onClick={() => void submit()}>保存设置</Button></div>}
      />

      <Spin spinning={loading}>
        <Form form={form} className="settings-sections" layout="vertical" requiredMark="optional" initialValues={defaults}>
          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>BRAND</span><h2>品牌标识</h2></div>
            <div className="form-grid">
              <Form.Item name="siteName" label="网站名称" rules={[{ max: 100 }]}><Input showCount maxLength={100} placeholder="Anywayone" /></Form.Item>
              <Form.Item name="logoMode" label="Logo 展示方式"><Radio.Group options={[{ label: '文字', value: 'TEXT' }, { label: '图片', value: 'IMAGE' }]} /></Form.Item>
            </div>
            {logoMode === 'TEXT' ? (
              <Form.Item name="logoText" label="文字 Logo" rules={[{ max: 100 }]}><Input showCount maxLength={100} placeholder="例如：Anywayone" /></Form.Item>
            ) : (
              <>
                <div className="site-media-grid">
                  {mediaPicker('logoWeb', 'Web Logo', '用于桌面端展示端和后台侧边栏品牌区。')}
                  {mediaPicker('logoMobile', '移动端 Logo', '用于移动端导航和后台紧凑品牌区。')}
                </div>
                <Form.Item
                  name="logoAlt"
                  label="图片 Logo 替代文本"
                  extra="用于无障碍阅读和图片无法显示时的文字说明。"
                  rules={[{ max: 160 }]}
                >
                  <Input showCount maxLength={160} placeholder="默认使用网站名称" />
                </Form.Item>
              </>
            )}
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>HERO</span><h2>首页首屏</h2></div>
            <Form.Item name="heroEyebrow" label="英文辅助标语" rules={[{ max: 80 }]}><Input showCount maxLength={80} placeholder="ANYWAY, BE YOUR ONE." /></Form.Item>
            <Form.Item name="heroTitle" label="中文主标语（支持换行）" rules={[{ max: 120 }]}><Input.TextArea rows={2} showCount maxLength={120} placeholder="不设限，做唯一的自己。" /></Form.Item>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>FOOTER / OPERATION</span><h2>页脚与运营</h2></div>
            <div className="form-grid">
              <Form.Item name="copyrightOwner" label="版权主体" rules={[{ max: 160 }]}><Input maxLength={160} placeholder="默认使用个人资料公开名称" /></Form.Item>
              <Form.Item name="copyrightStartYear" label="版权起始年份" rules={[{ type: 'number', min: 1900, max: 2200 }]}><Input type="number" placeholder="例如：2024" /></Form.Item>
            </div>
            <div className="form-grid">
              <Form.Item name="icpNumber" label="ICP备案号" rules={[{ max: 160 }]}><Input maxLength={160} placeholder="可选" /></Form.Item>
              <Form.Item name="policeRecord" label="公安备案号" rules={[{ max: 160 }]}><Input maxLength={160} placeholder="可选" /></Form.Item>
            </div>
            <div className="form-grid">
              <Form.Item name="launchDate" label="网站上线日期"><Input type="date" max={localToday()} /></Form.Item>
              <Form.Item name="showRuntimeDays" label="显示运行天数" valuePropName="checked"><Switch /></Form.Item>
            </div>
            <Form.Item name="footerNotice" label="页脚补充说明" rules={[{ max: 320 }]}><Input maxLength={320} placeholder="可选，例如联系方式或站点说明" /></Form.Item>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>SEO</span><h2>SEO 默认配置</h2></div>
            <Form.Item name="seoTitle" label="默认 SEO 标题" rules={[{ max: 200 }]}><Input showCount maxLength={200} placeholder="未设置时使用网站名称" /></Form.Item>
            <Form.Item name="seoDescription" label="默认 SEO 描述" rules={[{ max: 320 }]}><Input.TextArea rows={3} showCount maxLength={320} placeholder="用于首页、分享卡片和未单独配置 SEO 的页面" /></Form.Item>
            {mediaPicker('ogImage', '默认分享图', '用于 Open Graph 和社交平台分享卡片，建议 1200 × 630。')}
          </section>
        </Form>
      </Spin>
    </div>
  )
}
