## Corrigir herança de FAQ (e outros campos) entre criações de ticket

### Causa raiz
No `NewTicketDialog.tsx`, o `useEffect` que roda quando o diálogo abre (linhas 250-271) chama `reset({...})` apenas com os campos básicos. Campos opcionais que ficaram preenchidos do ticket anterior — em especial `faq_article_id` — não são limpos, ficam no estado do form e são gravados no novo ticket. Isso explica o 00101016 aparecer vinculado à FAQ do 00101015.

### Correção
Incluir explicitamente todos os campos opcionais no `reset` do `useEffect` de abertura, deixando-os como `null`/`undefined`/`""` conforme o esquema:

- `faq_article_id: null`
- `title: ""`, `description: ""`, `opening_reason: ""`, `problem_faced: ""`
- `contact_name: ""`, `contact_email: ""`, `contact_phone: ""`
- `responsible_user_id: undefined`
- `category_id: undefined`, `subcategory_id: undefined`
- `db_engine: undefined`, `db_environment: undefined`, `db_machine_id: undefined`, `db_name: ""`
- `app_product_id: undefined`, `app_environment: undefined`, `app_machine_id: undefined`, `app_instance_id: undefined`
- Qualquer outro campo opcional usado no schema

Também resetar estados auxiliares já presentes (`setUploadFiles([])`) — já feito — e garantir que `setSegment` seja chamado.

### Limpeza de dados existente (opcional, separado)
O ticket 00101016 já está com FAQ vinculada indevidamente. Posso (se você confirmar) executar um `UPDATE tickets SET faq_article_id = NULL WHERE ticket_number = '00101016'` para remover a vinculação fantasma desse ticket específico. Outros tickets criados após implantar o `useEffect` de reset (antes desta correção) podem ter o mesmo problema; se quiser, posso listar candidatos antes.

### Arquivos a alterar
- `src/components/tickets/NewTicketDialog.tsx` — expandir o objeto passado ao `reset(...)` dentro do `useEffect([open])`.

### Teste manual
1. Criar ticket selecionando uma FAQ.
2. Abrir "Novo ticket" novamente — confirmar que o `FAQSelector` aparece vazio e que o ticket criado salva `faq_article_id = null`.
3. Repetir alternando cliente/segmento.