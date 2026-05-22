## Problema

A usuária `juliane@atppoa.com.br` recebeu uma senha temporária contendo caracteres visualmente ambíguos (`l`, `1`, `I`, `O`, `0`, `o`). Ela digitou `1` no lugar de `l` minúsculo e recebeu "Invalid login credentials". Os logs confirmam que **nenhuma tentativa de login dela** chegou ao Supabase com sucesso — todas falharam por digitação incorreta.

## Solução

### 1. Senha temporária sem ambiguidade
Em `supabase/functions/invite-user/index.ts`, na função `generateTempPassword`, trocar o charset para remover caracteres confusos:

**Antes:**
```
abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*
```

**Depois (sem `l`, `I`, `O`, `o`, `0`, `1`):**
```
abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*
```

Garantir também que a senha gerada **sempre contenha** pelo menos 1 maiúscula, 1 minúscula, 1 dígito e 1 caractere especial (para passar na validação de `ForcePasswordChange`).

### 2. Botão "Copiar senha" no e-mail
Como não dá para ter botão de copiar real em e-mail, a melhor garantia é:
- Manter a senha em fonte monoespaçada grande (já está)
- Adicionar uma orientação explícita logo abaixo: **"💡 Dica: copie e cole a senha para evitar erros de digitação"**

### 3. (Opcional) Mostrar a senha em "caixa selecionável"
Adicionar `user-select: all` no `<p>` da senha — em clientes de e-mail web (Gmail, Outlook Web) basta 1 clique para selecionar tudo.

## Arquivos alterados

- `supabase/functions/invite-user/index.ts` — charset da senha + dica de copiar/colar no template

## Como verificar

1. Cadastrar um novo usuário de teste
2. Conferir no e-mail que a senha não contém `l`, `1`, `I`, `O`, `o`, `0`
3. Confirmar que a dica de copiar/colar aparece abaixo da senha
