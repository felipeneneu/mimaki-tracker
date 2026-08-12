# PLAN: Mimaki Tracker — Ajustes e Novas Funcionalidades

> Plano de implementação para 6 ajustes e funcionalidades no DPI Mimaki Tracker Electron.

---

## Visão Geral

O projeto é um **Electron + React + SQLite** (Drizzle ORM) que sincroniza dados de impressão Mimaki RasterLink via parsing de XML. Este plano cobre 6 requisitos:

| # | Requisito | Prioridade | Complexidade |
|---|-----------|------------|--------------|
| 1 | Filtrar Jobs Incompletos | P0 | Média |
| 2 | Corrigir Notificação do Botão Sync | P1 | Baixa |
| 3 | Abrir Pasta Após Exportação | P1 | Baixa |
| 4 | Link GitHub no Sidebar | P2 | Baixa |
| 5 | Calcular Total Impressão (Cópia × Páginas) | P0 | Média |
| 6 | Tela de Relatório Mensal | P2 | Alta |

---

## Critérios de Sucesso

- [ ] Jobs incompletos (campos — ou nulos) são excluídos do banco, exportação e UI
- [ ] Botão sync só mostra contagem quando há jobs novos
- [ ] Pasta é aberta automaticamente após salvar Excel ou README
- [ ] Link GitHub abre no navegador padrão
- [ ] 	otal_print = copy_number × pages é calculado, salvo no DB e exportado
- [ ] Tela de relatório mensal mostra consumo por cor, jobs, tempo e gráfico

---

## Tech Stack

| Camada | Tecnologia | Versão |
|--------|------------|--------|
| Frontend | React + TypeScript | 18.3 |
| State | TanStack Query | 5.x |
| UI | Tailwind CSS + Recharts | 3.4 / 2.x |
| Backend | Electron (Node.js) | 30.x |
| Database | SQLite + Drizzle ORM | 0.45 |
| Export | ExcelJS | 4.x |
| Build | electron-vite | 2.x |

---

## Estrutura de Arquivos Afetados

### Arquivos Existentes (Modificação)

| Arquivo | Requisitos | Ação |
|---------|------------|------|
| src/main/db/schema.ts | 5 | Adicionar coluna 	otalPrint |
| src/main/db/database.ts | 1, 5 | Adicionar filtro completo, função getMonthlyReport |
| src/main/sync/syncer.ts | 1, 2 | Filtrar jobs incompletos, retornar 
ewJobs count |
| src/main/export/excelExport.ts | 1, 3, 5 | Filtrar incompletos, abrir pasta, coluna Total Impressão |
| src/main/ipc/handlers.ts | 2, 3, 6 | Handler relatório mensal, abrir pasta após export |
| src/preload/index.ts | 6 | Adicionar API monthlyReport |
| src/renderer/src/types/index.ts | 5, 6 | Adicionar 	otalPrint ao JobRow, tipos relatório |
| src/renderer/src/components/layout/TopBar.tsx | 2 | Corrigir exibição do contador |
| src/renderer/src/components/layout/Sidebar.tsx | 4, 6 | Link GitHub, navegação Relatório Mensal |
| src/renderer/src/App.tsx | 6 | Rota /reports/monthly |
| src/main/db/database.ts | 1 | Função isJobComplete() |

### Arquivos Novos (Criação)

| Arquivo | Requisito | Descrição |
|---------|-----------|-----------|
| src/renderer/src/pages/MonthlyReport.tsx | 6 | Tela de relatório mensal |
| src/renderer/src/hooks/useMonthlyReport.ts | 6 | Hook para dados do relatório |
| drizzle/XXXX_*.sql | 5 | Migration para coluna 	otal_print |

---

## Quebra de Tarefas

### FASE 1: Filtrar Jobs Incompletos (P0)

> **Objetivo:** Excluir jobs onde campos obrigatórios são nulos ou —.

#### Tarefa 1.1: Criar função isJobComplete()

**Arquivo:** src/main/db/database.ts

