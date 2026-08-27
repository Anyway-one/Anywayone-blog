import { Button, Checkbox, Form, Input, Select, message } from 'antd'
import { Save } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const sections = {
  profile: {
    eyebrow: 'PROFILE',
    title: '个人资料',
    description: '配置首页第二屏使用的真实个人信息。',
  },
  contact: {
    eyebrow: 'CONTACT',
    title: '联系方式',
    description: '只有已配置的联系方式才会显示在展示端。',
  },
  site: {
    eyebrow: 'SETTINGS',
    title: '站点设置',
    description: '管理站点基础信息、默认语言和公开状态。',
  },
}

export default function SettingsPage({ section }: { section: keyof typeof sections }) {
  const [messageApi, contextHolder] = message.useMessage()
  const content = sections[section]

  return (
    <div className="page-stack settings-page">
      {contextHolder}
      <PageHeader
        eyebrow={content.eyebrow}
        title={content.title}
        description={content.description}
        actions={
          <Button type="primary" icon={<Save size={17} />} onClick={() => void messageApi.success('设置已保存在当前页面')}>
            保存设置
          </Button>
        }
      />

      <section className="surface-panel settings-form-panel">
        {section === 'profile' && (
          <Form layout="vertical" requiredMark="optional">
            <div className="form-grid">
              <Form.Item label="显示名称"><Input placeholder="Anywayone" /></Form.Item>
              <Form.Item label="职业"><Input placeholder="例如：独立开发者" /></Form.Item>
              <Form.Item label="所在城市"><Input placeholder="可选" /></Form.Item>
              <Form.Item label="个人属性"><Input placeholder="可选" /></Form.Item>
            </div>
            <Form.Item label="个人简介"><Input.TextArea rows={5} placeholder="介绍你自己，不填写则展示端显示空状态。" /></Form.Item>
            <Form.Item label="个人标签"><Select mode="tags" options={[]} placeholder="输入后按回车添加" /></Form.Item>
          </Form>
        )}

        {section === 'contact' && (
          <Form layout="vertical" requiredMark="optional">
            <div className="form-grid">
              <Form.Item label="邮箱"><Input type="email" placeholder="未配置" /></Form.Item>
              <Form.Item label="GitHub"><Input prefix="github.com/" placeholder="用户名" /></Form.Item>
              <Form.Item label="微信"><Input placeholder="未配置" /></Form.Item>
              <Form.Item label="其他链接"><Input placeholder="https://" /></Form.Item>
            </div>
            <p className="form-help">留空的联系方式不会出现在公开联系页。</p>
          </Form>
        )}

        {section === 'site' && (
          <Form layout="vertical" requiredMark="optional">
            <div className="form-grid">
              <Form.Item label="站点名称"><Input defaultValue="Anywayone" /></Form.Item>
              <Form.Item label="默认语言">
                <Select defaultValue="zh-CN" options={[{ value: 'zh-CN', label: '简体中文' }]} />
              </Form.Item>
              <Form.Item label="站点口号"><Input defaultValue="ANYWAY, BE YOUR ONE." /></Form.Item>
              <Form.Item label="公开地址"><Input placeholder="https://example.com" /></Form.Item>
            </div>
            <Form.Item><Checkbox>允许搜索引擎收录公开内容</Checkbox></Form.Item>
          </Form>
        )}
      </section>
    </div>
  )
}
