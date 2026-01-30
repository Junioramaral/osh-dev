

# Plano: Redirecionar para Login Quando Sessão Expira

## Problema Identificado

Quando o token JWT expira no Supabase (após o timeout de inatividade configurado), a interface permanece na mesma tela em vez de redirecionar para `/auth`. Isso acontece porque:

1. O `AppLayout` não verifica se o usuário está deslogado (`user === null`)
2. O `AuthContext` não dispara redirecionamento automático quando a sessão expira

## Solucao Proposta

Implementar duas camadas de proteção:

1. **Verificação no AppLayout** - Redirecionar para `/auth` quando não há usuário autenticado
2. **Listener no AuthContext** - Detectar quando sessão expira e fazer logout automático

---

## Alteracoes Detalhadas

### 1. `src/components/layout/AppLayout.tsx`

Adicionar verificação se o usuário está autenticado antes de renderizar o layout:

```typescript
// Após verificar mustChangePassword e loading
// Adicionar verificação de usuário não autenticado

if (!user) {
  console.log('[AppLayout] No authenticated user, redirecting to /auth');
  return <Navigate to="/auth" replace />;
}
```

Esta verificação garante que:
- Se a sessão expirar e `onAuthStateChange` disparar com `session = null`
- O estado `user` será atualizado para `null`
- O AppLayout detectará isso e redirecionará automaticamente

### 2. `src/contexts/AuthContext.tsx`

Melhorar o listener `onAuthStateChange` para tratar eventos de logout/expiração:

```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (event, session) => {
    console.log('[AuthContext] Auth event:', event);
    
    // Tratar eventos de logout/expiração
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
      console.log('[AuthContext] Session ended, clearing state');
      setUser(null);
      setSession(null);
      setProfile(null);
      setRoles([]);
      setMustChangePassword(false);
      setLoading(false);
      // Navegação será tratada pelo AppLayout
      return;
    }
    
    // ... resto do código existente
  }
);
```

---

## Fluxo Após Implementação

```text
┌─────────────────────────────────────────────────────────────┐
│                    Sessão Ativa                             │
│                         │                                   │
│                         ▼                                   │
│              Usuário fica inativo                           │
│                         │                                   │
│                         ▼                                   │
│           Token JWT expira no Supabase                      │
│                         │                                   │
│                         ▼                                   │
│         onAuthStateChange dispara com session=null          │
│                         │                                   │
│                         ▼                                   │
│            AuthContext atualiza user=null                   │
│                         │                                   │
│                         ▼                                   │
│         AppLayout detecta user=null                         │
│                         │                                   │
│                         ▼                                   │
│           Navigate para /auth (tela de login)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Adicionar verificação `!user` com redirect para `/auth` |
| `src/contexts/AuthContext.tsx` | Melhorar tratamento de eventos `SIGNED_OUT` no listener |

---

## Notas Técnicas

1. **Ordem das verificações no AppLayout**: A verificação de `!user` deve vir após `loading` para não redirecionar durante o carregamento inicial

2. **Eventos do Supabase**: O `onAuthStateChange` dispara com eventos como:
   - `SIGNED_IN` - Login bem sucedido
   - `SIGNED_OUT` - Logout ou sessão expirada
   - `TOKEN_REFRESHED` - Token renovado (pode ser `null` se falhar)

3. **Comportamento esperado**: Quando a sessão expira, o usuário verá a tela de login automaticamente, sem ficar "preso" em uma tela não funcional

