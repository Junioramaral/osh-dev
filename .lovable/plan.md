

# Formatar telefone na tabela de usuários do tenant

## Correção

Na linha 780 de `src/pages/TenantDetail.tsx`, o telefone é exibido sem formatação (`user.phone || "-"`). Basta trocar para `formatPhone(user.phone) || "-"` — o import de `formatPhone` já existe.

## Arquivo alterado
- `src/pages/TenantDetail.tsx` — linha 780: `{user.phone || "-"}` → `{user.phone ? formatPhone(user.phone) : "-"}`

