

# Esconder aba "RFC (Interno)" para clientes finais

## Problema

Na linha 715 de `src/components/tickets/NewTicketDialog.tsx`, a aba **RFC (Interno)** aparece para todos os usuários, inclusive clientes finais (LexisFlow, Sec4File, Adentro). RFC deve ser exclusiva da equipe Otimizzo (dono do sistema).

## Correção

Apenas usuários internos devem ver/usar a aba RFC: **Otimizzo (`isOtimizzoUser`)** ou **Super Admin (`isSuperAdmin`)**. Essas flags já estão disponíveis no componente (linha 89).

### Mudanças em `src/components/tickets/NewTicketDialog.tsx`

1. **Criar variável** `canCreateRFC = isOtimizzoUser || isSuperAdmin`
2. **Renderização condicional do `<Tabs>`** (linhas 712-717):
   - Se `canCreateRFC`: mostra as duas abas (Suporte + RFC) como hoje
   - Se NÃO `canCreateRFC`: não renderiza o `<Tabs>` — o usuário vê direto o formulário de Suporte
3. **Garantir** que `recordType` permaneça `"suporte"` para clientes (já é o default no `useState` linha 91, ok)
4. **Proteção extra**: o bloco `{recordType === "rfc" && ...}` (linha 720) também recebe `canCreateRFC &&` para evitar qualquer manipulação

## Arquivo alterado
- `src/components/tickets/NewTicketDialog.tsx` (única alteração, ~5 linhas)

## Sem quebrar nada
- Otimizzo e Super Admin continuam vendo RFC normalmente
- Clientes simplesmente não verão a aba — fluxo de Suporte intacto
- Nenhuma alteração em banco, RLS ou outras telas