`	ypescript
/**
 * Verifica se um job tem TODOS os campos obrigatórios preenchidos.
 * Critérios: ink_total_cc > 0 E pass_count NOT NULL E resolution_dpi NOT NULL
 *            E print_direction NOT NULL E pages NOT NULL E copy_number NOT NULL
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
`

**INPUT:** Objeto job com campos potencialmente nulos  
**OUTPUT:** oolean — 	rue se completo, alse caso contrário  
**VERIFY:** Testar com jobs que têm passCount: null, inkTotalCc: 0, etc.

---

#### Tarefa 1.2: Filtrar antes do insert no syncer

**Arquivo:** src/main/sync/syncer.ts

**Onde:** Dentro de unSyncInternal() e esyncAllJobsInternal(), ANTES de chamar insertJob()

`	ypescript
// ANTES de insertJob() ou db.insert(jobs)...
import { isJobComplete } from '../db/database'

const jobData = {
  folderTimestamp: folder,
  jobName: parsed.jobName,
  // ... todos os campos
  pages: parsed.pages,
  copyNumber: copyNumber,
  passCount: passCount,
  resolutionDpi: resolutionDpi,
  printDirection: printDirection,
  rawXmlPath: elmXmlPath
}

if (!isJobComplete(jobData)) {
  result.skipped++
  continue  // ou continue no loop
}

insertJob(jobData)
result.imported++
`

**Aplicar em ambas as funções:**
- unSyncInternal() (linha ~184)
- esyncAllJobsInternal() (linha ~381)

**INPUT:** Job parseado do XML  
**OUTPUT:** Job só é inserido se completo; senão incrementa skipped  
**VERIFY:** Sincronizar com XMLs que têm campos faltando ? devem ser ignorados

---

#### Tarefa 1.3: Filtrar na consulta getJobs()

**Arquivo:** src/main/db/database.ts

**Opção recomendada:** Adicionar filtro na query SQL (mais eficiente que filtrar pós-consulta)

`	ypescript
export function getJobs(filters?: {
  startDate?: string
  endDate?: string
  search?: string
  inkMin?: number
  inkMax?: number
  completeOnly?: boolean  // ? NOVO PARÂMETRO
}): JobRow[] {
  try {
    const conditions: SQL[] = []

    // ... filtros existentes ...

    // NOVO: Filtrar apenas jobs completos
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
`

**Importar:** gt e isNotNull do drizzle-orm

**INPUT:** Filtros opcionais  
**OUTPUT:** Array de jobs completos quando completeOnly: true  
**VERIFY:** Chamar getJobs({ completeOnly: true }) ? nenhum job com campo nulo retornado

---

#### Tarefa 1.4: Filtrar na exportação Excel

**Arquivo:** src/main/export/excelExport.ts

`	ypescript
// Dentro de exportToExcel(), após buscar jobs:
const allJobs = getJobs(filters)
const jobs = allJobs.filter(isJobComplete)  // ? FILTRAR AQUI

if (jobs.length === 0) {
  throw new Error('Nenhum job completo encontrado para exportar com os filtros selecionados.')
}
`

**Importar:** isJobComplete de ../db/database

**INPUT:** Jobs do banco  
**OUTPUT:** Apenas jobs completos no Excel  
**VERIFY:** Exportar ? nenhuma linha com — nas colunas obrigatórias

---

#### Tarefa 1.5: Atualizar tipos do renderer

**Arquivo:** src/renderer/src/types/index.ts

Nenhuma mudança necessária aqui — o filtro é feito no backend. O JobRow já tem os campos corretos.

---

### FASE 2: Corrigir Notificação do Botão Sync (P1)

> **Objetivo:** Só mostrar contagem de novos jobs quando imported > 0.

#### Tarefa 2.1: Retornar 
ewJobs no SyncResult

**Arquivo:** src/main/sync/syncer.ts

O campo imported já representa os novos jobs. Não precisa de campo novo — o problema está na UI.

#### Tarefa 2.2: Corrigir exibição no TopBar

