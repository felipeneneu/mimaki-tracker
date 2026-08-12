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
  getJobs: vi.fn(),
  isJobComplete: vi.fn(() => true)
}))

import { exportToExcel } from './excelExport'
import { dialog } from 'electron'
import { getJobs, isJobComplete } from '../db/database'

const mockGetJobs = vi.mocked(getJobs)
const mockIsJobComplete = vi.mocked(isJobComplete)
const mockShowSaveDialog = vi.mocked(dialog.showSaveDialog)

describe('exportToExcel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when no jobs match filters', async () => {
    mockGetJobs.mockReturnValue([])
    mockIsJobComplete.mockReturnValue(true)
    await expect(exportToExcel({ startDate: '2026-01-01' })).rejects.toThrow('Nenhum job completo encontrado')
  })

  it('throws when dialog is canceled', async () => {
    mockGetJobs.mockReturnValue([{
      id: 1, folderTimestamp: '20260101_120000_001', jobName: 'test',
      orderCode: null, quantityUnits: null,
      inkCyanCc: null, inkMagentaCc: null, inkYellowCc: null,
      inkBlackCc: null, inkWhite1Cc: null, inkWhite2Cc: null,
      inkVarnish1Cc: null, inkVarnish2Cc: null, inkTotalCc: null,
      printTimeMs: null, ripTimeMs: null,
      widthMm: null, heightMm: null,
      spoolDate: null, lastPrintDate: null,
      pages: null, copyNumber: null, totalPrint: null, passCount: null, resolutionDpi: null,
      printDirection: null, rawXmlPath: null,
      syncedToApi: 0, createdAt: '2026-01-01'
    }])
    mockIsJobComplete.mockReturnValue(true)
    mockShowSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    await expect(exportToExcel({})).rejects.toThrow('cancelada pelo usuário')
  })
})
