# PLAN: Mimaki Tracker - Drizzle ORM + Correções

> Plano de migração para Drizzle ORM e correções de parsing/sincronização.

---

## Contexto

O projeto é um **Electron + React + SQLite** que sincroniza dados de impressão Mimaki RasterLink via parsing de XML. Problemas atuais:

1. **better-sqlite3 raw SQL** - Camada de banco manual com queries SQL inline, sem type safety
2. **Referências desatualizadas** - `.opencode/references/` descrevem projeto "painel-pizzaria" (Next.js), mas o projeto real é "mimaki-tracker" (Electron)
3. **copyNumber incorreto** - Pega último valor encontrado, deveria pegar o MAIOR entre todos os composites
4. **Jobs com tinta zerada** - Impressões canceladas/erradas ficam no banco com `ink_total_cc = 0`
5. **Sync incompleto** - Botão "Sincronizar Agora" só processa pastas novas, deveria reprocessar TODAS
6. **Exportação README** - Falta botão em JobDetail.tsx para exportar .txt com dados do job

---

## FASE 0: Instalar Drizzle ORM + Criar Schema

### Tarefa 0.1: Instalar dependências

```bash
npm install drizzle-orm
npm install -D drizzle-kit
```

### Tarefa 0.2: Criar drizzle.config.ts

**Arquivo:** `drizzle.config.ts` (raiz do projeto)

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/main/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './mimaki.db'
  }
})
```

### Tarefa 0.3: Criar schema Drizzle

**Arquivo:** `src/main/db/schema.ts` (novo)

```typescript
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
  createdAt: text('created_at').default(sql`datetime('now')`),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
})
```

### Tarefa 0.4: Gerar primeira migration

```bash
npx drizzle-kit generate
```

### Tarefa 0.5: Adicionar scripts ao package.json

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:studio": "drizzle-kit studio"
```

---

## FASE 1: Migrar database.ts para Drizzle

### Tarefa 1.1: Reescrever initDB()

**Arquivo:** `src/main/db/database.ts`

```typescript
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>>

export function getDB() {
  if (!db) throw new Error('DB não inicializado — chame initDB() primeiro')
  return db
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
  // Criar tabelas se não existirem (primeira vez)
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

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)
}
```

### Tarefa 1.2: Migrar funções de settings

```typescript
import { eq } from 'drizzle-orm'
import { settings } from './schema'

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
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
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
```

### Tarefa 1.3: Migrar funções de jobs

```typescript
import { jobs } from './schema'
import { eq, and, like, gte, lte, inArray, SQL, isNull, or } from 'drizzle-orm'

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

export function getJobs(filters?: {
  startDate?: string
  endDate?: string
  search?: string
  inkMin?: number
  inkMax?: number
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

    return db.select().from(jobs)
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
    return db.select().from(jobs)
      .where(eq(jobs.syncedToApi, 0))
      .all()
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
    const result = db.delete(jobs)
      .where(or(eq(jobs.inkTotalCc, 0), isNull(jobs.inkTotalCc)))
      .run()
    return result.changes
  } catch (err: any) {
    console.error('[DB] Erro ao deletar jobs com tinta zerada:', err.message)
    return 0
  }
}
```

### Tarefa 1.4: Manter helpers de dev password

```typescript
import { createHash } from 'crypto'

export function getDevPasswordHash(): string | null {
  return getSetting('dev_terminal_password_hash')
}

export function setDevPasswordHash(hash: string): void {
  setSetting('dev_terminal_password_hash', hash)
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex')
}
```

### Tarefa 1.5: Atualizar closeDB()

```typescript
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
```

---

## FASE 2: Atualizar Referências

### Tarefa 2.1: Reescrever ARCHITECTURE_RULES.md

**Arquivo:** `.opencode/references/ARCHITECTURE_RULES.md`

- **Stack**: Electron + React + Drizzle ORM + SQLite
- **Estrutura**: `src/main/` (Node.js), `src/preload/` (contextBridge), `src/renderer/` (React)
- **DB**: Drizzle schema em `schema.ts`, migrations via Drizzle Kit
- **Fluxo**: XML files → Parser → Drizzle → React UI
- **IPC**: `ipcRenderer.invoke()` ↔ `ipcMain.handle()`

### Tarefa 2.2: Reescrever DATABASE_RULES.md

