import { parseStringPromise } from 'xml2js'

// ────────────────────────────────────────────────────────────────
// Tipos públicos
// ────────────────────────────────────────────────────────────────

export interface ParsedJob {
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
  warnings: string[]
}

// ────────────────────────────────────────────────────────────────
// Helpers de navegação no grafo xml2js
// ────────────────────────────────────────────────────────────────

/** Encontra um <void property="name"> dentro de um array de voids */
function findVoidByProperty(voids: any[] | undefined, property: string): any | null {
  if (!Array.isArray(voids)) return null
  return voids.find((v: any) => v?.$?.property === property) ?? null
}

/** Retorna o primeiro <object> filho de um void */
function childObject(voidEl: any): any | null {
  return voidEl?.object?.[0] ?? null
}

/** Extrai valor <long> de um void */
function longVal(voidEl: any): number | null {
  const raw = voidEl?.long?.[0]
  if (raw == null) return null
  return parseInt(String(raw), 10)
}

/** Extrai valor <string> de um void */
function stringVal(voidEl: any): string | null {
  return voidEl?.string?.[0] ?? null
}

/**
 * Parseia um <object class="java.util.TreeMap"> com <void method="put">
 * onde chave e valor são <int>.
 */
function parseIntTreeMap(obj: any): Record<number, number> {
  const map: Record<number, number> = {}
  const puts = (obj?.void ?? []).filter((v: any) => v?.$?.method === 'put')
  for (const put of puts) {
    const ints = put?.int ?? []
    if (ints.length >= 2) {
      map[parseInt(String(ints[0]), 10)] = parseInt(String(ints[1]), 10)
    }
  }
  return map
}

/**
 * Parseia um <object class="java.util.TreeMap"> com <void method="put">
 * onde chave é <string> e valor é <string> ou <int>.
 */
function parseStringTreeMap(obj: any): Record<string, string> {
  const map: Record<string, string> = {}
  const puts = (obj?.void ?? []).filter((v: any) => v?.$?.method === 'put')
  for (const put of puts) {
    const key = put?.string?.[0]
    const value = put?.string?.[1] ?? put?.int?.[0] ?? put?.boolean?.[0]
    if (key != null && value != null) {
      map[String(key)] = String(value)
    }
  }
  return map
}

/**
 * Parseia um <object class="jp.mimaki.cmn.math.DimDouble"> que usa
 * getField/set aninhado para width e height.
 */
function parseDimDouble(obj: any): { width: number | null; height: number | null } {
  const result = { width: null as number | null, height: null as number | null }
  const voids: any[] = obj?.void ?? []
  for (const v of voids) {
    if (v?.$?.method === 'getField') {
      const fieldName = v?.string?.[0]
      const innerVoid = (v?.void ?? []).find((iv: any) => iv?.$?.method === 'set')
      const dbl = innerVoid?.double?.[0]
      if (dbl != null) {
        const val = parseFloat(String(dbl))
        if (fieldName === 'width') result.width = val
        else if (fieldName === 'height') result.height = val
      }
    }
  }
  return result
}

/** Converte epoch milliseconds para ISO 8601 string, retorna null se inválido */
function epochToISO(ms: number | null): string | null {
  if (ms == null || isNaN(ms)) return null
  try {
    return new Date(ms).toISOString()
  } catch {
    return null
  }
}

/** Converte pontos tipográficos (1/72 polegada) para mm */
function pointsToMm(pts: number | null): number | null {
  if (pts == null) return null
  return parseFloat(((pts * 25.4) / 72).toFixed(2))
}

// ────────────────────────────────────────────────────────────────
// Extração de campos do jobName via regex (best-effort)
// ────────────────────────────────────────────────────────────────

function extractJobNameFields(jobName: string): {
  orderCode: string | null
  quantityUnits: number | null
} {
  // Código do pedido: dígitos no início antes do primeiro " - "
  const codeMatch = jobName.match(/^(\d+)\s*-/)
  const orderCode = codeMatch ? codeMatch[1] : null

  // Quantidade: último número antes de "unid"
  const qtyMatch = jobName.match(/(\d+)\s*unid/i)
  const quantityUnits = qtyMatch ? parseInt(qtyMatch[1], 10) : null

  return { orderCode, quantityUnits }
}

