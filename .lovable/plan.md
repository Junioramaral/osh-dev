## Mudanças na Tab "Anexos" do ticket

Arquivo: `src/components/tickets/TicketAttachments.tsx`

1. **Trocar grid de cards por lista**: cada anexo vira uma linha com:
   - Ícone (imagem ou documento)
   - Nome do arquivo (clicável para abrir/baixar)
   - Tamanho formatado
   - Data/hora de upload (usar `uploaded_at` do anexo; fallback para `created_at` do comentário pai quando ausente em anexos legados do ticket)
   - Botões Download e (se imagem) Visualizar à direita

2. **Reordenar layout**: lista de anexos primeiro, e o card "Adicionar anexos" (upload zone) abaixo da lista.

3. **Ajustes técnicos**:
   - Em `useTicketComments`, anexar `created_at` do comentário a cada anexo ao montar `allAttachments` para podermos exibir data/hora mesmo quando o anexo não tem `uploaded_at`.
   - Formatar data/hora em pt-BR (`dd/MM/yyyy HH:mm`) usando date-fns já presente no projeto.
   - Manter geração de signed URLs como está.
   - Estado vazio continua igual (ícone + texto), mas o bloco de upload permanece visível para quem pode anexar.

Sem alterações de schema, hooks ou lógica de upload.
