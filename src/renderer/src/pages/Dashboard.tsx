import { Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts'
import { StatCard } from '../components/ui/StatCard'
import { StatCardSkeleton, CardSkeleton } from '../components/ui/Skeleton'
import { useDashboard } from '../hooks/useDashboard'

export default function Dashboard() {
  const { data: jobs = [], isLoading } = useDashboard()

  const totalInk = jobs.reduce((acc, job) => acc + (job.inkTotalCc ?? 0), 0)

  const cyanCc = jobs.reduce((acc, job) => acc + (job.inkCyanCc ?? 0), 0)
  const magentaCc = jobs.reduce((acc, job) => acc + (job.inkMagentaCc ?? 0), 0)
  const yellowCc = jobs.reduce((acc, job) => acc + (job.inkYellowCc ?? 0), 0)
  const blackCc = jobs.reduce((acc, job) => acc + (job.inkBlackCc ?? 0), 0)
  const white1Cc = jobs.reduce((acc, job) => acc + (job.inkWhite1Cc ?? 0), 0)
  const white2Cc = jobs.reduce((acc, job) => acc + (job.inkWhite2Cc ?? 0), 0)
  const varnish1Cc = jobs.reduce((acc, job) => acc + (job.inkVarnish1Cc ?? 0), 0)
  const varnish2Cc = jobs.reduce((acc, job) => acc + (job.inkVarnish2Cc ?? 0), 0)

  const printTimeMs = jobs.reduce((acc, job) => acc + (job.printTimeMs ?? 0), 0)
  const printTimeHours = printTimeMs / 1000 / 3600

  const pieData = [
    { name: 'Ciano', value: cyanCc, color: '#06b6d4' },
    { name: 'Magenta', value: magentaCc, color: '#ec4899' },
    { name: 'Amarelo', value: yellowCc, color: '#eab308' },
    { name: 'Preto', value: blackCc, color: '#1c1917' },
    { name: 'Branco 1', value: white1Cc, color: '#e2e8f0' },
    { name: 'Branco 2', value: white2Cc, color: '#cbd5e1' },
    { name: 'Verniz 1', value: varnish1Cc, color: '#818cf8' },
    { name: 'Verniz 2', value: varnish2Cc, color: '#6366f1' }
  ].filter(d => d.value > 0)

  const recentJobs = jobs.slice(0, 7)

  return (
    <>
      <div className="p-8 space-y-6">

        <div className="grid grid-cols-2 gap-5">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                title="Tinta Consumida"
                value={`${totalInk.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cc`}
                subtext="Todos os canais"
              />
              <StatCard
                title="Tempo de Máquina"
                value={`${printTimeHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h`}
                subtext="Imprimindo"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <CardSkeleton className="col-span-1" />
              <CardSkeleton className="col-span-2" />
            </>
          ) : (
            <>
              <div className="col-span-1 bg-bg-surface border border-bg-border rounded-xl p-5 shadow-lg shadow-black/20">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Consumo por Cor de Tinta (30d)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e1830', borderColor: '#2d2545', borderRadius: '8px' }}
                        itemStyle={{ color: '#f0edf8' }}
                        formatter={(val: number, name: string) => [`${val.toFixed(2)} cc`, name]}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        formatter={(value) => <span className="text-[11px] text-text-muted">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-2 bg-bg-surface border border-bg-border rounded-xl p-5 flex flex-col shadow-lg shadow-black/20">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Produção Recente</h3>
                </div>

                <div className="flex-1 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-text-muted border-b border-bg-border">
                        <th className="pb-3 font-medium">Pedido</th>
                        <th className="pb-3 font-medium">Arquivo</th>
                        <th className="pb-3 font-medium text-right">Tinta (cc)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.length === 0 ? (
                        <tr><td colSpan={3} className="text-center py-6 text-text-dim">Nenhum job sincronizado.</td></tr>
                      ) : (
                        recentJobs.map(job => (
                          <tr key={job.id} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors duration-200">
                            <td className="py-3 font-medium text-brand-pink">{job.orderCode ?? '—'}</td>
                            <td className="py-3 text-text-primary truncate max-w-[200px]" title={job.jobName}>{job.jobName}</td>
                            <td className="py-3 text-right tabular-nums">{job.inkTotalCc?.toFixed(2) ?? '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </>
  )
}
