# Contribuindo

## Pré-requisitos

- Node.js 18+
- npm 9+
- Git

## Setup

```bash
# Clone o repositório
git clone https://github.com/felipeneneu/mimaki-tracker.git
cd mimaki-tracker

# Instale dependências
npm install

# Inicie em modo desenvolvimento
npm run dev
```

## Estrutura de Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: adicionar auto-update via GitHub Releases
fix: corrigir memory leak no updater
docs: atualizar README com seção de segurança
test: adicionar testes unitários para apiSync
refactor: otimizar syncer com índices pré-carregados
```

## Testes

### Unitários

```bash
# Executar todos os testes
npm run test

# Modo watch
npm run test:watch

# Teste específico
npx vitest run src/main/export/apiSync.test.ts
```

### E2E

```bash
# Executar testes E2E (requer build)
npm run build
npm run test:e2e

# Com UI interativa
npm run test:e2e:ui
```

## Code Style

- TypeScript estrito (`strict: true`)
- Sem comentários desnecessários
- Funções pequenas e focadas
- Tratamento de erros em toda a cadeia
- Usar React Query para dados assíncronos
- Seguir padrões existentes no codebase

## Branches

- `main` — Produção estável
- `develop` — Desenvolvimento
- `feat/*` — Novas funcionalidades
- `fix/*` — Correções de bugs

## Pull Requests

1. Crie uma branch a partir de `develop`
2. Implemente sua mudança
3. Adicione testes se aplicável
4. Execute `npm run test` e `npm run build`
5. Crie o PR com descrição clara

## Agentes de Auditoria

O projeto inclui definições de agentes em `agent/agents/` para auditoria:

- `penetration-tester.md` — Testes de segurança
- `performance-optimizer.md` — Otimização de performance
- `qa-automation-engineer.md` — Automação de testes
- `security-auditor.md` — Auditoria de segurança
- `test-engineer.md` — Engenharia de testes

Esses agentes podem ser usados como referência para revisões de código e auditorias.
