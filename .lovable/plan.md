## Objetivo
Melhorar os campos "Motivo da Abertura" e "Problema Enfrentado" no diálogo de Novo Ticket para permitir múltiplas linhas (ENTER) e quebra de texto automática, em vez do input de linha única atual.

## Mudanças

**Arquivo:** `src/components/tickets/NewTicketDialog.tsx` (linhas ~1540–1548)

1. Trocar `<Input>` por `<Textarea>` nos dois campos.
2. Configurar UX:
   - `rows={3}` para Motivo da Abertura (texto curto, mas com espaço para 2–3 linhas).
   - `rows={5}` para Problema Enfrentado (descrição mais longa).
   - `maxLength={500}` em Motivo da Abertura e `maxLength={2000}` em Problema Enfrentado, com contador discreto abaixo (ex.: `120 / 500`).
   - `className="resize-y"` para permitir o usuário aumentar manualmente se quiser.
   - Placeholders atualizados sugerindo uso de múltiplas linhas (ex.: "Ex: Sistema fora do ar desde 09h, afetando o time de vendas...").
3. Adicionar import de `Textarea` (se ainda não existir no arquivo).
4. Schema Zod: adicionar `.max(500)` e `.max(2000)` correspondentes para validação consistente.

## Fora de escopo
- Não altera o schema do banco (campos já são `text`).
- Não altera a visualização em `TicketDetails.tsx` (já usa `whitespace-pre-wrap`, então as quebras de linha aparecerão corretamente).
- Não mexe em e-mails nem em outras telas.
