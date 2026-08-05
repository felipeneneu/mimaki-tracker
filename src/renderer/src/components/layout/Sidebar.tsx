import { Link, useLocation } from 'react-router-dom'

export function Sidebar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/jobs', label: 'Histórico de Jobs' },
    { path: '/settings', label: 'Configurações' },
  ]

  return (
    <aside className="w-64 bg-bg-surface border-r border-bg-border flex flex-col h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-bg-border/50">
        <img src="./images/logo-64x64.png" alt="DPI Mimaki" className="w-8 h-8 rounded shadow-[0_0_15px_rgba(82,37,130,0.5)]" />
        <div>
          <h1 className="font-bold text-text-primary tracking-tight leading-tight">DPI Mimaki</h1>
          <p className="text-[10px] text-brand-pink uppercase tracking-widest font-semibold">Tracker</p>
        </div>
      </div>

      <nav className="flex-1 p-4 flex flex-col gap-1">
        {navItems.map(item => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-brand-purple/15 text-brand-pink'
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-bg-border/50 space-y-3">
        <div className="bg-bg-base rounded-lg p-3 text-xs text-text-muted border border-bg-border">
          <p className="mb-1 text-text-primary font-semibold">Suporte</p>
          <p className="text-[11px] opacity-80 mb-2">Software interno para cálculo de custos e volumetria.</p>
          <p className="text-[10px] opacity-60 mb-1">Desenvolvido por Felipe Neneu</p>
          <a href="https://github.com/felipeneneu" target="_blank" rel="noopener noreferrer" className="text-[10px] opacity-60 hover:text-brand-pink transition-colors duration-200">
            github.com/felipeneneu
          </a>
          <p className="text-[9px] opacity-40 mt-2 font-mono">Shift+T — Terminal de Dev</p>
        </div>
      </div>
    </aside>
  )
}