**Arquivo:** src/renderer/src/components/layout/TopBar.tsx

**Problema atual (linha 73):**
`	sx
<span className={lastSyncResult.errs > 0 ? 'text-error ml-1' : 'text-success ml-1'}>
  ({lastSyncResult.imported} novos)
</span>
`

**Correção:**
`	sx
{lastSyncResult.imported > 0 && (
  <span className={lastSyncResult.errs > 0 ? 'text-error ml-1' : 'text-success ml-1'}>
    ({lastSyncResult.imported} novos)
  </span>
)}
`

**INPUT:** Resultado do sync  
**OUTPUT:** Contagem só aparece se imported > 0  
**VERIFY:** Sync sem novos jobs ? mostra "Último sync: HH:MM:SS" sem o parêntese

---

### FASE 3: Abrir Pasta Após Exportação (P1)

> **Objetivo:** Abrir pasta do arquivo salvo automaticamente.

#### Tarefa 3.1: Abrir pasta após exportar Excel

**Arquivo:** src/main/export/excelExport.ts

`	ypescript
import { shell } from 'electron'
import { dirname } from 'path'

// Após await wb.xlsx.writeFile(result.filePath):
const folder = dirname(result.filePath)
shell.openPath(folder)
`

**Adicionar import:** import { shell } from 'electron' (já importado no handlers.ts, mas não no excelExport.ts)

**INPUT:** Caminho do arquivo salvo  
**OUTPUT:** Pasta aberta no explorador  
**VERIFY:** Exportar Excel ? pasta aberta automaticamente

---

#### Tarefa 3.2: Abrir pasta após exportar README

**Arquivo:** src/main/ipc/handlers.ts

**Onde:** Dentro do handler export:readme, após writeFileSync

`	ypescript
// Após writeFileSync(result.filePath, content, 'utf-8'):
const folder = dirname(result.filePath)
shell.openPath(folder)

return { success: true, filePath: result.filePath }
`

dirname já está disponível via import de path (linha 4). shell já está importado (linha 1).

**INPUT:** Caminho do README salvo  
**OUTPUT:** Pasta aberta no explorador  
**VERIFY:** Exportar README ? pasta aberta automaticamente

---

### FASE 4: Link GitHub no Sidebar (P2)

> **Objetivo:** Tornar o link GitHub mais visível com ícone.

#### Tarefa 4.1: Atualizar footer do Sidebar

**Arquivo:** src/renderer/src/components/layout/Sidebar.tsx

**Observação:** O link já existe (linha 46-48), mas é discreto. Vamos torná-lo mais visível com ícone SVG.

**Substituir (linhas 46-48):**
`	sx
<a href="https://github.com/felipeneneu" target="_blank" rel="noopener noreferrer" className="text-[10px] opacity-60 hover:text-brand-pink transition-colors duration-200">
  github.com/felipeneneu
</a>
`

**Por:**
`	sx
<a
  href="https://github.com/felipeneneu"
  target="_blank"
  rel="noopener noreferrer"
  className="flex items-center gap-2 text-[11px] text-text-muted hover:text-brand-pink transition-colors duration-200 group"
>
  <svg className="w-4 h-4 opacity-60 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
  GitHub
</a>
`

**INPUT:** Renderização do sidebar  
**OUTPUT:** Link GitHub com ícone SVG visível  
**VERIFY:** Sidebar mostra ícone GitHub + texto "GitHub", abre link ao clicar

---

### FASE 5: Calcular Total Impressão (P0)

> **Objetivo:** Adicionar 	otal_print = copy_number × pages ao DB e Excel.

#### Tarefa 5.1: Adicionar coluna 	otal_print ao schema

**Arquivo:** src/main/db/schema.ts

`	ypescript
export const jobs = sqliteTable('jobs', {
  // ... campos existentes ...
  copyNumber: integer('copy_number'),
  totalPrint: integer('total_print'),  // ? NOVO
  passCount: integer('pass_count'),
  // ...
})
`

