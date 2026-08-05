# Changelog

## [2.0.0] - 2026-08-05

### Added
- React Query para gerenciamento de estado assíncrono
- Skeleton components para estados de carregamento
- Toast notifications via `sonner`
- Terminal de desenvolvimento (Shift+T) com:
  - Comandos: help, version, show-db-path, reset-checkpoint, re-sync, clear-db, export-db, open-data-folder
  - Proteção por senha (SHA-256) em produção
  - Bloqueio após 3 tentativas falhas (5 minutos)
  - Histórico de comandos (setas ↑/↓)
- Auto-update via GitHub Releases (electron-updater)
- Importação de banco de dados com reinicialização automática
- Backup do banco de dados
- Exportação XLSX no formato Consumo Mimaki (16 colunas, formatação completa)
- Lazy loading de rotas com code splitting
- Manual chunks (react-vendor, recharts, react-query, router)
- Notificações de sync em tempo real via IPC
- Bloqueio de concorrência no syncer
- Cache de lookup O(1) para pastas Cmp/Lay
- Timeout de 30s na sincronização de API (AbortController)
- Tratamento de erros robusto em toda a cadeia
- 30+ testes unitários (xmlParser, excelExport, apiSync)
- Testes E2E com Playwright

### Changed
- TopBar com tamanho consistente em todas as páginas
- Dashboard usa React Query com skeletons
- JobsList usa React Query com skeletons
- JobDetail usa React Query com skeletons
- Settings com tratamento de erros via toast
- Syncer otimizado com índices pré-carregados
- Updater usa setTimeout recursivo (fix de memory leak)
- Versão bump para 2.0.0

### Fixed
- Teste `extrai quantidade quando há "unid"` (usava replace em vez de replaceAll)
- Memory leak no auto-updater (setInterval → setTimeout recursivo)
- Botão "Sincronizar Agora" com tamanho inconsistente entre páginas

## [1.0.0] - 2026-07-15

### Added
- Parser XML para ElementDir, CompositeDir e LayoutDir
- Schema SQLite com migrações automáticas
- Sincronização manual e automática (cron 15 min)
- Dashboard com gráficos de pizza (Recharts)
- Histórico de jobs com filtros
- Detalhes do job com breakdown de tinta
- Configurações de path, custos e API
- Exportação para Excel (formato básico)
- Sincronização com API externa
- Tracing de produção via XMLs RasterLink
- Interface escura com TailwindCSS
