import { HashRouter, Routes, Route, Outlet } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { Sidebar } from './components/layout/Sidebar'
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

function AppLayout() {
  return (
    <div className="flex h-screen bg-bg-base overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
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