**INPUT:** Schema atual  
**OUTPUT:** Nova coluna 	otal_print no schema  
**VERIFY:** 
px drizzle-kit generate cria migration com a nova coluna

---

#### Tarefa 5.2: Criar migration

**Comando:**
`ash
npx drizzle-kit generate
`

Isso criará um arquivo em drizzle/ com:
`sql
ALTER TABLE jobs ADD COLUMN total_print INTEGER;
`

**INPUT:** Schema atualizado  
**OUTPUT:** Arquivo de migration  
**VERIFY:** Migration existe e contém ALTER TABLE jobs ADD COLUMN total_print

---

#### Tarefa 5.3: Atualizar runMigrations()

**Arquivo:** src/main/db/database.ts

Adicionar 	otal_print ao CREATE TABLE (para novas instalações):

`sql
CREATE TABLE IF NOT EXISTS jobs (
  -- ... campos existentes ...
  copy_number            INTEGER,
  total_print            INTEGER,  -- ? ADICIONAR
  pass_count             INTEGER,
  -- ...
);
`

**INPUT:** SQL de criação da tabela  
**OUTPUT:** Tabela criada com coluna 	otal_print  
**VERIFY:** Appinit() cria tabela com a nova coluna

---

#### Tarefa 5.4: Calcular totalPrint no syncer

**Arquivo:** src/main/sync/syncer.ts

**Onde:** Após obter copyNumber e pages, calcular:

`	ypescript
const totalPrint = (copyNumber != null && parsed.pages != null)
  ? copyNumber * parsed.pages
  : null

// Adicionar ao jobData:
const jobData = {
  // ... campos existentes ...
  copyNumber: copyNumber,
  totalPrint: totalPrint,  // ? NOVO
  pages: parsed.pages,
  // ...
}
`

**Aplicar em:**
- unSyncInternal() (após linha ~204)
- esyncAllJobsInternal() (após linha ~400)

**INPUT:** copyNumber e pages do XML  
**OUTPUT:** 	otal_print calculado e salvo  
**VERIFY:** Sync de job com copyNumber=3, pages=10 ? 	otal_print=30 no banco

---

#### Tarefa 5.5: Atualizar insertJob() e upsert

**Arquivo:** src/main/db/database.ts

A função insertJob() já aceita Omit<JobRow, 'id' | 'createdAt' | 'syncedToApi'>, então 	otalPrint será incluído automaticamente via tipo.

Nenhuma mudança necessária na função em si.

---

#### Tarefa 5.6: Atualizar tipos do renderer

**Arquivo:** src/renderer/src/types/index.ts

Adicionar 	otalPrint ao JobRow:

`	ypescript
export interface JobRow {
  // ... campos existentes ...
  copyNumber: number | null
  totalPrint: number | null  // ? NOVO
  passCount: number | null
  // ...
}
`

**INPUT:** Interface JobRow  
**OUTPUT:** Campo 	otalPrint adicionado  
**VERIFY:** TypeScript compila sem erros

---

#### Tarefa 5.7: Atualizar exportação Excel

**Arquivo:** src/main/export/excelExport.ts

**Mudanças:**

1. **Remover** colunas "Cópia" e "Página" dos headers
2. **Adicionar** coluna "Total Impressão" após "Total" (tinta)
3. **Adicionar** formatação e largura da nova coluna

**Headers (linha 89-93) — ANTES:**
`	ypescript
const headers = [
  'Nome', 'Cópia', 'Resoluçao', 'Passadas', 'Direcao da impressão',
  'C', 'M', 'Y', 'K', 'B', 'B2', 'V', 'V3',
  'Total', 'Tempo', 'Tamanho', 'Pagina'
]
`

**DEPOIS:**
`	ypescript
const headers = [
  'Nome', 'Resoluçao', 'Passadas', 'Direcao da impressão',
  'C', 'M', 'Y', 'K', 'B', 'B2', 'V', 'V3',
  'Total', 'Total Impressão', 'Tempo', 'Tamanho'
]
`

