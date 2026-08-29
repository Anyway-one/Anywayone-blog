import { useEffect, useMemo, useState } from 'react'
import { Avatar, Breadcrumb, Button, Drawer, Dropdown, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { Bell, ExternalLink, LogOut, Menu as MenuIcon, MoreHorizontal, Search } from 'lucide-react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { getSiteSettings, type SiteSettings } from '../api/site'
import BrandMark from '../components/BrandMark'
import {
  getRouteMeta,
  getSelectedMenuKey,
  navigationItems,
  type NavigationItem,
} from '../app/navigation'
import './admin-layout.css'

function toMenuItems(items: NavigationItem[]): MenuProps['items'] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    children: item.children ? toMenuItems(item.children) : undefined,
  }))
}

const menuItems = toMenuItems(navigationItems)
const webUrl = import.meta.env.VITE_WEB_URL || 'http://localhost:3000'

function SidebarContent({ onNavigate, siteSettings }: { onNavigate?: () => void; siteSettings: SiteSettings | null }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key.startsWith('/')) {
      navigate(key)
      onNavigate?.()
    }
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      onNavigate?.()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="sidebar-content">
      <div className="sidebar-content__brand">
        <BrandMark settings={siteSettings} />
      </div>

      <Menu
        aria-label="管理端主导航"
        className="sidebar-menu"
        theme="dark"
        mode="inline"
        items={menuItems}
        defaultOpenKeys={['content', 'photography', 'site']}
        selectedKeys={[getSelectedMenuKey(location.pathname)]}
        onClick={handleMenuClick}
        inlineIndent={16}
      />

      <div className="sidebar-account">
        <Avatar size={36} src={user?.avatarPublicUrl || '/brand/anywayone-mark.svg'} />
        <div className="sidebar-account__copy">
          <strong>{user?.displayName || 'Anywayone'}</strong>
          <span title={user?.email}>{user?.email || '站点管理员'}</span>
        </div>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'site', label: '查看展示端', icon: <ExternalLink size={16} /> },
              { type: 'divider' },
              {
                key: 'logout',
                label: loggingOut ? '正在退出…' : '退出登录',
                icon: <LogOut size={16} />,
                danger: true,
                disabled: loggingOut,
              },
            ],
            onClick: ({ key }) => {
              if (key === 'site') window.open(webUrl, '_blank', 'noopener,noreferrer')
              if (key === 'logout') void handleLogout()
            },
          }}
        >
          <Button
            className="sidebar-account__more"
            type="text"
            icon={<MoreHorizontal size={18} />}
            aria-label="打开账号菜单"
          />
        </Dropdown>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null)
  const meta = useMemo(() => getRouteMeta(location.pathname), [location.pathname])

  useEffect(() => {
    void getSiteSettings().then(setSiteSettings).catch(() => undefined)
  }, [])

  useEffect(() => {
    document.title = `${meta.title} · Anywayone Studio`
  }, [meta.title])

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="侧边栏">
        <SidebarContent siteSettings={siteSettings} />
      </aside>

      <Drawer
        className="admin-mobile-drawer"
        placement="left"
        size={320}
        closable={false}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <SidebarContent siteSettings={siteSettings} onNavigate={() => setDrawerOpen(false)} />
      </Drawer>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__start">
            <Button
              className="admin-topbar__menu"
              type="text"
              icon={<MenuIcon size={21} />}
              aria-label="打开导航菜单"
              onClick={() => setDrawerOpen(true)}
            />
            <Breadcrumb
              items={[
                { title: '工作台', onClick: () => navigate('/dashboard') },
                ...(meta.group ? [{ title: meta.group }] : []),
                ...(meta.title !== '概览' ? [{ title: meta.title }] : []),
              ]}
            />
          </div>

          <div className="admin-topbar__actions">
            <Tooltip title="全局搜索即将开放">
              <Button type="text" icon={<Search size={19} />} aria-label="搜索" />
            </Tooltip>
            <Tooltip title="暂无通知">
              <Button type="text" icon={<Bell size={19} />} aria-label="通知" />
            </Tooltip>
            <Tooltip title={user?.displayName || '站点管理员'}>
              <Avatar className="admin-topbar__avatar" size={34} src={user?.avatarPublicUrl || '/brand/anywayone-mark.svg'} />
            </Tooltip>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
