import { useEffect, useRef, useState } from 'react'
import { Button, Form, Input, Select, Spin, message } from 'antd'
import { ImagePlus, Save, Trash2 } from 'lucide-react'
import { uploadMedia } from '../api/media'
import { getProfile, saveProfile, type SiteProfileInput } from '../api/site'
import PageHeader from '../components/PageHeader'

const zodiacOptions = '白羊座 金牛座 双子座 巨蟹座 狮子座 处女座 天秤座 天蝎座 射手座 摩羯座 水瓶座 双鱼座'
  .split(' ').map((value) => ({ value, label: value }))
const chineseZodiacOptions = '鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪'
  .split(' ').map((value) => ({ value, label: value }))
const bloodOptions = ['A', 'B', 'AB', 'O'].map((value) => ({ value, label: `${value} 型` }))

function nullable(value: string | undefined) {
  return value?.trim() || null
}

export default function ProfilePage() {
  const [form] = Form.useForm<SiteProfileInput>()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    void getProfile()
      .then((profile) => {
        form.setFieldsValue(profile)
        setAvatarMediaId(profile.avatarMediaId)
        setAvatarUrl(profile.avatarPublicUrl)
      })
      .catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '个人资料加载失败。'))
      .finally(() => setLoading(false))
  }, [form, messageApi])

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const media = await uploadMedia(file)
      setAvatarMediaId(media.id)
      setAvatarUrl(media.publicUrl)
      void messageApi.success('头像已上传，请保存个人资料')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '头像上传失败。')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const profile = await saveProfile({
        ...values,
        avatarMediaId,
        publicName: nullable(values.publicName ?? undefined),
        expertise: nullable(values.expertise ?? undefined),
        occupation: nullable(values.occupation ?? undefined),
        zodiacSign: values.zodiacSign || null,
        chineseZodiac: values.chineseZodiac || null,
        bloodType: values.bloodType || null,
        location: nullable(values.location ?? undefined),
        personalityType: nullable(values.personalityType ?? undefined),
        motto: nullable(values.motto ?? undefined),
        bio: nullable(values.bio ?? undefined),
        interests: values.interests ?? [],
        favoriteCities: values.favoriteCities ?? [],
        tags: values.tags ?? [],
      })
      form.setFieldsValue(profile)
      setAvatarMediaId(profile.avatarMediaId)
      setAvatarUrl(profile.avatarPublicUrl)
      void messageApi.success('个人资料已保存')
    } catch (error) {
      if (error instanceof Error) void messageApi.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-stack settings-page">
      {contextHolder}
      <input ref={avatarInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file) }} />
      <PageHeader
        eyebrow="SITE / PROFILE"
        title="个人资料"
        description="维护首页个人档案和公开作者信息；未填写的字段不会显示。"
        actions={<Button type="primary" icon={<Save size={17} />} loading={saving} onClick={() => void submit()}>保存资料</Button>}
      />
      <Spin spinning={loading}>
        <Form form={form} className="settings-sections" layout="vertical" requiredMark="optional">
          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>PROFILE</span><h2>基本资料</h2></div>
            <div className="profile-avatar-field">
              <div className="profile-avatar-preview">
                <img src={avatarUrl ?? '/brand/anywayone-mark.svg'} alt="个人头像预览" />
              </div>
              <div>
                <strong>个人头像</strong>
                <span>建议使用清晰的正方形图片，展示端将裁切为圆形。</span>
                <div className="profile-avatar-actions">
                  <Button icon={<ImagePlus size={16} />} loading={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>{avatarUrl ? '更换头像' : '上传头像'}</Button>
                  {avatarUrl && <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => { setAvatarMediaId(null); setAvatarUrl(null) }}>移除</Button>}
                </div>
              </div>
            </div>
            <div className="form-grid">
              <Form.Item name="publicName" label="公开名称" rules={[{ max: 100 }]}><Input placeholder="Anywayone" /></Form.Item>
              <Form.Item name="motto" label="个人签名" rules={[{ max: 240 }]}><Input showCount maxLength={240} placeholder="用一句话表达你的生活态度或个人主张" /></Form.Item>
            </div>
            <Form.Item name="bio" label="个人简介" rules={[{ max: 4000 }]}><Input.TextArea rows={6} showCount maxLength={4000} placeholder="一段完整的自我介绍，可选" /></Form.Item>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>IDENTITY</span><h2>身份信息</h2></div>
            <div className="form-grid">
              <Form.Item name="expertise" label="专业领域"><Input placeholder="例如：软件工程、视觉设计" /></Form.Item>
              <Form.Item name="occupation" label="职业"><Input placeholder="例如：独立开发者" /></Form.Item>
              <Form.Item name="location" label="所在地"><Input placeholder="例如：中国 · 深圳" /></Form.Item>
              <Form.Item name="personalityType" label="人格类型"><Input placeholder="例如：INTJ" /></Form.Item>
              <Form.Item name="zodiacSign" label="星座"><Select allowClear options={zodiacOptions} placeholder="未设置" /></Form.Item>
              <Form.Item name="chineseZodiac" label="生肖"><Select allowClear options={chineseZodiacOptions} placeholder="未设置" /></Form.Item>
              <Form.Item name="bloodType" label="血型"><Select allowClear options={bloodOptions} placeholder="未设置" /></Form.Item>
            </div>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>INTERESTS</span><h2>兴趣与偏好</h2></div>
            <Form.Item name="interests" label="兴趣爱好"><Select mode="tags" tokenSeparators={[',', '，']} maxCount={20} placeholder="输入后按回车添加" options={[]} /></Form.Item>
            <Form.Item name="favoriteCities" label="喜欢的城市"><Select mode="tags" tokenSeparators={[',', '，']} maxCount={20} placeholder="输入后按回车添加" options={[]} /></Form.Item>
            <Form.Item name="tags" label="个人标签"><Select mode="tags" tokenSeparators={[',', '，']} maxCount={20} placeholder="例如：长期主义、摄影爱好者" options={[]} /></Form.Item>
          </section>
        </Form>
      </Spin>
    </div>
  )
}
