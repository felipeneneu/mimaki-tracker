import { app } from 'electron'
import { join } from 'path'
import * as ExcelJS from 'exceljs'
import { getJobs } from '../db/database'

/** Formata milissegundos em "Xmin Ys" */
function formatMs(ms: number | null): string {
  if (ms == null) return ''
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}min ${sec} seg` : `${sec} seg`
}

/** Formata valor de tinta como "0.000 cc" */
function inkCc(val: number | null): string {
  if (val == null || val === 0) return '0.000 cc'
  return `${val.toFixed(3)} cc`
}

/** Formata dimensões como "W.00 x H.00 mm" */
function formatSize(width: number | null, height: number | null): string {
  if (width == null || height == null) return ''
  return `${width.toFixed(2)} x ${height.toFixed(2)} mm`
}

export async function exportToExcel(opts: {
  startDate?: string
  endDate?: string
}): Promise<{ filePath: string }> {
  const jobs = getJobs(opts)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'DPI Mimaki Tracker'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Planilha1')

  // ── Row 1: Título mergeado ──────────────────────────────────
  sheet.mergeCells('A1:Q1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = 'Consumo Impressão Mimaki'
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF522582' }
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  sheet.getRow(1).height = 30

  // ── Row 2: vazia ────────────────────────────────────────────
  sheet.getRow(2).height = 6

  // ── Row 3: Cabeçalhos ───────────────────────────────────────
  const headers = [
    { header: 'Data (Spool)', key: 'spool_date', width: 20 },
    { header: 'Nome', key: 'job_name', width: 78 },
    { header: 'Resolução', key: 'resolution', width: 16 },
    { header: 'Passadas', key: 'passes', width: 10 },
    { header: 'Direção', key: 'direction', width: 20 },
    { header: 'C', key: 'ink_cyan', width: 12 },
    { header: 'M', key: 'ink_magenta', width: 12 },
    { header: 'Y', key: 'ink_yellow', width: 12 },
    { header: 'K', key: 'ink_black', width: 12 },
    { header: 'B', key: 'ink_white1', width: 12 },
    { header: 'B2', key: 'ink_white2', width: 12 },
    { header: 'V', key: 'ink_varnish1', width: 12 },
    { header: 'V3', key: 'ink_varnish2', width: 12 },
    { header: 'Total', key: 'ink_total', width: 14 },
    { header: 'Tempo', key: 'print_time', width: 16 },
    { header: 'Tamanho', key: 'size', width: 22 },
    { header: 'Página', key: 'pages', width: 10 }
  ]

  sheet.columns = headers

  // Formata cabeçalhos
  const headerRow = sheet.getRow(3)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF522582' }
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  headerRow.height = 22

  // ── Rows 4+: Dados ─────────────────────────────────────────
  for (const job of jobs) {
    sheet.addRow({
      spool_date: job.spool_date
        ? new Date(job.spool_date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
        : '',
      job_name: job.job_name,
      resolution: '',   // vazio — preenchimento manual futuro
      passes: '',        // vazio — preenchimento manual futuro
      direction: '',     // vazio — preenchimento manual futuro
      ink_cyan: inkCc(job.ink_cyan_cc),
      ink_magenta: inkCc(job.ink_magenta_cc),
      ink_yellow: inkCc(job.ink_yellow_cc),
      ink_black: inkCc(job.ink_black_cc),
      ink_white1: inkCc(job.ink_white1_cc),
      ink_white2: inkCc(job.ink_white2_cc),
      ink_varnish1: inkCc(job.ink_varnish1_cc),
      ink_varnish2: inkCc(job.ink_varnish2_cc),
      ink_total: inkCc(job.ink_total_cc),
      print_time: formatMs(job.print_time_ms),
      size: formatSize(job.width_mm, job.height_mm),
      pages: job.pages ?? ''
    })
  }

  // Bordas finas nas células de dados
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
  }

  for (let i = 4; i <= sheet.rowCount; i++) {
    const row = sheet.getRow(i)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle' }
    })
    row.height = 18
  }

  // Alinhamento à direita para colunas numéricas (C, M, Y, K, B, B2, V, V3, Total)
  for (let col = 6; col <= 14; col++) {
    sheet.getColumn(col).alignment = { horizontal: 'right', vertical: 'middle' }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const defaultPath = join(app.getPath('documents'), `DPI_Consumo_${timestamp}.xlsx`)

  await workbook.xlsx.writeFile(defaultPath)

  return { filePath: defaultPath }
}
