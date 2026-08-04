import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parseElementDirXml } from '../parser/xmlParser'
import { insertJob, getSetting, setSetting } from '../db/database'

const TIMESTAMP_REGEX = /^\d{8}_\d{6}_\d{3}$/

export interface SyncResult {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

export async function runSync(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, skipped: 0, total: 0, errors: [] }

  const dataPath = getSetting('rasterlink_data_path')
  if (!dataPath || !existsSync(dataPath)) {
    result.errors.push('Caminho de dados do RasterLink não configurado ou não encontrado.')
    return result
  }

  // Lista subpastas com nome de timestamp válido
  let folders: string[]
  try {
    folders = readdirSync(dataPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && TIMESTAMP_REGEX.test(d.name))
      .map((d) => d.name)
      .sort() // ordem lexicográfica = cronológica
  } catch (err) {
    result.errors.push(`Erro ao listar pastas: ${err}`)
    return result
  }

  if (folders.length === 0) return result

  const lastSyncTimestamp = getSetting('last_sync_folder_timestamp') ?? ''
  const toProcess = folders.filter((f) => f > lastSyncTimestamp)

  result.total = toProcess.length

  if (toProcess.length === 0) {
    result.skipped = folders.length
    return result
  }

  let maxProcessed = lastSyncTimestamp

  for (let i = 0; i < toProcess.length; i++) {
    const folder = toProcess[i]
    onProgress?.(i + 1, toProcess.length, folder)
    const xmlPath = join(dataPath, folder, 'ElementDir.xml')

    if (!existsSync(xmlPath)) {
      result.errors.push(`ElementDir.xml não encontrado em: ${folder}`)
      continue
    }

    try {
      const xmlContent = readFileSync(xmlPath, 'utf-8')
      const parsed = await parseElementDirXml(xmlContent)

      if (parsed.warnings.length > 0) {
        console.warn(`[Sync] Warnings para ${folder}:`, parsed.warnings)
      }

      insertJob({
        folder_timestamp: folder,
        job_name: parsed.jobName,
        order_code: parsed.orderCode,
        quantity_units: parsed.quantityUnits,
        ink_cyan_cc: parsed.inkCyanCc,
        ink_magenta_cc: parsed.inkMagentaCc,
        ink_yellow_cc: parsed.inkYellowCc,
        ink_black_cc: parsed.inkBlackCc,
        ink_white1_cc: parsed.inkWhite1Cc,
        ink_white2_cc: parsed.inkWhite2Cc,
        ink_varnish1_cc: parsed.inkVarnish1Cc,
        ink_varnish2_cc: parsed.inkVarnish2Cc,
        ink_total_cc: parsed.inkTotalCc,
        print_time_ms: parsed.printTimeMs,
        rip_time_ms: parsed.ripTimeMs,
        width_mm: parsed.widthMm,
        height_mm: parsed.heightMm,
        spool_date: parsed.spoolDate,
        last_print_date: parsed.lastPrintDate,
        pages: parsed.pages,
        raw_xml_path: xmlPath
      })

      result.imported++
      if (folder > maxProcessed) maxProcessed = folder
    } catch (err) {
      result.errors.push(`Erro ao processar ${folder}: ${err}`)
    }
  }

  // Atualiza checkpoint só se algo foi processado com sucesso
  if (maxProcessed > lastSyncTimestamp) {
    setSetting('last_sync_folder_timestamp', maxProcessed)
  }

  return result
}
