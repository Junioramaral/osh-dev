## Tornar o Dialog de Resolver Ticket mais responsivo e organizado

### Problema
O dialog "Resolver Ticket" (`TicketResolveDialog`) está com layout apertado: o título do ticket é cortado, a largura máxima de `600px` é insuficiente para o conteúdo (lista de tickets vinculáveis + texto de resolução), e o visual fica "bagunçado" em telas menores.

### Alterações propostas

1. **Aumentar a largura do dialog**
   - Trocar `sm:max-w-[600px]` para `sm:max-w-[750px]` (ou `sm:max-w-[800px]`) no `DialogContent` para dar mais respiro ao conteúdo.

2. **Melhorar o header com título longo**
   - O título do ticket (`ticket.title`) na seção de info está com `truncate`, o que esconde texto. Em vez de truncar numa única linha, permitir quebra de linha (`break-words` ou `whitespace-normal`) ou limitar a altura com scroll se for muito longo.

3. **Responsividade em telas pequenas**
   - Garantir que o `DialogContent` use `max-w-[95vw]` ou similar em telas abaixo de `sm`, para não haver overflow horizontal.
   - Verificar se o campo de busca e a lista de tickets vinculáveis se adaptam corretamente à largura reduzida.

4. **Ajustes visuais na lista de tickets**
   - Garantir que badges e datas na lista de tickets não forcem quebra estranha.
   - Verificar espaçamentos internos (`p-2`, `gap-2`) para que não fique amontoado.

### Arquivos a modificar
- `src/components/tickets/TicketResolveDialog.tsx`

### Testes
- Abrir o dialog em diferentes larguras de viewport (mobile, tablet, desktop).
- Verificar que o título do ticket não é cortado de forma abrupta.
- Verificar que não há scroll horizontal e que o conteúdo se adapta.