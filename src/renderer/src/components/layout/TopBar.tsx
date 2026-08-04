import { useState, useEffect, useCallback } from 'react'

interface SyncProgress {
  current: number
  total: number
  folder: string
}

export function TopBar({ title }: { title: string }) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [progress, setProgress] = useState<SyncProgress | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<{ imported: number; errs: number; errors: string[] } | null>(null)

  const handleSync = useCallback(async () => {
    setIsSyncing(true)
    setLastSyncResult(null)
    setProgress(null)
    try {
      const result = await window.api.syncRun()
      setLastSyncResult({ imported: result.imported, errs: result.errors.length, errors: result.errors })
    } catch (e) {
      setLastSyncResult({ imported: 0, errs: 1, errors: ['Erro de comunicação com o processo principal'] })
    } finally {
      setIsSyncing(false)
      setProgress(null)
    }
  }, [])

  // Escuta progresso do sync
  useEffect(() => {
    const unsubscribe = window.api.onSyncProgress((data) => {
      setProgress(data)
    })
    return () => unsubscribe()
  }, [])

  // Escuta pedido de sync via Tray
  useEffect(() => {
    const unsubscribe = window.api.onTraySyncRequested(() => {
      handleSync()
    })
    return () => unsubscribe()
  }, [handleSync])

  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <header className="h-16 border-b border-bg-border bg-bg-base/80 backdrop-blur flex items-center justify-between px-8 sticky top-0 z-10">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      
      <div className="flex items-center gap-4">
        {/* Último resultado */}
        {lastSyncResult && !isSyncing && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-text-muted">
              Último sync: {new Date().toLocaleTimeString()} 
              <span className={lastSyncResult.errs > 0 ? 'text-error ml-1' : 'text-success ml-1'}>
                ({lastSyncResult.imported} novos)
              </span>
            </span>
            {lastSyncResult.errs > 0 && lastSyncResult.errors.length > 0 && (
              <span className="text-[10px] text-error max-w-[300px] text-right truncate" title={lastSyncResult.errors.join('\n')}>
                {lastSyncResult.errors[0]}
              </span>
            )}
          </div>
        )}

        {/* Barra de progresso durante sync */}
        {isSyncing && (
          <div className="flex flex-col items-end gap-1 min-w-[220px]">
            <span className="text-[11px] text-text-muted">
              {progress
                ? `Processando ${progress.current}/${progress.total} pastas`
                : 'Iniciando sincronização...'
              }
            </span>
            <div className="w-full h-2 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out animate-shimmer"
                style={{ width: progress ? `${pct}%` : '0%' }}
              />
            </div>
            {progress && (
              <span className="text-[10px] text-text-dim font-mono truncate max-w-[220px]" title={progress.folder}>
                {progress.folder}
              </span>
            )}
          </div>
        )}
        
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-brand-purple hover:bg-brand-purple/80 text-white text-sm font-medium px-4 py-2 rounded-md shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSyncing ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Sincronizando...
            </>
          ) : (
            'Sincronizar Agora'
          )}
        </button>
      </div>
    </header>
  )
}
