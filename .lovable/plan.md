## Reposicionar Subcategoria no formulário de Novo Ticket

Atualmente, no `NewTicketDialog.tsx`, a Subcategoria aparece muito depois (após Título, FAQ e Fila de Atendimento), longe da Categoria.

### Mudança

Mover o bloco de Subcategoria para logo abaixo da linha Tipo + Prioridade + Categoria, transformando a grid de 3 colunas em um agrupamento lógico:

- Linha 1: Tipo | Prioridade | Categoria (mantém)
- Logo abaixo (condicional): Subcategoria em largura total, aparecendo apenas quando a categoria selecionada tiver subcategorias

Assim o usuário escolhe Categoria → vê imediatamente a Subcategoria correspondente, antes de seguir para FAQ/Título.

### Arquivo

- `src/components/tickets/NewTicketDialog.tsx`: remover o bloco de Subcategoria das linhas ~1000–1017 e reinseri-lo logo após o fechamento da grid Tipo/Prioridade/Categoria (linha 949), mantendo a mesma lógica condicional (`selectedCategoryId && subcategories.length > 0`).

Nenhuma alteração de schema, validação ou lógica de submissão.