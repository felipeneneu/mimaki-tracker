import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CardSkeleton } from '../components/ui/Skeleton'

function formatMs(ms: number | null): string {
  if (ms == null) return '—'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}min ${sec}s` : `${sec}s`
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => window.api.jobsGetById(Number(id)),
    enabled: !!id,
  })

  if (isLoading) {
    return (
      <>
        <div className="p-8 space-y-6 max-w-5xl">
          <CardSkeleton />
          <CardSkeleton />
          <div className="grid grid-cols-2 gap-4">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </>
    )
  }

  if (!job) {
    return (
      <>
        <div className="p-8 flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-text-muted">Job não encontrado.</p>
          <button
            onClick={() => navigate('/jobs')}
            className="text-brand-pink hover:underline text-sm transition-colors duration-200"
          >
            Voltar para a lista
          </button>
        </div>
      </>
    )
  }

  const inkRows = [
    { label: 'Ciano (C)', value: job.inkCyanCc, color: 'bg-cyan-500' },
    { label: 'Magenta (M)', value: job.inkMagentaCc, color: 'bg-pink-500' },
    { label: 'Amarelo (Y)', value: job.inkYellowCc, color: 'bg-yellow-400' },
    { label: 'Preto (K)', value: job.inkBlackCc, color: 'bg-stone-800' },
    { label: 'Branco 1 (B)', value: job.inkWhite1Cc, color: 'bg-slate-200' },
    { label: 'Branco 2 (B2)', value: job.inkWhite2Cc, color: 'bg-slate-400' },
    { label: 'Verniz 1 (V)', value: job.inkVarnish1Cc, color: 'bg-indigo-400' },
    { label: 'Verniz 2 (V3)', value: job.inkVarnish2Cc, color: 'bg-indigo-600' }
  ]

  const handleExportReadme = async () => {
    try {
      const result = await window.api.exportReadme(job.id)
      if (result.success) {
        toast.success(`README.txt exportado para: ${result.filePath}`)
      } else if (result.error !== 'Cancelado pelo usuário') {
        toast.error(result.error)
      }
    } catch {
      toast.error('Erro ao exportar README')
    }
  }

  return (
    <>
      <div className="p-8 space-y-6 max-w-5xl">
        <button
          onClick={() => navigate('/jobs')}
          className="text-sm text-text-muted hover:text-brand-pink transition-colors duration-200 flex items-center gap-1"
        >
          ← Voltar para a lista
        </button>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-text-primary truncate" title={job.jobName}>
                {job.jobName}
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Pedido: <span className="text-brand-pink font-medium">{job.orderCode ?? '—'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-text-dim text-xs mb-1">Data (Spool)</p>
              <p className="text-text-primary">
                {job.spoolDate
                  ? new Date(job.spoolDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Dimensões</p>
              <p className="text-text-primary">
                {job.widthMm && job.heightMm
                  ? `${job.widthMm.toFixed(0)} × ${job.heightMm.toFixed(0)} mm`
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Quantidade</p>
              <p className="text-text-primary">{job.quantityUnits ?? '—'} unid.</p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Páginas</p>
              <p className="text-text-primary">{job.pages ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Consumo de Tinta</h3>

          <div className="grid grid-cols-4 gap-3">
            {inkRows.map(row => (
              <div key={row.label} className="flex items-center gap-3 bg-bg-base rounded-lg px-4 py-3 transition-colors duration-200 hover:bg-bg-elevated">
                <div className={`w-3 h-3 rounded-full ${row.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-[11px] text-text-dim truncate">{row.label}</p>
                  <p className="text-sm font-medium text-text-primary tabular-nums">
                    {row.value != null ? `${row.value.toFixed(3)} cc` : '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-bg-border flex items-center justify-between">
            <span className="text-sm font-semibold text-text-primary">Total</span>
            <span className="text-lg font-bold text-brand-pink tabular-nums">
              {job.inkTotalCc != null ? `${job.inkTotalCc.toFixed(3)} cc` : '—'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Tempo de Impressão</h3>
            <p className="text-2xl font-bold text-text-primary tabular-nums">
              {formatMs(job.printTimeMs)}
            </p>
          </div>
          <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
            <h3 className="text-sm font-semibold text-text-primary mb-2">Tempo de RIP</h3>
            <p className="text-2xl font-bold text-text-primary tabular-nums">
              {formatMs(job.ripTimeMs)}
            </p>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Informações de Impressão</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-text-dim text-xs mb-1">Cópias</p>
              <p className="text-text-primary font-medium">{job.copyNumber ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Passadas</p>
              <p className="text-text-primary font-medium">{job.passCount ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Resolução (DPI)</p>
              <p className="text-text-primary font-medium">{job.resolutionDpi ?? '—'}</p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Direção</p>
              <p className="text-text-primary font-medium">
                {job.printDirection === 'bidirecional' ? 'Bidirecional' : job.printDirection === 'unidirecional' ? 'Unidirecional' : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-lg shadow-black/20">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Informações Técnicas</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-text-dim text-xs mb-1">ID da Pasta</p>
              <p className="text-text-primary font-mono">{job.folderTimestamp}</p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Última Impressão</p>
              <p className="text-text-primary">
                {job.lastPrintDate
                  ? new Date(job.lastPrintDate).toLocaleString('pt-BR')
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">XML Original</p>
              <p className="text-text-primary font-mono text-xs truncate" title={job.rawXmlPath ?? ''}>
                {job.rawXmlPath ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-text-dim text-xs mb-1">Criado em</p>
              <p className="text-text-primary">
                {new Date(job.createdAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            onClick={handleExportReadme}
            className="mt-4 px-4 py-2 bg-bg-elevated hover:bg-bg-hover text-text-secondary text-sm rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar README.txt
          </button>
        </div>
      </div>
    </>
  )
}
