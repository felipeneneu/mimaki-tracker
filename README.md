# DPI Mimaki Tracker

Aplicação desktop Electron para rastreamento de produção e análise de custos de tinta Mimaki RasterLink6Plus.

## Tech Stack

- **Frontend**: React 18 + TypeScript + TailwindCSS + React Query
- **Backend**: Electron 30 + Node.js
- **Database**: SQLite (better-sqlite3)
- **Build**: electron-vite + electron-builder
- **Charts**: Recharts
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Auto-update**: electron-updater (GitHub Releases)

## Estrutura de Pastas

```
mimaki-tracker/
├── src/
│   ├── main/                    # Processo principal (Node.js)
│   │   ├── db/                  # Schema SQLite, migrações, CRUD
│   │   │   ├── database.ts
│   │   │   └── migrations.ts
│   │   ├── ipc/                 # Handlers IPC (main ↔ renderer)
│   │   │   └── handlers.ts
│   │   ├── parser/              # Parsers XML do RasterLink
│   │   │   ├── xmlParser.ts
│   │   │   └── xmlParser.test.ts
│   │   ├── sync/                # Sincronização automática
│   │   │   ├── syncer.ts
│   │   │   └── scheduler.ts
│   │   ├── export/              # Exportação XLSX e API
│   │   │   ├── excelExport.ts
│   │   │   ├── apiSync.ts
│   │   │   └── *.test.ts
│   │   ├── updater.ts           # Auto-update via GitHub Releases
│   │   └── index.ts             # Entry point do Electron
│   ├── preload/                 # Bridge seguro (contextBridge)
│   │   └── index.ts
│   └── renderer/                # Frontend React
│       └── src/
│           ├── components/
│           │   ├── layout/      # TopBar, Sidebar
│           │   ├── ui/          # Skeleton, StatCard
│           │   └── dev/         # Terminal de desenvolvimento
│           ├── hooks/           # React Query hooks
│           ├── pages/           # Dashboard, JobsList, JobDetail, Settings
│           ├── lib/             # QueryClient config
│           ├── types/           # TypeScript interfaces
│           └── App.tsx          # Router + lazy loading
├── e2e/                         # Testes E2E (Playwright)
├── tests/fixtures/              # Fixtures XML para testes
├── agent/agents/                # Definições de agentes de auditoria
└── electron-builder.yml         # Configuração de build
```

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build production
npm run build

# Empacotar (build + electron-builder)
npm run package

# Testes unitários
npm run test

# Testes E2E
npm run test:e2e

# Testes E2E com UI
npm run test:e2e:ui
```

## Terminal de Desenvolvimento

Acesse o terminal de desenvolvimento pressionando **Shift+T**.

### Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `help` | Lista todos os comandos |
| `version` | Mostra versão do app |
| `show-db-path` | Mostra caminho do banco de dados |
| `reset-checkpoint` | Reseta checkpoint de sincronização |
| `re-sync` | Força re-sincronização completa |
| `clear-db` | Limpa o banco de dados (requer confirmação) |
| `export-db` | Exporta cópia do banco de dados |
| `open-data-folder` | Abre a pasta de dados no explorador |

### Segurança

- **Produção**: Terminal protegido por senha (SHA-256 hashed)
- **3 tentativas falhas**: Bloqueio por 5 minutos
- **Desenvolvimento**: Acesso direto sem senha

## Auto-Update

O app verifica atualizações automaticamente via GitHub Releases.

### Configuração

1. Crie um release no GitHub com tag `v2.0.0`
2. Adicione os arquivos de build como assets
3. O app detecta e instala atualizações automaticamente

### Fluxo

1. Verificação a cada 4 horas (via setTimeout recursivo)
2. Download em background
3. Notificação ao usuário
4. Reinicialização para instalar

## Banco de Dados

### Schema principal

```sql
CREATE TABLE jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_timestamp TEXT UNIQUE NOT NULL,
  job_name TEXT,
  order_code TEXT,
  quantity_units INTEGER,
  ink_cyan_cc REAL,
  ink_magenta_cc REAL,
  ink_yellow_cc REAL,
  ink_black_cc REAL,
  ink_white1_cc REAL,
  ink_white2_cc REAL,
  ink_varnish1_cc REAL,
  ink_varnish2_cc REAL,
  ink_total_cc REAL,
  print_time_ms INTEGER,
  rip_time_ms INTEGER,
  width_mm REAL,
  height_mm REAL,
  spool_date TEXT,
  last_print_date TEXT,
  pages INTEGER,
  pass_count INTEGER,
  resolution_dpi INTEGER,
  print_direction TEXT,
  raw_xml_path TEXT,
  synced_to_api INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Migrações

- Migrações automáticas ao iniciar
- `INSERT OR REPLACE` para jobs existentes
- Auto-migração de path com `\Elm` para path correto

## Sincronização

### Manual
- Clique em "Sincronizar Agora" na TopBar
- Atalho: **Shift+T** (apenas no dev)

### Automática
- Cron a cada 15 minutos
- Concorrência bloqueada (flag `isSyncing`)
- Notificação via IPC `sync:completed`

### Correlação XML

Os XMLs são correlacionados por IDs (não por timestamps de pasta):

```
ElementDir.xml → CompositeDir.xml (via elementID)
                → LayoutDir.xml (via compositeID)
```

## Exportação XLSX

Formato que espelha a planilha `Consumo Mimaki.xlsx`:

| Coluna | Descrição |
|--------|-----------|
| Nome | Nome do job |
| Resoluçao | `600x600 VD` |
| Passadas | Número de passadas |
| Direcao da impressão | Unidirecional/Bidirecional |
| C, M, Y, K, B, B2, V, V3 | Tinta por canal (cc) |
| Total | Total de tinta (cc) |
| Tempo | Tempo de impressão |
| Tamanho | Largura x Altura (mm) |
| Pagina | Número de páginas |

## Licença

MIT
