import { useEffect, useRef, useState } from 'react'
import { Button, Input, Select, Upload, message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, ImagePlus, Save, Trash2, UploadCloud } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { createPhotography, getPhotography, publishPhotography, updatePhotography, type PhotographyCollection } from '../api/photography'
import { uploadMedia, type MediaItem } from '../api/media'
import { compressPhotographyImage } from '../utils/image'

type PhotoDraft = { title: string; slug: string; description: string; locationText: string; capturedFrom: string; capturedTo: string }

export default function PhotographyEditorPage() {
  const navigate = useNavigate()
  const { albumId } = useParams()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [mediaByUid, setMediaByUid] = useState<Record<string, MediaItem>>({})
  const [draft, setDraft] = useState<PhotoDraft>({ title: '', slug: '', description: '', locationText: '', capturedFrom: '', capturedTo: '' })
  const [collection, setCollection] = useState<PhotographyCollection | null>(null)
  const [saving, setSaving] = useState(false)
  const previewUrls = useRef(new Set<string>())
  const uploadingUids = useRef(new Set<string>())
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => () => previewUrls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  useEffect(() => {
    if (!albumId) return
    void getPhotography(albumId).then((value) => {
      setCollection(value)
      setDraft({ title: value.title, slug: value.slug, description: value.description ?? '', locationText: value.locationText ?? '', capturedFrom: value.capturedFrom ?? '', capturedTo: value.capturedTo ?? '' })
      setFiles(value.items.map((item) => ({ uid: item.id, name: item.originalName, status: 'done', url: item.publicUrl })))
      setMediaByUid(Object.fromEntries(value.items.map((item) => [item.id, { id: item.mediaId, publicUrl: item.publicUrl, originalName: item.originalName, mimeType: 'image/*', sizeBytes: 0, width: item.width, height: item.height, altText: item.altText, createdAt: '' }])))
    }).catch((error: unknown) => void messageApi.error(error instanceof Error ? error.message : '摄影集加载失败。'))
  }, [albumId, messageApi])

  const uploadProps: UploadProps = {
    accept: 'image/jpeg,image/png,image/webp,image/gif,image/avif', multiple: true, fileList: files, beforeUpload: () => false, showUploadList: false,
    onChange: ({ fileList }) => {
      setFiles(fileList)
      for (const file of fileList) {
        if (mediaByUid[file.uid] || uploadingUids.current.has(file.uid) || !file.originFileObj) continue
        uploadingUids.current.add(file.uid)
        const thumbUrl = URL.createObjectURL(file.originFileObj)
        previewUrls.current.add(thumbUrl)
        setFiles((current) => current.map((item) => item.uid === file.uid ? { ...item, thumbUrl, status: 'uploading' } : item))
        void compressPhotographyImage(file.originFileObj).then((preparedFile) => uploadMedia(preparedFile)).then((media) => {
          setMediaByUid((current) => ({ ...current, [file.uid]: media }))
          setFiles((current) => current.map((item) => item.uid === file.uid ? { ...item, status: 'done' } : item))
        }).catch((error: unknown) => { setFiles((current) => current.filter((item) => item.uid !== file.uid)); void messageApi.error(error instanceof Error ? error.message : '图片上传失败。') }).finally(() => uploadingUids.current.delete(file.uid))
      }
    },
  }

  const moveFile = (index: number, direction: -1 | 1) => { const nextIndex = index + direction; if (nextIndex < 0 || nextIndex >= files.length) return; const next = [...files]; const [current] = next.splice(index, 1); next.splice(nextIndex, 0, current); setFiles(next) }
  const removeFile = (uid: string) => setFiles((current) => current.filter((file) => file.uid !== uid))
  const setField = (field: keyof PhotoDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }))
  const payload = () => ({ ...draft, description: draft.description.trim() || null, locationText: draft.locationText.trim() || null, capturedFrom: draft.capturedFrom || null, capturedTo: draft.capturedTo || null, coverMediaId: files[0] ? mediaByUid[files[0].uid]?.id ?? null : null, items: files.map((file, position) => ({ mediaId: mediaByUid[file.uid]?.id, position, title: null, altText: mediaByUid[file.uid]?.altText || file.name, caption: null })).filter((item): item is typeof item & { mediaId: string } => Boolean(item.mediaId)) })
  const save = async (): Promise<PhotographyCollection | null> => {
    if (!draft.title.trim() || !draft.slug.trim()) { void messageApi.warning('请填写标题和页面路径。'); return null }
    setSaving(true)
    try { const next = collection ? await updatePhotography(collection.id, { ...payload(), revision: collection.revision }) : await createPhotography(payload()); setCollection(next); navigate(`/photography/${next.id}/edit`, { replace: true }); void messageApi.success('摄影集已保存'); return next } catch (error) { void messageApi.error(error instanceof Error ? error.message : '摄影集保存失败。'); return null } finally { setSaving(false) }
  }
  const publish = async () => { const saved = await save(); if (!saved) return; try { const next = await publishPhotography(saved.id, saved.revision); setCollection(next); void messageApi.success('摄影集已发布') } catch (error) { void messageApi.error(error instanceof Error ? error.message : '发布失败。') } }

  return <div className="editor-page photography-editor">{contextHolder}<header className="editor-commandbar"><div className="editor-commandbar__start"><Button type="text" icon={<ArrowLeft size={18} />} aria-label="返回摄影集" onClick={() => navigate('/photography')} /><div><strong>{collection ? '编辑摄影集' : '新建摄影集'}</strong><span>{collection?.status === 'PUBLISHED' ? '已发布' : '草稿'}</span></div></div><div className="editor-commandbar__actions"><Button icon={<Eye size={17} />} onClick={() => collection && window.open(`/photography/${collection.slug}`, '_blank')}>预览</Button><Button icon={<Save size={17} />} loading={saving} onClick={() => void save()}>保存草稿</Button><Button type="primary" loading={saving} onClick={() => void publish()}>发布</Button></div></header>
    <div className="editor-layout"><section className="editor-canvas" aria-label="摄影集照片"><Input className="album-title" variant="borderless" placeholder="输入摄影集标题" aria-label="摄影集标题" value={draft.title} onChange={(event) => setField('title', event.target.value)} /><Input.TextArea className="album-description" autoSize={{ minRows: 2, maxRows: 4 }} placeholder="记录这组照片的时间、地点或故事。" aria-label="摄影集说明" value={draft.description} onChange={(event) => setField('description', event.target.value)} /><Upload.Dragger {...uploadProps} className="photo-uploader"><UploadCloud size={28} aria-hidden="true" /><strong>选择或拖入摄影作品</strong><span>支持 JPEG、PNG、WebP、GIF 和 AVIF，可一次选择多张</span></Upload.Dragger>{files.length === 0 ? <div className="photo-grid-empty"><ImagePlus size={24} aria-hidden="true" /><p>照片加入后会以稳定缩略图显示在这里。</p></div> : <div className="photo-sort-grid" aria-live="polite">{files.map((file, index) => <article className="photo-sort-item" key={file.uid}><div className="photo-sort-item__preview">{(file.thumbUrl || file.url) && <img src={file.thumbUrl || file.url} alt="" />}<span>{String(index + 1).padStart(2, '0')}</span></div><div className="photo-sort-item__meta"><strong title={file.name}>{file.name}</strong><div><Button size="small" type="text" icon={<ArrowUp size={15} />} aria-label={`将 ${file.name} 前移`} disabled={index === 0} onClick={() => moveFile(index, -1)} /><Button size="small" type="text" icon={<ArrowDown size={15} />} aria-label={`将 ${file.name} 后移`} disabled={index === files.length - 1} onClick={() => moveFile(index, 1)} /><Button size="small" type="text" danger icon={<Trash2 size={15} />} aria-label={`从摄影集移除${file.name}`} onClick={() => removeFile(file.uid)} /></div></div></article>)}</div>}</section>
      <aside className="editor-settings" aria-label="摄影集设置"><div className="settings-section"><span className="settings-section__label">发布</span><label><span>内容状态</span><Select value={collection?.status ?? 'DRAFT'} disabled options={[{ value: 'DRAFT', label: '草稿' }, { value: 'PUBLISHED', label: '已发布' }, { value: 'WITHDRAWN', label: '已撤回' }]} /></label></div><div className="settings-divider" /><div className="settings-section"><span className="settings-section__label">作品信息</span><label><span>拍摄地点</span><Input placeholder="可选" value={draft.locationText} onChange={(event) => setField('locationText', event.target.value)} /></label><label><span>拍摄时间</span><Input type="date" value={draft.capturedFrom} onChange={(event) => setField('capturedFrom', event.target.value)} /></label><label><span>页面路径</span><Input prefix="/photography/" placeholder="album-slug" value={draft.slug} onChange={(event) => setField('slug', event.target.value)} /></label></div></aside>
    </div></div>
}
