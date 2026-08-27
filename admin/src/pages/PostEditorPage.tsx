import { useState } from 'react'
import { Button, Checkbox, Divider, Input, Select, Segmented, Tooltip, Typography, message } from 'antd'
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
  Save,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'

const toolbarActions = [
  { label: '标题', icon: Heading2 },
  { label: '粗体', icon: Bold },
  { label: '斜体', icon: Italic },
  { label: '链接', icon: Link },
  { label: '引用', icon: Quote },
  { label: '列表', icon: List },
  { label: '代码', icon: Code2 },
  { label: '图片', icon: ImagePlus },
]

export default function PostEditorPage() {
  const navigate = useNavigate()
  const { postId } = useParams()
  const [mode, setMode] = useState<string | number>('写作')
  const [saved, setSaved] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const saveLocally = () => {
    setSaved(true)
    void messageApi.success('草稿已保存在当前页面')
  }

  return (
    <div className="editor-page">
      {contextHolder}
      <header className="editor-commandbar">
        <div className="editor-commandbar__start">
          <Button type="text" icon={<ArrowLeft size={18} />} aria-label="返回文章列表" onClick={() => navigate('/posts')} />
          <div>
            <strong>{postId ? '编辑文章' : '未命名文章'}</strong>
            <span>{saved ? '仅本地保存' : '尚未保存'}</span>
          </div>
        </div>
        <div className="editor-commandbar__actions">
          <Button icon={<Eye size={17} />}>预览</Button>
          <Button icon={<Save size={17} />} onClick={saveLocally}>保存草稿</Button>
          <Button type="primary" onClick={() => void messageApi.info('后端接入后开放发布')}>发布</Button>
          <Button type="text" icon={<MoreHorizontal size={18} />} aria-label="更多文章操作" />
        </div>
      </header>

      <div className="editor-layout">
        <section className="editor-canvas" aria-label="文章编辑区">
          <Input.TextArea
            className="editor-title"
            autoSize={{ minRows: 1, maxRows: 3 }}
            placeholder="输入文章标题"
            aria-label="文章标题"
          />
          <Input.TextArea
            className="editor-summary"
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="添加一段简短摘要，用于文章列表与搜索结果。"
            aria-label="文章摘要"
          />

          <div className="editor-toolbar">
            <Segmented options={['写作', '分栏', '预览']} value={mode} onChange={setMode} />
            <div className="editor-toolbar__tools" role="toolbar" aria-label="Markdown 工具栏">
              {toolbarActions.map(({ label, icon: Icon }) => (
                <Tooltip title={label} key={label}>
                  <Button type="text" icon={<Icon size={17} />} aria-label={label} />
                </Tooltip>
              ))}
            </div>
          </div>

          <Input.TextArea
            className="markdown-editor"
            placeholder="开始写作…"
            aria-label="Markdown 正文"
          />
        </section>

        <aside className="editor-settings" aria-label="文章设置">
          <div className="settings-section">
            <span className="settings-section__label">发布</span>
            <label>
              <span>内容状态</span>
              <Select
                defaultValue="draft"
                options={[
                  { value: 'draft', label: '草稿' },
                  { value: 'scheduled', label: '定时发布' },
                ]}
              />
            </label>
            <label>
              <span>发布时间</span>
              <Input placeholder="发布时自动记录" disabled />
            </label>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">组织</span>
            <label>
              <span>分类</span>
              <Select placeholder="选择分类" options={[]} />
            </label>
            <label>
              <span>标签</span>
              <Select mode="tags" placeholder="输入标签" options={[]} />
            </label>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">展示</span>
            <Button block icon={<ImagePlus size={16} />}>选择封面</Button>
            <Checkbox>设为精选文章</Checkbox>
          </div>
          <Divider />
          <div className="settings-section">
            <span className="settings-section__label">SEO</span>
            <label>
              <span>页面路径</span>
              <Input prefix="/posts/" placeholder="article-slug" />
            </label>
            <Typography.Text type="secondary">搜索摘要默认使用文章摘要，可在后续版本单独配置。</Typography.Text>
          </div>
        </aside>
      </div>
    </div>
  )
}
