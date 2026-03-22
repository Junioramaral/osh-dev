

# Restringir Abertura de Tickets por Analistas Otimizzo (por Filas/Equipe)

## Problema

Atualmente, todos os usuários do tenant Otimizzo (incluindo analistas) veem o seletor de clientes e podem abrir tickets para qualquer cliente. O seletor está desabilitado para analistas (linha 626), mas o `client_id` já está definido como o tenant Otimizzo, o que não faz sentido para abertura de tickets de suporte.

## Solução

Filtrar a lista de clientes disponíveis para analistas Otimizzo com base no segmento da equipe do analista, e restringir os segmentos disponíveis conforme as filas da equipe.

### Lógica

1. **Analistas Otimizzo (analyst_db/analyst_app)** sem role de super_admin ou tenant_admin:
   - Buscar a equipe do analista (`profile.team_id`) e seu segmento
   - Filtrar a lista de clientes para mostrar apenas clientes que possuem o segmento da equipe do analista (ex: analista DB vê apenas clientes com segmento "DB")
   - Restringir o seletor de segmento ao segmento da equipe
   - Habilitar o seletor de clientes (atualmente está disabled para analistas)

2. **Super Admin / Tenant Admin Otimizzo**: mantém comportamento atual (todos os clientes, todos os segmentos)

### Mudanças em `src/components/tickets/NewTicketDialog.tsx`

1. **Buscar dados da equipe do analista**: Nova query para obter o segmento da equipe (`teams.segment`) usando `profile.team_id`

2. **Filtrar clientes**: Quando o usuário é analista Otimizzo, filtrar a lista de `clients` para mostrar apenas clientes que incluem o segmento da equipe em seu array `segments`

3. **Restringir segmento**: Para analistas, forçar o segmento para o da equipe (não permitir trocar)

4. **Habilitar seletor de clientes**: Remover o `disabled` do seletor de clientes para analistas (eles precisam escolher o cliente, mas da lista filtrada)

5. **Tratar analista sem equipe**: Se o analista não tem equipe atribuída, exibir mensagem informando que precisa ser atribuído a uma equipe antes de abrir tickets

### Arquivo editado
- `src/components/tickets/NewTicketDialog.tsx`