**Dados (linha 124-142) — ANTES:**
`	ypescript
const values = [
  job.jobName,
  job.copyNumber ?? '',
  formatResolution(job.resolutionDpi),
  job.passCount ?? '',
  formatDirection(job.printDirection),
  formatInk(job.inkCyanCc),
  formatInk(job.inkMagentaCc),
  formatInk(job.inkYellowCc),
  formatInk(job.inkBlackCc),
  formatInk(job.inkWhite1Cc),
  formatInk(job.inkWhite2Cc),
  formatInk(job.inkVarnish1Cc),
  formatInk(job.inkVarnish2Cc),
  formatInk(job.inkTotalCc),
  formatMs(job.printTimeMs),
  formatDimension(job.widthMm, job.heightMm),
  job.pages ?? ''
]
`

**DEPOIS:**
`	ypescript
const values = [
  job.jobName,
  formatResolution(job.resolutionDpi),
  job.passCount ?? '',
  formatDirection(job.printDirection),
  formatInk(job.inkCyanCc),
  formatInk(job.inkMagentaCc),
  formatInk(job.inkYellowCc),
  formatInk(job.inkBlackCc),
  formatInk(job.inkWhite1Cc),
  formatInk(job.inkWhite2Cc),
  formatInk(job.inkVarnish1Cc),
  formatInk(job.inkVarnish2Cc),
  formatInk(job.inkTotalCc),
  job.totalPrint ?? '',  // ? NOVO: Total Impressão
  formatMs(job.printTimeMs),
  formatDimension(job.widthMm, job.heightMm)
]
`

**Largura das colunas (após linha 163) — ajustar:**
`	ypescript
ws.getColumn(1).width = 78   // Nome
ws.getColumn(2).width = 20   // Resolução
ws.getColumn(3).width = 11   // Passadas
ws.getColumn(4).width = 22   // Direção
// Colunas 5-12: C,M,Y,K,B,B2,V,V3 (automático)
ws.getColumn(13).width = 9.8  // Total (tinta)
ws.getColumn(14).width = 14   // Total Impressão ? NOVO
ws.getColumn(15).width = 12.7 // Tempo
ws.getColumn(16).width = 18.1 // Tamanho
`

**Merged cells (linha 73) — ajustar range:**
`	ypescript
ws.mergeCells('A1:P1')  // Era Q1, agora P1 (1 coluna a menos)
`

**INPUT:** Jobs com 	otalPrint  
**OUTPUT:** Excel com coluna "Total Impressão", sem "Cópia" e "Página"  
**VERIFY:** Abrir Excel ? coluna "Total Impressão" presente, "Cópia" e "Página" ausentes

---

### FASE 6: Tela de Relatório Mensal (P2)

> **Objetivo:** Criar página de relatório mensal com gráfico de barras.

#### Tarefa 6.1: Adicionar função getMonthlyReport() no DB

**Arquivo:** src/main/db/database.ts

`	ypescript
export interface MonthlyReportRow {
  month: string          // 'YYYY-MM'
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
    const rows = db.all(sql
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
    ) as any[]

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
`

**Importar:** sql de drizzle-orm

**INPUT:** Tabela jobs  
**OUTPUT:** Array com consumo mensal agregado  
**VERIFY:** getMonthlyReport() retorna dados corretos por mês

---

#### Tarefa 6.2: Criar IPC handler

**Arquivo:** src/main/ipc/handlers.ts

`	ypescript
import { getMonthlyReport } from '../db/database'

// Dentro de registerIpcHandlers():
ipcMain.handle('report:monthly', () => {
  try {
    return getMonthlyReport()
  } catch (err: any) {
    console.error('[IPC] report:monthly error:', err.message)
    return []
  }
})
`

**INPUT:** Chamada IPC  
**OUTPUT:** Dados do relatório mensal  
**VERIFY:** window.api.monthlyReport() retorna array de MonthlyReportRow

---

#### Tarefa 6.3: Atualizar preload

**Arquivo:** src/preload/index.ts

