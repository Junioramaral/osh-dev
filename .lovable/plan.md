

# Adicionar seção de Detalhamento e Observações no Relatório RFC

## O que muda

Abaixo da tabela de execução existente, adicionar uma nova seção **"📝 Detalhamento e Observações"** que lista cada passo com:
- Número e título do passo
- **Procedimento** (`procedimento`) — o que foi planejado/executado
- **Observações do Analista** (`observacao`) — notas feitas durante a execução

Somente passos que tenham `procedimento` ou `observacao` preenchidos serão exibidos nesta seção (para não mostrar itens vazios).

## Quebra de página

O html2canvas captura tudo como uma imagem única, então a quebra de página no PDF precisa ser gerenciada dividindo o conteúdo em blocos. A abordagem será usar CSS `page-break-inside: avoid` nos cards de cada passo para que o html2canvas + jsPDF multi-page handling mantenha os blocos coesos.

Cada passo será um bloco visual com borda e padding, com `style={{ pageBreakInside: 'avoid' }}` para evitar cortes.

## Arquivo alterado

### `src/components/tickets/RFCReportPreview.tsx`

Entre a seção `{/* Steps table */}` (linha 324) e `{/* Conclusion */}` (linha 326), inserir:

```text
{/* Detalhamento e Observações */}
- Título da seção com ícone 📝
- Filtrar steps que tenham procedimento OU observacao
- Para cada step filtrado, renderizar um card com:
  - Header: "Passo XX — {descricao}" em fundo cinza
  - Se procedimento: label "Procedimento" + texto pre-wrap
  - Se observacao: label "Observações do Analista" + texto pre-wrap com fundo amarelo claro
  - style={{ pageBreakInside: 'avoid' }} em cada card
```

Se nenhum passo tiver procedimento ou observação, a seção inteira não será renderizada.

## Detalhes técnicos

- Os campos `procedimento` e `observacao` já existem na tabela `rfc_steps` e já são retornados pelo hook `useTicketRFCSteps`
- Não requer mudanças no banco, hooks ou edge functions
- Apenas 1 arquivo editado: `RFCReportPreview.tsx`

