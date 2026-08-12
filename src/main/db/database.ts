import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq, and, like, gte, lte, inArray, or, isNull, gt, isNotNull, type SQL } from 'drizzle-orm'
import { app } from 'electron'
import { join } from 'path'
import { createHash } from 'crypto'
import { sql } from 'drizzle-orm'
import * as schema from './schema'

const { jobs, settings } = schema

let db: ReturnType<typeof drizzle<typeof schema>>

export function getDB() {
  if (!db) throw new Error('DB não inicializado — chame initDB() primeiro')
  return db
}

export function closeDB(): void {
  if (db) {
    try {
      const raw = db.$client
      raw.pragma('wal_checkpoint(TRUNCATE)')
      raw.close()
    } catch {
      // Ignora erro de WAL checkpoint no fechamento
    }
    db = null as any
  }
}

export function initDB(): void {
  try {
    const dbPath = join(app.getPath('userData'), 'mimaki.db')
    const sqlite = new Database(dbPath)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    db = drizzle(sqlite, { schema })
    runMigrations(sqlite)
  } catch (err: any) {
    throw new Error(`Falha ao inicializar banco de dados: ${err.message}`)
  }
}

function runMigrations(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_timestamp       TEXT    UNIQUE NOT NULL,
      job_name               TEXT    NOT NULL,
      order_code             TEXT,
      quantity_units         INTEGER,
      ink_cyan_cc            REAL,
      ink_magenta_cc         REAL,
      ink_yellow_cc          REAL,
      ink_black_cc           REAL,
      ink_white1_cc          REAL,
      ink_white2_cc          REAL,
      ink_varnish1_cc        REAL,
      ink_varnish2_cc        REAL,
      ink_total_cc           REAL,
      print_time_ms          INTEGER,
      rip_time_ms            INTEGER,
      width_mm               REAL,
      height_mm              REAL,
      spool_date             TEXT,
      last_print_date        TEXT,
      pages                  INTEGER,
      copy_number            INTEGER,
      pass_count             INTEGER,
      resolution_dpi         INTEGER,
      print_direction        TEXT,
      raw_xml_path           TEXT,
      synced_to_api          INTEGER DEFAULT 0,
      created_at             TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_folder_timestamp ON jobs(folder_timestamp);
    CREATE INDEX IF NOT EXISTS idx_jobs_spool_date       ON jobs(spool_date);
  `)

  // Migration: adicionar coluna total_print se não existir
  try {
    sqlite.exec(`ALTER TABLE jobs ADD COLUMN total_print INTEGER;`)
  } catch {
    // Coluna já existe — ignora
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}

// ────────────────────────────────────────────────────────────────
// Settings helpers
// ────────────────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  try {
    const row = db.select().from(settings).where(eq(settings.key, key)).get()
    return row?.value ?? null
  } catch {
    return null
  }
}

export function setSetting(key: string, value: string): void {
  try {
    db.insert(settings).values({ key, value }).onConflictDoUpdate({
      target: settings.key,
      set: { value }
    }).run()
  } catch (err: any) {
    console.error(`[DB] Erro ao salvar setting "${key}":`, err.message)
  }
}

export function getAllSettings(): Record<string, string> {
  try {
    const rows = db.select().from(settings).all()
    return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']))
  } catch {
    return {}
  }
}

export function saveAllSettings(s: Record<string, string>): void {
  const entries = Object.entries(s)
  db.transaction((tx) => {
    for (const [key, value] of entries) {
      tx.insert(settings).values({ key, value }).onConflictDoUpdate({
        target: settings.key,
        set: { value }
      }).run()
    }
  })
}

// ────────────────────────────────────────────────────────────────
// Jobs helpers
// ────────────────────────────────────────────────────────────────

export type JobRow = typeof jobs.$inferSelect

export function insertJob(job: Omit<JobRow, 'id' | 'createdAt' | 'syncedToApi'>): void {
  try {
    db.insert(jobs).values(job).onConflictDoUpdate({
      target: jobs.folderTimestamp,
      set: job
    }).run()
  } catch (err: any) {
    console.error(`[DB] Erro ao inserir job ${job.folderTimestamp}:`, err.message)
    throw err
  }
}

/**
 * Verifica se um job tem TODOS os campos obrigatórios preenchidos.
 */
export function isJobComplete(job: {
  inkTotalCc: number | null
  passCount: number | null
  resolutionDpi: number | null
  printDirection: string | null
  pages: number | null
  copyNumber: number | null
}): boolean {
  return (
    job.inkTotalCc != null &&
    job.inkTotalCc > 0 &&
    job.passCount != null &&
    job.resolutionDpi != null &&
    job.printDirection != null &&
    job.pages != null &&
    job.copyNumber != null
  )
}

export function getJobs(filters?: {
  startDate?: string
  endDate?: string
  search?: string
  inkMin?: number
  inkMax?: number
  completeOnly?: boolean
}): JobRow[] {
  try {
    const conditions: SQL[] = []

    if (filters?.startDate) {
      conditions.push(gte(jobs.spoolDate, filters.startDate))
    }
    if (filters?.endDate) {
      conditions.push(lte(jobs.spoolDate, filters.endDate + 'T23:59:59'))
    }
    if (filters?.search) {
      const pattern = `%${filters.search}%`
      conditions.push(or(like(jobs.jobName, pattern), like(jobs.orderCode, pattern))!)
    }
    if (filters?.inkMin != null) {
      conditions.push(gte(jobs.inkTotalCc, filters.inkMin))
    }
    if (filters?.inkMax != null) {
      conditions.push(lte(jobs.inkTotalCc, filters.inkMax))
    }
    if (filters?.completeOnly) {
      conditions.push(
        and(
          gt(jobs.inkTotalCc, 0),
          isNotNull(jobs.passCount),
          isNotNull(jobs.resolutionDpi),
          isNotNull(jobs.printDirection),
          isNotNull(jobs.pages),
          isNotNull(jobs.copyNumber)
        )!
      )
    }

    return db
      .select()
      .from(jobs)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(jobs.folderTimestamp)
      .all()
      .reverse()
  } catch (err: any) {
    console.error('[DB] Erro ao buscar jobs:', err.message)
    return []
  }
}

export function getUnsyncedJobs(): JobRow[] {
  try {
    return db.select().from(jobs).where(eq(jobs.syncedToApi, 0)).all()
  } catch {
    return []
  }
}

export function getJobById(id: number): JobRow | undefined {
  try {
    return db.select().from(jobs).where(eq(jobs.id, id)).get()
  } catch {
    return undefined
  }
}

export function markJobsSynced(ids: number[]): void {
  if (ids.length === 0) return
  try {
    db.update(jobs).set({ syncedToApi: 1 }).where(inArray(jobs.id, ids)).run()
  } catch (err: any) {
    console.error('[DB] Erro ao marcar jobs como sincronizados:', err.message)
  }
}

export function updateJobCopyNumber(id: number, copyNumber: number | null): void {
  try {
    db.update(jobs).set({ copyNumber }).where(eq(jobs.id, id)).run()
  } catch (err: any) {
    console.error(`[DB] Erro ao atualizar copy_number do job ${id}:`, err.message)
  }
}

export function deleteZeroInkJobs(): number {
  try {
    const result = db.delete(jobs).where(or(eq(jobs.inkTotalCc, 0), isNull(jobs.inkTotalCc))).run()
    return result.changes
  } catch (err: any) {
    console.error('[DB] Erro ao deletar jobs com tinta zerada:', err.message)
    return 0
  }
}

// ────────────────────────────────────────────────────────────────
// Monthly Report
// ────────────────────────────────────────────────────────────────

export interface MonthlyReportRow {
  month: string
  cyanCc: number
  magentaCc: number
  yellowCc: number
  blackCc: number
  white1Cc: number
  white2Cc: number
  varnish1Cc: number
  varnish2Cc: number
  totalInkCc: number
  jobCount: number
  totalPrintTimeMs: number
}

export function getMonthlyReport(): MonthlyReportRow[] {
  try {
    const rows = db.all(sql`
      SELECT
        substr(spool_date, 1, 7) as month,
        COALESCE(SUM(ink_cyan_cc), 0) as cyan_cc,
        COALESCE(SUM(ink_magenta_cc), 0) as magenta_cc,
        COALESCE(SUM(ink_yellow_cc), 0) as yellow_cc,
        COALESCE(SUM(ink_black_cc), 0) as black_cc,
        COALESCE(SUM(ink_white1_cc), 0) as white1_cc,
        COALESCE(SUM(ink_white2_cc), 0) as white2_cc,
        COALESCE(SUM(ink_varnish1_cc), 0) as varnish1_cc,
        COALESCE(SUM(ink_varnish2_cc), 0) as varnish2_cc,
        COALESCE(SUM(ink_total_cc), 0) as total_ink_cc,
        COUNT(*) as job_count,
        COALESCE(SUM(print_time_ms), 0) as total_print_time_ms
      FROM jobs
      WHERE spool_date IS NOT NULL
      GROUP BY month
      ORDER BY month DESC
    `) as any[]

    return rows.map(r => ({
      month: r.month,
      cyanCc: r.cyan_cc,
      magentaCc: r.magenta_cc,
      yellowCc: r.yellow_cc,
      blackCc: r.black_cc,
      white1Cc: r.white1_cc,
      white2Cc: r.white2_cc,
      varnish1Cc: r.varnish1_cc,
      varnish2Cc: r.varnish2_cc,
      totalInkCc: r.total_ink_cc,
      jobCount: r.job_count,
      totalPrintTimeMs: r.total_print_time_ms
    }))
  } catch (err: any) {
    console.error('[DB] Erro ao buscar relatório mensal:', err.message)
    return []
  }
}

// ────────────────────────────────────────────────────────────────
// Dev password helpers
// ────────────────────────────────────────────────────────────────

export function getDevPasswordHash(): string | null {
  return getSetting('dev_terminal_password_hash')
}

export function setDevPasswordHash(hash: string): void {
  setSetting('dev_terminal_password_hash', hash)
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
