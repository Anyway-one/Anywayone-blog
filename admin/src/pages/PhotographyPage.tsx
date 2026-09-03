import { useCallback, useEffect, useState } from 'react'
import { Button, Input, Modal, Segmented, Spin, Tag, message } from 'antd'
import { ImagePlus, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { deletePhotography, listPhotography, type PhotographyListItem, type PhotographyStatus } from '../api/photography'

export default function PhotographyPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<PhotographyListItem[]>([])
  const [filter, setFilter] = useState('全部')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, modalContextHolder] = Modal.useModal()
  const [messageApi, contextHolder] = message.useMessage()
  const load = useCallback(async () => {
    try {
      const status: PhotographyStatus | undefined = filter === '草稿' ? 'DRAFT' : filter === '已发布' ? 'PUBLISHED' : undefined
      setItems(await listPhotography(status, query))
    } catch (error) { void messageApi.error(error instanceof Error ? error.message : '摄影集加载失败。') }
    finally { setLoading(false) }
  }, [filter, messageApi, query])

  const remove = (item: PhotographyListItem) => {
    modal.confirm({
      title: `删除“${item.title}”？`,
      content: '摄影集会移入回收站，图片本身仍保留在媒体库中。',
      okText: '删除摄影集',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deletePhotography(item.id)
          await load()
          void messageApi.success('摄影集已删除')
        } catch (error) { void messageApi.error(error instanceof Error ? error.message : '摄影集删除失败。') }
      },
    })
  }
  useEffect(() => {
    let cancelled = false
    const status: PhotographyStatus | undefined = filter === '草稿' ? 'DRAFT' : filter === '已发布' ? 'PUBLISHED' : undefined
    void listPhotography(status, query)
      .then((nextItems) => { if (!cancelled) setItems(nextItems) })
      .catch((error: unknown) => { if (!cancelled) void messageApi.error(error instanceof Error ? error.message : '摄影集加载失败。') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filter, messageApi, query])

  return (
    <div className="page-stack">
      {contextHolder}
      {modalContextHolder}
      <PageHeader
        eyebrow="PHOTOGRAPHY"
        title="摄影集"
        description="整理横竖比例混合的个人摄影作品，并控制展示顺序。"
        actions={
          <Button type="primary" icon={<ImagePlus size={17} />} onClick={() => navigate('/photography/new')}>
            新建摄影集
          </Button>
        }
      />

      <section className="surface-panel list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar__filters"><Segmented options={['全部', '草稿', '已发布']} value={filter} onChange={(value) => setFilter(String(value))} /></div>
          <div className="list-toolbar__actions"><Input className="compact-search" allowClear prefix={<Search size={16} />} placeholder="搜索摄影集" value={query} onChange={(event) => setQuery(event.target.value)} onPressEnter={() => void load()} /><Button icon={<RefreshCw size={16} />} aria-label="刷新" onClick={() => { setLoading(true); void load() }} /></div>
        </div>
        <Spin spinning={loading}>{items.length === 0 ? <div className="media-empty">还没有摄影集，创建第一组照片故事吧。</div> : <div className="photography-admin-list">{items.map((item) => <article className="photography-admin-item" key={item.id}><div className="photography-admin-item__cover">{item.coverPublicUrl && <img src={item.coverPublicUrl} alt="" />}</div><div className="photography-admin-item__body"><div><Tag color={item.status === 'PUBLISHED' ? 'green' : 'default'}>{item.status === 'PUBLISHED' ? '已发布' : item.status === 'WITHDRAWN' ? '已撤回' : '草稿'}</Tag><span>{item.photoCount} 张照片</span></div><h2>{item.title}</h2><p>{item.locationText || '未设置地点'} · {item.updatedAt.slice(0, 10)}</p></div><div className="photography-admin-item__actions"><Button type="text" icon={<Pencil size={16} />} aria-label={`编辑${item.title}`} onClick={() => navigate(`/photography/${item.id}/edit`)} /><Button type="text" danger icon={<Trash2 size={16} />} aria-label={`删除${item.title}`} onClick={() => remove(item)} /></div></article>)}</div>}</Spin>
      </section>
    </div>
  )
}
