import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  subtext?: string
  icon?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
}

export function StatCard({ title, value, subtext, icon, trend, trendValue }: StatCardProps) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-5 flex flex-col items-center text-center hover:border-brand-purple/50 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {icon && <div className="text-brand-pink/80">{icon}</div>}
        <h3 className="text-text-muted text-sm font-medium">{title}</h3>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-text-primary tracking-tight">{value}</span>
        {trendValue && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
              trend === 'up'
                ? 'bg-success/10 text-success'
                : trend === 'down'
                ? 'bg-error/10 text-error'
                : 'bg-text-dim text-text-muted'
            }`}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'} {trendValue}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-text-dim mt-2 font-medium">{subtext}</p>}
    </div>
  )
}
