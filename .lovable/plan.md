

# Diagnostico e Correcao: UI Travando Apos Alguns Minutos

## Problema Identificado

Apos analise do codigo, identifiquei **3 problemas criticos** que, combinados, causam o travamento progressivo da interface.

---

## Causa 1: Bug no Hook `useToast` (CRITICO)

**Arquivo:** `src/hooks/use-toast.ts` (linha 177)

O `useEffect` do hook `useToast` tem `[state]` como dependencia. Isso significa que toda vez que um toast e adicionado/removido, o efeito re-executa, removendo e re-adicionando o listener na lista global. Isso causa:
- Re-subscricoes desnecessarias a cada mudanca de estado
- Potencial acumulo de listeners em condicoes de concorrencia
- Re-renders cascateados em todos os componentes que usam `useToast`

Alem disso, o `TOAST_REMOVE_DELAY` esta em `1000000` (16.7 minutos), fazendo com que toasts nunca sejam removidos da memoria durante a sessao.

**Correcao:**
- Trocar `[state]` por `[]` no useEffect
- Reduzir `TOAST_REMOVE_DELAY` para `5000` (5 segundos)

---

## Causa 2: AuthContext Recria Funcoes a Cada Render (ALTO IMPACTO)

**Arquivo:** `src/contexts/AuthContext.tsx`

O `AuthProvider` cria novas referencias de funcao (`hasRole`, `signIn`, `signOut`, `signUp`, `resetPassword`, `updatePassword`) a cada render. Como o valor do contexto muda a cada render, TODOS os componentes consumidores (via `useAuth()`) tambem re-renderizam.

Com 4 queries de polling rodando a cada 30 segundos no `AppLayout` (pendingCount, myTicketsCount, SLA alerts count, SLA alerts), cada poll causa re-render no AuthProvider, que propaga para toda a arvore de componentes.

**Correcao:**
- Envolver `signIn`, `signUp`, `signOut`, `clearMustChangePassword`, `resetPassword`, `updatePassword` com `useCallback`
- Memoizar o objeto de valor do contexto com `useMemo`
- Memoizar `hasRole` com `useCallback` e derivados (`isSuperAdmin`, etc.) com `useMemo`

---

## Causa 3: Debounce Timers Sem Cleanup no `useRFCStepActions`

**Arquivo:** `src/hooks/useRFCStepActions.ts`

Os timers de debounce no `useRef` nunca sao limpos quando o componente desmonta. Se o usuario navega para outra pagina, os timers disparam e tentam fazer chamadas Supabase em componentes desmontados, podendo causar erros silenciosos e comportamento inesperado.

**Correcao:**
- Adicionar cleanup dos timers no `useEffect` de desmontagem

---

## Detalhes Tecnicos

### Arquivo 1: `src/hooks/use-toast.ts`

Mudancas:
- Linha 6: `TOAST_REMOVE_DELAY = 1000000` para `TOAST_REMOVE_DELAY = 5000`
- Linha 177: `}, [state]);` para `}, []);`

### Arquivo 2: `src/contexts/AuthContext.tsx`

Mudancas:
- Importar `useCallback` e `useMemo`
- Envolver `fetchProfile`, `fetchRoles`, `signIn`, `signUp`, `signOut`, `clearMustChangePassword`, `resetPassword`, `updatePassword` com `useCallback`
- Memoizar `hasRole` com `useCallback`
- Memoizar `isSuperAdmin`, `isTenantAdmin`, `isViewer`, `isAnalyst`, `isOtimizzoUser`, `tenantId` com `useMemo`
- Memoizar o objeto de valor do `Provider` com `useMemo`

### Arquivo 3: `src/hooks/useRFCStepActions.ts`

Mudancas:
- Adicionar `useEffect` com cleanup que limpa todos os timers no desmonte:
```text
useEffect(() => {
  return () => {
    Object.values(debounceTimers.current).forEach(clearTimeout);
  };
}, []);
```

### Sequencia de Implementacao

```text
1. use-toast.ts (correcao do memory leak)
2. AuthContext.tsx (memoizacao do contexto)
3. useRFCStepActions.ts (cleanup de timers)
```

### O que NAO muda

- Nenhuma pagina ou componente visual e alterado
- Nenhuma query de banco e modificada
- Nenhuma funcionalidade e removida
- Apenas otimizacoes de performance e correcao de bugs

