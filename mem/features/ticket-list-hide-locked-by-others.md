---
name: Ticket List Hide Owned By Others
description: Lista geral de Tickets esconde por padrão tickets assumidos por outros analistas (analyst_id OU lock_owner_id); reaparecem ao filtrar por cliente
type: feature
---
Na tela `/tickets`, tickets onde outro usuário interno é `analyst_id` OU é dono do lock (`lock_status='locked'` com `lock_owner_id` ≠ usuário logado) ficam ocultos por padrão para todos os usuários internos (analistas, super_admin, viewer, Otimizzo). Clientes (`isClient`) não são afetados.

Critério alinhado ao de "Meus Tickets" (`analyst_id.eq OR lock_owner_id.eq`), garantindo que um ticket que aparece em "Meus Tickets" de alguém não apareça também na fila geral.

Reexibição: ao selecionar um cliente específico no filtro (`clientFilter !== 'all'`), os tickets ocultos voltam a aparecer.

Aviso visual (Alert) acima da tabela mostra a contagem de tickets ocultos quando houver.

Implementação: filtragem no frontend em `src/pages/Tickets.tsx` (não altera RLS nem queries).