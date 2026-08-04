import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

export function getDB(): Database.Database {
  if (!db) throw new Error('DB não inicializado — chame initDB() primeiro')
  return db
}

export function initDB(): void {
  const dbPath = join(app.getPath('userData'), 'mimaki.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations()
}

function runMigrations(): void {
  db.exec(`
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
      raw_xml_path           TEXT,
      synced_to_api          INTEGER DEFAULT 0,
      created_at             TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_folder_timestamp ON jobs(folder_timestamp);
    CREATE INDEX IF NOT EXISTS idx_jobs_spool_date       ON jobs(spool_date);

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
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
}

export function getAllSettings(): Record<string, string> {
  const rows = db.prepare('SELECT key, value FROM settings').all() as {
    key: string
    value: string
  }[]
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function saveAllSettings(settings: Record<string, string>): void {
  const insert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  const txn = db.transaction((s: Record<string, string>) => {
    for (const [key, value] of Object.entries(s)) {
      insert.run(key, value)
    }
  })
  txn(settings)
}

// ────────────────────────────────────────────────────────────────
// Jobs helpers
// ────────────────────────────────────────────────────────────────

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

export function insertJob(job: Omit<JobRow, 'id' | 'created_at' | 'synced_to_api'>): void {
  db.prepare(`
    INSERT OR IGNORE INTO jobs (
      folder_timestamp, job_name, order_code, quantity_units,
      ink_cyan_cc, ink_magenta_cc, ink_yellow_cc, ink_black_cc,
      ink_white1_cc, ink_white2_cc, ink_varnish1_cc, ink_varnish2_cc,
      ink_total_cc, print_time_ms, rip_time_ms,
      width_mm, height_mm, spool_date, last_print_date,
      pages, raw_xml_path
    ) VALUES (
      @folder_timestamp, @job_name, @order_code, @quantity_units,
      @ink_cyan_cc, @ink_magenta_cc, @ink_yellow_cc, @ink_black_cc,
      @ink_white1_cc, @ink_white2_cc, @ink_varnish1_cc, @ink_varnish2_cc,
      @ink_total_cc, @print_time_ms, @rip_time_ms,
      @width_mm, @height_mm, @spool_date, @last_print_date,
      @pages, @raw_xml_path
    )
  `).run(job)
}

export function getJobs(filters?: {
  startDate?: string
  endDate?: string
  search?: string
}): JobRow[] {
  let query = 'SELECT * FROM jobs WHERE 1=1'
  const params: (string | number)[] = []

  if (filters?.startDate) {
    query += ' AND spool_date >= ?'
    params.push(filters.startDate)
  }
  if (filters?.endDate) {
    query += ' AND spool_date <= ?'
    params.push(filters.endDate + 'T23:59:59')
  }
  if (filters?.search) {
    query += ' AND (job_name LIKE ? OR order_code LIKE ?)'
    const like = `%${filters.search}%`
    params.push(like, like)
  }

  query += ' ORDER BY folder_timestamp DESC'
  return db.prepare(query).all(...params) as JobRow[]
}

export function getUnsyncedJobs(): JobRow[] {
  return db.prepare('SELECT * FROM jobs WHERE synced_to_api = 0 ORDER BY folder_timestamp').all() as JobRow[]
}

export function getJobById(id: number): JobRow | undefined {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined
}

export function markJobsSynced(ids: number[]): void {
  const placeholders = ids.map(() => '?').join(',')
  db.prepare(`UPDATE jobs SET synced_to_api = 1 WHERE id IN (${placeholders})`).run(...ids)
}
