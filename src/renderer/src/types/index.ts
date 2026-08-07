export interface JobRow {
  id: number
  folder_timestamp: string
  job_name: string
  order_code: string | null
  quantity_units: number | null
  ink_cyan_cc: number | null
  ink_magenta_cc: number | null
  ink_yellow_cc: number | null
  ink_black_cc: number | null
  ink_white1_cc: number | null
  ink_white2_cc: number | null
  ink_varnish1_cc: number | null
  ink_varnish2_cc: number | null
  ink_total_cc: number | null
  print_time_ms: number | null
  rip_time_ms: number | null
  width_mm: number | null
  height_mm: number | null
  spool_date: string | null
  last_print_date: string | null
  pages: number | null
  copy_number: number | null
  pass_count: number | null
  resolution_dpi: number | null
  print_direction: string | null
  raw_xml_path: string | null
  synced_to_api: number
  created_at: string
}

export interface SyncResult {
  imported: number
  skipped: number
  total: number
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
