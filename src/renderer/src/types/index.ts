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

// Global window declarations
declare global {
  interface Window {
    api: {
      syncRun: () => Promise<SyncResult>
      onSyncProgress: (callback: (data: { current: number; total: number; folder: string }) => void) => () => void
      jobsList: (filters?: {
        startDate?: string
        endDate?: string
        search?: string
      }) => Promise<JobRow[]>
      jobsGetById: (id: number) => Promise<JobRow | null>
      settingsGet: () => Promise<Record<string, string>>
      settingsSave: (settings: Record<string, string>) => Promise<boolean>
      exportExcel: (opts: { startDate?: string; endDate?: string }) => Promise<{ filePath: string }>
      exportApi: () => Promise<{ count: number; error?: string }>
      openFolderDialog: () => Promise<string | null>
      onTraySyncRequested: (callback: () => void) => () => void
    }
  }
}
