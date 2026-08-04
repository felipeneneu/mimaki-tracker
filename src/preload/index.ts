import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// API exposta ao renderer via contextBridge (sem acesso direto ao Node)
const api = {
  // Sincronização
  syncRun: () => ipcRenderer.invoke('sync:run'),
  onSyncProgress: (callback: (data: { current: number; total: number; folder: string }) => void) => {
    ipcRenderer.on('sync:progress', (_, data) => callback(data))
    return () => ipcRenderer.removeListener('sync:progress', callback)
  },

  // Jobs
  jobsList: (filters?: { startDate?: string; endDate?: string; search?: string }) =>
    ipcRenderer.invoke('jobs:list', filters),
  jobsGetById: (id: number) => ipcRenderer.invoke('jobs:getById', id),

  // Settings
  settingsGet: () => ipcRenderer.invoke('settings:get'),
  settingsSave: (settings: Record<string, string>) =>
    ipcRenderer.invoke('settings:save', settings),

  // Exportação
  exportExcel: (opts: { startDate?: string; endDate?: string }) =>
    ipcRenderer.invoke('export:excel', opts),

  exportApi: () => ipcRenderer.invoke('export:api'),

  // Diálogos nativos
  openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

  // Backup do banco
  backupDatabase: () => ipcRenderer.invoke('db:backup'),

  // Eventos do tray (escuta)
  onTraySyncRequested: (callback: () => void) => {
    ipcRenderer.on('tray:sync-requested', callback)
    return () => ipcRenderer.removeListener('tray:sync-requested', callback)
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
