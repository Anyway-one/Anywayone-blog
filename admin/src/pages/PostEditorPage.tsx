import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Dropdown,
  Input,
  Modal,
  Segmented,
  Select,
  Spin,
  Tooltip,
  Typography,
  message,
} from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import {
  ArrowLeft,
  Bold,
  Code2,
  Eye,
  Heading2,
  ImagePlus,
  Italic,
  Link,
  List,
  MoreHorizontal,
  Quote,
  RefreshCw,
  Save,
  Undo2,
  X,
} from 'lucide-react'
import { useBeforeUnload, useNavigate, useParams } from 'react-router-dom'
import {
  createPost,
  getPost,
  publishPost,
  updatePost,
  validatePublication,
  withdrawPost,
  type PostRead,
  type PostStatus,
  type PostVisibility,
} from '../api/posts'
import { ApiError } from '../api/http'
import { listMedia, uploadMedia, type MediaItem } from '../api/media'
import { listCategories, listTags, type CategoryItem, type TaxonomyItem } from '../api/taxonomy'

interface EditorDraft {
  title: string
  slug: string
  excerpt: string
  markdown: string
  visibility: PostVisibility
  isPinned: boolean
  categoryId: string | null
  tagIds: string[]
  coverMediaId: string | null
  coverAlt: string
}

type EditorMode = '写作' | '分栏' | '预览'
type EditorAction = 'saving' | 'validating' | 'publishing' | 'withdrawing' | null

const emptyDraft: EditorDraft = {
  title: '',
  slug: '',
  excerpt: '',
  markdown: '',
  visibility: 'PUBLIC',
  isPinned: false,
  categoryId: null,
  tagIds: [],
  coverMediaId: null,
  coverAlt: '',
}

const statusLabels: Record<PostStatus, string> = {
  DRAFT: '草稿',
  SCHEDULED: '待发布',
  PUBLISHED: '已发布',
  WITHDRAWN: '已撤回',
  ARCHIVED: '已归档',
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const toolbarItems = [
  { label: '标题', icon: Heading2 },
  { label: '粗体', icon: Bold },
  { label: '斜体', icon: Italic },
  { label: '链接', icon: Link },
  { label: '引用', icon: Quote },
  { label: '列表', icon: List },
  { label: '代码', icon: Code2 },
  { label: '图片', icon: ImagePlus },
] as const

function draftFromPost(post: PostRead): EditorDraft {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    markdown: post.markdown,
    visibility: post.visibility,
    isPinned: post.isPinned,
    categoryId: post.categoryId,
    tagIds: post.tags.map((tag) => tag.id),
    coverMediaId: post.coverMediaId,
    coverAlt: post.coverAlt ?? '',
  }
}

function draftSnapshot(draft: EditorDraft) {
  return JSON.stringify(draft)
}

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatSavedTime(value: Date | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(value)
}

