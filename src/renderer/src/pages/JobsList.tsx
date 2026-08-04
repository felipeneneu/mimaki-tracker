import { TopBar } from '../components/layout/TopBar'
import { Badge } from '../components/ui/Badge'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { JobRow } from '../types'

export function JobsList() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [search, setSearch] = useState('')
  const [prices, setPrices] = useState({ cmyk: 0, white: 0, varnish: 0, machine: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const loadData = () => {
    window.api.jobsList({ search }).then(setJobs)
  }

  useEffect(() => {
    loadData()
  }, [search])

  useEffect(() => {
    window.api.settingsGet().then(s => {
      setPrices({
        cmyk: parseFloat(s.ink_price_per_cc_cmyk || '0'),
        white: parseFloat(s.ink_price_per_cc_white || '0'),
        varnish: parseFloat(s.ink_price_per_cc_varnish || '0'),
        machine: parseFloat(s.machine_cost_per_hour || '0')
      })
    })
  }, [])

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await window.api.exportExcel({})
      alert(`Excel salvo em: ${res.filePath}`)
    } catch (e: any) {
      alert(`Erro: ${e.message}`)
    } finally {
      setIsExporting(false)
    }
  }

  const calcCost = (job: JobRow) => {
    const cmyk = (job.ink_cyan_cc??0) + (job.ink_magenta_cc??0) + (job.ink_yellow_cc??0) + (job.ink_black_cc??0)
    const white = (job.ink_white1_cc??0) + (job.ink_white2_cc??0)
    const varnish = (job.ink_varnish1_cc??0) + (job.ink_varnish2_cc??0)
    
    const inkCost = (cmyk * prices.cmyk) + (white * prices.white) + (varnish * prices.varnish)
    const machineCost = ((job.print_time_ms??0) / 1000 / 3600) * prices.machine

    return inkCost + machineCost
  }

  return (
    <>
      <TopBar title="Histórico de Jobs" />
      <div className="p-8 flex-1 flex flex-col min-h-0">
        
        <div className="flex justify-between items-center mb-6">
          <input 
            type="text" 
            placeholder="Buscar por pedido ou arquivo..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-80 bg-bg-surface border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors placeholder:text-text-dim"
          />
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-bg-elevated hover:bg-bg-border border border-bg-border text-text-primary text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>

        <div className="flex-1 bg-bg-surface border border-bg-border rounded-xl overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-bg-elevated sticky top-0">
                <tr className="text-text-muted border-b border-bg-border">
                  <th className="px-4 py-3 font-medium">Data (Spool)</th>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Arquivo</th>
                  <th className="px-4 py-3 font-medium text-right">Dimensões</th>
                  <th className="px-4 py-3 font-medium text-right">Tinta (cc)</th>
                  <th className="px-4 py-3 font-medium text-right">Custo Est.</th>
                  <th className="px-4 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="border-b border-bg-border/50 hover:bg-bg-elevated/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-text-muted">
                      {job.spool_date ? new Date(job.spool_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-pink">{job.order_code ?? '—'}</td>
                    <td className="px-4 py-2.5 text-text-primary max-w-[250px] truncate" title={job.job_name}>{job.job_name}</td>
                    <td className="px-4 py-2.5 text-right text-text-muted tabular-nums">
                      {job.width_mm && job.height_mm ? `${job.width_mm.toFixed(0)} × ${job.height_mm.toFixed(0)} mm` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-text-primary">{job.ink_total_cc?.toFixed(2) ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                      {calcCost(job).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {job.synced_to_api 
                        ? <Badge variant="success">OK</Badge>
                        : <Badge variant="default">Pend.</Badge>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
