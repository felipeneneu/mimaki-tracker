import { HashRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { TitleBar } from './components/layout/TitleBar'
import { TopBar } from './components/layout/TopBar'
import { DevTerminal } from './components/dev/DevTerminal'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const JobsList = lazy(() => import('./pages/JobsList'))
const JobDetail = lazy(() => import('./pages/JobDetail'))
const Settings = lazy(() => import('./pages/Settings'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-brand-purple border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Carregando...</span>
      </div>
    </div>
  )
}

const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/jobs': 'Histórico de Jobs',
  '/settings': 'Configurações',
}

function AppLayout() {
  const { pathname } = useLocation()
  const title = pathname.startsWith('/jobs/') ? 'Detalhe do Job' : routeTitles[pathname] ?? ''

  return (
    <div className="flex h-screen bg-bg-base overflow-hidden rounded-xl">
      <TitleBar />
      <Sidebar />
      <TopBar title={title} />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto pt-[102px]">
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <DevTerminal />
    </div>
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<JobsList />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App
