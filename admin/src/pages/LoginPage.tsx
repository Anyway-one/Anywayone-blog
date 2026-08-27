import { useEffect, useState } from 'react'
import { Alert, Button, Form, Input } from 'antd'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { LoginInput } from '../api/auth'
import { ApiError } from '../api/http'
import { useAuth } from '../auth/AuthContext'
import BrandMark from '../components/BrandMark'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    document.title = '登录 · Anywayone Studio'
  }, [])

  const handleSubmit = async (values: LoginInput) => {
    setSubmitting(true)
    setErrorMessage(null)
    try {
      await login(values)
      const requestedPath = (location.state as { from?: unknown } | null)?.from
      const destination =
        typeof requestedPath === 'string' && requestedPath.startsWith('/') && !requestedPath.startsWith('//')
          ? requestedPath
          : '/dashboard'
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : '登录失败，请稍后重试。',
      )
    } finally {
      setSubmitting(false)
    }
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

          {errorMessage && (
            <Alert
              type="error"
              showIcon
              title="无法登录"
              description={errorMessage}
              closable
              onClose={() => setErrorMessage(null)}
            />
          )}

          <Form<LoginInput> layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入管理员邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                prefix={<Mail size={17} />}
                autoComplete="username"
                autoFocus
                disabled={submitting}
              />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少需要 8 个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockKeyhole size={17} />}
                autoComplete="current-password"
                disabled={submitting}
              />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              icon={<ArrowRight size={17} />}
              iconPlacement="end"
              loading={submitting}
            >
              登录
            </Button>
          </Form>
        </div>
      </section>
    </main>
  )
}
