import { Button, Card } from 'antd'
import { ArrowRight, FileText, Image, Plus, Radio, Server } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

const metrics = [
  { label: '已发布文章', icon: FileText },
  { label: '摄影集', icon: Image },
  { label: '本月访问', icon: Radio },
  { label: '服务状态', icon: Server },
]

export default function DashboardPage() {
  const navigate = useNavigate()

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="OVERVIEW"
        title="早上好，Anywayone"
        description="在这里整理文章、摄影作品与个人站点内容。"
        actions={
          <Button type="primary" icon={<Plus size={17} />} onClick={() => navigate('/posts/new')}>
            新建文章
          </Button>
        }
      />

      <section className="metric-grid" aria-label="站点概览">
        {metrics.map(({ label, icon: Icon }) => (
          <Card key={label} className="metric-card">
            <div className="metric-card__head">
              <span>{label}</span>
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>—</strong>
            <small>等待后端数据接入</small>
          </Card>
        ))}
      </section>

      <section className="dashboard-grid">
        <div className="surface-panel dashboard-grid__main">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">RECENT</span>
              <h2>最近编辑</h2>
            </div>
            <Button type="link" icon={<ArrowRight size={16} />} iconPlacement="end" onClick={() => navigate('/posts')}>
              全部文章
            </Button>
          </div>
          <EmptyPanel title="还没有内容记录" description="新建第一篇文章后，最近编辑记录会显示在这里。" />
        </div>

        <aside className="surface-panel dashboard-grid__side">
          <div className="section-heading">
            <div>
              <span className="section-heading__eyebrow">STATUS</span>
              <h2>内容状态</h2>
            </div>
          </div>
          <dl className="status-list">
            <div>
              <dt>草稿</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>待发布</dt>
              <dd>—</dd>
            </div>
            <div>
              <dt>媒体文件</dt>
              <dd>—</dd>
            </div>
          </dl>
          <p className="surface-note">FastAPI 接口可用后自动同步真实状态。</p>
        </aside>
      </section>
    </div>
  )
}
