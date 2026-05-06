## Proposta

Trocar a geração de PDF + upload no Storage por um **email HTML inline** com o conteúdo completo do relatório RFC, no mesmo padrão do "Relatório Mensal de Suporte".

Vantagens:
- Elimina o erro de tamanho ("The object exceeded the maximum allowed size") — não há mais upload
- Cliente lê direto na caixa de entrada, sem precisar baixar PDF / clicar em link assinado
- Sem dependência de `html2canvas` + `jspdf` no fluxo de envio
- Mais rápido e mais leve

## Mudanças

### 1. Edge Function `supabase/functions/send-rfc-report/index.ts`
Refatorar para receber dados do ticket + passos e montar o HTML do relatório no próprio servidor:

- Novo payload: `{ ticketId }` apenas
- Buscar via service role:
  - ticket (com `clients(name)`, `profiles!analyst_id(full_name)`, `contact_email`, `contact_name`, `title`, `description`, `ticket_number`)
  - `ticket_rfc_steps` ordenados por `ordem` (com `started_by_name`, `concluded_by_name`)
- Renderizar HTML estilizado seguindo o visual do relatório mensal (gradiente verde do header já existente, container 600px, tabelas com bordas, badges de status), contendo:
  - Cabeçalho com #ticket_number e título
  - Bloco de info: Cliente, Analista, Progresso (X/Y, %), Tempo total
  - Tabela de passos: Ordem · Descrição · Status (badge) · Início · Fim · Duração · Responsável
  - Linha de total ao final
  - Rodapé Otimizzo
- Mantém `from`, `replyTo` e cabeçalhos `In-Reply-To`/`References` com formato `ticket-{number}@resend.otimizzo.com` (memória do projeto)
- Mantém verificação de auth e papel (Otimizzo/super_admin)

Helpers a portar para a edge function (cópias simples, sem dependências):
- `formatDuration(start, end)` e `formatTotalDuration(min)` (mesma lógica do front)
- `formatBR(date)` para datas em pt-BR

### 2. Componente `src/components/tickets/RFCReportPreview.tsx`
- Manter o **preview visual e o botão "Baixar PDF"** (download local continua útil para arquivo offline)
- Refatorar `handleSendToClient`:
  - Remover geração de PDF, upload no bucket e signed URL
  - Chamar `supabase.functions.invoke("send-rfc-report", { body: { ticketId: ticket.id } })` direto
  - Manter o comentário interno de auditoria ("📄 Relatório RFC enviado por email para …")
  - Manter toasts de sucesso/erro

Sem mudanças em schema, storage ou políticas. Sem novos secrets.

## Arquivos
- editar `supabase/functions/send-rfc-report/index.ts`
- editar `src/components/tickets/RFCReportPreview.tsx`

Após editar a edge function, fazer deploy de `send-rfc-report`.

## Memória a atualizar
Atualizar `mem://features/rfc-pdf-report-workflow` para refletir que o envio ao cliente agora é HTML inline (PDF segue disponível só para download local).
