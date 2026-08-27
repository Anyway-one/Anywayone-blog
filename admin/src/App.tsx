import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAnonymous, RequireAuth } from './auth/AuthRoutes'
import AdminLayout from './layouts/AdminLayout'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const PostEditorPage = lazy(() => import('./pages/PostEditorPage'))
const PostsPage = lazy(() => import('./pages/PostsPage'))
const PhotographyEditorPage = lazy(() => import('./pages/PhotographyEditorPage'))
const PhotographyPage = lazy(() => import('./pages/PhotographyPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const TaxonomyPage = lazy(() => import('./pages/TaxonomyPage'))
const MediaPage = lazy(() => import('./pages/MediaPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))

export default function App() {
  return (
    <Suspense fallback={<div className="route-loading" role="status">正在加载…</div>}>
      <Routes>
        <Route element={<RequireAnonymous />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/posts" element={<PostsPage />} />
            <Route path="/posts/new" element={<PostEditorPage />} />
            <Route path="/posts/:postId/edit" element={<PostEditorPage />} />
            <Route path="/taxonomy" element={<TaxonomyPage />} />
            <Route path="/photography" element={<PhotographyPage />} />
            <Route path="/photography/new" element={<PhotographyEditorPage />} />
            <Route path="/photography/:albumId/edit" element={<PhotographyEditorPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="/profile" element={<SettingsPage section="profile" />} />
            <Route path="/contact" element={<SettingsPage section="contact" />} />
            <Route path="/settings" element={<SettingsPage section="site" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
