import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Empty, Form, Input, Modal, Select, Spin, message } from 'antd'
import { CalendarDays, Edit3, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { listMedia, uploadMedia, type MediaItem } from '../api/media'
import {
  createSiteHistoryEvent,
  deleteSiteHistoryEvent,
  getSiteHistory,
  updateSiteHistoryEvent,
  type SiteHistoryEvent,
  type SiteHistoryInput,
} from '../api/site'
import PageHeader from '../components/PageHeader'

function localToday() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function displayDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}.${month}.${day}`
}

export default function SiteHistoryPage() {
  const [form] = Form.useForm<SiteHistoryInput>()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<SiteHistoryEvent[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [editing, setEditing] = useState<SiteHistoryEvent | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [modal, modalContextHolder] = Modal.useModal()
  const [messageApi, messageContextHolder] = message.useMessage()
  const selectedMediaId = Form.useWatch('imageMediaId', form)

  const load = useCallback(async () => {
    try {
      const [history, mediaResponse] = await Promise.all([getSiteHistory(), listMedia(1, 100)])
      setItems(history)
      setMedia(mediaResponse.data)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '站点纪事加载失败。')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    void Promise.all([getSiteHistory(), listMedia(1, 100)])
      .then(([history, mediaResponse]) => {
        setItems(history)
        setMedia(mediaResponse.data)
      })
      .catch((error: unknown) => {
        void messageApi.error(error instanceof Error ? error.message : '站点纪事加载失败。')
      })
      .finally(() => setLoading(false))
  }, [messageApi])

  const openCreate = () => {
    setEditing(null)
    form.setFieldsValue({ eventDate: localToday(), name: '', description: '', imageMediaId: null })
    setEditorOpen(true)
  }

  const openEdit = (item: SiteHistoryEvent) => {
    setEditing(item)
    form.setFieldsValue({
      eventDate: item.eventDate,
      name: item.name,
      description: item.description,
      imageMediaId: item.imageMediaId,
    })
    setEditorOpen(true)
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        ...values,
        name: values.name.trim(),
        description: values.description.trim(),
        imageMediaId: values.imageMediaId || null,
      }
      setSaving(true)
      if (editing) await updateSiteHistoryEvent(editing.id, payload)
      else await createSiteHistoryEvent(payload)
      setEditorOpen(false)
      await load()
      void messageApi.success(editing ? '纪事已更新' : '纪事已添加')
    } catch (error) {
      if (error instanceof Error) void messageApi.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const item = await uploadMedia(file, 'site')
      setMedia((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
      form.setFieldValue('imageMediaId', item.id)
      void messageApi.success('图片已上传并选中')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '图片上传失败。')
    } finally {
      setUploading(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const remove = (item: SiteHistoryEvent) => {
    modal.confirm({
      title: `删除“${item.name}”？`,
      content: '删除后，该事件将立即从首页站点纪事中消失。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSiteHistoryEvent(item.id)
          setItems((current) => current.filter((entry) => entry.id !== item.id))
          void messageApi.success('纪事已删除')
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '纪事删除失败。')
        }
      },
    })
  }

  const selectedMedia = media.find((item) => item.id === selectedMediaId)
  const selectedImageUrl = selectedMedia?.publicUrl
    ?? (editing && editing.imageMediaId === selectedMediaId ? editing.imagePublicUrl : null)

  return (
    <div className="page-stack history-admin-page">
      {messageContextHolder}
      {modalContextHolder}
      <input
        ref={imageInputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }}
      />
      <PageHeader
        eyebrow="SITE / HISTORY"
        title="站点纪事"
        description="记录域名、上线、改版与版本发布等站点节点。"
        actions={<Button type="primary" icon={<Plus size={17} />} onClick={openCreate}>添加纪事</Button>}
      />

      <Spin spinning={loading}>
        {items.length === 0 ? (
          <section className="surface-panel history-admin-empty">
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有站点纪事" />
            <Button icon={<Plus size={16} />} onClick={openCreate}>添加第一条纪事</Button>
          </section>
        ) : (
          <section className="history-admin-list" aria-label="站点纪事列表">
            {[...items].reverse().map((item) => (
              <article className="history-admin-item" key={item.id}>
                <div className="history-admin-item__image">
                  {item.imagePublicUrl
                    ? <img src={item.imagePublicUrl} alt="" />
                    : <CalendarDays aria-hidden="true" />}
                </div>
                <div className="history-admin-item__body">
                  <time dateTime={item.eventDate}>{displayDate(item.eventDate)}</time>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
                <div className="history-admin-item__actions">
                  <Button type="text" icon={<Edit3 size={16} />} aria-label={`编辑${item.name}`} onClick={() => openEdit(item)} />
                  <Button type="text" danger icon={<Trash2 size={16} />} aria-label={`删除${item.name}`} onClick={() => remove(item)} />
                </div>
              </article>
            ))}
          </section>
        )}
      </Spin>

      <Modal
        title={editing ? '编辑站点纪事' : '添加站点纪事'}
        open={editorOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => void save()}
        onCancel={() => setEditorOpen(false)}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark="optional" className="history-editor-form">
          <div className="form-grid">
            <Form.Item name="eventDate" label="日期" rules={[{ required: true, message: '请选择日期' }]}>
              <Input type="date" max={localToday()} />
            </Form.Item>
            <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, max: 120 }]}>
              <Input maxLength={120} placeholder="例如：2.0 版本发布" />
            </Form.Item>
          </div>
          <Form.Item name="description" label="描述" rules={[{ required: true, whitespace: true, max: 1000 }]}>
            <Input.TextArea rows={4} showCount maxLength={1000} placeholder="记录这次事件发生了什么。" />
          </Form.Item>
          <Form.Item name="imageMediaId" label="图片">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="从媒体库选择"
              options={media.map((item) => ({ value: item.id, label: item.originalName }))}
            />
          </Form.Item>
          {selectedImageUrl && <div className="history-editor-image"><img src={selectedImageUrl} alt="纪事图片预览" /></div>}
          <Button block icon={<ImagePlus size={16} />} loading={uploading} onClick={() => imageInputRef.current?.click()}>
            上传新图片
          </Button>
        </Form>
      </Modal>
    </div>
  )
}
