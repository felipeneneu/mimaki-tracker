# Regras e Workflow do Agente: Mobile Developer

## Anti-Padrões (NUNCA Faça Isso!)

### Pecados de Performance

| ❌ NUNCA | ✅ SEMPRE |
|----------|----------|
| `ScrollView` para listas | `FlatList` / `FlashList` / `ListView.builder` |
| `renderItem` inline | `useCallback` + `React.memo` |
| `keyExtractor` ausente | ID único estável dos dados |
| `useNativeDriver: false` | `useNativeDriver: true` |
| `console.log` em produção | Remover antes do lançamento |
| `setState()` para tudo | Estado direcionado, construtores `const` |

**Por quê?** Listas com `ScrollView` carregam TUDO na memória. Se você tem 1000 itens, são 1000 componentes renderizados. `FlatList` renderiza apenas os visíveis.

---

### Pecados de Toque/UX

| ❌ NUNCA | ✅ SEMPRE |
|----------|----------|
| Alvo de toque < 44px | Mínimo 44pt (iOS) / 48dp (Android) |
| Espaçamento < 8px | Mínimo 8-12px entre alvos |
| Só gesto (sem botão) | Fornecer alternativa visível |
| Sem estado de loading | SEMPRE mostrar feedback de carregamento |
| Sem estado de erro | Mostrar erro com opção de retry |
| Sem tratamento offline | Degradação graciosa, dados em cache |

**Por quê?** Dedos são grandes e imprecisos. Botões pequenos causam cliques errados. Sem loading, o usuário pensa que o app travou.

---

### Pecados de Segurança

| ❌ NUNCA | ✅ SEMPRE |
|----------|----------|
| Token no `AsyncStorage` | `SecureStore` / `Keychain` |
| Chaves de API hardcoded | Variáveis de ambiente |
| Pular SSL pinning | Fixar certificados em produção |
| Logar dados sensíveis | Nunca logar tokens, senhas, PII |

**Por quê?** `AsyncStorage` é armazenamento simples, qualquer app pode ler. `SecureStore` usa o keychain do dispositivo.

---

## Checkpoint Obrigatório

> **Antes de escrever QUALQUER código mobile, complete este checkpoint:**

```
🧠 CHECKPOINT:

Plataforma:  [ iOS / Android / Ambos ]
Framework:   [ React Native / Flutter / SwiftUI / Kotlin ]
Arquivos Lidos: [ Lista os arquivos de habilidade que você leu ]

3 Princípios que Vou Aplicar:
1. _______________
2. _______________
3. _______________

Anti-Padrões que Vou Evitar:
1. _______________
2. _______________
```

**Exemplo:**
```
🧠 CHECKPOINT:

Plataforma:  iOS + Android (Cross-platform)
Framework:   React Native + Expo
Arquivos Lidos: SKILL.md, touch-psychology.md, mobile-performance.md, platform-ios.md, platform-android.md

3 Princípios que Vou Aplicar:
1. FlatList com React.memo + useCallback para todas as listas
2. Alvos de toque 48px, zona do polegar para CTAs principais
3. Navegação específica por plataforma (swipe lateral iOS, botão voltar Android)

Anti-Padrões que Vou Evitar:
1. ScrollView para listas → FlatList
2. renderItem inline → Memoizado
3. AsyncStorage para tokens → SecureStore
```

> 🔴 **Não consegue preencher o checkpoint? → VOLTE E LEIA OS ARQUIVOS DE HABILIDADE.**

---

## Processo Decisório de Desenvolvimento

### Fase 1: Análise de Requisitos (SEMPRE PRIMEIRO)

Antes de qualquer código, responda:
- **Plataforma**: iOS, Android ou ambos?
- **Framework**: React Native, Flutter ou nativo?
- **Offline**: O que precisa funcionar sem rede?
- **Auth**: Que autenticação é necessária?

→ Se algum desses for incerto → **PERGUNTE AO USUÁRIO**

### Fase 2: Arquitetura

Aplique os frameworks de decisão de `decision-trees.md`:
- Seleção de framework
- Gerenciamento de estado
- Padrão de navegação
- Estratégia de armazenamento

### Fase 3: Executar

Construa camada por camada:
1. Estrutura de navegação
2. Telas principais (listas memoizadas!)
3. Camada de dados (API, armazenamento)
4. Polimento (animações, haptics)

### Fase 4: Verificação

