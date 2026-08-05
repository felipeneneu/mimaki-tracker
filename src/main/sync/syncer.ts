import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parseElementDirXml, parseCompositeDirXml, parseLayoutDirXml } from '../parser/xmlParser'
import { insertJob, getSetting, setSetting } from '../db/database'

const TIMESTAMP_REGEX = /^\d{8}_\d{6}_\d{3}$/

let isSyncing = false

export interface SyncResult {
  imported: number
  skipped: number
  total: number
  errors: string[]
}

export function isSyncRunning(): boolean {
  return isSyncing
}

export async function runSync(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  if (isSyncing) {
    return { imported: 0, skipped: 0, total: 0, errors: ['Sincronização já em andamento.'] }
  }

  isSyncing = true

  try {
    return await runSyncInternal(onProgress)
  } finally {
    isSyncing = false
  }
}

async function runSyncInternal(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, skipped: 0, total: 0, errors: [] }

  const dataPath = getSetting('rasterlink_data_path')
  if (!dataPath || !existsSync(dataPath)) {
    result.errors.push('Caminho de dados do RasterLink não configurado ou não encontrado.')
    return result
  }

  // Se o path mudou desde a última sincronização, reseta o checkpoint
  const lastSyncPath = getSetting('last_sync_data_path')
  if (lastSyncPath !== dataPath) {
    setSetting('last_sync_folder_timestamp', '')
    setSetting('last_sync_data_path', dataPath)
  }

  const elmPath = join(dataPath, 'Elm')
  const cmpPath = join(dataPath, 'Cmp')
  const layPath = join(dataPath, 'Lay')

  if (!existsSync(elmPath)) {
    result.errors.push(`Pasta Elm não encontrada em: ${dataPath}`)
    return result
  }

  // Lista subpastas Elm com nome de timestamp válido
  let folders: string[]
  try {
    folders = readdirSync(elmPath, { withFileTypes: true })
      .filter((d) => d.isDirectory() && TIMESTAMP_REGEX.test(d.name))
      .map((d) => d.name)
      .sort()
  } catch (err: any) {
    result.errors.push(`Erro ao listar pastas Elm: ${err.message}`)
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

  // Pré-carrega e indexa pastas Cmp e Lay para evitar O(n×m)
  const cmpIndex = new Map<string, string>() // elementID → cmpFolder
  const layIndex = new Map<string, string>() // compositeID → layFolder

  if (existsSync(cmpPath)) {
    try {
      const cmpFolders = readdirSync(cmpPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && TIMESTAMP_REGEX.test(d.name))
        .map((d) => d.name)

      for (const cmpFolder of cmpFolders) {
        const cmpXmlPath = join(cmpPath, cmpFolder, 'CompositeDir.xml')
        if (!existsSync(cmpXmlPath)) continue
        try {
          const cmpXmlContent = readFileSync(cmpXmlPath, 'utf-8')
          const cmpParsed = await parseCompositeDirXml(cmpXmlContent)
          if (cmpParsed.elementID) {
            cmpIndex.set(cmpParsed.elementID, cmpFolder)
          }
        } catch {
          // Ignora erros de parse
        }
      }
    } catch (err: any) {
      result.errors.push(`Erro ao listar pastas Cmp: ${err.message}`)
    }
  }

  if (existsSync(layPath)) {
    try {
      const layFolders = readdirSync(layPath, { withFileTypes: true })
        .filter((d) => d.isDirectory() && TIMESTAMP_REGEX.test(d.name))
        .map((d) => d.name)

      for (const layFolder of layFolders) {
        const layXmlPath = join(layPath, layFolder, 'LayoutDir.xml')
        if (!existsSync(layXmlPath)) continue
        try {
          const layXmlContent = readFileSync(layXmlPath, 'utf-8')
          const layParsed = await parseLayoutDirXml(layXmlContent)
          if (layParsed.compositeID) {
            layIndex.set(layParsed.compositeID, layFolder)
          }
        } catch {
          // Ignora erros de parse
        }
      }
    } catch (err: any) {
      result.errors.push(`Erro ao listar pastas Lay: ${err.message}`)
    }
  }

  let maxProcessed = lastSyncTimestamp

  for (let i = 0; i < toProcess.length; i++) {
    const folder = toProcess[i]
    onProgress?.(i + 1, toProcess.length, folder)

    const elmXmlPath = join(elmPath, folder, 'ElementDir.xml')
    if (!existsSync(elmXmlPath)) {
      result.errors.push(`ElementDir.xml não encontrado em: Elm/${folder}`)
      continue
    }

    try {
      const elmXmlContent = readFileSync(elmXmlPath, 'utf-8')
      const parsed = await parseElementDirXml(elmXmlContent)

      // Busca pass/resolution/direction via índices
      let passCount: number | null = null
      let resolutionDpi: number | null = null
      let printDirection: string | null = null

      const cmpFolder = cmpIndex.get(folder)
      if (cmpFolder) {
        const layFolder = layIndex.get(cmpFolder)
        if (layFolder) {
          const layXmlPath = join(layPath, layFolder, 'LayoutDir.xml')
          if (existsSync(layXmlPath)) {
            try {
              const layXmlContent = readFileSync(layXmlPath, 'utf-8')
              const layParsed = await parseLayoutDirXml(layXmlContent)
              passCount = layParsed.passCount
              resolutionDpi = layParsed.resolutionDpi
              printDirection = layParsed.printDirection
            } catch {
              // Ignora erro de parse do Layout
            }
          }
        }
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
        pass_count: passCount,
        resolution_dpi: resolutionDpi,
        print_direction: printDirection,
        raw_xml_path: elmXmlPath
      })

      result.imported++
      if (folder > maxProcessed) maxProcessed = folder
    } catch (err: any) {
      result.errors.push(`Erro ao processar ${folder}: ${err.message}`)
    }
  }

  // Atualiza checkpoint só se algo foi processado com sucesso
  if (maxProcessed > lastSyncTimestamp) {
    setSetting('last_sync_folder_timestamp', maxProcessed)
  }

  return result
}