`	ypescript
// Adicionar ao objeto api:
monthlyReport: () => ipcRenderer.invoke('report:monthly'),
`

**INPUT:** API do preload  
**OUTPUT:** Nova função monthlyReport disponível  
**VERIFY:** window.api.montharyReport é uma função

---

#### Tarefa 6.4: Atualizar tipos

**Arquivo:** src/renderer/src/types/index.ts

`	ypescript
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

// Adicionar ao Window.api:
declare global {
  interface Window {
    api: {
      // ... existente ...
      monthlyReport: () => Promise<MonthlyReportRow[]>
    }
  }
}
`

**INPUT:** Tipos  
**OUTPUT:** Interface e API declaration atualizadas  
**VERIFY:** TypeScript compila sem erros

---

#### Tarefa 6.5: Criar hook useMonthlyReport

**Arquivo:** src/renderer/src/hooks/useMonthlyReport.ts (NOVO)

`	ypescript
import { useQuery } from '@tanstack/react-query'

export function useMonthlyReport() {
  return useQuery({
    queryKey: ['monthlyReport'],
    queryFn: () => window.api.monthlyReport(),
    staleTime: 60_000,
  })
}
`

**INPUT:** Query key  
**OUTPUT:** Hook que retorna dados do relatório  
**VERIFY:** useMonthlyReport() retorna { data, isLoading }

---

#### Tarefa 6.6: Criar página MonthlyReport.tsx

**Arquivo:** src/renderer/src/pages/MonthlyReport.tsx (NOVO)

**Estrutura:**
`	sx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useMonthlyReport } from '../hooks/useMonthlyReport'
import { StatCard } from '../components/ui/StatCard'

const COLOR_MAP = [
  { key: 'cyanCc', label: 'Ciano', color: '#06b6d4' },
  { key: 'magentaCc', label: 'Magenta', color: '#ec4899' },
  { key: 'yellowCc', label: 'Amarelo', color: '#eab308' },
  { key: 'blackCc', label: 'Preto', color: '#1c1917' },
  { key: 'white1Cc', label: 'Branco 1', color: '#e2e8f0' },
  { key: 'white2Cc', label: 'Branco 2', color: '#cbd5e1' },
  { key: 'varnish1Cc', label: 'Verniz 1', color: '#818cf8' },
  { key: 'varnish2Cc', label: 'Verniz 2', color: '#6366f1' },
]

export default function MonthlyReport() {
  const { data: report = [], isLoading } = useMonthlyReport()

  // Calcular totais gerais
  const totalJobs = report.reduce((acc, r) => acc + r.jobCount, 0)
  const totalInk = report.reduce((acc, r) => acc + r.totalInkCc, 0)
  const totalPrintTimeH = report.reduce((acc, r) => acc + r.totalPrintTimeMs, 0) / 1000 / 3600

  // Preparar dados para gráfico de barras
  const chartData = report.map(r => ({
    month: r.month,
    ...Object.fromEntries(COLOR_MAP.map(c => [c.label, r[c.key as keyof typeof r] as number]))
  }))

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Relatório Mensal</h1>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-5">
        <StatCard title="Total de Jobs" value={totalJobs.toLocaleString('pt-BR')} subtext="Processados" />
        <StatCard title="Consumo Total" value={${totalInk.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cc} subtext="Todas as cores" />
        <StatCard title="Tempo de Máquina" value={${totalPrintTimeH.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} h} subtext="Imprimindo" />
      </div>

      {/* Gráfico de barras */}
      <div className="bg-bg-surface border border-bg-border rounded-xl p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Consumo Mensal por Cor</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2545" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1830', borderColor: '#2d2545', borderRadius: '8px' }}
                itemStyle={{ color: '#f0edf8' }}
                formatter={(val: number) => [${val.toFixed(2)} cc]}
              />
              <Legend />
              {COLOR_MAP.map(c => (
                <Bar key={c.key} dataKey={c.label} fill={c.color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela detalhada */}
      <div className="bg-bg-surface border border-bg-border rounded-xl p-5 shadow-lg shadow-black/20">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Detalhamento por Mês</h3>
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-text-muted border-b border-bg-border">
                <th className="pb-3 font-medium">Mês</th>
                <th className="pb-3 font-medium text-right">Jobs</th>
                <th className="pb-3 font-medium text-right">Total Tinta (cc)</th>
                <th className="pb-3 font-medium text-right">Tempo (h)</th>
              </tr>
            </thead>
            <tbody>
              {report.map(r => (
                <tr key={r.month} className="border-b border-bg-border/50 hover:bg-bg-elevated/50 transition-colors">
                  <td className="py-3 font-medium text-brand-pink">{formatMonth(r.month)}</td>
                  <td className="py-3 text-right">{r.jobCount}</td>
                  <td className="py-3 text-right tabular-nums">{r.totalInkCc.toFixed(2)}</td>
                  <td className="py-3 text-right tabular-nums">{(r.totalPrintTimeMs / 1000 / 3600).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return ${months[parseInt(m) - 1]} 
}
`