Antes de completar:
- [ ] Performance: 60fps em dispositivo低端?
- [ ] Toque: Todos os alvos ≥ 44-48px?
- [ ] Offline: Degradação graciosa?
- [ ] Segurança: Tokens em SecureStore?
- [ ] A11y: Rótulos em elementos interativos?

---

## Referência Rápida

### Alvos de Toque

```
iOS:     44pt × 44pt mínimo
Android: 48dp × 48dp mínimo
Espaçamento: 8-12px entre alvos
```

### FlatList (React Native)

```typescript
const Item = React.memo(({ item }) => <ItemView item={item} />);
const renderItem = useCallback(({ item }) => <Item item={item} />, []);
const keyExtractor = useCallback((item) => item.id, []);

<FlatList
  data={data}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  getItemLayout={(_, i) => ({ length: H, offset: H * i, index: i })}
/>
```

### ListView.builder (Flutter)

```dart
ListView.builder(
  itemCount: items.length,
  itemExtent: 56, // Altura fixa
  itemBuilder: (context, index) => const ItemWidget(key: ValueKey(id)),
)
```

---

## Controle de Qualidade (Obrigatório)

Após editar qualquer arquivo:
1. **Rodar validação**: Verificação de lint
2. **Verificação de performance**: Listas memoizadas? Animações nativas?
3. **Verificação de segurança**: Sem tokens em armazenamento simples?
4. **Verificação de A11y**: Rótulos em elementos interativos?
5. **Relatar conclusão**: Somente após todas as verificações passarem

---

## Verificação de Build (Obrigatório antes de dizer "Pronto")

> **⛔ Você NÃO PODE declarar um projeto mobile "completo" sem rodar builds reais!**

### Por que isso é não negociável

```
IA escreve código → "Parece bom" → Usuário abre Android Studio → ERROS DE BUILD!
Isso é INACEITÁVEL.

IA DEVE:
├── Rodar o comando de build real
├── Verificar se compila
├── Corrigir quaisquer erros
└── SOMENTE ENTÃO dizer "pronto"
```

### Comandos por Framework

| Framework | Build Android | Build iOS |
|-----------|---------------|-----------|
| **React Native (Bare)** | `cd android && ./gradlew assembleDebug` | `cd ios && xcodebuild -workspace App.xcworkspace -scheme App` |
| **Expo (Dev)** | `npx expo run:android` | `npx expo run:ios` |
| **Expo (EAS)** | `eas build --platform android --profile preview` | `eas build --platform ios --profile preview` |
| **Flutter** | `flutter build apk --debug` | `flutter build ios --debug` |

### O que verificar após o build

```
SAÍDA DO BUILD:
├── ✅ BUILD BEM-SUCEDIDO → Prosseguir
├── ❌ BUILD FALHOU → CORRIGIR antes de continuar
│   ├── Ler mensagem de erro
│   ├── Corrigir o problema
│   ├── Rodar build novamente
│   └── Repetir até sucesso
└── ⚠️ AVISOS → Revisar, corrigir se críticos
```

### Erros Comuns de Build

| Tipo de Erro | Causa | Correção |
|--------------|-------|----------|
| **Gradle sync failed** | Versão de dependência incompatível | Verificar `build.gradle`, sincronizar versões |
| **Pod install failed** | Problema de dependência iOS | `cd ios && pod install --repo-update` |
| **Erros TypeScript** | Incompatibilidade de tipos | Corrigir definições de tipo |
| **Imports faltando** | Auto-import falhou | Adicionar imports faltando |
| **Versão Android SDK** | `minSdkVersion` muito baixo | Atualizar em `build.gradle` |
| **Target de deployment iOS** | Versão incompatível | Atualizar em Xcode/Podfile |

### Checklist Obrigatório de Build

Antes de dizer "projeto completo":

- [ ] **Build Android roda sem erros** (`./gradlew assembleDebug` ou equivalente)
- [ ] **Build iOS roda sem erros** (se cross-platform)
- [ ] **App inicia no dispositivo/emulador**
- [ ] **Sem erros de console no início**
- [ ] **Fluxos críticos funcionam** (navegação, funcionalidades principais)

> 🔴 **Se você pular a verificação de build e o usuário encontrar erros, você FALHOU.**
> 🔴 **"Funciona na minha cabeça" NÃO é verificação. RODE O BUILD.**

---

> **Lembre-se:** Usuários mobile são impacientes, interrompidos e usam dedos imprecisos em telas pequenas. Projetar para as **piores condições**: rede ruim, uma mão, sol forte, bateria baixa. Se funciona lá, funciona em qualquer lugar.
