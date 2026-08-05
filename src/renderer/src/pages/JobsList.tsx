import { TopBar } from '../components/layout/TopBar'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useJobs } from '../hooks/useJobs'
import { TableRowSkeleton } from '../components/ui/Skeleton'
import { toast } from 'sonner'
import type { JobRow } from '../types'

export default function JobsList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [inkMin, setInkMin] = useState('')
  const [inkMax, setInkMax] = useState('')
  const [prices, setPrices] = useState({ cmyk: 0, white: 0, varnish: 0, machine: 0 })
  const [isExporting, setIsExporting] = useState(false)

  const filters: any = {}
  if (search) filters.search = search
  if (startDate) filters.startDate = startDate
  if (endDate) filters.endDate = endDate
  if (inkMin) filters.inkMin = parseFloat(inkMin)
  if (inkMax) filters.inkMax = parseFloat(inkMax)

  const { data: jobs = [], isLoading } = useJobs(Object.keys(filters).length > 0 ? filters : undefined)

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
      toast.success('Excel exportado com sucesso!', { description: res.filePath })
    } catch (e: any) {
      if (!e.message?.includes('cancelada')) {
        toast.error('Erro ao exportar', { description: e.message })
      }
    } finally {
      setIsExporting(false)
    }
  }

  const calcCost = (job: JobRow) => {
    const cmyk = (job.ink_cyan_cc ?? 0) + (job.ink_magenta_cc ?? 0) + (job.ink_yellow_cc ?? 0) + (job.ink_black_cc ?? 0)
    const white = (job.ink_white1_cc ?? 0) + (job.ink_white2_cc ?? 0)
    const varnish = (job.ink_varnish1_cc ?? 0) + (job.ink_varnish2_cc ?? 0)

    const inkCost = (cmyk * prices.cmyk) + (white * prices.white) + (varnish * prices.varnish)
    const machineCost = ((job.print_time_ms ?? 0) / 1000 / 3600) * prices.machine

    return inkCost + machineCost
  }

  const clearFilters = () => {
    setSearch('')
    setStartDate('')
    setEndDate('')
    setInkMin('')
    setInkMax('')
  }

  return (
    <>
      <TopBar title="Histórico de Jobs" />
      <div className="p-8 flex-1 flex flex-col min-h-0">

        <div className="flex flex-wrap items-end gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por pedido ou arquivo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-72 bg-bg-surface border border-bg-border rounded-md px-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200 placeholder:text-text-dim"
          />
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-dim uppercase tracking-wider">Data início</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-bg-surface border border-bg-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-dim uppercase tracking-wider">Data fim</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-bg-surface border border-bg-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-dim uppercase tracking-wider">Tinta mín (cc)</label>
            <input
              type="number" step="0.01" min="0"
              value={inkMin}
              onChange={e => setInkMin(e.target.value)}
              className="w-24 bg-bg-surface border border-bg-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-dim uppercase tracking-wider">Tinta máx (cc)</label>
            <input
              type="number" step="0.01" min="0"
              value={inkMax}
              onChange={e => setInkMax(e.target.value)}
              className="w-24 bg-bg-surface border border-bg-border rounded-md px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-purple transition-colors duration-200"
            />
          </div>
          {(search || startDate || endDate || inkMin || inkMax) && (
            <button
              onClick={clearFilters}
              className="text-xs text-brand-pink hover:text-brand-pink/80 font-medium py-2 transition-colors duration-200"
            >
              Limpar filtros
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-bg-elevated hover:bg-bg-border border border-bg-border text-text-primary text-sm font-medium px-4 py-2 rounded-md transition-colors duration-200"
          >
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        </div>

        <div className="flex-1 bg-bg-surface border border-bg-border rounded-xl overflow-hidden flex flex-col shadow-lg shadow-black/20">
          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-bg-elevated sticky top-0">
                <tr className="text-text-muted border-b border-bg-border">
                  <th className="px-4 py-3 font-medium">Data (Spool)</th>
                  <th className="px-4 py-3 font-medium">Pedido</th>
                  <th className="px-4 py-3 font-medium">Arquivo</th>
                  <th className="px-4 py-3 font-medium text-right">Dimensões</th>
                  <th className="px-4 py-3 font-medium text-right">Tinta (cc)</th>
                  <th className="px-4 py-3 font-medium text-center">Res.</th>
                  <th className="px-4 py-3 font-medium text-center">Pass</th>
                  <th className="px-4 py-3 font-medium text-center">Direção</th>
                  <th className="px-4 py-3 font-medium text-right">Custo Est.</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={9} />)
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-text-dim">
                      Nenhum job encontrado.
                    </td>
                  </tr>
                ) : (
                  jobs.map(job => (
                    <tr
                      key={job.id}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                      className="border-b border-bg-border/50 hover:bg-bg-elevated/50 cursor-pointer transition-colors duration-200"
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
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                        {job.resolution_dpi ? `${job.resolution_dpi}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center tabular-nums text-text-muted">
                        {job.pass_count ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-text-muted">
                        {job.print_direction === 'bidirecional' ? 'Bidir.' : job.print_direction === 'unidirecional' ? 'Unidir.' : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-text-primary">
                        {calcCost(job).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
