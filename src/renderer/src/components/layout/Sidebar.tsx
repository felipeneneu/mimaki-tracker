import { Link, useLocation } from 'react-router-dom'

export function Sidebar() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard'},
    { path: '/jobs', label: 'Histórico de Jobs'},
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
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-brand-purple/15 text-brand-pink' 
                  : 'text-text-muted hover:bg-bg-elevated hover:text-text-primary'
              }`}
            >
              <span className={isActive ? 'opacity-100' : 'opacity-70'}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-bg-border/50">
        <div className="bg-bg-base rounded-lg p-3 text-xs text-text-muted border border-bg-border">
          <p className="mb-1 text-text-primary font-semibold">Suporte</p>
          <p className="text-[11px] opacity-80">Software interno para cálculo de custos e volumetria.</p>
        </div>
      </div>
    </aside>
  )
}