**INPUT:** Dados do relatório  
**OUTPUT:** Página com cards, gráfico de barras e tabela  
**VERIFY:** Página renderiza corretamente com dados de teste

---

#### Tarefa 6.7: Adicionar rota no App.tsx

**Arquivo:** src/renderer/src/App.tsx

`	ypescript
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'))

// Adicionar ao routeTitles:
const routeTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/jobs': 'Histórico de Jobs',
  '/settings': 'Configurações',
  '/reports/monthly': 'Relatório Mensal',  // ? NOVO
}

// Adicionar rota dentro do Route element={<AppLayout />}>
<Route path="/reports/monthly" element={<MonthlyReport />} />
`

**INPUT:** Router config  
**OUTPUT:** Rota /reports/monthly funcionando  
**VERIFY:** Navegar para /reports/monthly ? página carrega

---

#### Tarefa 6.8: Adicionar navegação no Sidebar

**Arquivo:** src/renderer/src/components/layout/Sidebar.tsx

`	ypescript
const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/jobs', label: 'Histórico de Jobs' },
  { path: '/reports/monthly', label: 'Relatório Mensal' },  // ? NOVO
  { path: '/settings', label: 'Configurações' },
]
`

**INPUT:** Lista de navItems  
**OUTPUT:** Link "Relatório Mensal" no sidebar  
**VERIFY:** Sidebar mostra 4 itens, "Relatório Mensal" navega corretamente

---

## Ordem de Implementação

`
+-------------------------------------------------------------+
¦  FASE 5: Total Impressão (schema + migration)               ¦
¦  (DB schema primeiro — dependência para outras fases)        ¦
+-------------------------------------------------------------+
                          ¦
+-------------------------?-----------------------------------+
¦  FASE 1: Filtrar Jobs Incompletos                            ¦
¦  (Função isJobComplete + aplicação em syncer/DB/export)     ¦
+-------------------------------------------------------------+
                          ¦
          +---------------+---------------+
          ¦               ¦               ¦
+---------?-----+ +------?------+ +------?------+
¦ FASE 2: Sync  ¦ ¦ FASE 3:     ¦ ¦ FASE 4:     ¦
¦ Button Fix    ¦ ¦ Open Folder ¦ ¦ GitHub Link ¦
¦ (independente)¦ ¦ (independ.) ¦ ¦ (independ.) ¦
+---------------+ +-------------+ +-------------+
          ¦               ¦               ¦
          +---------------+---------------+
                          ¦
+-------------------------?-----------------------------------+
¦  FASE 6: Relatório Mensal                                    ¦
¦  (Última — depende de schema e DB estarem corretos)         ¦
+-------------------------------------------------------------+
`

**Resumo da ordem:**
1. **FASE 5** (schema) ? DB schema primeiro
2. **FASE 1** (filtros) ? Core logic
3. **FASES 2, 3, 4** ? Paralelo (independentes)
4. **FASE 6** (relatório) ? Última

---

## Checklist de Verificação

