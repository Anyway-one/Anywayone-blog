import { Button, Card, Spin, Tag } from 'antd'
import { ArrowRight, FileText, Image, MapPin, Plus, Radio, Server, Share2, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getVisitorAnalytics, type VisitorAdminStats, type VisitorBreakdownItem } from '../api/analytics'
import { getHealthStatus, type HealthStatus } from '../api/health'
import { getMediaCount } from '../api/media'
import { listPosts, type PostListItem, type PostStatus } from '../api/posts'
import { getPhotographyCount } from '../api/photography'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

const statusLabels: Record<PostStatus, string> = {
  DRAFT: '草稿',
  SCHEDULED: '待发布',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
  ARCHIVED: '已归档',
}

const statusColors: Record<PostStatus, string> = {
  DRAFT: 'default',
  SCHEDULED: 'gold',
  PUBLISHED: 'green',
  WITHDRAWN: 'orange',
  ARCHIVED: 'default',
}

const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analytics, setAnalytics] = useState<VisitorAdminStats | null>(null)
  const [recentPosts, setRecentPosts] = useState<PostListItem[]>([])
  const [contentStats, setContentStats] = useState({ published: null as number | null, draft: null as number | null, scheduled: null as number | null, photography: null as number | null, media: null as number | null })
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void Promise.all([
      getVisitorAnalytics().catch(() => null),
      listPosts({ page: 1, pageSize: 5 }).catch(() => null),
      listPosts({ page: 1, pageSize: 1, status: 'PUBLISHED' }).catch(() => null),
      listPosts({ page: 1, pageSize: 1, status: 'DRAFT' }).catch(() => null),
      listPosts({ page: 1, pageSize: 1, status: 'SCHEDULED' }).catch(() => null),
      getPhotographyCount().catch(() => null),
      getMediaCount().catch(() => null),
      getHealthStatus().catch(() => null),
    ]).then(([visitorData, postsResponse, publishedResponse, draftResponse, scheduledResponse, photographyCount, mediaCount, healthData]) => {
      if (!active) return
      setAnalytics(visitorData)
      setRecentPosts(postsResponse?.data ?? [])
      setContentStats({
        published: publishedResponse?.meta.total ?? null,
        draft: draftResponse?.meta.total ?? null,
        scheduled: scheduledResponse?.meta.total ?? null,
        photography: photographyCount,
        media: mediaCount,
      })
      setHealth(healthData)
      setLoading(false)
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

  const serviceLabel = health
    ? health.status === 'ok' && health.database === 'ok' ? '正常' : '异常'
    : '—'
  const metrics = [
    { label: '已发布文章', icon: FileText, value: contentStats.published, note: '篇公开文章' },
    { label: '摄影集', icon: Image, value: contentStats.photography, note: '个摄影集' },
    { label: '近 30 天访问', icon: Radio, value: analytics?.pageViews ?? null, note: `${analytics?.todayVisitors ?? 0} 位今日访客` },
    { label: '服务状态', icon: Server, value: serviceLabel, note: health ? `API ${health.status === 'ok' ? '正常' : '异常'} · 数据库 ${health.database === 'ok' ? '正常' : '异常'}` : '等待检查' },
  ]

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
        {metrics.map(({ label, icon: Icon, value, note }) => (
          <Card key={label} className="metric-card">
            <div className="metric-card__head">
              <span>{label}</span>
              <Icon size={18} aria-hidden="true" />
            </div>
            <strong>{loading && value === null ? <Spin size="small" /> : value ?? '—'}</strong>
            <small>{note}</small>
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
        {loading && !analytics ? <div className="analytics-loading"><Spin size="small" />正在加载访问数据</div> : (
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
          {loading ? <div className="list-loading"><Spin size="small" />正在加载最近编辑</div> : recentPosts.length > 0 ? (
            <div className="post-list dashboard-recent-list">
              {recentPosts.map((post) => (
                <article className="post-list-row" key={post.id}>
                  <button className="post-list-row__title" onClick={() => navigate(`/posts/${post.id}/edit`)}>
                    <strong>{post.title}</strong>
                    <span>/posts/{post.slug}</span>
                  </button>
                  <div><Tag color={statusColors[post.status]}>{statusLabels[post.status]}</Tag></div>
                  <time dateTime={post.updatedAt}>{dateTimeFormatter.format(new Date(post.updatedAt))}</time>
                  <Button type="link" icon={<ArrowRight size={15} />} aria-label={`编辑《${post.title}》`} onClick={() => navigate(`/posts/${post.id}/edit`)} />
                </article>
              ))}
            </div>
          ) : <EmptyPanel title="还没有内容记录" description="新建第一篇文章后，最近编辑记录会显示在这里。" />}
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
              <dd>{contentStats.draft ?? '—'}</dd>
            </div>
            <div>
              <dt>待发布</dt>
              <dd>{contentStats.scheduled ?? '—'}</dd>
            </div>
            <div>
              <dt>媒体文件</dt>
              <dd>{contentStats.media ?? '—'}</dd>
            </div>
          </dl>
          <p className="surface-note">数据与文章、摄影集及媒体库接口保持同步。</p>
        </aside>
      </section>
    </div>
  )
}
