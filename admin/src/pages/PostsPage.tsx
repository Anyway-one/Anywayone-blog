import { Button, Input, Segmented, Select } from 'antd'
import { FilePlus2, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

export default function PostsPage() {
  const navigate = useNavigate()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="CONTENT"
        title="全部文章"
        description="管理草稿、定时发布和已发布文章。"
        actions={
          <Button type="primary" icon={<FilePlus2 size={17} />} onClick={() => navigate('/posts/new')}>
            新建文章
          </Button>
        }
      />

      <section className="surface-panel list-panel">
        <div className="list-toolbar">
          <Segmented options={['全部', '草稿', '待发布', '已发布']} defaultValue="全部" />
          <div className="list-toolbar__filters">
            <Select
              aria-label="按分类筛选"
              defaultValue="all"
              options={[{ value: 'all', label: '全部分类' }]}
              style={{ width: 128 }}
            />
            <Input allowClear prefix={<Search size={16} />} placeholder="搜索标题" />
          </div>
        </div>

        <div className="table-header" aria-hidden="true">
          <span>标题</span>
          <span>状态</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>

        <EmptyPanel
          title="还没有文章"
          description="从一篇草稿开始，内容只会在你主动发布后出现在展示端。"
          action={
            <Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/posts/new')}>
              创建第一篇文章
            </Button>
          }
        />
      </section>
    </div>
  )
}
