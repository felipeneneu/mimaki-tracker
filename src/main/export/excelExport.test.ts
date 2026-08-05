import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockWindow = { isDestroyed: () => false }

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: vi.fn(() => [mockWindow]),
    getFocusedWindow: vi.fn(() => mockWindow)
  },
  dialog: {
    showSaveDialog: vi.fn()
  }
}))

vi.mock('../db/database', () => ({
  getJobs: vi.fn()
}))

import { exportToExcel } from './excelExport'
import { dialog } from 'electron'
import { getJobs } from '../db/database'

const mockGetJobs = vi.mocked(getJobs)
const mockShowSaveDialog = vi.mocked(dialog.showSaveDialog)

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when no jobs match filters', async () => {
    mockGetJobs.mockReturnValue([])
    await expect(exportToExcel({ startDate: '2026-01-01' })).rejects.toThrow('Nenhum job encontrado')
  })

  it('throws when dialog is canceled', async () => {
    mockGetJobs.mockReturnValue([{
      id: 1, folder_timestamp: '20260101_120000_001', job_name: 'test',
      order_code: null, quantity_units: null,
      ink_cyan_cc: null, ink_magenta_cc: null, ink_yellow_cc: null,
      ink_black_cc: null, ink_white1_cc: null, ink_white2_cc: null,
      ink_varnish1_cc: null, ink_varnish2_cc: null, ink_total_cc: null,
      print_time_ms: null, rip_time_ms: null,
      width_mm: null, height_mm: null,
      spool_date: null, last_print_date: null,
      pages: null, pass_count: null, resolution_dpi: null,
      print_direction: null, raw_xml_path: null,
      synced_to_api: 0, created_at: '2026-01-01'
    }])
    mockShowSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    await expect(exportToExcel({})).rejects.toThrow('cancelada pelo usuário')
  })
})
