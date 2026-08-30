import { useEffect, useRef, useState } from 'react'
import { AutoComplete, Button, Form, Input, InputNumber, Segmented, Select, Slider, Spin, message } from 'antd'
import { ImagePlus, Minus, Plus, Save, Trash2 } from 'lucide-react'
import { uploadMedia } from '../api/media'
import { getProfile, saveProfile, type SiteProfileInput } from '../api/site'
import PageHeader from '../components/PageHeader'
import { chinaLocationOptions } from '../app/site-options'

const zodiacOptions = '白羊座 金牛座 双子座 巨蟹座 狮子座 处女座 天秤座 天蝎座 射手座 摩羯座 水瓶座 双鱼座'
  .split(' ').map((value) => ({ value, label: value }))
const chineseZodiacOptions = '鼠 牛 虎 兔 龙 蛇 马 羊 猴 鸡 狗 猪'
  .split(' ').map((value) => ({ value, label: value }))
const bloodOptions = ['A', 'B', 'AB', 'O'].map((value) => ({ value, label: `${value} 型` }))
const equipmentOptions = [
  ['iphone', 'iPhone'],
  ['ipad', 'iPad'],
  ['iwatch', 'Apple Watch'],
  ['AirPods', 'AirPods'],
  ['MacMini', 'Mac mini'],
  ['macbook', 'MacBook'],
  ['lcd', '显示器'],
].map(([value, label]) => ({ value, label }))
const webUrl = (import.meta.env.VITE_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')
const defaultAvatarUrl = `${webUrl}/brand/anywayone-avatar.png`
const personalityTraits = [
  { scoreName: 'personalityEnergyScore', formName: 'personalityEnergyTrait', label: '能量', left: '外向 E', right: '内向 I' },
  { scoreName: 'personalityMindScore', formName: 'personalityMindTrait', label: '意识', left: '直觉 N', right: '观察 S' },
  { scoreName: 'personalityNatureScore', formName: 'personalityNatureTrait', label: '本性', left: '思维 T', right: '感觉 F' },
  { scoreName: 'personalityTacticsScore', formName: 'personalityTacticsTrait', label: '策略', left: '评判 J', right: '勘探 P' },
  { scoreName: 'personalityIdentityScore', formName: 'personalityIdentityTrait', label: '身份', left: '自信 A', right: '湍流 T' },
] as const

type PersonalityTendency = 'left' | 'right'
type PersonalityTraitValue = { tendency: PersonalityTendency; percentage: number }
type PersonalityTraitFormName = typeof personalityTraits[number]['formName']
type ProfileFormValues = SiteProfileInput & Partial<Record<PersonalityTraitFormName, PersonalityTraitValue>>

function nullable(value: string | undefined) {
  return value?.trim() || null
}

function scoreToTraitValue(score: number | null): PersonalityTraitValue | undefined {
  if (score == null) return undefined
  return score > 50
    ? { tendency: 'right', percentage: score }
    : { tendency: 'left', percentage: 100 - score }
}

function traitValueToScore(value: PersonalityTraitValue | undefined): number | null {
  if (!value) return null
  const percentage = Math.min(100, Math.max(50, value.percentage))
  return value.tendency === 'left' ? 100 - percentage : percentage
}

function PersonalityTraitControl({
  value,
  onChange,
  left,
  right,
}: {
  value?: PersonalityTraitValue
  onChange?: (value: PersonalityTraitValue | undefined) => void
  left: string
  right: string
}) {
  const tendency = value?.tendency
  const percentage = value?.percentage ?? 50

  return (
    <div className="personality-trait-control">
      <Segmented
        block
        value={tendency}
        options={[
          { label: left, value: 'left' },
          { label: right, value: 'right' },
        ]}
        onChange={(next) => {
          onChange?.({ tendency: next as PersonalityTendency, percentage })
        }}
      />
      <div className="personality-trait-value">
        <Slider
          min={50}
          max={100}
          disabled={!value}
          value={percentage}
          tooltip={{ formatter: (next) => next == null ? null : `${next}%` }}
          onChange={(next) => value && onChange?.({ ...value, percentage: next })}
        />
        <InputNumber
          min={50}
          max={100}
          disabled={!value}
          value={value ? percentage : null}
          suffix="%"
          aria-label={`${value?.tendency === 'right' ? right : left}倾向百分比`}
          onChange={(next) => value && onChange?.({ ...value, percentage: next ?? 50 })}
        />
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [form] = Form.useForm<ProfileFormValues>()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const personalityPortraitInputRef = useRef<HTMLInputElement>(null)
  const [avatarMediaId, setAvatarMediaId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [personalityPortraitMediaId, setPersonalityPortraitMediaId] = useState<string | null>(null)
  const [personalityPortraitUrl, setPersonalityPortraitUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingPersonalityPortrait, setUploadingPersonalityPortrait] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    void getProfile()
      .then((profile) => {
        form.setFieldsValue({
          ...profile,
          personalityEnergyTrait: scoreToTraitValue(profile.personalityEnergyScore),
          personalityMindTrait: scoreToTraitValue(profile.personalityMindScore),
          personalityNatureTrait: scoreToTraitValue(profile.personalityNatureScore),
          personalityTacticsTrait: scoreToTraitValue(profile.personalityTacticsScore),
          personalityIdentityTrait: scoreToTraitValue(profile.personalityIdentityScore),
        })
        setAvatarMediaId(profile.avatarMediaId)
        setAvatarUrl(profile.avatarPublicUrl)
        setPersonalityPortraitMediaId(profile.personalityPortraitMediaId)
        setPersonalityPortraitUrl(profile.personalityPortraitPublicUrl)
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

  const uploadPersonalityPortrait = async (file: File) => {
    setUploadingPersonalityPortrait(true)
    try {
      const media = await uploadMedia(file)
      setPersonalityPortraitMediaId(media.id)
      setPersonalityPortraitUrl(media.publicUrl)
      void messageApi.success('人格肖像已上传，请保存个人资料')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '人格肖像上传失败。')
    } finally {
      setUploadingPersonalityPortrait(false)
      if (personalityPortraitInputRef.current) personalityPortraitInputRef.current.value = ''
    }
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      const {
        personalityEnergyTrait,
        personalityMindTrait,
        personalityNatureTrait,
        personalityTacticsTrait,
        personalityIdentityTrait,
        ...profileValues
      } = values
      setSaving(true)
      const profile = await saveProfile({
        ...profileValues,
        avatarMediaId,
        personalityPortraitMediaId,
        publicName: nullable(values.publicName ?? undefined),
        expertise: nullable(values.expertise ?? undefined),
        occupation: nullable(values.occupation ?? undefined),
        zodiacSign: values.zodiacSign || null,
        chineseZodiac: values.chineseZodiac || null,
        bloodType: values.bloodType || null,
        location: nullable(values.location ?? undefined),
        personalityType: nullable(values.personalityType ?? undefined),
        personalityName: nullable(values.personalityName ?? undefined),
        personalityDescription: nullable(values.personalityDescription ?? undefined),
        personalityTestDate: values.personalityTestDate || null,
        personalityLearnMoreUrl: nullable(values.personalityLearnMoreUrl ?? undefined),
        personalityEnergyScore: traitValueToScore(personalityEnergyTrait),
        personalityMindScore: traitValueToScore(personalityMindTrait),
        personalityNatureScore: traitValueToScore(personalityNatureTrait),
        personalityTacticsScore: traitValueToScore(personalityTacticsTrait),
        personalityIdentityScore: traitValueToScore(personalityIdentityTrait),
        motto: nullable(values.motto ?? undefined),
        bio: nullable(values.bio ?? undefined),
        interests: values.interests ?? [],
        favoriteCities: values.favoriteCities ?? [],
        tags: values.tags ?? [],
      })
      form.setFieldsValue({
        ...profile,
        personalityEnergyTrait: scoreToTraitValue(profile.personalityEnergyScore),
        personalityMindTrait: scoreToTraitValue(profile.personalityMindScore),
        personalityNatureTrait: scoreToTraitValue(profile.personalityNatureScore),
        personalityTacticsTrait: scoreToTraitValue(profile.personalityTacticsScore),
        personalityIdentityTrait: scoreToTraitValue(profile.personalityIdentityScore),
      })
      setAvatarMediaId(profile.avatarMediaId)
      setAvatarUrl(profile.avatarPublicUrl)
      setPersonalityPortraitMediaId(profile.personalityPortraitMediaId)
      setPersonalityPortraitUrl(profile.personalityPortraitPublicUrl)
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
      <input ref={personalityPortraitInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPersonalityPortrait(file) }} />
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
                <img src={avatarUrl ?? defaultAvatarUrl} alt="个人头像预览" />
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
              <Form.Item name="location" label="所在地"><AutoComplete allowClear options={chinaLocationOptions} placeholder="例如：中国 · 广东 · 深圳" /></Form.Item>
              <Form.Item name="zodiacSign" label="星座"><Select allowClear options={zodiacOptions} placeholder="未设置" /></Form.Item>
              <Form.Item name="chineseZodiac" label="生肖"><Select allowClear options={chineseZodiacOptions} placeholder="未设置" /></Form.Item>
              <Form.Item name="bloodType" label="血型"><Select allowClear options={bloodOptions} placeholder="未设置" /></Form.Item>
            </div>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>PERSONALITY</span><h2>人格卡片</h2></div>
            <div className="personality-portrait-field">
              <div className="personality-portrait-preview">
                {personalityPortraitUrl
                  ? <img src={personalityPortraitUrl} alt="人格肖像预览" />
                  : <ImagePlus size={30} aria-hidden="true" />}
              </div>
              <div>
                <strong>人格肖像</strong>
                <span>建议上传透明背景或留白充足的正方形图片，首页会完整展示人物主体。</span>
                <div className="profile-avatar-actions">
                  <Button icon={<ImagePlus size={16} />} loading={uploadingPersonalityPortrait} onClick={() => personalityPortraitInputRef.current?.click()}>{personalityPortraitUrl ? '更换肖像' : '上传肖像'}</Button>
                  {personalityPortraitUrl && <Button type="text" danger icon={<Trash2 size={16} />} onClick={() => { setPersonalityPortraitMediaId(null); setPersonalityPortraitUrl(null) }}>移除</Button>}
                </div>
              </div>
            </div>

            <div className="form-grid">
              <Form.Item name="personalityType" label="人格类型" rules={[{ max: 40 }]}><Input placeholder="例如：INFJ-A" /></Form.Item>
              <Form.Item name="personalityName" label="人格名称" rules={[{ max: 80 }]}><Input placeholder="例如：倡导者" /></Form.Item>
              <Form.Item name="personalityTestDate" label="测试日期"><Input type="date" max={new Date().toISOString().slice(0, 10)} /></Form.Item>
              <Form.Item name="personalityLearnMoreUrl" label="了解更多链接" rules={[{ type: 'url', message: '请输入完整的 http(s) 链接' }, { max: 2048 }]}><Input placeholder="https://www.16personalities.com/ch/infj-人格" /></Form.Item>
            </div>
            <Form.Item name="personalityDescription" label="人格简介" rules={[{ max: 1200 }]}><Input.TextArea rows={4} showCount maxLength={1200} placeholder="用一小段文字概括这种人格的特点" /></Form.Item>

            <div className="personality-traits-heading">
              <div>
                <strong>人格维度</strong>
                <span>滑块位置代表你在两端特质之间的倾向；没有测试数据时可以留空。</span>
              </div>
              <Button type="text" size="small" icon={<Trash2 size={14} />} onClick={() => form.setFields(personalityTraits.map((trait) => ({ name: trait.formName, value: undefined })))}>清空维度</Button>
            </div>
            <div className="personality-traits-grid">
              {personalityTraits.map((trait) => (
                <Form.Item key={trait.formName} name={trait.formName} label={trait.label}>
                  <PersonalityTraitControl left={trait.left} right={trait.right} />
                </Form.Item>
              ))}
            </div>
          </section>

          <section className="surface-panel settings-section-panel">
            <div className="settings-section-heading"><span>EQUIPMENT</span><h2>装备卡片</h2></div>
            <p className="settings-section-help">配置首页展示的设备，图标使用站点内置素材；最多可添加 20 项。</p>
            <Form.List name="equipment">
              {(fields, { add, remove }) => (
                <div className="equipment-editor-list">
                  {fields.map((field, index) => (
                    <div className="equipment-editor-row" key={field.key}>
                      <span className="equipment-editor-index">{String(index + 1).padStart(2, '0')}</span>
                      <Form.Item {...field} name={[field.name, 'icon']} rules={[{ required: true, message: '请选择图标' }]}>
                        <Select options={equipmentOptions} placeholder="选择图标" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true, message: '请输入设备名称' }, { max: 100 }]}>
                        <Input placeholder="设备名称" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'detail']}>
                        <Input placeholder="规格 / 备注（可选）" maxLength={160} />
                      </Form.Item>
                      <Button type="text" danger icon={<Minus size={16} />} aria-label={`移除第 ${index + 1} 项装备`} onClick={() => remove(field.name)} />
                    </div>
                  ))}
                  <Button type="dashed" icon={<Plus size={16} />} onClick={() => add({ icon: undefined, name: '', detail: '' })} disabled={fields.length >= 20}>添加装备</Button>
                </div>
              )}
            </Form.List>
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
