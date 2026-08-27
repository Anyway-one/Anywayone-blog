import { useEffect, useRef, useState } from 'react'
import { Button, Input, Select, Upload, message } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, ImagePlus, Save, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function PhotographyEditorPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UploadFile[]>([])
  const previewUrls = useRef(new Set<string>())
  const [messageApi, contextHolder] = message.useMessage()

  useEffect(() => {
    const urls = previewUrls.current
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  const uploadProps: UploadProps = {
    accept: 'image/jpeg,image/png,image/webp',
    multiple: true,
    fileList: files,
    beforeUpload: () => false,
    onChange: ({ fileList }) => {
      const nextFiles = fileList.map((file) => {
        if (file.thumbUrl || !file.originFileObj) return file
        const thumbUrl = URL.createObjectURL(file.originFileObj)
        previewUrls.current.add(thumbUrl)
        return { ...file, thumbUrl }
      })
      setFiles(nextFiles)
    },
  }

  const moveFile = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= files.length) return
    const nextFiles = [...files]
    const [current] = nextFiles.splice(index, 1)
    nextFiles.splice(nextIndex, 0, current)
    setFiles(nextFiles)
    void messageApi.success(`已将照片移动到第 ${nextIndex + 1} 位`)
  }

  return (
    <div className="editor-page photography-editor">
      {contextHolder}
      <header className="editor-commandbar">
        <div className="editor-commandbar__start">
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="返回摄影集" onClick={() => navigate('/photography')} />
          <div>
            <strong>新建摄影集</strong>
            <span>尚未保存</span>
          </div>
        </div>
        <div className="editor-commandbar__actions">
          <Button icon={<Eye size={17} />}>预览</Button>
          <Button icon={<Save size={17} />} onClick={() => void messageApi.success('摄影集已保存在当前页面')}>保存草稿</Button>
          <Button type="primary" onClick={() => void messageApi.info('后端接入后开放发布')}>发布</Button>
        </div>
      </header>

      <div className="editor-layout">
        <section className="editor-canvas" aria-label="摄影集照片">
          <Input className="album-title" variant="borderless" placeholder="输入摄影集标题" aria-label="摄影集标题" />
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="记录这组照片的时间、地点或故事。" aria-label="摄影集说明" />

          <Upload.Dragger {...uploadProps} className="photo-uploader" showUploadList={false}>
            <UploadCloud size={28} aria-hidden="true" />
            <strong>选择或拖入摄影作品</strong>
            <span>支持 JPG、PNG、WebP，可一次选择多张</span>
          </Upload.Dragger>

          {files.length === 0 ? (
            <div className="photo-grid-empty">
              <ImagePlus size={24} aria-hidden="true" />
              <p>照片加入后会以稳定缩略图显示在这里。</p>
            </div>
          ) : (
            <div className="photo-sort-grid" aria-live="polite">
              {files.map((file, index) => (
                <article className="photo-sort-item" key={file.uid}>
                  <div className="photo-sort-item__preview">
                    {file.thumbUrl && <img src={file.thumbUrl} alt="" />}
                    <span>{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="photo-sort-item__meta">
                    <strong title={file.name}>{file.name}</strong>
                    <div>
                      <Button
                        size="small"
                        type="text"
                        icon={<ArrowUp size={15} />}
                        aria-label={`将 ${file.name} 前移`}
                        disabled={index === 0}
                        onClick={() => moveFile(index, -1)}
                      />
                      <Button
                        size="small"
                        type="text"
                        icon={<ArrowDown size={15} />}
                        aria-label={`将 ${file.name} 后移`}
                        disabled={index === files.length - 1}
                        onClick={() => moveFile(index, 1)}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="editor-settings" aria-label="摄影集设置">
          <div className="settings-section">
            <span className="settings-section__label">发布</span>
            <label>
              <span>内容状态</span>
              <Select defaultValue="draft" options={[{ value: 'draft', label: '草稿' }]} />
            </label>
          </div>
          <div className="settings-divider" />
          <div className="settings-section">
            <span className="settings-section__label">作品信息</span>
            <label>
              <span>拍摄地点</span>
              <Input placeholder="可选" />
            </label>
            <label>
              <span>拍摄时间</span>
              <Input type="date" />
            </label>
            <label>
              <span>页面路径</span>
              <Input prefix="/photography/" placeholder="album-slug" />
            </label>
          </div>
        </aside>
      </div>
    </div>
  )
}
