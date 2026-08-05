import cron from 'node-cron'
import { BrowserWindow } from 'electron'
import { runSync } from './syncer'

let task: cron.ScheduledTask | null = null

export function startScheduler(): void {
  if (task) return

  task = cron.schedule('*/15 * * * *', async () => {
    console.log('[Scheduler] Iniciando sincronização automática...')
    try {
      const result = await runSync()

      // Notifica todas as janelas sobre a conclusão
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('sync:completed', result)
        }
      }

      if (result.errors.length > 0) {
        console.error('[Scheduler] Sincronização concluída com erros:', result.errors)
      } else if (result.imported > 0) {
        console.log(`[Scheduler] Sincronização concluída. ${result.imported} jobs importados.`)
      } else {
        console.log('[Scheduler] Sincronização concluída. Nenhum job novo.')
      }
    } catch (err) {
      console.error('[Scheduler] Erro fatal na sincronização:', err)
    }
  })

  console.log('[Scheduler] Agendador iniciado (a cada 15 min).')
}

export function stopScheduler(): void {
  if (task) {
    task.stop()
    task = null
    console.log('[Scheduler] Agendador parado.')
  }
}
