import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

autoUpdater.logger = log

let checkInterval: ReturnType<typeof setTimeout> | null = null

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:status', 'checking')
    }
  })

  autoUpdater.on('update-available', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      })
    }
  })

  autoUpdater.on('update-not-available', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:status', 'up-to-date')
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:progress', {
        percent: progress.percent,
        transferred: progress.transferred,
        total: progress.total,
      })
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:downloaded', {
        version: info.version,
      })
    }
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err)
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:error', err.message)
    }
  })

  // Verifica na inicialização
  autoUpdater.checkForUpdatesAndNotify().catch(() => {
    // Ignora erros na primeira verificação
  })

  // Verifica a cada 4 horas (usando setTimeout recursivo para poder limpar)
  const scheduleCheck = (): void => {
    checkInterval = setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {})
      scheduleCheck()
    }, 4 * 60 * 60 * 1000)
  }
  scheduleCheck()
}

export function stopAutoUpdater(): void {
  if (checkInterval) {
    clearTimeout(checkInterval)
    checkInterval = null
  }
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdatesAndNotify().catch(() => {})
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true)
}
