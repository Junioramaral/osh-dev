

# Relatório PDF de RFC com aba de preview e aprovação de envio

## Resumo

Quando uma RFC for concluída (status `resolvido`), uma nova aba **"Relatório"** aparecerá no detalhe do ticket RFC. O analista poderá visualizar o relatório completo antes de aprovar o envio por email ao cliente. O relatório será gerado como PDF no navegador usando `jspdf` + `html2canvas`.

## Fluxo

```text
RFC concluída (status=resolvido)
  └─► Aba "Relatório" aparece no TicketDetail (somente RFCs resolvidas)
        └─► Preview visual do relatório completo
              ├─ Cabeçalho com logo Otimizzo, dados do ticket e cliente
              ├─ Seção de planejamento (título, descrição, segmento)
              ├─ Tabela de passos com status, início, fim, duração, responsável
              ├─ Tempo total de execução
              └─ Mensagem de conclusão
        └─► Botões:
              ├─ "Baixar PDF" — gera e baixa o PDF localmente
              └─ "Enviar Relatório ao Cliente" — gera PDF, faz upload
                   ao Storage e envia email com link de download
```

## Mudanças

### 1. Novo componente: `src/components/tickets/RFCReportPreview.tsx`
- Componente que renderiza o relatório formatado para visualização e captura PDF
- Seções: cabeçalho com dados do ticket/cliente, planejamento, tabela de execução dos passos, tempo total, mensagem de conclusão
- Botão "Baixar PDF" que usa `jspdf` + `html2canvas` para gerar o PDF a partir do HTML renderizado
- Botão "Enviar Relatório ao Cliente" que gera o PDF, faz upload para o bucket `ticket-attachments` no Supabase Storage, e envia email de notificação com o link do PDF

### 2. Atualizar `src/pages/TicketDetail.tsx`
- Adicionar nova aba "Relatório" visível somente quando `record_type === 'rfc'` e `status === 'resolvido'`
- Atualizar o grid-cols para acomodar a aba extra (6 colunas para RFCs resolvidas)

### 3. Edge Function: `supabase/functions/send-rfc-report/index.ts`
- Nova Edge Function que recebe `ticketId`, `ticketNumber`, `contactEmail`, `contactName`, `reportUrl`
- Envia email via Resend com template profissional contendo link para download do relatório PDF
- Reutiliza o padrão visual dos emails existentes (header verde, badge, rodapé)

### 4. Dependências
- Instalar `jspdf` e `html2canvas` no projeto (geração de PDF no client-side)

## Detalhes Técnicos

- O relatório é renderizado como HTML dentro de um `div` com `ref`, capturado por `html2canvas` e convertido em PDF via `jspdf`
- O PDF é nomeado como `RFC-{ticket_number}-Relatorio.pdf`
- Upload do PDF para `ticket-attachments/{ticketId}/rfc-report.pdf`
- A aba "Relatório" só aparece para analistas Otimizzo (isOtimizzoUser) em RFCs com status `resolvido`
- O botão de envio registra um comentário interno no ticket confirmando o envio

## Arquivos afetados
- `src/components/tickets/RFCReportPreview.tsx` — novo
- `src/pages/TicketDetail.tsx` — nova aba condicional
- `supabase/functions/send-rfc-report/index.ts` — novo
- `package.json` — adicionar jspdf + html2canvas

