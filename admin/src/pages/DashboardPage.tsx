import { Button, Card, Spin } from 'antd'
import { ArrowRight, FileText, Image, MapPin, Plus, Radio, Server, Share2, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getVisitorAnalytics, type VisitorAdminStats, type VisitorBreakdownItem } from '../api/analytics'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

const metrics = [
  { label: '已发布文章', icon: FileText },
  { label: '摄影集', icon: Image },
  { label: '近 30 天访问', icon: Radio },
  { label: '服务状态', icon: Server },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<VisitorAdminStats | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

  useEffect(() => {
    let active = true
    void getVisitorAnalytics().then((data) => {
      if (active) setAnalytics(data)
    }).catch(() => undefined).finally(() => {
      if (active) setAnalyticsLoading(false)
    })
    return () => { active = false }
  }, [])

  const breakdown = (items: VisitorBreakdownItem[] | undefined) => (
    <div className="analytics-breakdown">
      {(items || []).length > 0 ? items?.map((item) => (
        <div className="analytics-breakdown__row" key={item.name}>
          <span title={item.name}>{item.name}</span>
          <strong>{item.count}</strong>
          <small>{item.percentage}%</small>
        </div>
      )) : <p className="surface-note">暂无数据</p>}
    </div>
  )

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="OVERVIEW"
        title={`你好，${user?.displayName || 'Anywayone'}`}
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
            <strong>{label === '近 30 天访问' ? (analytics?.pageViews ?? '—') : '—'}</strong>
            <small>{label === '近 30 天访问' ? `${analytics?.todayVisitors ?? 0} 位今日访客` : '内容统计'}</small>
          </Card>
        ))}
      </section>

      <section className="surface-panel dashboard-analytics">
        <div className="section-heading">
          <div>
            <span className="section-heading__eyebrow">VISITOR ANALYTICS</span>
            <h2>访客统计</h2>
          </div>
          <span className="analytics-range">近 {analytics?.rangeDays ?? 30} 天</span>
        </div>
        {analyticsLoading ? <div className="analytics-loading"><Spin size="small" />正在加载访问数据</div> : (
          <>
            <div className="analytics-summary">
              <div><span>访客数</span><strong>{analytics?.visitors ?? 0}</strong></div>
              <div><span>浏览量</span><strong>{analytics?.pageViews ?? 0}</strong></div>
              <div><span>今日访客</span><strong>{analytics?.todayVisitors ?? 0}</strong></div>
              <div><span>今日浏览</span><strong>{analytics?.todayPageViews ?? 0}</strong></div>
            </div>
            <div className="analytics-detail-grid">
              <div><h3><MapPin size={15} />来源地</h3>{breakdown(analytics?.locations)}</div>
              <div><h3><Share2 size={15} />来源页</h3>{breakdown(analytics?.referrers)}</div>
              <div><h3><Smartphone size={15} />设备</h3>{breakdown(analytics?.devices)}</div>
              <div><h3><FileText size={15} />热门页面</h3>{breakdown(analytics?.pages)}</div>
            </div>
          </>
        )}
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
