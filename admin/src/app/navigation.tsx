import type { ReactNode } from 'react'
import {
  Aperture,
  BookOpenText,
  CircleUserRound,
  FilePlus2,
  FolderKanban,
  ImagePlus,
  Images,
  History,
  LayoutDashboard,
  Library,
  Mail,
  Settings,
  Share2,
  Tags,
  Users,
} from 'lucide-react'

export interface NavigationItem {
  key: string
  label: string
  icon?: ReactNode
  children?: NavigationItem[]
}

const icon = (Icon: typeof LayoutDashboard) => <Icon aria-hidden="true" size={18} />

export const navigationItems: NavigationItem[] = [
  {
    key: '/dashboard',
    label: '概览',
    icon: icon(LayoutDashboard),
  },
  {
    key: 'content',
    label: '内容管理',
    icon: icon(BookOpenText),
    children: [
      { key: '/posts', label: '全部文章', icon: icon(Library) },
      { key: '/posts/new', label: '新建文章', icon: icon(FilePlus2) },
      { key: '/taxonomy', label: '分类与标签', icon: icon(Tags) },
    ],
  },
  {
    key: 'photography',
    label: '摄影管理',
    icon: icon(Aperture),
    children: [
      { key: '/photography', label: '摄影集', icon: icon(Images) },
      { key: '/photography/new', label: '新建摄影集', icon: icon(ImagePlus) },
      { key: '/media', label: '媒体库', icon: icon(FolderKanban) },
    ],
  },
  {
    key: 'site',
    label: '站点管理',
    icon: icon(Settings),
    children: [
      { key: '/profile', label: '个人资料', icon: icon(CircleUserRound) },
      { key: '/contact', label: '联系方式', icon: icon(Mail) },
      { key: '/social', label: '社交平台', icon: icon(Share2) },
      { key: '/history', label: '站点纪事', icon: icon(History) },
      { key: '/settings', label: '站点设置', icon: icon(Settings) },
      { key: '/users', label: '用户管理', icon: icon(Users) },
    ],
  },
]

export const routeMeta: Record<string, { title: string; group?: string }> = {
  '/dashboard': { title: '概览' },
  '/posts': { title: '全部文章', group: '内容管理' },
  '/posts/new': { title: '新建文章', group: '内容管理' },
  '/taxonomy': { title: '分类与标签', group: '内容管理' },
  '/photography': { title: '摄影集', group: '摄影管理' },
  '/photography/new': { title: '新建摄影集', group: '摄影管理' },
  '/media': { title: '媒体库', group: '摄影管理' },
  '/profile': { title: '个人资料', group: '站点管理' },
  '/contact': { title: '联系方式', group: '站点管理' },
  '/social': { title: '社交平台', group: '站点管理' },
  '/history': { title: '站点纪事', group: '站点管理' },
  '/settings': { title: '站点设置', group: '站点管理' },
  '/users': { title: '用户管理', group: '站点管理' },
}

export function getRouteMeta(pathname: string) {
  if (/^\/posts\/[^/]+\/edit$/.test(pathname)) {
    return { title: '编辑文章', group: '内容管理' }
  }
  if (/^\/photography\/[^/]+\/edit$/.test(pathname)) {
    return { title: '编辑摄影集', group: '摄影管理' }
  }
  return routeMeta[pathname] ?? { title: 'Anywayone Studio' }
}

export function getSelectedMenuKey(pathname: string) {
  if (pathname.startsWith('/posts/') && pathname !== '/posts/new') return '/posts'
  if (pathname.startsWith('/photography/') && pathname !== '/photography/new') {
    return '/photography'
  }
  return pathname
}
