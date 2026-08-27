import { useCallback, useEffect, useState } from 'react'
import { Button, Input, InputNumber, Modal, Segmented, Select, Spin, Typography, message } from 'antd'
import { GitMerge, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react'
import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  listCategories,
  listTags,
  mergeTag,
  updateCategory,
  updateTag,
  type CategoryItem,
  type TaxonomyItem,
} from '../api/taxonomy'
import PageHeader from '../components/PageHeader'

type View = '分类' | '标签'
type EditorState = {
  kind: View
  id?: string
  name: string
  slug: string
  description: string
  sortOrder: number
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugify(value: string) {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function itemEditor(kind: View, item?: CategoryItem | TaxonomyItem): EditorState {
  return {
    kind,
    id: item?.id,
    name: item?.name ?? '',
    slug: item?.slug ?? '',
    description: item?.description ?? '',
    sortOrder: 'sortOrder' in (item ?? {}) ? (item as CategoryItem).sortOrder : 0,
  }
}

export default function TaxonomyPage() {
  const [view, setView] = useState<View>('分类')
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [tags, setTags] = useState<TaxonomyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [mergeSource, setMergeSource] = useState<TaxonomyItem | null>(null)
  const [mergeTarget, setMergeTarget] = useState<string>()
  const [modal, modalContextHolder] = Modal.useModal()
  const [messageApi, messageContextHolder] = message.useMessage()

  const load = useCallback(async () => {
    try {
      const [nextCategories, nextTags] = await Promise.all([listCategories(), listTags()])
      setCategories(nextCategories)
      setTags(nextTags)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '分类与标签加载失败。')
    } finally {
      setLoading(false)
    }
  }, [messageApi])

  useEffect(() => {
    void Promise.all([listCategories(), listTags()])
      .then(([nextCategories, nextTags]) => {
        setCategories(nextCategories)
        setTags(nextTags)
      })
      .catch((error: unknown) => {
        void messageApi.error(error instanceof Error ? error.message : '分类与标签加载失败。')
      })
      .finally(() => setLoading(false))
  }, [messageApi])

  const saveEditor = async () => {
    if (!editor?.name.trim() || !slugPattern.test(editor.slug.trim())) {
      void messageApi.warning('请填写名称，并使用小写字母、数字和连字符作为页面路径。')
      return
    }
    setSaving(true)
    const base = {
      name: editor.name.trim(),
      slug: editor.slug.trim(),
      description: editor.description.trim() || null,
    }
    try {
      if (editor.kind === '分类') {
        const input = { ...base, sortOrder: editor.sortOrder }
        if (editor.id) await updateCategory(editor.id, input)
        else await createCategory(input)
      } else if (editor.id) await updateTag(editor.id, base)
      else await createTag(base)
      setEditor(null)
      await load()
      void messageApi.success(`${editor.kind}已保存`)
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '保存失败。')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = (kind: View, item: CategoryItem | TaxonomyItem) => {
    modal.confirm({
      title: `删除${kind}“${item.name}”？`,
      content: kind === '分类'
        ? `关联的 ${item.postCount} 篇文章将变为未分类。`
        : `将从 ${item.postCount} 篇文章中移除此标签。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          if (kind === '分类') await deleteCategory(item.id)
          else await deleteTag(item.id)
          await load()
          void messageApi.success(`${kind}已删除`)
        } catch (error) {
          void messageApi.error(error instanceof Error ? error.message : '删除失败。')
        }
      },
    })
  }

  const submitMerge = async () => {
    if (!mergeSource || !mergeTarget) return
    setSaving(true)
    try {
      await mergeTag(mergeSource.id, mergeTarget)
      setMergeSource(null)
      setMergeTarget(undefined)
      await load()
      void messageApi.success('标签已合并')
    } catch (error) {
      void messageApi.error(error instanceof Error ? error.message : '标签合并失败。')
    } finally {
      setSaving(false)
    }
  }

  const items = view === '分类' ? categories : tags

  return (
    <div className="taxonomy-page">
      {messageContextHolder}
      {modalContextHolder}
      <PageHeader
        eyebrow="CONTENT / TAXONOMY"
        title="分类与标签"
        description="建立稳定的内容主题，并在文章编辑器和公开站点中复用。"
        actions={(
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setEditor(itemEditor(view))}>
            新建{view}
          </Button>
        )}
      />

      <div className="taxonomy-toolbar">
        <Segmented options={['分类', '标签']} value={view} onChange={(value) => setView(value as View)} />
        <Button
          icon={<RefreshCw size={16} />}
          onClick={() => { setLoading(true); void load() }}
          aria-label="刷新"
        />
      </div>

      <Spin spinning={loading}>
        <section className="taxonomy-list" aria-label={`${view}列表`}>
          <div className="taxonomy-list__header">
            <span>名称</span><span>页面路径</span><span>文章</span><span>操作</span>
          </div>
          {items.length === 0 ? (
            <div className="taxonomy-list__empty">尚未创建{view}</div>
          ) : items.map((item) => (
            <article className="taxonomy-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                {item.description && <p>{item.description}</p>}
              </div>
              <code>{item.slug}</code>
              <span>{item.postCount}</span>
              <div className="taxonomy-row__actions">
                {view === '标签' && tags.length > 1 && (
                  <Button
                    type="text"
                    icon={<GitMerge size={16} />}
                    aria-label={`合并${item.name}`}
                    onClick={() => setMergeSource(item)}
                  />
                )}
                <Button
                  type="text"
                  icon={<Pencil size={16} />}
                  aria-label={`编辑${item.name}`}
                  onClick={() => setEditor(itemEditor(view, item))}
                />
                <Button
                  type="text"
                  danger
                  icon={<Trash2 size={16} />}
                  aria-label={`删除${item.name}`}
                  onClick={() => confirmDelete(view, item)}
                />
              </div>
            </article>
          ))}
        </section>
      </Spin>

      <Modal
        open={Boolean(editor)}
        title={`${editor?.id ? '编辑' : '新建'}${editor?.kind ?? ''}`}
        okText="保存"
        cancelText="取消"
        confirmLoading={saving}
        onOk={() => void saveEditor()}
        onCancel={() => setEditor(null)}
      >
        {editor && (
          <div className="taxonomy-form">
            <label><span>名称</span><Input value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value, slug: editor.id ? editor.slug : slugify(event.target.value) })} /></label>
            <label><span>页面路径</span><Input value={editor.slug} status={editor.slug && !slugPattern.test(editor.slug) ? 'error' : undefined} onChange={(event) => setEditor({ ...editor, slug: event.target.value.toLowerCase() })} /></label>
            <label><span>描述</span><Input.TextArea rows={3} value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
            {editor.kind === '分类' && <label><span>排序</span><InputNumber min={0} max={10000} value={editor.sortOrder} onChange={(value) => setEditor({ ...editor, sortOrder: value ?? 0 })} /></label>}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(mergeSource)}
        title={`合并标签“${mergeSource?.name ?? ''}”`}
        okText="合并"
        cancelText="取消"
        confirmLoading={saving}
        okButtonProps={{ disabled: !mergeTarget }}
        onOk={() => void submitMerge()}
        onCancel={() => { setMergeSource(null); setMergeTarget(undefined) }}
      >
        <Typography.Paragraph type="secondary">源标签会被删除，关联文章将迁移到目标标签。</Typography.Paragraph>
        <Select
          className="taxonomy-merge-select"
          placeholder="选择目标标签"
          value={mergeTarget}
          onChange={setMergeTarget}
          options={tags.filter((tag) => tag.id !== mergeSource?.id).map((tag) => ({ value: tag.id, label: tag.name }))}
        />
      </Modal>
    </div>
  )
}
