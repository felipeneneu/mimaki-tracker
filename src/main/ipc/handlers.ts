import { BrowserWindow, dialog, app, shell } from 'electron'
import { is } from '@electron-toolkit/utils'
import { copyFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { join } from 'path'
import {
  getJobs, getJobById, getAllSettings, saveAllSettings,
  closeDB, getSetting, setSetting,
  getDevPasswordHash, setDevPasswordHash, hashPassword,
  updateJobCopyNumber
} from '../db/database'
import { runSync } from '../sync/syncer'
import { parseLayoutDirXml } from '../parser/xmlParser'
import { exportToExcel } from '../export/excelExport'
import { syncToApi } from '../export/apiSync'
import { checkForUpdates, quitAndInstall } from '../updater'

// ── Dev password state ─────────────────────────────────────────
let devFailedAttempts = 0
let devBlockedUntil = 0
const DEV_MAX_ATTEMPTS = 3
const DEV_BLOCK_MS = 5 * 60 * 1000 // 5 minutos

function isDevBlocked(): boolean {
  if (devBlockedUntil === 0) return false
  if (Date.now() > devBlockedUntil) {
    devBlockedUntil = 0
    devFailedAttempts = 0
    return false
  }
  return true
}

export function registerIpcHandlers(ipcMain: Electron.IpcMain): void {
  // ── Sync ──────────────────────────────────────────────────────
  ipcMain.handle('sync:run', async (event) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)
      const result = await runSync((current, total, folder) => {
        win?.webContents.send('sync:progress', { current, total, folder })
      })
      win?.webContents.send('sync:completed', result)
      return result
    } catch (err: any) {
      console.error('[IPC] sync:run error:', err.message)
      return { imported: 0, skipped: 0, total: 0, errors: [`Erro na sincronização: ${err.message}`] }
    }
  })

  // ── Jobs ──────────────────────────────────────────────────────
  ipcMain.handle('jobs:list', (_, filters) => {
    try {
      return getJobs(filters)
    } catch (err: any) {
      console.error('[IPC] jobs:list error:', err.message)
      return []
    }
  })

  ipcMain.handle('jobs:getById', (_, id: number) => {
    try {
      return getJobById(id) ?? null
    } catch (err: any) {
      console.error('[IPC] jobs:getById error:', err.message)
      return null
    }
  })

  // ── Settings ──────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => {
    try {
      return getAllSettings()
    } catch (err: any) {
      console.error('[IPC] settings:get error:', err.message)
      return {}
    }
  })

  ipcMain.handle('settings:save', (_, settings) => {
    try {
      saveAllSettings(settings)
      return true
    } catch (err: any) {
      console.error('[IPC] settings:save error:', err.message)
      return false
    }
  })

  // ── Validation ────────────────────────────────────────────────
  ipcMain.handle('dialog:validateMf', (_, path: string) => {
    try {
      const elmPath = join(path, 'Elm')
      const cmpPath = join(path, 'Cmp')
      const layPath = join(path, 'Lay')
      const missing: string[] = []
      if (!existsSync(elmPath)) missing.push('Elm')
      if (!existsSync(cmpPath)) missing.push('Cmp')
      if (!existsSync(layPath)) missing.push('Lay')
      return { valid: missing.length === 0, missing }
    } catch {
      return { valid: false, missing: ['Elm', 'Cmp', 'Lay'] }
    }
  })

  // ── Export ─────────────────────────────────────────────────────
  ipcMain.handle('export:excel', async (_, opts) => {
    try {
      return await exportToExcel(opts)
    } catch (err: any) {
      throw new Error(`Erro ao exportar Excel: ${err.message}`)
    }
  })

  ipcMain.handle('export:api', async () => {
    try {
      return await syncToApi()
    } catch (err: any) {
      return { count: 0, error: `Erro na sincronização com API: ${err.message}` }
    }
  })

  // ── Folder dialog ─────────────────────────────────────────────
  ipcMain.handle('dialog:openFolder', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return null

      const result = await dialog.showOpenDialog(window, {
        properties: ['openDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    } catch {
      return null
    }
  })

  // ── Dev tools ─────────────────────────────────────────────────
  ipcMain.handle('dev:openTools', (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (window) window.webContents.openDevTools({ mode: 'detach' })
      return true
    } catch {
      return false
    }
  })

  // ── Dev terminal password ─────────────────────────────────────
  ipcMain.handle('dev:request-access', () => {
    // Em dev, acesso direto
    if (is.dev) {
      return { granted: true, needsPassword: false }
    }

    // Em prod, verificar se tem hash salvo
    const hash = getDevPasswordHash()
    if (!hash) {
      // Primeira vez — precisa configurar senha
      return { granted: false, needsPassword: true, isFirstSetup: true }
    }

    // Verificar se está bloqueado
    if (isDevBlocked()) {
      const remainingMs = devBlockedUntil - Date.now()
      const remainingMin = Math.ceil(remainingMs / 60000)
      return { granted: false, blocked: true, remainingMinutes: remainingMin }
    }

    return { granted: false, needsPassword: true, isFirstSetup: false }
  })

  ipcMain.handle('dev:verify-password', (_, password: string) => {
    // Em dev, sempre aceita
    if (is.dev) {
      devFailedAttempts = 0
      return { granted: true }
    }

    // Verificar bloqueio
    if (isDevBlocked()) {
      const remainingMs = devBlockedUntil - Date.now()
      const remainingMin = Math.ceil(remainingMs / 60000)
      return { granted: false, blocked: true, remainingMinutes: remainingMin }
    }

    const storedHash = getDevPasswordHash()
    if (!storedHash) {
      // Primeira vez — salvar hash
      setDevPasswordHash(hashPassword(password))
      devFailedAttempts = 0
      return { granted: true }
    }

    // Comparar senhas
    const inputHash = hashPassword(password)
    if (inputHash === storedHash) {
      devFailedAttempts = 0
      return { granted: true }
    }

    // Senha errada
    devFailedAttempts++
    if (devFailedAttempts >= DEV_MAX_ATTEMPTS) {
      devBlockedUntil = Date.now() + DEV_BLOCK_MS
      return { granted: false, blocked: true, remainingMinutes: 5 }
    }

    return { granted: false, error: `Senha incorreta. ${DEV_MAX_ATTEMPTS - devFailedAttempts} tentativa(s) restante(s).` }
  })

  ipcMain.handle('dev:set-password', (_, newPassword: string) => {
    try {
      setDevPasswordHash(hashPassword(newPassword))
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Backup do banco ──────────────────────────────────────────
  ipcMain.handle('db:backup', async (event) => {
    try {
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

      const dbPath = join(app.getPath('userData'), 'mimaki.db')
      copyFileSync(dbPath, result.filePath)
      return { success: true, path: result.filePath }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Importar banco ───────────────────────────────────────────
  ipcMain.handle('db:import', async (event) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return { success: false, error: 'Janela não encontrada' }

      const result = await dialog.showOpenDialog(window, {
        title: 'Importar Backup do Banco de Dados',
        filters: [
          { name: 'SQLite Database', extensions: ['db'] },
          { name: 'Todos os arquivos', extensions: ['*'] }
        ],
        properties: ['openFile']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Cancelado pelo usuário' }
      }

      const importedPath = result.filePaths[0]
      const dbPath = join(app.getPath('userData'), 'mimaki.db')

      // Fecha o banco atual
      closeDB()

      // Copia o arquivo importado
      copyFileSync(importedPath, dbPath)

      return { success: true, needsRestart: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ── Terminal de desenvolvimento ──────────────────────────────
  ipcMain.handle('dev:runCommand', async (_, command: string) => {
    // Bloquear em produção sem senha
    if (!is.dev) {
      return { error: 'Terminal de desenvolvimento indisponível em produção.' }
    }

    const cmd = command.trim().toLowerCase()

    try {
      switch (cmd) {
        case 'help':
          return {
            output: [
              'Comandos disponíveis:',
              '  help              Lista todos os comandos',
              '  version           Mostra versão do app',
              '  show-db-path      Mostra caminho do banco de dados',
              '  reset-checkpoint  Reseta checkpoint de sincronização',
              '  re-sync           Força re-sincronização completa',
              '  reprocess-copy    Reprocessa copy_number de jobs existentes',
              '  clear-db          Limpa o banco de dados',
              '  export-db         Exporta cópia do banco de dados',
              '  open-data-folder  Abre a pasta de dados no explorador',
            ].join('\n')
          }

        case 'version':
          return { output: `DPI Mimaki Tracker v${app.getVersion()}` }

        case 'show-db-path':
          return { output: join(app.getPath('userData'), 'mimaki.db') }

        case 'reset-checkpoint':
          setSetting('last_sync_folder_timestamp', '')
          setSetting('last_sync_data_path', '')
          return { output: 'Checkpoint resetado. Próxima sincronização processará todas as pastas.' }

        case 're-sync': {
          setSetting('last_sync_folder_timestamp', '')
          setSetting('last_sync_data_path', '')
          const result = await runSync()
          return {
            output: [
              'Sincronização concluída!',
              `  Total de pastas: ${result.total}`,
              `  Importados: ${result.imported}`,
              `  Pulados: ${result.skipped}`,
              result.errors.length > 0 ? `  Erros: ${result.errors.join('; ')}` : '',
            ].filter(Boolean).join('\n')
          }
        }

        case 'clear-db': {
          const win = BrowserWindow.getAllWindows()[0]
          if (!win) return { error: 'Janela não encontrada' }
          const confirm = await dialog.showMessageBox(win, {
            type: 'warning',
            title: 'Confirmar limpeza',
            message: 'Isso irá apagar TODOS os jobs e configurações.',
            detail: 'Esta ação não pode ser desfeita. O app será reiniciado.',
            buttons: ['Cancelar', 'Limpar e reiniciar'],
            defaultId: 0,
            cancelId: 0,
          })
          if (confirm.response === 0) {
            return { error: 'Operação cancelada pelo usuário.' }
          }
          closeDB()
          const dbPath = join(app.getPath('userData'), 'mimaki.db')
          if (existsSync(dbPath)) unlinkSync(dbPath)
          app.relaunch()
          app.exit(0)
          return { output: 'Banco limpo. Reiniciando...' }
        }

        case 'export-db': {
          const win = BrowserWindow.getAllWindows()[0]
          if (!win) return { error: 'Janela não encontrada' }
          const saveResult = await dialog.showSaveDialog(win, {
            title: 'Exportar Banco de Dados',
            defaultPath: `mimaki_${new Date().toISOString().slice(0, 10)}.db`,
            filters: [
              { name: 'SQLite Database', extensions: ['db'] },
              { name: 'Todos os arquivos', extensions: ['*'] }
            ]
          })
          if (saveResult.canceled || !saveResult.filePath) {
            return { error: 'Exportação cancelada.' }
          }
          const srcPath = join(app.getPath('userData'), 'mimaki.db')
          copyFileSync(srcPath, saveResult.filePath)
          return { output: `Banco exportado para:\n${saveResult.filePath}` }
        }

        case 'open-data-folder': {
          const dataPath = getSetting('rasterlink_data_path')
          if (dataPath && existsSync(dataPath)) {
            shell.openPath(dataPath)
            return { output: `Pasta aberta: ${dataPath}` }
          }
          return { error: 'Pasta de dados não encontrada.' }
        }

        case 'reprocess-copy': {
          const jobs = getJobs()
          if (jobs.length === 0) return { output: 'Nenhum job encontrado no banco.' }

          let updated = 0
          let errors = 0
          for (const job of jobs) {
            if (!job.raw_xml_path) { errors++; continue }
            // Deriva o caminho do LayoutDir.xml a partir do raw_xml_path (ElementDir.xml)
            const layPath = job.raw_xml_path
              .replace(/\\Elm\\/, '\\Lay\\')
              .replace(/\/Elm\//, '/Lay/')
              .replace(/ElementDir\.xml$/, 'LayoutDir.xml')
            if (!existsSync(layPath)) { errors++; continue }
            try {
              const xml = readFileSync(layPath, 'utf-8')
              const layParsed = await parseLayoutDirXml(xml)
              if (layParsed.copyNumber != null) {
                updateJobCopyNumber(job.id, layParsed.copyNumber)
                updated++
              }
            } catch {
              errors++
            }
          }
          return {
            output: [
              'Reprocessamento de copy_number concluído!',
              `  Jobs encontrados: ${jobs.length}`,
              `  Atualizados: ${updated}`,
              `  Erros/skipados: ${errors}`,
            ].join('\n')
          }
        }

        default:
          return {
            error: `Comando desconhecido: "${command}". Digite "help" para ver os comandos disponíveis.`
          }
      }
    } catch (err: any) {
      return { error: `Erro ao executar comando: ${err.message}` }
    }
  })

  // ── Auto-update ──────────────────────────────────────────────
  ipcMain.handle('update:check', () => {
    try {
      checkForUpdates()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('update:install', () => {
    try {
      quitAndInstall()
      return true
    } catch {
      return false
    }
  })

  // ── Restart app ──────────────────────────────────────────────
  ipcMain.handle('app:restart', () => {
    try {
      app.relaunch()
      app.exit(0)
      return true
    } catch {
      return false
    }
  })

  // ── Window controls (frameless) ────────────────────────────
  ipcMain.handle('window:minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.handle('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      win.isMaximized() ? win.unmaximize() : win.maximize()
    }
  })

  ipcMain.handle('window:close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })
}
