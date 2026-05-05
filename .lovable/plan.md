## Corrigir overflow das colunas de data no email do relatório mensal

No template HTML do email (`supabase/functions/send-monthly-report/index.ts`), a tabela "Listagem de Tickets" tem 8 colunas e as duas últimas (`Abertura` e `Última atualização`) estouram a largura porque o formato `dd/MM/yyyy, HH:mm` força `white-space: nowrap` em ~110px cada.

### Estratégia: compactar antes de remover

Vou primeiro tentar caber as duas colunas. Se visualmente continuar apertado em clientes de email estreitos, a remoção fica como fallback simples (1 linha alterada).

### Mudanças no `send-monthly-report/index.ts`

1. **Quebrar data e hora em duas linhas** dentro da mesma célula:
   - Nova função `formatBRStacked(date)` retornando `dd/MM/yyyy<br><span style="color:#64748b">HH:mm</span>`.
   - Usada nas células `Abertura` e `Última atualização`.
   - Reduz a largura necessária de ~110px para ~70px por coluna.

2. **Renomear cabeçalhos** para versões curtas:
   - `Abertura` → `Abertura` (mantém)
   - `Última atualização` → `Atualizado` (mais curto, evita quebra dupla no header).

3. **Ajustar estilos da tabela de tickets**:
   - Adicionar `table-layout: fixed; width: 100%;` à tabela de tickets.
   - Definir larguras explícitas nas colunas:
     ```
     Número 9% | Título 28% | Segmento 8% | Prioridade 9% |
     Status 12% | SLA 6% | Abertura 14% | Atualizado 14%
     ```
   - Reduzir `font-size` da tabela de tickets para `11px` e `padding` para `6px 4px`.
   - Manter `text-overflow: ellipsis` no título com `max-width` removido (a largura fixa da coluna já controla).

4. **Remover `white-space: nowrap`** das células de data (não é mais necessário com a quebra em duas linhas).

### Fallback (caso o usuário prefira)

Se mesmo com as melhorias o layout ficar ruim em algum cliente de email, basta remover:
- `<th>Última atualização</th>`
- `<td>${formatBR(t.updated_at)}</td>`
- E renomear `Abertura` para `Última atualização` (já que `updated_at` é mais informativo) — ou manter `Abertura` apenas.

Vou aplicar a estratégia principal (compactar). Se você preferir já partir direto para remover a coluna, me avise.

### Arquivo alterado
- `supabase/functions/send-monthly-report/index.ts` (apenas o template HTML e helper de data)
