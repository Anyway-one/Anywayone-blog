import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Modal, Pagination, Spin, message } from 'antd'
import { ImagePlus, RefreshCw, Trash2 } from 'lucide-react'
import { deleteMedia, listMedia, uploadMedia, type MediaItem } from '../api/media'
import PageHeader from '../components/PageHeader'

function fileSize(value: number) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

export default function MediaPage() {
  const pageSize = 24
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [modal, modalContextHolder] = Modal.useModal()
  const [messageApi, messageContextHolder] = message.useMessage()

  const load = useCallback(async (targetPage = page) => {
    try {
      const response = await listMedia(targetPage, pageSize)
      setItems(response.data)
      setTotal(response.meta.total)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '媒体加载失败。')
    } finally {
      setLoading(false)
    }
  }, [messageApi, page])

  useEffect(() => {
    void listMedia(1, pageSize)
      .then((response) => {
        setItems(response.data)
        setTotal(response.meta.total)
      })
      .catch((error: unknown) => {
        void messageApi.error(error instanceof Error ? error.message : '媒体加载失败。')
      })
      .finally(() => setLoading(false))
  }, [messageApi])

  const upload = async (file: File) => {
    setUploading(true)
    try {
      await uploadMedia(file)
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

  const remove = (item: MediaItem) => {
    modal.confirm({
      title: `删除“${item.originalName}”？`,
      content: '正在作为文章封面的图片不会被删除。',
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
        description="管理文章封面图片。支持 JPEG、PNG、WebP、GIF 和 AVIF，单张不超过 10 MB。"
        actions={(
          <Button type="primary" icon={<ImagePlus size={16} />} loading={uploading} onClick={() => inputRef.current?.click()}>
            上传图片
          </Button>
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
        <span>{total} 张图片</span>
        <Button
          icon={<RefreshCw size={16} />}
          aria-label="刷新"
          onClick={() => { setLoading(true); void load() }}
        />
      </div>
      <Spin spinning={loading}>
        {items.length === 0 ? (
          <div className="media-empty">上传第一张图片后，即可在文章编辑器中选择封面。</div>
        ) : (
          <section className="media-grid" aria-label="图片列表">
            {items.map((item) => (
              <article className="media-item" key={item.id}>
                <div className="media-item__preview"><img src={item.publicUrl} alt={item.altText ?? ''} /></div>
                <div className="media-item__meta">
                  <div><strong title={item.originalName}>{item.originalName}</strong><span>{item.width} × {item.height} · {fileSize(item.sizeBytes)}</span></div>
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
