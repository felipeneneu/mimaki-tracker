# DPI Mimaki Tracker

App desktop de análise de produção Mimaki RasterLink6Plus, construído com Electron, React, TypeScript e SQLite.

## Recursos
- Parse automático e defensivo de XML (`ElementDir.xml`) do RasterLink.
- Extração de custos de tintas por canal, tempo de impressão.
- Checkpoint inteligente com SQLite (zero duplicação de jobs).
- Dashboard analítico.
- Exportação para Excel e envio em batch para API Next.js.
- Sincronização automática via `node-cron` a cada 15 min.

## Como rodar localmente

1. `npm install`
2. `npm run dev`

### Testes do Parser

Validado contra um fixture real (`ElementDir.xml` da produção). Para rodar os testes:
```bash
npm run test
```

## Como empacotar (Windows)

```bash
npm run package
```
Isto gerará um instalador e um executável standalone na pasta `dist-app/`.
