import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Sincronização
  syncRun: () => ipcRenderer.invoke('sync:run'),
  onSyncProgress: (callback: (data: { current: number; total: number; folder: string }) => void) => {
    const handler = (_event: any, data: { current: number; total: number; folder: string }) => callback(data)
    ipcRenderer.on('sync:progress', handler)
    return () => ipcRenderer.removeListener('sync:progress', handler)
  },
  onSyncCompleted: (callback: (result: any) => void) => {
    const handler = (_event: any, result: any) => callback(result)
    ipcRenderer.on('sync:completed', handler)
    return () => ipcRenderer.removeListener('sync:completed', handler)
  },

  // Jobs
  jobsList: (filters?: { startDate?: string; endDate?: string; search?: string; inkMin?: number; inkMax?: number }) =>
    ipcRenderer.invoke('jobs:list', filters),
  jobsGetById: (id: number) => ipcRenderer.invoke('jobs:getById', id),

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSave: (settings: Record<string, string>) =>
    ipcRenderer.invoke('settings:save', settings),

  // Validação de pasta Mf
  validateMfFolder: (path: string) => ipcRenderer.invoke('dialog:validateMf', path),

  // Sincronização completa
  syncResyncAll: () => ipcRenderer.invoke('sync:resync-all'),

  // Exportação
  exportExcel: (opts: { startDate?: string; endDate?: string }) =>
    ipcRenderer.invoke('export:excel', opts),

  exportApi: () => ipcRenderer.invoke('export:api'),

  // Export README.txt
  exportReadme: (jobId: number) => ipcRenderer.invoke('export:readme', jobId),

  // Diálogos nativos
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Backup do banco
  backupDatabase: () => ipcRenderer.invoke('db:backup'),

  // Importar banco
  importDatabase: () => ipcRenderer.invoke('db:import'),

  // Limpar banco (com senha)
  clearDatabase: (password: string) => ipcRenderer.invoke('db:clear', password),

  // Restart app
  restartApp: () => ipcRenderer.invoke('app:restart'),

  // Window controls (frameless)
  windowMinimize: () => ipcRenderer.invoke('window:minimize'),
  windowMaximize: () => ipcRenderer.invoke('window:maximize'),
  windowClose: () => ipcRenderer.invoke('window:close'),

  // Terminal de desenvolvimento
  openDevTools: () => ipcRenderer.invoke('dev:openTools'),
  runDevCommand: (command: string) => ipcRenderer.invoke('dev:runCommand', command),

  // Dev terminal — acesso com senha
  requestDevAccess: () => ipcRenderer.invoke('dev:request-access'),
  verifyDevPassword: (password: string) => ipcRenderer.invoke('dev:verify-password', password),
  setDevPassword: (password: string) => ipcRenderer.invoke('dev:set-password', password),
  onDevNeedPassword: (callback: () => void) => {
    ipcRenderer.on('dev:need-password', callback)
    return () => ipcRenderer.removeListener('dev:need-password', callback)
  },
  onDevAccessGranted: (callback: () => void) => {
    ipcRenderer.on('dev:access-granted', callback)
    return () => ipcRenderer.removeListener('dev:access-granted', callback)
  },

  // Auto-update
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (callback: (info: { version: string; releaseDate: string }) => void) => {
    const handler = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update:available', handler)
    return () => ipcRenderer.removeListener('update:available', handler)
  },
  onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => {
    const handler = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  },
  onUpdateDownloaded: (callback: (info: { version: string }) => void) => {
    const handler = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update:downloaded', handler)
    return () => ipcRenderer.removeListener('update:downloaded', handler)
  },
  onUpdateStatus: (callback: (status: string) => void) => {
    const handler = (_event: any, status: string) => callback(status)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error)
    ipcRenderer.on('update:error', handler)
    return () => ipcRenderer.removeListener('update:error', handler)
  },

  // Terminal de dev — toggle via atalho
  onDevToggleTerminal: (callback: () => void) => {
    ipcRenderer.on('dev:toggle-terminal', callback)
    return () => ipcRenderer.removeListener('dev:toggle-terminal', callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (only in dev without context isolation)
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

export type API = typeof api
