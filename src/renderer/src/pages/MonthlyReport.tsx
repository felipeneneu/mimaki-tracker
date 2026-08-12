import { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMonthlyReport } from '../hooks/useMonthlyReport'
import { StatCard } from '../components/ui/StatCard'
import { StatCardSkeleton } from '../components/ui/Skeleton'

const COLOR_MAP = [
  { key: 'cyanCc', label: 'Ciano', color: '#06b6d4' },
  { key: 'magentaCc', label: 'Magenta', color: '#ec4899' },
  { key: 'yellowCc', label: 'Amarelo', color: '#eab308' },
  { key: 'blackCc', label: 'Preto', color: '#1c1917' },
  { key: 'white1Cc', label: 'Branco 1', color: '#e2e8f0' },
  { key: 'white2Cc', label: 'Branco 2', color: '#cbd5e1' },
  { key: 'varnish1Cc', label: 'Verniz 1', color: '#818cf8' },
  { key: 'varnish2Cc', label: 'Verniz 2', color: '#6366f1' },
]

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return `${months[parseInt(m) - 1]} ${year}`
}

function getTextColor(bgColor: string): string {
  const hex = bgColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5 ? '#ffffff' : '#1c1917'
}

function CustomTooltip({ active, payload, label, activeBar }: any) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p: any) => {
    if (p.value == null || p.value === 0) return false
    if (activeBar && p.dataKey !== activeBar) return false
    return true
  })
  if (items.length === 0) return null

  return (
    <div style={{ backgroundColor: '#1e1830', borderColor: '#2d2545', borderRadius: '8px', padding: '8px 12px', border: '1px solid' }}>
      <p style={{ color: '#f0edf8', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{label}</p>
      {items.map((item: any) => (
        <p key={item.dataKey} style={{ color: getTextColor(item.color), fontSize: '11px', margin: '2px 0', backgroundColor: item.color, borderRadius: '4px', padding: '2px 6px' }}>
          {item.name}: {item.value.toFixed(2)} cc
        </p>
      ))}
    </div>
  )
}

export default function MonthlyReport() {
  const { data: report = [], isLoading } = useMonthlyReport()
  const [activeBar, setActiveBar] = useState<string | null>(null)

  const totalJobs = report.reduce((acc, r) => acc + r.jobCount, 0)
  const totalInk = report.reduce((acc, r) => acc + r.totalInkCc, 0)
  const totalPrintTimeH = report.reduce((acc, r) => acc + r.totalPrintTimeMs, 0) / 1000 / 3600

  const chartData = report.map(r => ({
    month: formatMonth(r.month),
    ...Object.fromEntries(COLOR_MAP.map(c => [c.label, r[c.key as keyof typeof r] as number]))
  }))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Relatório Mensal</h1>

      <div className="grid grid-cols-3 gap-5">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total de Jobs"
              value={totalJobs.toLocaleString('pt-BR')}
              subtext="Processados"
            />
            <StatCard
              title="Consumo Total"
              value={`${totalInk.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cc`}
              subtext="Todas as cores"
            />
            <StatCard
              title="Tempo de Máquina"
              value={`${totalPrintTimeH.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`}
              subtext="Imprimindo"
            />
          </>
        )}
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-xl p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Consumo Mensal por Cor</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2545" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip cursor={false} content={<CustomTooltip activeBar={activeBar} />} />
              <Legend />
              {COLOR_MAP.map(c => (
                <Bar
                  key={c.key}
                  dataKey={c.label}
                  fill={c.color}
                  fillOpacity={activeBar === null || activeBar === c.label ? 1 : 0.2}
                  onMouseEnter={() => setActiveBar(c.label)}
                  onMouseLeave={() => setActiveBar(null)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-bg-surface border border-bg-border rounded-xl p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Detalhamento por Mês</h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-text-muted border-b border-bg-border">
                <th className="pb-3 font-medium">Mês</th>
                <th className="pb-3 font-medium text-right">Jobs</th>
                <th className="pb-3 font-medium text-right">Total Tinta (cc)</th>
                <th className="pb-3 font-medium text-right">Tempo (h)</th>
              </tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.month} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="py-3 font-medium text-brand-pink">{formatMonth(r.month)}</td>
                  <td className="py-3 text-right">{r.jobCount}</td>
                  <td className="py-3 text-right tabular-nums">{r.totalInkCc.toFixed(2)}</td>
                  <td className="py-3 text-right tabular-nums">{(r.totalPrintTimeMs / 1000 / 3600).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
