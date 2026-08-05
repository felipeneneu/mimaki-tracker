import { BrowserWindow, dialog } from 'electron'
import * as ExcelJS from 'exceljs'
import { getJobs } from '../db/database'

function formatMs(ms: number | null): string {
  if (ms == null) return ''
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}min ${sec} seg` : `${sec} seg`
}

function formatResolution(resolutionDpi: number | null): string {
  if (!resolutionDpi) return '—'
  return `${resolutionDpi}x${resolutionDpi} VD`
}

function formatDirection(dir: string | null): string {
  if (dir === 'unidirecional') return 'Unidirecional'
  if (dir === 'bidirecional') return 'Bidirecional'
  return '—'
}

function formatDimension(w: number | null, h: number | null): string {
  if (w == null || h == null) return '—'
  return `${w.toFixed(2)} x ${h.toFixed(2)} mm`
}

function formatInk(val: number | null): string {
  if (val == null) return '0.000 cc'
  return `${val.toFixed(3)} cc`
}

export async function exportToExcel(opts: {
  startDate?: string
  endDate?: string
}): Promise<{ filePath: string }> {
  const filters: Record<string, string> = {}
  if (opts.startDate) filters.startDate = opts.startDate
  if (opts.endDate) filters.endDate = opts.endDate

  const jobs = getJobs(filters)

  if (jobs.length === 0) {
    throw new Error('Nenhum job encontrado para exportar com os filtros selecionados.')
  }

  const mainWindow = BrowserWindow.getAllWindows()[0] ?? BrowserWindow.getFocusedWindow()
  if (!mainWindow) {
    throw new Error('Nenhuma janela disponível para o diálogo de exportação.')
  }

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exportar Consumo Mimaki',
    defaultPath: `Consumo Mimaki ${new Date().toISOString().slice(0, 10)}.xlsx`,
    filters: [
      { name: 'Planilha Excel', extensions: ['xlsx'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ]
  })

  if (result.canceled || !result.filePath) {
    throw new Error('Exportação cancelada pelo usuário.')
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'DPI Mimaki Tracker'
  wb.created = new Date()

  const ws = wb.addWorksheet('Planilha1')

  // ── Row 1: Título merged ──────────────────────────────────────
  ws.mergeCells('A1:P1')
  const titleCell = ws.getCell('A1')
  titleCell.value = 'Consumo Impressão Mimaki'
  titleCell.font = {
    bold: true,
    size: 15,
    name: 'Calibri',
    family: 2,
    scheme: 'minor',
    color: { theme: 3 }
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  titleCell.fill = { type: 'pattern', pattern: 'none' }
  ws.getRow(1).height = 19.5

  // ── Row 3: Headers ────────────────────────────────────────────
  const headers = [
    'Nome', 'Resoluçao', 'Passadas', 'Direcao da impressão',
    'C', 'M', 'Y', 'K', 'B', 'B2', 'V', 'V3',
    'Total', 'Tempo', 'Tamanho', 'Pagina'
  ]

  const headerRow = ws.getRow(3)
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1)
    cell.value = h
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF522582' }
    }
    cell.font = {
      bold: true,
      size: 11,
      name: 'Calibri',
      family: 2,
      scheme: 'minor',
      color: { argb: 'FFFFFFFF' }
    }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } }
    }
  })

  // ── Row 4+: Dados ─────────────────────────────────────────────
  jobs.forEach((job, idx) => {
    const row = ws.getRow(4 + idx)
    const values = [
      job.job_name,
      formatResolution(job.resolution_dpi),
      job.pass_count ?? '',
      formatDirection(job.print_direction),
      formatInk(job.ink_cyan_cc),
      formatInk(job.ink_magenta_cc),
      formatInk(job.ink_yellow_cc),
      formatInk(job.ink_black_cc),
      formatInk(job.ink_white1_cc),
      formatInk(job.ink_white2_cc),
      formatInk(job.ink_varnish1_cc),
      formatInk(job.ink_varnish2_cc),
      formatInk(job.ink_total_cc),
      formatMs(job.print_time_ms),
      formatDimension(job.width_mm, job.height_mm),
      job.pages ?? ''
    ]

    values.forEach((val, i) => {
      const cell = row.getCell(i + 1)
      cell.value = val
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      }
      cell.font = {
        size: 11,
        name: 'Calibri',
        family: 2,
        scheme: 'minor',
        color: { theme: 1 }
      }
    })
  })

  // ── Largura das colunas ────────────────────────────────────────
  ws.getColumn(1).width = 78
  ws.getColumn(2).width = 20
  ws.getColumn(3).width = 11
  ws.getColumn(4).width = 22
  ws.getColumn(12).width = 9.8
  ws.getColumn(13).width = 8.7
  ws.getColumn(14).width = 12.7
  ws.getColumn(15).width = 18.1

  await wb.xlsx.writeFile(result.filePath)

  return { filePath: result.filePath }
}
