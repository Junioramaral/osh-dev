## Objetivo
Substituir a mensagem genérica "Invalid login credentials" (vinda do Supabase, em inglês) por uma mensagem amigável em português, com título e descrição padronizados como os demais toasts do sistema.

## Mudanças

**Arquivo:** `src/pages/Auth.tsx`

No `handleLogin`, ao invés de `toast.error(error.message)`, mapear o `error.message` retornado pelo Supabase para mensagens amigáveis em PT-BR:

- `Invalid login credentials` → título: "Não foi possível entrar" / descrição: "Email ou senha incorretos. Verifique seus dados e tente novamente."
- `Email not confirmed` → "Email não confirmado" / "Confirme seu email antes de acessar."
- `Too many requests` / rate limit → "Muitas tentativas" / "Aguarde alguns instantes antes de tentar novamente."
- Fallback (qualquer outro erro) → "Erro ao entrar" / "Tente novamente em instantes. Se o problema persistir, contate o suporte."

A função usará `toast.error(titulo, { description: ... })` para manter o mesmo padrão visual dos outros toasts do app (ex.: "Erro ao enviar email" no reset de senha).

## Fora do escopo
- Não altera lógica de autenticação.
- Não altera mensagens de outras páginas.