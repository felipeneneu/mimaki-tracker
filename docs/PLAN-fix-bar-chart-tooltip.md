# PLAN: Fix Monthly Report Bar Chart Tooltip

> Corrigir Tooltip do gráfico de barras no Relatório Mensal para funcionar como o da Dashboard.

---

## Problema

O Tooltip do gráfico de barras no MonthlyReport está "bugado" ao passar o mouse:
1. Mostra todas as 8 cores mesmo quando valor é 0
2. Formatter não recebe o `name` (nome da cor) corretamente
3. Inconsistência visual com o Tooltip do Dashboard (pie chart)

---

## Solução

**Arquivo:** `src/renderer/src/pages/MonthlyReport.tsx`

### Mudança 1: Custom Tooltip Component

Criar um componente `CustomTooltip` que:
- Filtra itens com valor > 0 (não mostra cores zeradas)
- Formata cada item como "Cor: X.XXX cc"
- Usa o mesmo estilo do Dashboard

```tsx
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const items = payload.filter((p: any) => p.value > 0)
  if (items.length === 0) return null

  return (
    <div style={{ backgroundColor: '#1e1830', borderColor: '#2d2545', borderRadius: '8px', padding: '8px 12px' }}>
      <p style={{ color: '#f0edf8', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>{label}</p>
      {items.map((item: any) => (
        <p key={item.dataKey} style={{ color: item.color, fontSize: '11px', margin: '2px 0' }}>
          {item.name}: {item.value.toFixed(2)} cc
        </p>
      ))}
    </div>
  )
}
```

### Mudança 2: Substituir Tooltip inline por CustomTooltip

```tsx
// ANTES:
<Tooltip
  contentStyle={{ backgroundColor: '#1e1830', borderColor: '#2d2545', borderRadius: '8px' }}
  itemStyle={{ color: '#f0edf8' }}
  formatter={(val: number) => [`${val.toFixed(2)} cc`]}
/>

// DEPOIS:
<Tooltip content={<CustomTooltip />} />
```

---

## Checklist

- [ ] Tooltip mostra apenas cores com valor > 0
- [ ] Tooltip mostra nome da cor + valor formatado
- [ ] Estilo visual consistente com Dashboard
- [ ] Build sem erros

---

## Esforço

~5 minutos (1 arquivo, mudança simples)
