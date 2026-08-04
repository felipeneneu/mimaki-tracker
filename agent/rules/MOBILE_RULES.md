# Mobile Rules — Hunter Academy

> Regras específicas para o projeto mobile (Expo + React Native)

---

## 1. Tech Stack

| Item | Tecnologia |
|------|------------|
| Framework | React Native + Expo SDK 54 |
| Router | Expo Router (file-based) |
| State | React Query (server) + AsyncStorage (local) |
| UI | Custom components (sem biblioteca externa) |
| Animações | react-native-reanimated |
| Ícones | lucide-react-native |
| Notificações | expo-notifications |

---

## 2. Performance — OBRIGATÓRIO

### Listas
- **SEMPRE** usar `FlatList` para listas com mais de 10 itens
- **SEMPRE** usar `React.memo` em componentes de lista
- **SEMPRE** usar `useCallback` para `renderItem` e `keyExtractor`
- **NUNCA** usar `ScrollView` para listas longas

```tsx
// ✅ CORRETO
const ListItem = React.memo(({ item }: { item: Item }) => (
  <View style={styles.item}>
    <Text>{item.title}</Text>
  </View>
));

const renderItem = useCallback(
  ({ item }: { item: Item }) => <ListItem item={item} />,
  []
);

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
/>
```

```tsx
// ❌ ERRADO
<ScrollView>
  {items.map(item => (
    <View key={item.id}>...</View>
  ))}
</ScrollView>
```

### Animações
- **SEMPRE** usar `useNativeDriver: true`
- **SOMENTE** animar `transform` e `opacity`
- **NUNCA** animar `width`, `height`, `top`, `left`

### State
- State local para dados de UI
- React Query para dados do servidor
- AsyncStorage para persistência local
- **NUNCA** usar Redux para este projeto

---

## 3. Touch & UX — OBRIGATÓRIO

### Touch Targets
- **Mínimo**: 44px (iOS) / 48px (Android)
- **Espaçamento**: 8-12px entre alvos
- **CTAs principais**: na zona do polegar (inferior da tela)

### Estados de UI
- **SEMPRE** ter estado de loading
- **SEMPRE** ter estado de erro com retry
- **SEMPRE** ter estado vazio com mensagem amigável

### Feedback
- **SEMPRE** usar `expo-haptics` ao completar ações
- **SEMPRE** feedback visual imediato (checkmark, cor)

---

## 4. Navegação

### Tab Bar (5 rotas principais)
```
🏠 Home    ✅ Hábitos    📖 Apostila    📊 Stats    ⚙️ Config
```

### Sidebar (apenas na home)
- Ícones lucide-react-native
- Pill indicador de rota ativa

### PageHeader (todas as outras telas)
- ← Voltar + título centralizado
- Componente reutilizável `PageHeader`

---

## 5. Gamificação Unificada

### Sistema de XP
| Fonte | XP |
|-------|-----|
| Hábito diário | +10 |
| Hábito + streak 3 dias | +15 |
| Hábito + streak 7 dias | +25 |
| Compromisso cumprido | +20 |
| Missão completa | +30 |
| Raid completa | +50 |
| Desafio vencido | +100 |

### Streaks
- 3 dias: ×1.5 XP
- 7 dias: ×2 XP
- 14 dias: ×3 XP
- 30 dias: ×4 XP + badge

### Badges
- 🌅 Early Bird
- 💧 Hidratado
- 🧘 Monge
- 📚 Estudioso
- 🏋️ Atleta
- 🎯 Perfeito
- 🔥 Inabalável
- 🏆 Mestre dos Hábitos

---

## 6. Segurança

- **NUNCA** armazenar tokens em AsyncStorage
- **SEMPRE** usar expo-secure-store para dados sensíveis
- **NUNCA** logar dados sensíveis em produção
- **SEMPRE** validar inputs com Zod

---

## 7. Arquitetura de Arquivos

```
app/
├── _layout.tsx          # Root layout + providers
├── index.tsx            # Dashboard principal
├── habitat.tsx          # Dashboard de hábitos
├── habits.tsx           # Lista de hábitos
├── alarms.tsx           # Despertadores
├── agenda.tsx           # Compromissos
├── music.tsx            # Player de músicas
├── timer.tsx            # Pomodoro timer
├── quests.tsx           # Missões
├── stats.tsx            # Estatísticas
├── skills.tsx           # Árvore de skills
├── docs/                # Apostila
├── raids/               # Raids
├── challenge.tsx        # Boss battle
├── prova.tsx            # Quiz
└── config.tsx           # Configurações

components/
├── Avatar.tsx           # Avatar com rank
├── Sidebar.tsx          # Navegação lateral
├── PageHeader.tsx       # ← Voltar + título
├── HabitCard.tsx        # Card de hábito
├── ProgressRing.tsx     # Anel de progresso
├── CodeBlock.tsx        # Código estilo terminal
└── ScreenWrapper.tsx    # Wrapper padrão de telas

lib/
├── api.ts               # Cliente API
├── hooks.ts             # React Query hooks
├── types.ts             # TypeScript types
├── constants.ts         # Ranks, cores
├── habitStore.ts        # Dados de hábitos
├── xpStore.ts           # XP unificado
├── notifications.ts     # Notificações
└── secureStore.ts       # Dados sensíveis
```

---

## 8. Checklist Antes de Cada Feature

```
🧠 CHECKPOINT:

Platform:   iOS + Android (Cross-platform)
Framework:  React Native + Expo SDK 54
Files Read: [list]

3 Principles I Will Apply:
1. FlatList + React.memo + useCallback para listas
2. Touch targets ≥ 44px, loading/error states
3. Haptics ao completar ações

Anti-Patterns I Will Avoid:
1. ScrollView para listas
2. Inline renderItem
3. State desnecessário
```
