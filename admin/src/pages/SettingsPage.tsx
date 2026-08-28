import { useEffect, useState } from 'react'
import { Button, Form, Input, Spin, message } from 'antd'
import { Save } from 'lucide-react'
import { getSiteSettings, saveSiteSettings, type SiteSettingsInput } from '../api/site'
import PageHeader from '../components/PageHeader'

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SettingsPage() {
  const [form] = Form.useForm<SiteSettingsInput>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    void getSiteSettings()
      .then((settings) => form.setFieldsValue(settings))
      .catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '站点设置加载失败。'))
      .finally(() => setLoading(false))
  }, [form, messageApi])

  const submit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const settings = await saveSiteSettings({ launchDate: values.launchDate || null })
      form.setFieldsValue(settings)
      void messageApi.success('站点设置已保存')
    } catch (error) {
      if (error instanceof Error) void messageApi.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack settings-page">
      {contextHolder}
      <PageHeader
        eyebrow="SITE / SETTINGS"
        title="站点设置"
        description="维护站点运营信息。"
        actions={<Button type="primary" icon={<Save size={17} />} loading={saving} onClick={() => void submit()}>保存设置</Button>}
      />

      <Spin spinning={loading}>
        <Form form={form} className="settings-sections" layout="vertical" requiredMark="optional">
          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>OPERATION</span><h2>运营信息</h2></div>
            <div className="form-grid">
              <Form.Item name="launchDate" label="网站上线日期">
                <Input type="date" max={localToday()} />
              </Form.Item>
            </div>
          </section>
        </Form>
      </Spin>
    </div>
  )
}
