import { useEffect, useState } from 'react'
import { Alert, Button, Input, Pagination, Segmented, Spin, Tag } from 'antd'
import { FilePenLine, FilePlus2, RefreshCw, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { listPosts, type PostListItem, type PostStatus } from '../api/posts'
import EmptyPanel from '../components/EmptyPanel'
import PageHeader from '../components/PageHeader'

type StatusFilter = 'ALL' | PostStatus

const statusOptions: { label: string; value: StatusFilter }[] = [
  { label: '全部', value: 'ALL' },
  { label: '草稿', value: 'DRAFT' },
  { label: '待发布', value: 'SCHEDULED' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已撤回', value: 'WITHDRAWN' },
]

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
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export default function PostsPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<PostListItem[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [searchInput, setSearchInput] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (searchInput.trim() === query) return
      setLoading(true)
      setError(null)
      setPage(1)
      setQuery(searchInput.trim())
    }, 350)
    return () => window.clearTimeout(timeoutId)
  }, [query, searchInput])

  useEffect(() => {
    const controller = new AbortController()
    void listPosts({
      page,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      query,
      signal: controller.signal,
    })
      .then((response) => {
        setPosts(response.data)
        setTotal(response.meta.total)
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        setError(requestError instanceof Error ? requestError.message : '文章列表加载失败。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [page, query, reloadKey, statusFilter])

  const changeStatus = (value: string | number) => {
    setLoading(true)
    setError(null)
    setPage(1)
    setStatusFilter(value as StatusFilter)
  }

  const retryLoad = () => {
    setLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const clearFilters = () => {
    setLoading(true)
    setError(null)
    setSearchInput('')
    setQuery('')
    setStatusFilter('ALL')
    setPage(1)
  }

  const changePage = (nextPage: number) => {
    setLoading(true)
    setError(null)
    setPage(nextPage)
  }

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
          <Segmented options={statusOptions} value={statusFilter} onChange={changeStatus} />
          <div className="list-toolbar__filters">
            <Input
              allowClear
              prefix={<Search size={16} />}
              placeholder="搜索标题"
              aria-label="搜索文章标题"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </div>

        <div className="table-header" aria-hidden="true">
          <span>标题</span>
          <span>状态</span>
          <span>更新时间</span>
          <span>操作</span>
        </div>

        {error ? (
          <div className="list-feedback">
            <Alert
              type="error"
              showIcon
              message="无法加载文章"
              description={error}
              action={
                <Button icon={<RefreshCw size={15} />} onClick={retryLoad}>
                  重试
                </Button>
              }
            />
          </div>
        ) : loading ? (
          <div className="list-loading" role="status">
            <Spin />
            <span>正在加载文章…</span>
          </div>
        ) : posts.length ? (
          <>
            <div className="post-list">
              {posts.map((post) => (
                <article className="post-list-row" key={post.id}>
                  <button className="post-list-row__title" onClick={() => navigate(`/posts/${post.id}/edit`)}>
                    <strong>{post.title}</strong>
                    <span>/posts/{post.slug}</span>
                  </button>
                  <div><Tag color={statusColors[post.status]}>{statusLabels[post.status]}</Tag></div>
                  <time dateTime={post.updatedAt}>{dateTimeFormatter.format(new Date(post.updatedAt))}</time>
                  <Button
                    type="text"
                    icon={<FilePenLine size={16} />}
                    aria-label={`编辑《${post.title}》`}
                    onClick={() => navigate(`/posts/${post.id}/edit`)}
                  />
                </article>
              ))}
            </div>
            <div className="list-pagination">
              <span>共 {total} 篇文章</span>
              <Pagination current={page} pageSize={20} total={total} showSizeChanger={false} onChange={changePage} />
            </div>
          </>
        ) : (
          <EmptyPanel
            title={query || statusFilter !== 'ALL' ? '没有匹配的文章' : '还没有文章'}
            description={
              query || statusFilter !== 'ALL'
                ? '调整状态或搜索条件后再试。'
                : '从一篇草稿开始，内容只会在你主动发布后出现在展示端。'
            }
            action={
              query || statusFilter !== 'ALL' ? (
                <Button onClick={clearFilters}>清除筛选</Button>
              ) : (
                <Button icon={<FilePlus2 size={16} />} onClick={() => navigate('/posts/new')}>
                  创建第一篇文章
                </Button>
              )
            }
          />
        )}
      </section>
    </div>
  )
}
