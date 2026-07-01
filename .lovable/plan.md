## Problema
O diálogo "Registrar Horas Trabalhadas" está com `sm:max-w-lg` (~512px), o que corta as abas "Novo Registro/Registros", força truncamento no título, e provoca scroll horizontal na aba Registros (datas/horários/descrições grandes ficam apertados numa coluna estreita).

## Solução
Ajustar apenas o `DialogContent` e alguns detalhes de layout interno em `src/components/tickets/TimeLogDialog.tsx`:

1. **Largura do diálogo**: trocar `sm:max-w-lg` por `w-[95vw] sm:max-w-3xl` (mesmo padrão já usado no `TicketResolveDialog`), permitindo até ~768px em telas normais e ocupando 95% em mobile.
2. **Título/descrição**: permitir quebra de linha no título do ticket (`break-words`) para eliminar o truncamento visível no print.
3. **Aba "Registros"**:
   - Aumentar o `max-h` do ScrollArea de 360px para algo como `max-h-[55vh]` aproveitando a altura extra.
   - Garantir `min-w-0` e `break-words` nas linhas de descrição/ticket para evitar overflow horizontal.
4. **Aba "Novo Registro"**: manter o grid de 2 colunas já existente (data/hora), sem mudanças funcionais.

## Fora do escopo
- Nenhuma mudança em regras de negócio, permissões, mutations ou hooks.
- Nenhuma alteração em outros diálogos.
