---
name: Ticket List Hide Locked By Others
description: Lista geral de Tickets esconde por padrão tickets bloqueados por outros analistas; reaparecem ao filtrar por cliente específico
type: feature
---
Na tela `/tickets`, tickets com `lock_status='locked'` e `lock_owner_id` diferente do usuário logado ficam ocultos por padrão para todos os usuários internos (analistas, super_admin, viewer, Otimizzo). Clientes (`isClient`) não são afetados.

Reexibição: ao selecionar um cliente específico no filtro (`clientFilter !== 'all'`), os tickets ocultos voltam a aparecer.

Aviso visual (Alert) acima da tabela mostra a contagem de tickets ocultos quando houver.

Implementação: filtragem no frontend em `src/pages/Tickets.tsx` (não altera RLS nem queries).