**Arquivo:** `.opencode/references/DATABASE_RULES.md`

- **ORM**: Drizzle ORM com better-sqlite3 driver
- **Schema**: `src/main/db/schema.ts` com `sqliteTable()`
- **Migrations**: `npx drizzle-kit generate` + `npx drizzle-kit migrate`
- **Queries**: Drizzle query builder, type-safe
- **Transactions**: `db.transaction()` para batch operations

### Tarefa 2.3: Reescrever PROJECT_RULES.md

**Arquivo:** `.opencode/references/PROJECT_RULES.md`

- **Tech Stack**: Electron 35, React 19, Vite, Drizzle ORM, TanStack Query, Tailwind CSS
- **Convenções**: snake_case no DB, camelCase no código
- **IPC Pattern**: `window.api.*` via preload contextBridge

---

## FASE 3: Corrigir copyNumber (MAX value)

### Tarefa 3.1: Modificar parseLayoutDirXml()

**Arquivo:** `src/main/parser/xmlParser.ts` (linha 402)

**Problema atual:** `copyNumber = cn` pega o ÚLTIMO valor encontrado, não o maior.

**Solução:**
```typescript
// ANTES (linha 402):
copyNumber = cn

// DEPOIS:
if (cn != null && (copyNumber == null || cn > copyNumber)) {
  copyNumber = cn
}
```

### Tarefa 3.2: Adicionar teste para MAX copyNumber

**Arquivo:** `src/main/parser/xmlParser.test.ts`

Adicionar caso de teste com LayoutDir.xml que tenha múltiplos composites com copyNumbers diferentes (ex: 1, 2, 3) e verificar que retorna 3.

---

## FASE 4: Deletar jobs com tinta zerada

### Tarefa 4.1: Chamar deleteZeroInkJobs() na sincronização

**Arquivo:** `src/main/sync/syncer.ts`

No final de `runSyncInternal()`, chamar `deleteZeroInkJobs()` e incluir contagem no `SyncResult`.

### Tarefa 4.2: Exportar via preload

**Arquivo:** `src/preload/index.ts`

Adicionar `deleteZeroInkJobs` ao contextBridge API.

### Tarefa 4.3: Atualizar SyncResult type

**Arquivo:** `src/renderer/src/types/index.ts`

Adicionar campo `deletedZeroInk: number` ao tipo `SyncResult`.

### Tarefa 4.4: Exibir na UI após sync

**Arquivo:** `src/renderer/src/components/layout/TopBar.tsx`

Mostrar contagem de jobs deletados na mensagem de conclusão do sync.

---

## FASE 5: Sync Full Re-sync

### Tarefa 5.1: Criar função resyncAllJobs()

**Arquivo:** `src/main/sync/syncer.ts`

Nova função que:
1. Lista TODAS as pastas (não apenas novas)
2. Para cada pasta, re-lê os 3 XMLs (ElementDir, CompositeDir, LayoutDir)
3. Usa `db.transaction()` para batch insert (melhoria de performance)
4. Deleta jobs com `ink_total_cc = 0` após reprocessamento
5. Retorna `SyncResult` com contagens

### Tarefa 5.2: Criar IPC handler para resync

**Arquivo:** `src/main/ipc/handlers.ts`

Adicionar handler `sync:resync-all` que chama `resyncAllJobs()`.

### Tarefa 5.3: Atualizar preload

**Arquivo:** `src/preload/index.ts`

Adicionar `syncResyncAll()` ao contextBridge API.

### Tarefa 5.4: Atualizar botão Sincronizar Agora

**Arquivo:** `src/renderer/src/components/layout/TopBar.tsx`

Mudar comportamento do botão para chamar `syncResyncAll()` em vez de `syncRun()`.

### Tarefa 5.5: Atualizar useSync hook

**Arquivo:** `src/renderer/src/hooks/useSync.ts`

Adicionar mutation para resync all.

---

## FASE 6: Exportar README.txt

### Tarefa 6.1: Criar função exportJobReadme()

**Arquivo:** `src/main/export/readmeExport.ts` (novo arquivo)

Função que recebe um `JobRow` e gera conteúdo no formato:

