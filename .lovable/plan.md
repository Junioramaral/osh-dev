
# Filtro de Segmentos por Cliente na Abertura de Ticket

## Diagnostico do Problema

O codigo ja possui a infraestrutura para filtrar segmentos por cliente (linhas 160-163 do `NewTicketDialog.tsx`). Porem existem dois problemas que podem fazer com que o cliente veja segmentos que nao sao seus:

**Problema 1: `tenantId` pode ser nulo no carregamento inicial**
- O `tenantId` vem de `roles` no `AuthContext`, que carrega assincronamente
- Se `tenantId === null`, a query `currentTenant` fica desabilitada e `clientSegmentCodes` retorna `[]`
- Com array vazio, o filtro `allSegments?.filter(s => clientSegmentCodes.includes(s.code))` retorna `[]` (nenhum segmento)
- O campo exibe vazio ou estado indefinido ate os roles carregarem

**Problema 2: `profile.client_id` nao e usado como fallback**
- A memoria de arquitetura documenta que `profile.client_id` deve ser o indicador primario para deteccao de usuario-cliente, pois carrega antes dos roles
- O codigo atual usa apenas `tenantId` (derivado de roles), ignorando `profile.client_id`

**Comportamento esperado:**
- Cliente Lexisflow (so tem segmento `DB`): mostrar apenas "Banco de Dados" como campo desabilitado
- Cliente com DB + APP: mostrar dropdown com as duas opcoes
- Usuario Otimizzo abrindo ticket para cliente: filtrar segmentos do cliente selecionado (ja funciona)

## Solucao

Usar `profile?.client_id` como fonte primaria do `clientId` para usuarios cliente, com `tenantId` como fallback. Assim a query `currentTenant` e habilitada imediatamente quando o perfil carrega, sem esperar os roles.

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/tickets/NewTicketDialog.tsx` | Usar `profile.client_id` como fallback para `tenantId` na query de tenant atual |

## Mudancas Tecnicas

### Estado atual (problema)
```typescript
const { profile, tenantId, hasRole, isOtimizzoUser } = useAuth();
// ...
const { data: currentTenant } = useQuery({
  queryKey: ["current-tenant", tenantId],
  queryFn: async () => { /* ... */ },
  enabled: !!tenantId,  // <-- so habilita quando roles carregam
});
```

### Solucao proposta
```typescript
const { profile, tenantId, hasRole, isOtimizzoUser } = useAuth();

// Usar profile.client_id como fonte primaria (carrega antes dos roles)
const effectiveTenantId = tenantId || profile?.client_id || null;

const { data: currentTenant } = useQuery({
  queryKey: ["current-tenant", effectiveTenantId],
  queryFn: async () => {
    if (!effectiveTenantId) return null;
    const { data, error } = await supabase
      .from("clients")
      .select("id, name, segments, tenant_type, db_engines, app_product_ids")
      .eq("id", effectiveTenantId)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!effectiveTenantId,  // <-- habilita quando profile carrega (mais rapido)
});
```

### Propagacao do `effectiveTenantId`
Tambem substituir `tenantId` por `effectiveTenantId` nos seguintes pontos dentro do componente:
- `defaultValues.client_id: effectiveTenantId || ""`
- No `useEffect` de inicializacao do segmento: `client_id: effectiveTenantId || ""`

## Fluxo Corrigido

```text
Usuario cliente abre dialog
         |
         v
profile.client_id disponivel (rapido)
         |
         v
Query currentTenant habilitada imediatamente
         |
         v
currentTenant.segments = ["DB"] (ex: Lexisflow)
         |
         v
availableSegments = [{ code: "DB", display_name: "Banco de Dados" }]
         |
         v
hasOnlyOneSegment = true
         |
         v
Campo exibido como texto fixo "Banco de Dados" (nao editavel)
         |
         v
Ticket criado com segment = "DB"
```

## O que NAO muda

- A logica de filtragem de segmentos ja existente (linhas 160-163) esta correta
- A exibicao de campo desabilitado quando ha apenas 1 segmento (linhas 590-603) esta correta
- A logica para usuarios Otimizzo (que escolhem o cliente e filtram seus segmentos) permanece inalterada
- Nenhuma alteracao de banco de dados necessaria
