export interface JobRow {
  id: number
  folderTimestamp: string
  jobName: string
  orderCode: string | null
  quantityUnits: number | null
  inkCyanCc: number | null
  inkMagentaCc: number | null
  inkYellowCc: number | null
  inkBlackCc: number | null
  inkWhite1Cc: number | null
  inkWhite2Cc: number | null
  inkVarnish1Cc: number | null
  inkVarnish2Cc: number | null
  inkTotalCc: number | null
  printTimeMs: number | null
  ripTimeMs: number | null
  widthMm: number | null
  heightMm: number | null
  spoolDate: string | null
  lastPrintDate: string | null
  pages: number | null
  copyNumber: number | null
  passCount: number | null
  resolutionDpi: number | null
  printDirection: string | null
  rawXmlPath: string | null
  syncedToApi: number
  createdAt: string
}

export interface SyncResult {
  imported: number
  skipped: number
  total: number
  deletedZeroInk: number
  errors: string[]
}

export interface DevCommandResult {
  output?: string
  error?: string
}

export interface DevAccessResult {
  granted: boolean
  needsPassword?: boolean
  isFirstSetup?: boolean
  blocked?: boolean
  remainingMinutes?: number
  error?: string
}

declare global {
  interface Window {
    api: {
      // Sincronização
      syncRun: () => Promise<SyncResult>
      syncResyncAll: () => Promise<SyncResult>
      onSyncProgress: (callback: (data: { current: number; total: number; folder: string }) => void) => () => void
      onSyncCompleted: (callback: (result: SyncResult) => void) => () => void

      // Jobs
      jobsList: (filters?: {
        startDate?: string
        endDate?: string
        search?: string
        inkMin?: number
        inkMax?: number
      }) => Promise<JobRow[]>
      jobsGetById: (id: number) => Promise<JobRow | null>

      // Settings
      settingsGet: () => Promise<Record<string, string>>
      settingsSave: (settings: Record<string, string>) => Promise<boolean>

      // Validação
      validateMfFolder: (path: string) => Promise<{ valid: boolean; missing: string[] }>

      // Exportação
      exportExcel: (opts: { startDate?: string; endDate?: string }) => Promise<{ filePath: string }>
      exportApi: () => Promise<{ count: number; error?: string }>
      exportReadme: (jobId: number) => Promise<{ success: boolean; filePath?: string; error?: string }>

      // Diálogos
      openFolderDialog: () => Promise<string | null>

      // Backup/Import
      backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>
      importDatabase: () => Promise<{ success: boolean; needsRestart?: boolean; error?: string }>
      clearDatabase: (password: string) => Promise<{ success: boolean; error?: string }>
      restartApp: () => Promise<boolean>

      // Window controls (frameless)
      windowMinimize: () => Promise<void>
      windowMaximize: () => Promise<void>
      windowClose: () => Promise<void>

      // Terminal de dev
      openDevTools: () => Promise<boolean>
      runDevCommand: (command: string) => Promise<DevCommandResult>
      onDevToggleTerminal: (callback: () => void) => () => void
      requestDevAccess: () => Promise<DevAccessResult>
      verifyDevPassword: (password: string) => Promise<DevAccessResult>
      setDevPassword: (password: string) => Promise<{ success: boolean; error?: string }>
      onDevNeedPassword: (callback: () => void) => () => void
      onDevAccessGranted: (callback: () => void) => () => void

      // Auto-update
      checkForUpdates: () => Promise<boolean>
      installUpdate: () => Promise<boolean>
      onUpdateAvailable: (callback: (info: { version: string; releaseDate: string }) => void) => () => void
      onUpdateProgress: (callback: (progress: { percent: number; transferred: number; total: number }) => void) => () => void
      onUpdateDownloaded: (callback: (info: { version: string }) => void) => () => void
      onUpdateStatus: (callback: (status: string) => void) => () => void
      onUpdateError: (callback: (error: string) => void) => () => void
    }
  }
}
