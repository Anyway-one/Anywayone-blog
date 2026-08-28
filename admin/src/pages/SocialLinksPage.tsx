import { useEffect, useState } from 'react'
import { Button, Input, Spin, Switch, message } from 'antd'
import { ArrowDown, ArrowUp, Save } from 'lucide-react'
import { getSocialLinks, saveSocialLinks, type SocialLink, type SocialPlatform } from '../api/site'
import { socialOptions } from '../app/site-options'
import PageHeader from '../components/PageHeader'
import PlatformIcon from '../components/PlatformIcon'

function blankLinks(): SocialLink[] {
  return socialOptions.map((option, index) => ({
    platform: option.platform,
    accountName: null,
    url: null,
    sortOrder: index,
    isEnabled: false,
  }))
}

export default function SocialLinksPage() {
  const [items, setItems] = useState<SocialLink[]>(blankLinks)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    void getSocialLinks()
      .then((saved) => {
        const configured = [...saved].sort((a, b) => a.sortOrder - b.sortOrder)
        const savedPlatforms = new Set(configured.map((item) => item.platform))
        const remaining = blankLinks().filter((item) => !savedPlatforms.has(item.platform))
        setItems([...configured, ...remaining].map((item, index) => ({ ...item, sortOrder: index })))
      })
      .catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '社交平台加载失败。'))
      .finally(() => setLoading(false))
  }, [messageApi])

  const update = (platform: SocialPlatform, changes: Partial<SocialLink>) => {
    setItems((current) => current.map((item) => item.platform === platform ? { ...item, ...changes } : item))
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

  const submit = async () => {
    const enabledWithoutContent = items.find((item) => item.isEnabled && !item.accountName?.trim() && !item.url?.trim())
    if (enabledWithoutContent) {
      void messageApi.warning('公开展示前请至少填写账号名或链接。')
      return
    }
    const invalidUrl = items.find((item) => item.url && !/^https?:\/\//i.test(item.url))
    if (invalidUrl) {
      void messageApi.warning('平台链接需要以 http:// 或 https:// 开头。')
      return
    }
    setSaving(true)
    try {
      const configured = items.map((item, index) => ({
        ...item,
        accountName: item.accountName?.trim() || null,
        url: item.url?.trim() || null,
        sortOrder: index,
      })).filter((item) => item.accountName || item.url)
      const saved = await saveSocialLinks(configured)
      const savedByPlatform = new Map(saved.map((item) => [item.platform, item]))
      setItems(items.map((item, index) => savedByPlatform.get(item.platform) ?? { ...item, sortOrder: index }))
      void messageApi.success('社交平台已保存')
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
        eyebrow="SITE / SOCIAL"
        title="社交平台"
        description="配置公开账号、跳转链接和展示顺序；未启用的平台不会出现在展示端。"
        actions={<Button type="primary" icon={<Save size={17} />} loading={saving} onClick={() => void submit()}>保存社交平台</Button>}
      />
      <Spin spinning={loading}>
        <section className="surface-panel platform-settings-list social-settings-list" aria-label="社交平台列表">
          <div className="platform-list-header"><span>平台</span><span>账号名</span><span>链接</span><span>公开</span><span>排序</span></div>
          {items.map((item, index) => {
            const option = socialOptions.find((candidate) => candidate.platform === item.platform)!
            return (
              <article className="platform-setting-row platform-setting-row--social" key={item.platform}>
                <div className="platform-setting-row__identity"><span className="platform-icon"><PlatformIcon platform={item.platform} /></span><strong>{option.label}</strong></div>
                <Input value={item.accountName ?? ''} placeholder="账号名" onChange={(event) => update(item.platform, { accountName: event.target.value })} />
                <Input value={item.url ?? ''} placeholder={option.placeholder} onChange={(event) => update(item.platform, { url: event.target.value })} />
                <Switch checked={item.isEnabled} checkedChildren="公开" unCheckedChildren="隐藏" onChange={(checked) => update(item.platform, { isEnabled: checked })} />
                <div className="sort-actions"><Button type="text" icon={<ArrowUp size={15} />} disabled={index === 0} aria-label={`${option.label}上移`} onClick={() => move(index, -1)} /><Button type="text" icon={<ArrowDown size={15} />} disabled={index === items.length - 1} aria-label={`${option.label}下移`} onClick={() => move(index, 1)} /></div>
              </article>
            )
          })}
        </section>
      </Spin>
    </div>
  )
}
