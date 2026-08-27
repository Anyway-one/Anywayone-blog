import { useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { ArrowRight, LockKeyhole, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import BrandMark from '../components/BrandMark'

export default function LoginPage() {
  const navigate = useNavigate()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    setSubmitted(true)
  }

  return (
    <main className="login-page">
      <section className="login-brand" aria-label="Anywayone 品牌区">
        <BrandMark />
        <div className="login-brand__copy">
          <span>ANYWAY, BE YOUR ONE.</span>
          <h1>让每一次表达，<br />都有自己的样子。</h1>
        </div>
        <p>ANYWAYONE CONTENT STUDIO · ADMIN</p>
      </section>

      <section className="login-form-wrap">
        <div className="login-form">
          <span className="page-heading__eyebrow">WELCOME BACK</span>
          <h2>登录管理端</h2>
          <p>使用站点管理员账号继续。</p>

          {submitted && (
            <Alert
              type="info"
              showIcon
              message="登录接口尚未接入"
              description="当前可进入界面预览；正式鉴权将在 FastAPI 开发阶段完成。"
            />
          )}

          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item label="管理员账号" name="username" rules={[{ required: true, message: '请输入管理员账号' }]}>
              <Input prefix={<UserRound size={17} />} autoComplete="username" />
            </Form.Item>
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockKeyhole size={17} />} autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block icon={<ArrowRight size={17} />} iconPlacement="end">
              登录
            </Button>
          </Form>

          <Button className="login-preview" type="link" onClick={() => navigate('/dashboard')}>
            暂不登录，预览工作台
          </Button>
        </div>
      </section>
    </main>
  )
}
