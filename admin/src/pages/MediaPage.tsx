import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Input, Modal, Pagination, Select, Spin, Tag, message } from 'antd'
import { ImagePlus, RefreshCw, Search, Trash2 } from 'lucide-react'
import { bulkDeleteMedia, deleteMedia, listMedia, uploadMedia, type MediaCategory, type MediaItem } from '../api/media'
import PageHeader from '../components/PageHeader'

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

const categoryOptions: { value: MediaCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部分类' },
  { value: 'photography', label: '摄影作品' },
  { value: 'post-cover', label: '文章封面' },
  { value: 'site', label: '站点图片' },
  { value: 'profile', label: '头像 / 肖像' },
  { value: 'contact', label: '联系方式' },
  { value: 'general', label: '其他' },
]

export default function MediaPage() {
  const pageSize = 24
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MediaCategory | 'all'>('all')
  const [uploadCategory, setUploadCategory] = useState<MediaCategory>('general')
  const [unused, setUnused] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [modal, modalContextHolder] = Modal.useModal()
  const [messageApi, messageContextHolder] = message.useMessage()

  const load = useCallback(async (targetPage = page) => {
    try {
      const response = await listMedia(targetPage, pageSize, { query, unused, category: category === 'all' ? undefined : category })
      setItems(response.data)
      setTotal(response.meta.total)
      setSelected([])
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '媒体加载失败。')
    } finally {
      setLoading(false)
    }
  }, [category, messageApi, page, query, unused])

  useEffect(() => {
    void listMedia(1, pageSize, { query, unused, category: category === 'all' ? undefined : category })
      .then((response) => {
        setItems(response.data)
        setTotal(response.meta.total)
        setSelected([])
      })
      .catch((error: unknown) => {
        void messageApi.error(error instanceof Error ? error.message : '媒体加载失败。')
      })
      .finally(() => setLoading(false))
  }, [category, messageApi, query, unused])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextQuery = queryInput.trim()
      if (nextQuery === query) return
      setQuery(nextQuery)
      setPage(1)
      setLoading(true)
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [query, queryInput])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      await uploadMedia(file, uploadCategory)
      setPage(1)
      await load(1)
      void messageApi.success('图片已上传')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '图片上传失败。')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeSelected = () => {
    if (selected.length === 0) return
    modal.confirm({
      title: `删除选中的 ${selected.length} 张图片？`,
      content: '已被文章、摄影集或站点设置使用的图片会自动保留。',
      okText: '批量删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          const result = await bulkDeleteMedia(selected)
          setSelected([])
          setLoading(true)
          const targetPage = selected.length >= items.length && page > 1 ? page - 1 : page
          setPage(targetPage)
          await load(targetPage)
          if (result.blockedCount > 0) void messageApi.warning(`${result.deletedCount} 张已删除，${result.blockedCount} 张因正在使用而保留。`)
          else void messageApi.success(`已删除 ${result.deletedCount} 张图片`)
        } catch (error) { void messageApi.error(error instanceof Error ? error.message : '批量删除失败。') }
      },
    })
  }

  const remove = (item: MediaItem) => {
    modal.confirm({
      title: `删除“${item.originalName}”？`,
      content: '正在作为文章封面、个人头像或联系二维码使用的图片不会被删除。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteMedia(item.id)
          const targetPage = items.length === 1 && page > 1 ? page - 1 : page
          setPage(targetPage)
          await load(targetPage)
          void messageApi.success('图片已删除')
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '图片删除失败。')
        }
      },
    })
  }

  return (
    <div className="media-page">
      {messageContextHolder}
      {modalContextHolder}
      <PageHeader
        eyebrow="ASSETS / MEDIA"
        title="媒体库"
        description="统一管理文章封面、摄影作品、站点图片和个人资料资源。支持 JPEG、PNG、WebP、GIF 和 AVIF，单张不超过 10 MB。"
        actions={(
          <div className="media-upload-actions">
            <Select value={uploadCategory} options={categoryOptions.filter((option): option is { value: MediaCategory; label: string } => option.value !== 'all')} onChange={(value: MediaCategory) => setUploadCategory(value)} />
            <Button type="primary" icon={<ImagePlus size={16} />} loading={uploading} onClick={() => inputRef.current?.click()}>上传图片</Button>
          </div>
        )}
      />
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file) }}
      />
      <div className="media-toolbar">
        <div className="media-toolbar__filters">
          <span>{total} 张图片</span>
          {items.length > 0 && <Checkbox checked={selected.length === items.length} indeterminate={selected.length > 0 && selected.length < items.length} onChange={(event) => setSelected(event.target.checked ? items.map((item) => item.id) : [])}>全选当前页</Checkbox>}
          <Select value={category} options={categoryOptions} onChange={(value: MediaCategory | 'all') => { setCategory(value); setPage(1); setLoading(true) }} />
          <Select value={unused ? 'unused' : 'all'} options={[{ value: 'all', label: '全部状态' }, { value: 'unused', label: '仅未使用' }]} onChange={(value) => { setUnused(value === 'unused'); setPage(1); setLoading(true) }} />
        </div>
        <div className="media-toolbar__actions">
          <Input allowClear prefix={<Search size={16} />} placeholder="搜索文件名" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} />
          {selected.length > 0 && <Button danger icon={<Trash2 size={16} />} onClick={removeSelected}>删除选中 ({selected.length})</Button>}
          <Button icon={<RefreshCw size={16} />} aria-label="刷新" onClick={() => { setLoading(true); void load() }} />
        </div>
      </div>
      <Spin spinning={loading}>
        {items.length === 0 ? (
          <div className="media-empty">上传第一张图片后，即可用于文章封面、个人头像或联系二维码。</div>
        ) : (
          <section className="media-grid" aria-label="图片列表">
            {items.map((item) => (
              <article className={`media-item${selected.includes(item.id) ? ' media-item--selected' : ''}`} key={item.id}>
                <div className="media-item__preview"><img src={item.publicUrl} alt={item.altText ?? ''} /><Checkbox className="media-item__check" checked={selected.includes(item.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /></div>
                <div className="media-item__meta">
                  <div><strong title={item.originalName}>{item.originalName}</strong><span>{item.width} × {item.height} · {fileSize(item.sizeBytes)}</span><Tag>{categoryOptions.find((option) => option.value === item.category)?.label ?? '其他'}</Tag>{item.usageCount > 0 ? <small title={item.usageLabels.join('、')}>使用中 · {item.usageLabels[0]}{item.usageCount > 1 ? ` 等 ${item.usageCount} 处` : ''}</small> : <small className="media-item__unused">未使用</small>}</div>
                  <Button type="text" danger icon={<Trash2 size={16} />} aria-label={`删除${item.originalName}`} onClick={() => remove(item)} />
                </div>
              </article>
            ))}
          </section>
        )}
      </Spin>
      {total > pageSize && (
        <Pagination
          className="media-pagination"
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          onChange={(nextPage) => { setPage(nextPage); setLoading(true); void load(nextPage) }}
        />
      )}
    </div>
  )
}
