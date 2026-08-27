import { Button, Input, Segmented } from 'antd'
import { ImagePlus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

export default function PhotographyPage() {
  const navigate = useNavigate()

  return (
    <div className="page-stack">
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
          <Segmented options={['全部', '草稿', '已发布']} defaultValue="全部" />
          <Input className="compact-search" allowClear prefix={<Search size={16} />} placeholder="搜索摄影集" />
        </div>
        <EmptyPanel
          title="还没有摄影集"
          description="上传真实摄影作品后，可在这里调整封面、说明和照片顺序。"
          action={
            <Button icon={<ImagePlus size={16} />} onClick={() => navigate('/photography/new')}>
              创建摄影集
            </Button>
          }
        />
      </section>
    </div>
  )
}
