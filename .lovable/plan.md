
# Restricao de Visibilidade e Pre-requisitos para Execucao de RFC

## Resumo

Duas mudancas principais:

1. **Filtrar RFCs na tela de Execucao**: Analistas so veem RFCs atribuidas a eles (analyst_id) ou a sua fila (queue_id). Administradores (super_admin e Otimizzo) veem todas.

2. **Validar pre-requisitos antes de iniciar execucao**: Para iniciar uma atividade (startStep), a RFC precisa ter analyst_id, team_id e status "aprovado". Se faltar algum, exibir alerta pedindo para atribuir antes.

---

## Detalhes Tecnicos

### 1. Arquivo: `src/pages/RFCExecution.tsx`

**Query de RFCs aprovadas (linha 60-72)**: Atualmente busca todas as RFCs com status "aprovado" sem filtro de analista.

Mudanca:
- Importar `useAuth` do AuthContext
- Obter `user`, `isSuperAdmin`, `isOtimizzoUser`, `profile` do contexto
- Adicionar `analyst_id`, `team_id`, `queue_id` ao select da query
- Apos receber os dados, filtrar no client-side:
  - Se `isSuperAdmin || isOtimizzoUser`: mostra todas (sem filtro)
  - Senao: filtra onde `analyst_id === user.id` OU `queue_id` esta nas filas do analista (usando uma query auxiliar de `teams_queues` baseada no `profile.team_id`)

Alternativa mais simples (recomendada): filtrar diretamente na query Supabase:
- Para admins: sem filtro adicional
- Para analistas: adicionar `.eq("analyst_id", user.id)` (filtra apenas RFCs atribuidas ao analista logado)

### 2. Arquivo: `src/pages/RFCExecution.tsx`

**Validacao ao selecionar RFC**: Ao clicar em uma RFC para executar, buscar os dados completos do ticket (analyst_id, team_id, status). Se faltar analyst_id ou team_id:
- Exibir um banner/alerta na area de detalhes informando que e necessario atribuir o analista e/ou o time antes de iniciar a execucao
- Desabilitar os checkboxes e botoes de "Iniciar Atividade" ate que as condicoes sejam atendidas
- Incluir um link/botao para abrir o ticket e fazer a atribuicao

Para implementar:
- Adicionar `analyst_id, team_id` ao select da query de RFCs (linha 65)
- Criar um tipo RFC atualizado com esses campos
- Na area de detalhes, verificar `selectedRfc.analyst_id && selectedRfc.team_id` antes de habilitar a execucao
- Se faltar, renderizar um Card de alerta com icone de aviso e texto explicativo

### 3. Arquivo: `src/hooks/useRFCStepActions.ts`

**Guard no startStep e toggleStep**: Adicionar validacao server-side - antes de executar update, verificar se o ticket tem analyst_id e team_id preenchidos e status "aprovado". Se nao, retornar toast de erro.

### Arquivos a modificar

- `src/pages/RFCExecution.tsx` — filtrar lista por analista + validar pre-requisitos
- `src/hooks/useRFCStepActions.ts` — guard de validacao

### O que NAO muda

- Tela de Aprovacao de RFC (continua visivel para admins)
- Portal do cliente
- Banco de dados (nenhuma migracao necessaria)
- Nenhum outro componente