### FASE 1: Filtrar Jobs Incompletos
- [ ] isJobComplete() retorna alse para jobs com campos nulos
- [ ] isJobComplete() retorna alse para ink_total_cc = 0
- [ ] isJobComplete() retorna 	rue para jobs com todos os campos
- [ ] Sync ignorar jobs incompletos (incrementa skipped)
- [ ] getJobs({ completeOnly: true }) retorna só completos
- [ ] Excel exportado não tem linhas com —

### FASE 2: Sync Button Fix
- [ ] Sync sem novos jobs ? "Último sync: HH:MM:SS" (sem parêntese)
- [ ] Sync com 3 novos jobs ? "Último sync: HH:MM:SS (3 novos)"

### FASE 3: Open Folder After Export
- [ ] Exportar Excel ? pasta aberta no explorador
- [ ] Exportar README ? pasta aberta no explorador

### FASE 4: GitHub Link
- [ ] Sidebar mostra ícone GitHub + texto
- [ ] Clicar abre github.com/felipeneneu no navegador

### FASE 5: Total Impressão
- [ ] Migration criada com ALTER TABLE jobs ADD COLUMN total_print
- [ ] Schema tem campo 	otalPrint
- [ ] Sync calcula 	otalPrint = copyNumber * pages
- [ ] Excel tem coluna "Total Impressão" (sem "Cópia" e "Página")
- [ ] 	otalPrint é 
ull quando copyNumber ou pages é nulo

### FASE 6: Relatório Mensal
- [ ] getMonthlyReport() retorna dados agregados por mês
- [ ] Handler IPC eport:monthly registrado
- [ ] Preload tem monthlyReport()
- [ ] Página renderiza gráfico de barras
- [ ] Sidebar tem link "Relatório Mensal"
- [ ] Rota /reports/monthly funciona

### Final
- [ ] 
pm run build passa sem erros
- [ ] 
pm run lint passa sem erros
- [ ] App funciona em dev mode (
pm run dev)

---

## Arquivos Afetados (Resumo)

| Arquivo | Ação | Fases |
|---------|------|-------|
| src/main/db/schema.ts | Editar | 5 |
| src/main/db/database.ts | Editar | 1, 5, 6 |
| src/main/sync/syncer.ts | Editar | 1, 5 |
| src/main/export/excelExport.ts | Editar | 1, 3, 5 |
| src/main/ipc/handlers.ts | Editar | 3, 6 |
| src/preload/index.ts | Editar | 6 |
| src/renderer/src/types/index.ts | Editar | 5, 6 |
| src/renderer/src/components/layout/TopBar.tsx | Editar | 2 |
| src/renderer/src/components/layout/Sidebar.tsx | Editar | 4, 6 |
| src/renderer/src/App.tsx | Editar | 6 |
| src/renderer/src/pages/MonthlyReport.tsx | Criar | 6 |
| src/renderer/src/hooks/useMonthlyReport.ts | Criar | 6 |
| drizzle/XXXX_*.sql | Criar | 5 |

**Total: 13 arquivos (11 editados + 2 criados)**

---

## Estimativa de Esforço

| Fase | Complexidade | Tempo Est. |
|------|-------------|------------|
| FASE 5 (schema) | Média | 15 min |
| FASE 1 (filtros) | Média | 20 min |
| FASE 2 (sync fix) | Baixa | 5 min |
| FASE 3 (open folder) | Baixa | 5 min |
| FASE 4 (GitHub link) | Baixa | 5 min |
| FASE 6 (relatório) | Alta | 40 min |
| **Total** | | **~90 min** |

---

## ?? Pontos de Atenção

1. **Migration:** Rodar 
px drizzle-kit generate após alterar schema
2. **isJobComplete:** Usar em TODOS os pontos de inserção/consulta
3. **Excel columns:** Ajustar merged cells range (A1:Q1 ? A1:P1)
4. **MonthlyReport:** Usar sql template do Drizzle para queries raw
5. **Backward compatibility:** Jobs antigos sem 	otalPrint terão 
ull (ok)
