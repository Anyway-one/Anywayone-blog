import { useEffect, useRef, useState } from 'react'
import { Alert, Avatar, Button, Form, Input, Modal, Select, Spin, Table, Tag, message } from 'antd'
import type { TableProps } from 'antd'
import { ImagePlus, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { uploadMedia } from '../api/media'
import { createUser, listUsers, updateUser, type AdminUser, type UserStatus } from '../api/users'
import PageHeader from '../components/PageHeader'

type UserFormValues = {
  email: string
  displayName: string
  password?: string
  status: UserStatus
}

const statusLabels: Record<UserStatus, string> = { ACTIVE: '启用中', LOCKED: '已锁定', DISABLED: '已停用' }
const statusColors: Record<UserStatus, string> = { ACTIVE: 'green', LOCKED: 'gold', DISABLED: 'default' }
const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
})

function formatDate(value: string | null) {
  return value ? dateTimeFormatter.format(new Date(value)) : '从未登录'
}

export default function UsersPage() {
  const [form] = Form.useForm<UserFormValues>()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [avatar, setAvatar] = useState({ id: null as string | null, url: null as string | null })
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [messageApi, contextHolder] = message.useMessage()
  const isEditing = Boolean(editing)

  useEffect(() => {
    void listUsers()
      .then(setUsers)
      .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : '用户列表加载失败。'))
      .finally(() => setLoading(false))
  }, [reloadKey])

  const reload = () => {
    setLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  const openCreate = () => {
    setEditing(null)
    setAvatar({ id: null, url: null })
    form.resetFields()
    form.setFieldsValue({ status: 'ACTIVE' })
    setModalOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditing(user)
    setAvatar({ id: user.avatarMediaId, url: user.avatarPublicUrl })
    form.setFieldsValue({ email: user.email, displayName: user.displayName, password: undefined, status: user.status })
    setModalOpen(true)
  }

  const uploadAvatar = async (file: File) => {
    setUploadingAvatar(true)
    try {
      const media = await uploadMedia(file)
      setAvatar({ id: media.id, url: media.publicUrl })
      void messageApi.success('头像已上传，请保存用户信息')
    } catch (uploadError: unknown) {
      void messageApi.error(uploadError instanceof Error ? uploadError.message : '头像上传失败。')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  const save = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      if (editing) {
        await updateUser(editing.id, {
          email: values.email.trim(), displayName: values.displayName.trim(), password: values.password?.trim() || undefined, status: values.status, avatarMediaId: avatar.id,
        })
        void messageApi.success('用户信息已更新')
      } else {
        await createUser({ email: values.email.trim(), displayName: values.displayName.trim(), password: values.password?.trim() ?? '', avatarMediaId: avatar.id })
        void messageApi.success('用户已创建')
      }
      setModalOpen(false)
      setReloadKey((key) => key + 1)
    } catch (saveError: unknown) {
      if (saveError && typeof saveError === 'object' && 'errorFields' in saveError) return
      void messageApi.error(saveError instanceof Error ? saveError.message : '保存用户失败。')
    } finally {
      setSaving(false)
    }
  }

  const columns: TableProps<AdminUser>['columns'] = [
    {
      title: '用户', key: 'user', render: (_, user) => (
        <div className="user-table__identity">
          <Avatar src={user.avatarPublicUrl || '/brand/anywayone-mark.svg'} icon={<UserRound size={16} />} />
          <div><strong>{user.displayName}</strong><span>{user.email}</span></div>
        </div>
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 110, render: (status: UserStatus) => <Tag color={statusColors[status]}>{statusLabels[status]}</Tag> },
    { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 180, render: (value: string | null) => <span className="user-table__muted">{formatDate(value)}</span> },
    { title: '操作', key: 'actions', width: 88, render: (_, user) => <Button type="text" icon={<Pencil size={16} />} aria-label={`编辑${user.displayName}`} onClick={() => openEdit(user)} /> },
  ]

  return (
    <div className="page-stack users-page">
      {contextHolder}
      <PageHeader eyebrow="SITE / USERS" title="用户管理" description="管理可以登录管理端的账号，支持新增用户、修改邮箱和重置密码。" actions={<div className="page-heading__actions-group"><Button icon={<RefreshCw size={16} />} onClick={reload}>刷新</Button><Button type="primary" icon={<Plus size={17} />} onClick={openCreate}>新增用户</Button></div>} />
      <section className="surface-panel users-panel">
        {error ? <div className="list-feedback"><Alert type="error" showIcon message="无法加载用户" description={error} action={<Button icon={<RefreshCw size={15} />} onClick={reload}>重试</Button>} /></div> : <Spin spinning={loading}><Table<AdminUser> rowKey="id" columns={columns} dataSource={users} pagination={false} locale={{ emptyText: '还没有用户' }} /></Spin>}
      </section>
      <Modal open={modalOpen} title={isEditing ? '编辑用户' : '新增用户'} okText="保存" cancelText="取消" confirmLoading={saving} onOk={() => void save()} onCancel={() => { if (!saving) setModalOpen(false) }} destroyOnHidden>
        <Form form={form} layout="vertical" requiredMark="optional">
          <div className="user-avatar-editor">
            <Avatar size={72} src={avatar.url || '/brand/anywayone-mark.svg'} icon={<UserRound size={24} />} />
            <div className="user-avatar-editor__copy">
              <strong>头像</strong>
              <span>用于侧边栏和账号列表展示。</span>
              <div className="user-avatar-editor__actions">
                <input ref={avatarInputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file) }} />
                <Button icon={<ImagePlus size={15} />} loading={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>{avatar.url ? '更换头像' : '上传头像'}</Button>
                {avatar.id && <Button type="text" danger icon={<Trash2 size={15} />} onClick={() => setAvatar({ id: null, url: null })}>移除</Button>}
              </div>
            </div>
          </div>
          <Form.Item name="displayName" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }, { max: 100, message: '显示名称不能超过 100 个字符' }]}><Input prefix={<UserRound size={16} />} placeholder="例如：Anywayone" autoFocus /></Form.Item>
          <Form.Item name="email" label="登录邮箱" rules={[{ required: true, message: '请输入邮箱' }, { type: 'email', message: '请输入有效的邮箱地址' }]}><Input prefix={<ShieldCheck size={16} />} autoComplete="username" /></Form.Item>
          <Form.Item name="password" label={isEditing ? '新密码（留空则不修改）' : '密码'} rules={[{ required: !isEditing, message: '请输入密码' }, { min: 12, message: '密码至少需要 12 个字符' }]}><Input.Password prefix={<KeyRound size={16} />} autoComplete="new-password" placeholder={isEditing ? '留空保持当前密码' : '至少 12 个字符'} /></Form.Item>
          {isEditing && <Form.Item name="status" label="账号状态" rules={[{ required: true }]}><Select options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} /></Form.Item>}
        </Form>
      </Modal>
    </div>
  )
}
