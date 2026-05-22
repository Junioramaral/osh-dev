## Problemas identificados na tela de Máquinas

### 1. Badge "Crítica" aparece apagado

No arquivo `src/pages/Machines.tsx` (função `getCriticalityColor`), só existem cores definidas para `baixa`, `media` e `alta`. Quando a criticidade é `critica`, cai no fallback `bg-muted` (cinza claro com texto cinza) — por isso fica ilegível.

**Correção:** adicionar a cor para `critica` usando um vermelho mais intenso/escuro que se diferencie de `alta`:

- `baixa` → verde (success)
- `media` → amarelo (warning)
- `alta` → vermelho (destructive)
- `critica` → vermelho escuro com texto branco (ex.: `bg-destructive text-destructive-foreground` com peso/anel adicional, ou um tom dedicado tipo `bg-red-900 text-white` via token semântico)

### 2. Coluna "Local"

A coluna lê `machine.location`, um campo que existe no banco mas **nunca é preenchido** porque o formulário de cadastro/edição (`MachineDialog.tsx`) não tem esse campo. Por isso aparece sempre "-".

A intenção original do campo era indicar onde a máquina está fisicamente/logicamente hospedada (ex.: "Datacenter SP", "AWS us-east-1", "Sala 3 - Rack B", "On-premise cliente").

**Duas opções — preciso da sua decisão:**

**Opção A — Adicionar o campo "Local" no formulário** (recomendado)

- Incluir input de texto "Local" no `MachineDialog.tsx` (ex.: placeholder "Datacenter SP / AWS us-east-1 / Sala servidores")
- Mantém a coluna na listagem
- Útil para identificar rapidamente onde a máquina está

**Opção B — Remover a coluna "Local" da listagem**

- Se você não precisa rastrear localização das máquinas
- Mais limpo visualmente

Qual prefere? Se for a Opção A, devo deixar como texto livre ou prefere uma lista pré-definida (ex.: "On-premise", "AWS", "Azure", "GCP", "Outro")?  
  
Adicionar a Opçao A