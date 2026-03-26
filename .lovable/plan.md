
# Corrigir telefone no convite e edição de usuários

## Problemas identificados

1. **Convite**: O telefone preenchido no formulário é removido antes do envio. Na linha 286-290 de `TenantDetail.tsx`, o `cleanedForm` não inclui o campo `phone`. Além disso, o `inviteUser` no hook `useTenantUsers.ts` não aceita nem envia `phone` para a edge function.

2. **Edição**: O telefone armazenado no banco é apenas dígitos (ex: `51999887766`), mas o `PhoneInput` usa máscara `(99) 99999-9999`. Ao carregar o formulário de edição, os dígitos puros não são exibidos corretamente no campo mascarado.

## Correções

### 1. `src/pages/TenantDetail.tsx`
- Incluir `phone` no `cleanedForm` do invite (linha 286-290), aplicando `cleanPhone()` antes de enviar
- Ao popular o `editUserForm` (linha 769), formatar o telefone com `formatPhone()` para exibir corretamente no campo mascarado

### 2. `src/hooks/useTenantUsers.ts`
- Adicionar `phone` como parâmetro aceito no `inviteUserMutation` (linha 120-131) e enviá-lo no body da chamada à edge function

### 3. `src/lib/phoneUtils.ts`
- Já possui `formatPhone` e `cleanPhone` — sem alterações necessárias

## Arquivos alterados
- `src/pages/TenantDetail.tsx` — incluir phone no invite + formatar phone no edit
- `src/hooks/useTenantUsers.ts` — aceitar e enviar phone no invite mutation