```
Passadas: [pass_count]
Resolução (DPI): [resolution_dpi]
Direção: [print_direction]

[job_name]
Pedido: [order_code]
Data (Spool): [spool_date formatada]
Dimensões: [width_mm] × [height_mm] mm
Quantidade: [quantity_units] unid.
Páginas: [pages]

Informações Técnicas
ID da Pasta: [folder_timestamp]
Última Impressão: [last_print_date formatada]
XML Original: [raw_xml_path]
Criado em: [created_at]
```

Usar `dialog.showSaveDialog()` para salvar como `README.txt`.

### Tarefa 6.2: Criar IPC handler

**Arquivo:** `src/main/ipc/handlers.ts`

Adicionar handler `export:readme` que recebe jobId, busca job no DB, chama `exportJobReadme()`.

### Tarefa 6.3: Atualizar preload

**Arquivo:** `src/preload/index.ts`

Adicionar `exportReadme(jobId: number)` ao contextBridge API.

### Tarefa 6.4: Adicionar botão em JobDetail.tsx

**Arquivo:** `src/renderer/src/pages/JobDetail.tsx`

Adicionar botão "Exportar README" no card de Informações Técnicas:

```tsx
<button
  onClick={() => window.api.exportReadme(job.id)}
  className="mt-2 px-3 py-1.5 bg-surface-hover text-text-secondary text-xs rounded-md hover:bg-surface-active transition-colors"
>
  Exportar README.txt
</button>
```

---

## FASE 7: Verificação

### Checklist

- [ ] `drizzle-orm` e `drizzle-kit` instalados
- [ ] `src/main/db/schema.ts` criado com tabelas jobs + settings
- [ ] `drizzle.config.ts` configurado
- [ ] `src/main/db/database.ts` reescrito com Drizzle
- [ ] Todas as funções de DB mantêm mesma assinatura pública
- [ ] `npx drizzle-kit generate` funciona
- [ ] `.opencode/references/` atualizado com info Drizzle
- [ ] `parseLayoutDirXml()` retorna MAX copyNumber
- [ ] Teste unitário para MAX copyNumber passa
- [ ] Jobs com `ink_total_cc = 0` deletados após sync
- [ ] Sync completo reprocessa TODAS as pastas com transaction
- [ ] Botão "Exportar README.txt" funciona em JobDetail
- [ ] README.txt gerado contém todos os campos solicitados
- [ ] `npm run build` passa sem erros

---

## Arquivos Afetados (17)

| Arquivo | Ação | Fase |
|---------|------|------|
| `package.json` | Adicionar drizzle-orm, drizzle-kit | 0 |
| `drizzle.config.ts` | Criar | 0 |
| `src/main/db/schema.ts` | Criar | 0 |
| `src/main/db/database.ts` | Reescrever | 1 |
| `.opencode/references/ARCHITECTURE_RULES.md` | Reescrever | 2 |
| `.opencode/references/DATABASE_RULES.md` | Reescrever | 2 |
| `.opencode/references/PROJECT_RULES.md` | Reescrever | 2 |
| `src/main/parser/xmlParser.ts` | Editar (copyNumber MAX) | 3 |
| `src/main/parser/xmlParser.test.ts` | Adicionar teste | 3 |
| `src/main/sync/syncer.ts` | resyncAll + deleteZeroInk + transactions | 4, 5 |
| `src/main/ipc/handlers.ts` | Handlers resync + export | 5, 6 |
| `src/preload/index.ts` | APIs resync + export | 5, 6 |
| `src/renderer/src/types/index.ts` | Atualizar SyncResult | 4 |
| `src/renderer/src/components/layout/TopBar.tsx` | Botão resync | 5 |
| `src/renderer/src/hooks/useSync.ts` | Mutation resync | 5 |
| `src/renderer/src/pages/JobDetail.tsx` | Botão export | 6 |
| `src/main/export/readmeExport.ts` | Criar | 6 |

---

## Estimativa de Esforço

| Fase | Complexidade | Tempo Est. |
|------|-------------|------------|
| FASE 0 | Média | 20 min |
| FASE 1 | Alta | 35 min |
| FASE 2 | Baixa | 15 min |
| FASE 3 | Baixa | 10 min |
| FASE 4 | Média | 15 min |
| FASE 5 | Média | 25 min |
| FASE 6 | Média | 20 min |
| FASE 7 | Baixa | 10 min |
| **Total** | | **~150 min** |
