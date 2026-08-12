import { Link, useLocation } from 'react-router-dom'

export function Sidebar() {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/jobs', label: 'Histórico de Jobs' },
    { path: '/reports/monthly', label: 'Relatório Mensal' },
    { path: '/settings', label: 'Configurações' },
  ]

  return (
    <aside className="w-64 bg-bg-surface border-r border-bg-border flex flex-col h-screen pt-[38px]">
      <div className="p-6 flex items-center gap-3 ">
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
          <a
            href="https://github.com/felipeneneu"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-[11px] text-text-muted hover:text-brand-pink transition-colors duration-200 group"
          >
            <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            GitHub
          </a>
          <p className="text-[9px] opacity-40 mt-2 font-mono">Shift+T — Terminal de Dev</p>
        </div>
      </div>
    </aside>
  )
}
