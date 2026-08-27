import { Button } from 'antd'
import { ArrowLeft, FolderKanban, Tags } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

const copy = {
  taxonomy: {
    eyebrow: 'CONTENT',
    title: '分类与标签',
    description: '为文章建立稳定、可复用的内容分类体系。',
    empty: '后端分类接口接入后，可在这里创建、合并和排序分类与标签。',
    icon: Tags,
  },
  media: {
    eyebrow: 'MEDIA',
    title: '媒体库',
    description: '集中管理文章封面和摄影原图。',
    empty: '对象存储接入后，上传记录和媒体引用关系会显示在这里。',
    icon: FolderKanban,
  },
}

export default function PlaceholderPage({ type }: { type: keyof typeof copy }) {
  const navigate = useNavigate()
  const content = copy[type]
  const Icon = content.icon

  return (
    <div className="page-stack">
      <PageHeader eyebrow={content.eyebrow} title={content.title} description={content.description} />
      <section className="surface-panel">
        <EmptyPanel
          title="功能等待数据服务"
          description={content.empty}
          action={
            <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard')}>
              返回概览
            </Button>
          }
        />
        <Icon className="placeholder-watermark" size={120} aria-hidden="true" />
      </section>
    </div>
  )
}
