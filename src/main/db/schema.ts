import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const jobs = sqliteTable('jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folderTimestamp: text('folder_timestamp').unique().notNull(),
  jobName: text('job_name').notNull(),
  orderCode: text('order_code'),
  quantityUnits: integer('quantity_units'),
  inkCyanCc: real('ink_cyan_cc'),
  inkMagentaCc: real('ink_magenta_cc'),
  inkYellowCc: real('ink_yellow_cc'),
  inkBlackCc: real('ink_black_cc'),
  inkWhite1Cc: real('ink_white1_cc'),
  inkWhite2Cc: real('ink_white2_cc'),
  inkVarnish1Cc: real('ink_varnish1_cc'),
  inkVarnish2Cc: real('ink_varnish2_cc'),
  inkTotalCc: real('ink_total_cc'),
  printTimeMs: integer('print_time_ms'),
  ripTimeMs: integer('rip_time_ms'),
  widthMm: real('width_mm'),
  heightMm: real('height_mm'),
  spoolDate: text('spool_date'),
  lastPrintDate: text('last_print_date'),
  pages: integer('pages'),
  copyNumber: integer('copy_number'),
  passCount: integer('pass_count'),
  resolutionDpi: integer('resolution_dpi'),
  printDirection: text('print_direction'),
  rawXmlPath: text('raw_xml_path'),
  syncedToApi: integer('synced_to_api').default(0),
  createdAt: text('created_at').default(sql`datetime('now')`)
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value')
})