// ────────────────────────────────────────────────────────────────
// Parser principal
// ────────────────────────────────────────────────────────────────

export async function parseElementDirXml(xmlContent: string): Promise<ParsedJob> {
  const warnings: string[] = []

  const warn = (msg: string): null => {
    warnings.push(msg)
    return null
  }

  let root: any
  try {
    const parsed = await parseStringPromise(xmlContent, {
      explicitArray: true,
      mergeAttrs: false
    })
    
    // Procura o object de classe jp.mimaki.p2p.cmn.dir.ElementDir
    const objects = parsed?.java?.object ?? []
    root = objects.find((o: any) => o?.$?.class === 'jp.mimaki.p2p.cmn.dir.ElementDir')
    
  } catch (e) {
    throw new Error(`Falha ao parsear XML: ${e}`)
  }

  if (!root) throw new Error('Estrutura XML inválida: root ElementDir não encontrado')

  const rootVoids: any[] = root?.void ?? []

  // ── jobBasisProperty → propertyMap → JobName ──────────────────
  let jobName = 'Sem nome'
  const jobBasisVoid = findVoidByProperty(rootVoids, 'jobBasisProperty')
  const jobBasisObj = childObject(jobBasisVoid)
  const propertyMapVoid = findVoidByProperty(jobBasisObj?.void, 'propertyMap')
  const propertyMapObj = childObject(propertyMapVoid)
  if (propertyMapObj) {
    const propMap = parseStringTreeMap(propertyMapObj)
    jobName = propMap['JobName'] ?? warn('JobName não encontrado em jobBasisProperty.propertyMap') ?? 'Sem nome'
  } else {
    warn('jobBasisProperty.propertyMap não encontrado')
  }

  // ── Extrai campos regex do jobName ────────────────────────────
  const { orderCode, quantityUnits } = extractJobNameFields(jobName)

  // ── ripProperty ───────────────────────────────────────────────
  const ripVoid = findVoidByProperty(rootVoids, 'ripProperty')
  const ripObj = childObject(ripVoid)
  const ripVoids: any[] = ripObj?.void ?? []

  if (!ripObj) warn('ripProperty não encontrado')

  // inkUsed → TreeMap<int, int>, valor / 1000 = cc
  const INK_CHANNELS: Record<number, string> = {
    1: 'cyan', 2: 'magenta', 3: 'yellow', 4: 'black',
    131: 'white1', 133: 'white2', 136: 'varnish1', 137: 'varnish2'
  }

  const inkMap: Record<string, number | null> = {}
  const inkUsedVoid = findVoidByProperty(ripVoids, 'inkUsed')
  const inkUsedObj = childObject(inkUsedVoid)
  if (inkUsedObj) {
    const raw = parseIntTreeMap(inkUsedObj)
    for (const [ch, label] of Object.entries(INK_CHANNELS)) {
      const rawVal = raw[Number(ch)]
      inkMap[label] = rawVal != null ? parseFloat((rawVal / 1000).toFixed(4)) : null
      if (rawVal == null) warn(`inkUsed: canal ${ch} (${label}) ausente`)
    }
  } else {
    warn('ripProperty.inkUsed não encontrado')
    for (const label of Object.values(INK_CHANNELS)) inkMap[label] = null
  }

  const inkTotal = Object.values(inkMap).reduce<number | null>((acc, v) => {
    if (v == null) return acc
    return (acc ?? 0) + v
  }, null)

  // timeCmdPrn e timeRIP
  const printTimeMsVoid = findVoidByProperty(ripVoids, 'timeCmdPrn')
  const printTimeMs = printTimeMsVoid?.long?.[0] != null
    ? parseInt(String(printTimeMsVoid.long[0]), 10)
    : warn('ripProperty.timeCmdPrn não encontrado')

  const ripTimeMsVoid = findVoidByProperty(ripVoids, 'timeRIP')
  const ripTimeMs = ripTimeMsVoid?.long?.[0] != null
    ? parseInt(String(ripTimeMsVoid.long[0]), 10)
    : warn('ripProperty.timeRIP não encontrado')

  // pages — usa o atributo length do <array class="int" length="N">
  const pagesVoid = findVoidByProperty(ripVoids, 'pages')
  const pagesArray = pagesVoid?.array?.[0]
  const pages = pagesArray?.$?.length != null
    ? parseInt(String(pagesArray.$.length), 10)
    : warn('ripProperty.pages[array length] não encontrado')

  // ── spoolProperty ─────────────────────────────────────────────
  const spoolVoid = findVoidByProperty(rootVoids, 'spoolProperty')
  const spoolObj = childObject(spoolVoid)
  const spoolVoids: any[] = spoolObj?.void ?? []

  if (!spoolObj) warn('spoolProperty não encontrado')

  // date → java.util.Date → epoch ms
  const spoolDateVoid = findVoidByProperty(spoolVoids, 'date')
  const spoolDateObj = childObject(spoolDateVoid)
  const spoolEpoch = spoolDateObj?.long?.[0] != null
    ? parseInt(String(spoolDateObj.long[0]), 10)
    : null
  const spoolDate = epochToISO(spoolEpoch)
  if (!spoolDate) warn('spoolProperty.date não encontrado ou inválido')

  // format
  const formatVoid = findVoidByProperty(spoolVoids, 'format')
  if (!formatVoid) warn('spoolProperty.format não encontrado')

  // paperPoints → DimDouble
  const paperPointsVoid = findVoidByProperty(spoolVoids, 'paperPoints')
  const paperPointsObj = childObject(paperPointsVoid)
  let widthMm: number | null = null
  let heightMm: number | null = null
  if (paperPointsObj) {
    const { width, height } = parseDimDouble(paperPointsObj)
    widthMm = pointsToMm(width)
    heightMm = pointsToMm(height)
    if (widthMm == null) warn('paperPoints.width não encontrado')
    if (heightMm == null) warn('paperPoints.height não encontrado')
  } else {
    warn('spoolProperty.paperPoints não encontrado')
  }

  // ── editProperty → lastPrintDate ─────────────────────────────
  const editVoid = findVoidByProperty(rootVoids, 'editProperty')
  const editObj = childObject(editVoid)
  const lastPrintDateVoid = findVoidByProperty(editObj?.void, 'lastPrintDate')
  const lastPrintDateObj = childObject(lastPrintDateVoid)
  const lastPrintEpoch = lastPrintDateObj?.long?.[0] != null
    ? parseInt(String(lastPrintDateObj.long[0]), 10)
    : null
  const lastPrintDate = epochToISO(lastPrintEpoch)
  if (!lastPrintDate) warn('editProperty.lastPrintDate não encontrado ou inválido')

  return {
    jobName,
    orderCode,
    quantityUnits,
    inkCyanCc: inkMap['cyan'] ?? null,
    inkMagentaCc: inkMap['magenta'] ?? null,
    inkYellowCc: inkMap['yellow'] ?? null,
    inkBlackCc: inkMap['black'] ?? null,
    inkWhite1Cc: inkMap['white1'] ?? null,
    inkWhite2Cc: inkMap['white2'] ?? null,
    inkVarnish1Cc: inkMap['varnish1'] ?? null,
    inkVarnish2Cc: inkMap['varnish2'] ?? null,
    inkTotalCc: inkTotal !== null ? parseFloat(inkTotal.toFixed(4)) : null,
    printTimeMs: typeof printTimeMs === 'number' ? printTimeMs : null,
    ripTimeMs: typeof ripTimeMs === 'number' ? ripTimeMs : null,
    widthMm,
    heightMm,
    spoolDate,
    lastPrintDate,
    pages: typeof pages === 'number' ? pages : null,
    warnings
  }
}

/** Formata milissegundos em "Xmin Ys" */
export function formatMs(ms: number | null): string {
  if (ms == null) return '—'
  const totalSec = Math.floor(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return min > 0 ? `${min}min ${sec}s` : `${sec}s`
}
