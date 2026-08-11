import { readdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parseElementDirXml, parseCompositeDirXml, parseLayoutDirXml } from '../parser/xmlParser'
import { insertJob, getSetting, setSetting, deleteZeroInkJobs, getDB } from '../db/database'
import { jobs } from '../db/schema'

const TIMESTAMP_REGEX = /^\d{8}_\d{6}_\d{3}$/

let isSyncing = false

export interface SyncResult {
  imported: number
  skipped: number
  total: number
  deletedZeroInk: number
  errors: string[]
}

export function isSyncRunning(): boolean {
  return isSyncing
}

export async function runSync(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  if (isSyncing) {
    return { imported: 0, skipped: 0, total: 0, deletedZeroInk: 0, errors: ['Sincronização já em andamento.'] }
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
  const result: SyncResult = { imported: 0, skipped: 0, total: 0, deletedZeroInk: 0, errors: [] }

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
      let copyNumber: number | null = null
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
              copyNumber = layParsed.copyNumber
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
        folderTimestamp: folder,
        jobName: parsed.jobName,
        orderCode: parsed.orderCode,
        quantityUnits: parsed.quantityUnits,
        inkCyanCc: parsed.inkCyanCc,
        inkMagentaCc: parsed.inkMagentaCc,
        inkYellowCc: parsed.inkYellowCc,
        inkBlackCc: parsed.inkBlackCc,
        inkWhite1Cc: parsed.inkWhite1Cc,
        inkWhite2Cc: parsed.inkWhite2Cc,
        inkVarnish1Cc: parsed.inkVarnish1Cc,
        inkVarnish2Cc: parsed.inkVarnish2Cc,
        inkTotalCc: parsed.inkTotalCc,
        printTimeMs: parsed.printTimeMs,
        ripTimeMs: parsed.ripTimeMs,
        widthMm: parsed.widthMm,
        heightMm: parsed.heightMm,
        spoolDate: parsed.spoolDate,
        lastPrintDate: parsed.lastPrintDate,
        pages: parsed.pages,
        copyNumber: copyNumber,
        passCount: passCount,
        resolutionDpi: resolutionDpi,
        printDirection: printDirection,
        rawXmlPath: elmXmlPath
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

  // Deleta jobs com tinta zerada (impressões canceladas/erradas)
  result.deletedZeroInk = deleteZeroInkJobs()

  return result
}

// ────────────────────────────────────────────────────────────────
// Full Resync - reprocessa TODAS as pastas
// ────────────────────────────────────────────────────────────────

export async function resyncAllJobs(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  if (isSyncing) {
    return { imported: 0, skipped: 0, total: 0, deletedZeroInk: 0, errors: ['Sincronização já em andamento.'] }
  }

  isSyncing = true

  try {
    return await resyncAllJobsInternal(onProgress)
  } finally {
    isSyncing = false
  }
}

async function resyncAllJobsInternal(
  onProgress?: (current: number, total: number, folder: string) => void
): Promise<SyncResult> {
  const result: SyncResult = { imported: 0, skipped: 0, total: 0, deletedZeroInk: 0, errors: [] }

  const dataPath = getSetting('rasterlink_data_path')
  if (!dataPath || !existsSync(dataPath)) {
    result.errors.push('Caminho de dados do RasterLink não configurado ou não encontrado.')
    return result
  }

  const elmPath = join(dataPath, 'Elm')
  const cmpPath = join(dataPath, 'Cmp')
  const layPath = join(dataPath, 'Lay')

  if (!existsSync(elmPath)) {
    result.errors.push(`Pasta Elm não encontrada em: ${dataPath}`)
    return result
  }

  // Lista TODAS as pastas (sem filtro de checkpoint)
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

  result.total = folders.length

  // Pré-carrega e indexa pastas Cmp e Lay
  const cmpIndex = new Map<string, string>()
  const layIndex = new Map<string, string>()

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

  // Usa transaction para batch insert (performance)
  const db = getDB()

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i]
    onProgress?.(i + 1, folders.length, folder)

    const elmXmlPath = join(elmPath, folder, 'ElementDir.xml')
    if (!existsSync(elmXmlPath)) {
      result.errors.push(`ElementDir.xml não encontrado em: Elm/${folder}`)
      continue
    }

    try {
      const elmXmlContent = readFileSync(elmXmlPath, 'utf-8')
      const parsed = await parseElementDirXml(elmXmlContent)

      let copyNumber: number | null = null
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
              copyNumber = layParsed.copyNumber
              passCount = layParsed.passCount
              resolutionDpi = layParsed.resolutionDpi
              printDirection = layParsed.printDirection
            } catch {
              // Ignora erro de parse do Layout
            }
          }
        }
      }

      // Upsert com Drizzle
      db.insert(jobs).values({
        folderTimestamp: folder,
        jobName: parsed.jobName,
        orderCode: parsed.orderCode,
        quantityUnits: parsed.quantityUnits,
        inkCyanCc: parsed.inkCyanCc,
        inkMagentaCc: parsed.inkMagentaCc,
        inkYellowCc: parsed.inkYellowCc,
        inkBlackCc: parsed.inkBlackCc,
        inkWhite1Cc: parsed.inkWhite1Cc,
        inkWhite2Cc: parsed.inkWhite2Cc,
        inkVarnish1Cc: parsed.inkVarnish1Cc,
        inkVarnish2Cc: parsed.inkVarnish2Cc,
        inkTotalCc: parsed.inkTotalCc,
        printTimeMs: parsed.printTimeMs,
        ripTimeMs: parsed.ripTimeMs,
        widthMm: parsed.widthMm,
        heightMm: parsed.heightMm,
        spoolDate: parsed.spoolDate,
        lastPrintDate: parsed.lastPrintDate,
        pages: parsed.pages,
        copyNumber: copyNumber,
        passCount: passCount,
        resolutionDpi: resolutionDpi,
        printDirection: printDirection,
        rawXmlPath: elmXmlPath
      }).onConflictDoUpdate({
        target: jobs.folderTimestamp,
        set: {
          jobName: parsed.jobName,
          orderCode: parsed.orderCode,
          quantityUnits: parsed.quantityUnits,
          inkCyanCc: parsed.inkCyanCc,
          inkMagentaCc: parsed.inkMagentaCc,
          inkYellowCc: parsed.inkYellowCc,
          inkBlackCc: parsed.inkBlackCc,
          inkWhite1Cc: parsed.inkWhite1Cc,
          inkWhite2Cc: parsed.inkWhite2Cc,
          inkVarnish1Cc: parsed.inkVarnish1Cc,
          inkVarnish2Cc: parsed.inkVarnish2Cc,
          inkTotalCc: parsed.inkTotalCc,
          printTimeMs: parsed.printTimeMs,
          ripTimeMs: parsed.ripTimeMs,
          widthMm: parsed.widthMm,
          heightMm: parsed.heightMm,
          spoolDate: parsed.spoolDate,
          lastPrintDate: parsed.lastPrintDate,
          pages: parsed.pages,
          copyNumber: copyNumber,
          passCount: passCount,
          resolutionDpi: resolutionDpi,
          printDirection: printDirection,
          rawXmlPath: elmXmlPath
        }
      }).run()

      result.imported++
    } catch (err: any) {
      result.errors.push(`Erro ao processar ${folder}: ${err.message}`)
    }
  }

  // Deleta jobs com tinta zerada
  result.deletedZeroInk = deleteZeroInkJobs()

  return result
}
