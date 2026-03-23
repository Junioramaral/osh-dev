

# Adicionar tempos de execução na visão do cliente "Minhas RFCs"

## O que falta

O cliente vê apenas a timeline com status e data de conclusão, mas não vê:
- **Tempo total de execução** na barra de progresso
- **Tabela com Início, Fim, Duração** de cada passo (como a equipe Otimizzo vê)

## Mudanças

### `src/pages/ClientRFCPortal.tsx`

1. **Incluir `started_at` na query** do `rfc_steps` (linha 87) — atualmente só busca `concluded_at`

2. **Adicionar "Tempo total de execução"** abaixo da barra de progresso (após linha 237), usando a mesma lógica de `formatDuration` do `TicketRFCReport.tsx`

3. **Adicionar tabela de tempos** entre a barra de progresso e a timeline vertical, com as colunas:
   - Passo | Descrição | Início | Fim | Duração
   - Linha de total no final
   - Estilo compacto, similar ao primeiro print (tabela do relatório RFC)

4. **Funções utilitárias**: Reutilizar `formatDuration` e `getDurationMinutes` do `TicketRFCReport.tsx` (copiar localmente ou extrair para utils)

### Resultado visual esperado

Abaixo da barra de progresso e do banner de celebração, aparecerá uma tabela compacta mostrando início, fim e duração de cada passo, com o tempo total na última linha — idêntico ao que a Otimizzo vê na aba RFC do ticket.