export default function PostEditorPage() {
  const navigate = useNavigate()
  const { postId } = useParams()
  const markdownRef = useRef<TextAreaRef>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const savingRef = useRef(false)
  const draftRef = useRef<EditorDraft>(emptyDraft)
  const loadedPostIdRef = useRef<string | null>(null)
  const [draft, setDraft] = useState<EditorDraft>(emptyDraft)
  const [savedSnapshot, setSavedSnapshot] = useState(() => draftSnapshot(emptyDraft))
  const [post, setPost] = useState<PostRead | null>(null)
  const [mode, setMode] = useState<EditorMode>('写作')
  const [loading, setLoading] = useState(Boolean(postId))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [conflict, setConflict] = useState(false)
  const [action, setAction] = useState<EditorAction>(null)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [slugTouched, setSlugTouched] = useState(Boolean(postId))
  const [reloadKey, setReloadKey] = useState(0)
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [tags, setTags] = useState<TaxonomyItem[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [coverUploading, setCoverUploading] = useState(false)
  const [messageApi, messageContextHolder] = message.useMessage()
  const [modal, modalContextHolder] = Modal.useModal()
  const dirty = draftSnapshot(draft) !== savedSnapshot

  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  useEffect(() => {
    void Promise.all([listCategories(), listTags(), listMedia(1, 100)])
      .then(([nextCategories, nextTags, mediaResponse]) => {
        setCategories(nextCategories)
        setTags(nextTags)
        setMedia(mediaResponse.data)
      })
      .catch((requestError: unknown) => {
        void messageApi.error(requestError instanceof Error ? requestError.message : '文章设置加载失败。')
      })
  }, [messageApi])

  useEffect(() => {
    if (!postId || loadedPostIdRef.current === postId) return

    const controller = new AbortController()
    void getPost(postId, controller.signal)
      .then((loadedPost) => {
        const loadedDraft = draftFromPost(loadedPost)
        loadedPostIdRef.current = loadedPost.id
        setPost(loadedPost)
        setDraft(loadedDraft)
        setSavedSnapshot(draftSnapshot(loadedDraft))
        setConflict(false)
        setSaveError(null)
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(requestError instanceof Error ? requestError.message : '文章加载失败。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [postId, reloadKey])

  useBeforeUnload(
    useCallback(
      (event) => {
        if (!dirty) return
        event.preventDefault()
        event.returnValue = ''
      },
      [dirty],
    ),
  )

  const setDraftField = <Key extends keyof EditorDraft>(key: Key, value: EditorDraft[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setSaveError(null)
  }

  const validateDraft = useCallback((candidate: EditorDraft, silent: boolean) => {
    if (!candidate.title.trim()) {
      if (!silent) void messageApi.warning('请先填写文章标题。')
      return false
    }
    if (!slugPattern.test(candidate.slug.trim())) {
      if (!silent) void messageApi.warning('页面路径只能包含小写字母、数字和连字符。')
      return false
    }
    return true
  }, [messageApi])

  const persistDraft = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (savingRef.current || loading || conflict) return null

    const draftAtStart = draftRef.current
    if (!validateDraft(draftAtStart, silent)) return null
    const rawSnapshotAtStart = draftSnapshot(draftAtStart)
    savingRef.current = true
    setAction('saving')
    setSaveError(null)

    try {
      const baseInput = {
        title: draftAtStart.title.trim(),
        slug: draftAtStart.slug.trim(),
        excerpt: draftAtStart.excerpt.trim() || null,
        markdown: draftAtStart.markdown,
        categoryId: draftAtStart.categoryId,
        tagIds: draftAtStart.tagIds,
        coverMediaId: draftAtStart.coverMediaId,
        coverAlt: draftAtStart.coverAlt.trim() || null,
      }
      let savedPost: PostRead

      if (post) {
        savedPost = await updatePost(post.id, {
          ...baseInput,
          revision: post.revision,
          visibility: draftAtStart.visibility,
          isPinned: draftAtStart.isPinned,
        })
      } else {
        savedPost = await createPost(baseInput)
        if (draftAtStart.visibility !== savedPost.visibility || draftAtStart.isPinned !== savedPost.isPinned) {
          savedPost = await updatePost(savedPost.id, {
            ...baseInput,
            revision: savedPost.revision,
            visibility: draftAtStart.visibility,
            isPinned: draftAtStart.isPinned,
          })
        }
      }

      const savedDraft = draftFromPost(savedPost)
      loadedPostIdRef.current = savedPost.id
      setPost(savedPost)
      setLastSavedAt(new Date())
      setConflict(false)
      if (draftSnapshot(draftRef.current) === rawSnapshotAtStart) {
        setDraft(savedDraft)
        setSavedSnapshot(draftSnapshot(savedDraft))
      } else {
        setSavedSnapshot(rawSnapshotAtStart)
      }
      if (!postId) navigate(`/posts/${savedPost.id}/edit`, { replace: true })
      if (!silent) void messageApi.success('草稿已保存')
      return savedPost
    } catch (requestError) {
      const errorMessage = requestError instanceof Error ? requestError.message : '保存失败，请稍后重试。'
      setSaveError(errorMessage)
      if (requestError instanceof ApiError && requestError.code === 'CONTENT_VERSION_CONFLICT') {
        setConflict(true)
      } else if (!silent) {
        void messageApi.error(errorMessage)
      }
      return null
    } finally {
      savingRef.current = false
      setAction(null)
    }
  }, [conflict, loading, messageApi, navigate, post, postId, validateDraft])

  useEffect(() => {
    if (!dirty || loading || conflict || action || saveError || post?.status === 'PUBLISHED' || !validateDraft(draft, true)) return
    const timeoutId = window.setTimeout(() => {
      void persistDraft({ silent: true })
    }, 2200)
    return () => window.clearTimeout(timeoutId)
  }, [action, conflict, dirty, draft, loading, persistDraft, post?.status, saveError, validateDraft])

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void persistDraft()
      }
    }
    window.addEventListener('keydown', handleSaveShortcut)
    return () => window.removeEventListener('keydown', handleSaveShortcut)
  }, [persistDraft])

  useEffect(() => {
    if (!dirty) return
    const interceptLink = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(target instanceof HTMLAnchorElement) || target.target === '_blank') return
      const destination = new URL(target.href, window.location.href)
      if (destination.origin !== window.location.origin || destination.href === window.location.href) return
      event.preventDefault()
      event.stopPropagation()
      modal.confirm({
        title: '离开编辑页？',
        content: '尚有未保存的更改，离开后这些内容会丢失。',
        okText: '放弃更改',
        cancelText: '继续编辑',
        okButtonProps: { danger: true },
        onOk: () => navigate(`${destination.pathname}${destination.search}${destination.hash}`),
      })
    }
    document.addEventListener('click', interceptLink, true)
    return () => document.removeEventListener('click', interceptLink, true)
  }, [dirty, modal, navigate])

  const handleBack = () => {
    if (!dirty) {
      navigate('/posts')
      return
    }
    modal.confirm({
      title: '返回文章列表？',
      content: '尚有未保存的更改，返回后这些内容会丢失。',
      okText: '放弃更改',
      cancelText: '继续编辑',
      okButtonProps: { danger: true },
      onOk: () => navigate('/posts'),
    })
  }

  const reloadServerVersion = () => {
    if (!postId) return
    loadedPostIdRef.current = null
    setConflict(false)
    setLoadError(null)
    setLoading(true)
    setReloadKey((key) => key + 1)
  }

  const handlePublish = async () => {
    let currentPost = post
    if (dirty || !currentPost) currentPost = await persistDraft()
    if (!currentPost) return

    setAction('validating')
    try {
      const validation = await validatePublication(currentPost.id)
      if (!validation.valid) {
        modal.warning({
          title: '暂时无法发布',
          content: (
            <ul className="publication-issues">
              {validation.issues.map((issue) => <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>)}
            </ul>
          ),
        })
        return
      }

      modal.confirm({
        title: '发布这篇文章？',
        content: '发布后文章将立即出现在公开展示端。',
        okText: '确认发布',
        cancelText: '取消',
        onOk: async () => {
          setAction('publishing')
          try {
            const publishedPost = await publishPost(currentPost.id, currentPost.revision)
            const publishedDraft = draftFromPost(publishedPost)
            setPost(publishedPost)
            setDraft(publishedDraft)
            setSavedSnapshot(draftSnapshot(publishedDraft))
            void messageApi.success('文章已发布')
          } catch (requestError) {
            const errorMessage = requestError instanceof Error ? requestError.message : '发布失败，请稍后重试。'
            void messageApi.error(errorMessage)
            throw requestError
          } finally {
            setAction(null)
          }
        },
      })
    } catch (requestError) {
      void messageApi.error(requestError instanceof Error ? requestError.message : '发布检查失败。')
    } finally {
      setAction(null)
    }
  }

  const handleWithdraw = () => {
    if (!post) return
    modal.confirm({
      title: '撤回这篇文章？',
      content: '撤回后公开页面将不再显示这篇文章。',
      okText: '确认撤回',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setAction('withdrawing')
        try {
          const withdrawnPost = await withdrawPost(post.id, post.revision)
          const withdrawnDraft = draftFromPost(withdrawnPost)
          setPost(withdrawnPost)
          setDraft(withdrawnDraft)
          setSavedSnapshot(draftSnapshot(withdrawnDraft))
          void messageApi.success('文章已撤回')
        } catch (requestError) {
          void messageApi.error(requestError instanceof Error ? requestError.message : '撤回失败。')
          throw requestError
        } finally {
          setAction(null)
        }
      },
    })
  }

  const switchMode = async (nextMode: string | number) => {
    const selectedMode = nextMode as EditorMode
    if (selectedMode === '写作' || !dirty) {
      setMode(selectedMode)
      return
    }
    if (post?.status === 'PUBLISHED') {
      void messageApi.warning('请先更新已发布文章，再查看最新预览。')
      return
    }
    const savedPost = await persistDraft()
    if (savedPost) setMode(selectedMode)
  }

  const handleUpdate = () => {
    if (!dirty) {
      void messageApi.info('当前内容已是最新版本。')
      return
    }
    void persistDraft()
  }

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true)
    try {
      const uploaded = await uploadMedia(file)
      setMedia((current) => [uploaded, ...current.filter((item) => item.id !== uploaded.id)])
      setDraft((current) => ({ ...current, coverMediaId: uploaded.id }))
      setSaveError(null)
      void messageApi.success('封面已上传')
    } catch (requestError) {
      void messageApi.error(requestError instanceof Error ? requestError.message : '封面上传失败。')
    } finally {
      setCoverUploading(false)
      if (coverInputRef.current) coverInputRef.current.value = ''
    }
  }

  const insertMarkdown = (before: string, after = '', placeholder = '') => {
    const textArea = markdownRef.current?.resizableTextArea?.textArea
    if (!textArea) return
    const start = textArea.selectionStart
    const end = textArea.selectionEnd
    const selectedText = draft.markdown.slice(start, end) || placeholder
    const nextMarkdown = `${draft.markdown.slice(0, start)}${before}${selectedText}${after}${draft.markdown.slice(end)}`
    setDraftField('markdown', nextMarkdown)
    window.requestAnimationFrame(() => {
      textArea.focus()
      textArea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    })
  }

  const insertPrefixedLines = (prefix: string, placeholder: string) => {
    const textArea = markdownRef.current?.resizableTextArea?.textArea
    if (!textArea) return
    const start = textArea.selectionStart
    const end = textArea.selectionEnd
    const selectedText = draft.markdown.slice(start, end) || placeholder
    const formatted = selectedText.split('\n').map((line) => `${prefix}${line}`).join('\n')
    const nextMarkdown = `${draft.markdown.slice(0, start)}${formatted}${draft.markdown.slice(end)}`
    setDraftField('markdown', nextMarkdown)
    window.requestAnimationFrame(() => {
      textArea.focus()
      textArea.setSelectionRange(start, start + formatted.length)
    })
  }

  const runToolbarAction = (label: (typeof toolbarItems)[number]['label']) => {
    switch (label) {
      case '标题': insertPrefixedLines('## ', '标题'); break
      case '粗体': insertMarkdown('**', '**', '粗体文字'); break
      case '斜体': insertMarkdown('*', '*', '斜体文字'); break
      case '链接': insertMarkdown('[', '](https://)', '链接文字'); break
      case '引用': insertPrefixedLines('> ', '引用内容'); break
      case '列表': insertPrefixedLines('- ', '列表项'); break
      case '代码': insertMarkdown('`', '`', 'code'); break
      case '图片': insertMarkdown('![', '](https://)', '图片说明'); break
    }
  }

  const saveStatus = loading
    ? '正在加载…'
    : conflict
      ? '存在版本冲突'
      : action === 'saving'
        ? '正在保存…'
        : dirty
          ? saveError || '有未保存的更改'
          : lastSavedAt
            ? `${formatSavedTime(lastSavedAt)} 已保存`
            : post
              ? '所有更改已保存'
              : '尚未保存'

  if (loading) {
    return <div className="editor-loading" role="status"><Spin /><span>正在加载文章…</span></div>
  }

  if (loadError) {
    return (
      <div className="editor-load-error">
        {messageContextHolder}
        {modalContextHolder}
        <Alert type="error" showIcon message="无法打开文章" description={loadError} />
        <div>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/posts')}>返回列表</Button>
          <Button type="primary" icon={<RefreshCw size={16} />} onClick={reloadServerVersion}>重试</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      {messageContextHolder}
      {modalContextHolder}
      <header className="editor-commandbar">
        <div className="editor-commandbar__start">
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="返回文章列表" onClick={handleBack} />
          <div>
            <strong>{draft.title || '未命名文章'}</strong>
            <span className={conflict || saveError ? 'editor-save-status--error' : undefined}>{saveStatus}</span>
          </div>
        </div>
        <div className="editor-commandbar__actions">
          <Button icon={<Eye size={17} />} disabled={Boolean(action)} onClick={() => void switchMode('预览')}>预览</Button>
          {post?.status === 'PUBLISHED' ? (
            <>
              <Button type="primary" icon={<Save size={17} />} loading={action === 'saving'} disabled={Boolean(action && action !== 'saving') || conflict} onClick={handleUpdate}>
                更新
              </Button>
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [{ key: 'withdraw', label: '撤回文章', danger: true, icon: <Undo2 size={15} />, disabled: dirty || Boolean(action) }],
                  onClick: ({ key }) => { if (key === 'withdraw') handleWithdraw() },
                }}
              >
                <Button type="text" icon={<MoreHorizontal size={18} />} aria-label="更多文章操作" />
              </Dropdown>
            </>
          ) : (
            <>
              <Button icon={<Save size={17} />} loading={action === 'saving'} disabled={Boolean(action && action !== 'saving') || conflict} onClick={() => void persistDraft()}>
                保存草稿
              </Button>
              <Button type="primary" loading={action === 'validating' || action === 'publishing'} disabled={Boolean(action && action !== 'validating' && action !== 'publishing') || conflict} onClick={() => void handlePublish()}>
                发布
              </Button>
            </>
          )}
        </div>
      </header>

      {conflict && (
        <Alert
          type="warning"
          showIcon
          message="文章已在其他位置更新"
          description="为避免覆盖另一处修改，自动保存已暂停。请重新载入服务器版本后再继续编辑。"
          action={<Button icon={<RefreshCw size={15} />} onClick={reloadServerVersion}>重新载入</Button>}
        />
      )}

      <div className="editor-layout">
        <section className="editor-canvas" aria-label="文章编辑区">
          <Input.TextArea
            className="editor-title"
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="输入文章标题"
            aria-label="文章标题"
            maxLength={200}
            value={draft.title}
            onChange={(event) => {
              const title = event.target.value
              setDraft((current) => ({
                ...current,
                title,
                slug: slugTouched ? current.slug : slugify(title),
              }))
              setSaveError(null)
            }}
          />
          <Input.TextArea
            className="editor-summary"
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="添加一段简短摘要，用于文章列表与搜索结果。"
            aria-label="文章摘要"
            value={draft.excerpt}
            onChange={(event) => setDraftField('excerpt', event.target.value)}
          />

          <div className="editor-toolbar">
            <Segmented options={['写作', '分栏', '预览']} value={mode} onChange={(value) => void switchMode(value)} />
            <div className="editor-toolbar__tools" role="toolbar" aria-label="Markdown 工具栏">
              {toolbarItems.map(({ label, icon: Icon }) => (
                <Tooltip title={label} key={label}>
                  <Button type="text" icon={<Icon size={17} />} aria-label={label} disabled={mode === '预览'} onClick={() => runToolbarAction(label)} />
                </Tooltip>
              ))}
            </div>
          </div>

          <div className={`editor-content editor-content--${mode === '分栏' ? 'split' : mode === '预览' ? 'preview' : 'write'}`}>
            {mode !== '预览' && (
              <Input.TextArea
                ref={markdownRef}
                className="markdown-editor"
                placeholder="开始写作…"
                aria-label="Markdown 正文"
                value={draft.markdown}
                onChange={(event) => setDraftField('markdown', event.target.value)}
              />
            )}
            {mode !== '写作' && (
              <article className="markdown-preview" aria-label="文章预览">
                {post?.renderedHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: post.renderedHtml }} />
                ) : (
                  <div className="markdown-preview__empty">保存正文后即可查看预览。</div>
                )}
              </article>
            )}
          </div>
        </section>

        <aside className="editor-settings" aria-label="文章设置">
          <div className="settings-section">
            <span className="settings-section__label">发布</span>
            <label>
              <span>内容状态</span>
              <Select value={post ? statusLabels[post.status] : '草稿'} disabled options={[]} />
            </label>
            <label>
              <span>可见性</span>
              <Select
                value={draft.visibility}
                onChange={(value: PostVisibility) => setDraftField('visibility', value)}
                options={[
                  { value: 'PUBLIC', label: '公开' },
                  { value: 'UNLISTED', label: '不在列表展示' },
                ]}
              />
            </label>
            <label>
              <span>发布时间</span>
              <Input value={post?.publishedAt ? new Date(post.publishedAt).toLocaleString('zh-CN') : ''} placeholder="发布时自动记录" disabled />
            </label>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">组织</span>
            <label>
              <span>分类</span>
              <Select
                allowClear
                placeholder="未分类"
                value={draft.categoryId ?? undefined}
                onChange={(value?: string) => setDraftField('categoryId', value ?? null)}
                options={categories.map((item) => ({ value: item.id, label: item.name }))}
              />
            </label>
            <label>
              <span>标签</span>
              <Select
                mode="multiple"
                maxCount={20}
                placeholder="选择标签"
                value={draft.tagIds}
                onChange={(value: string[]) => setDraftField('tagIds', value)}
                options={tags.map((item) => ({ value: item.id, label: item.name }))}
              />
            </label>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">展示</span>
            <input
              ref={coverInputRef}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleCoverUpload(file) }}
            />
            {draft.coverMediaId && media.find((item) => item.id === draft.coverMediaId) && (
              <div className="editor-cover-preview">
                <img src={media.find((item) => item.id === draft.coverMediaId)?.publicUrl} alt="" />
                <Button type="text" icon={<X size={15} />} aria-label="移除封面" onClick={() => { setDraftField('coverMediaId', null); setDraftField('coverAlt', '') }} />
              </div>
            )}
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="从媒体库选择"
              value={draft.coverMediaId ?? undefined}
              onChange={(value?: string) => setDraftField('coverMediaId', value ?? null)}
              options={media.map((item) => ({ value: item.id, label: item.originalName }))}
            />
            <Button block icon={<ImagePlus size={16} />} loading={coverUploading} onClick={() => coverInputRef.current?.click()}>上传新封面</Button>
            {draft.coverMediaId && (
              <label>
                <span>封面替代文本</span>
                <Input maxLength={320} placeholder="描述图片内容" value={draft.coverAlt} onChange={(event) => setDraftField('coverAlt', event.target.value)} />
              </label>
            )}
            <Checkbox checked={draft.isPinned} onChange={(event) => setDraftField('isPinned', event.target.checked)}>设为精选文章</Checkbox>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">SEO</span>
            <label>
              <span>页面路径</span>
              <Input
                prefix="/posts/"
                placeholder="article-slug"
                maxLength={200}
                status={draft.slug && !slugPattern.test(draft.slug) ? 'error' : undefined}
                value={draft.slug}
                onChange={(event) => {
                  setSlugTouched(true)
                  setDraftField('slug', event.target.value.toLowerCase())
                }}
              />
            </label>
            <Typography.Text type="secondary">搜索摘要默认使用文章摘要。</Typography.Text>
          </div>
        </aside>
      </div>
    </div>
  )
}
