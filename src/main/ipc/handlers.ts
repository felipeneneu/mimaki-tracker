import { BrowserWindow } from 'electron'
import { copyFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { getJobs, getJobById, getAllSettings, saveAllSettings } from '../db/database'
import { runSync } from '../sync/syncer'
import { exportToExcel } from '../export/excelExport'
import { syncToApi } from '../export/apiSync'

export function registerIpcHandlers(ipcMain: Electron.IpcMain, dialog: Electron.Dialog): void {
  ipcMain.handle('sync:run', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return await runSync((current, total, folder) => {
      win?.webContents.send('sync:progress', { current, total, folder })
    })
  })

  ipcMain.handle('jobs:list', (_, filters) => {
    return getJobs(filters)
  })

  ipcMain.handle('jobs:getById', (_, id: number) => {
    return getJobById(id) ?? null
  })

  ipcMain.handle('settings:get', () => {
    return getAllSettings()
  })

  ipcMain.handle('settings:save', (_, settings) => {
    saveAllSettings(settings)
    return true
  })

  ipcMain.handle('export:excel', async (_, opts) => {
    try {
      return await exportToExcel(opts)
    } catch (err: any) {
      throw new Error(`Erro ao exportar Excel: ${err.message}`)
    }
  })

  ipcMain.handle('export:api', async () => {
    return await syncToApi()
  })

  ipcMain.handle('dialog:openFolder', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null

    const result = await dialog.showOpenDialog(window, {
      properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('db:backup', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return { success: false, error: 'Janela não encontrada' }

    const result = await dialog.showSaveDialog(window, {
      title: 'Salvar Backup do Banco de Dados',
      defaultPath: `mimaki_backup_${new Date().toISOString().slice(0, 10)}.db`,
      filters: [
        { name: 'SQLite Database', extensions: ['db'] },
        { name: 'Todos os arquivos', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Cancelado pelo usuário' }
    }

    try {
      const dbPath = join(app.getPath('userData'), 'mimaki.db')
      copyFileSync(dbPath, result.filePath)
      return { success: true, path: result.filePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
