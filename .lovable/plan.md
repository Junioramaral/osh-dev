

# Corrigir geração de PDF multi-página no Relatório RFC

## Problema

A lógica atual do `while (heightLeft > 0)` na função `generatePDF` adiciona a imagem inteira novamente em cada página com cálculos de posição incorretos. Isso causa:
1. Páginas duplicadas com o mesmo conteúdo
2. A mensagem "RFC Concluída com sucesso" no final é cortada/não aparece

## Correção

Reescrever a lógica de paginação em `src/components/tickets/RFCReportPreview.tsx` (linhas 73-84) com um loop simples que desloca a posição Y da imagem negativamente a cada página:

```text
Página 1: addImage em Y = margin (10mm)
Página 2: addImage em Y = margin - 1 * pageContentHeight
Página 3: addImage em Y = margin - 2 * pageContentHeight
... até cobrir toda a altura da imagem
```

### Lógica corrigida:

```typescript
const pageContentHeight = pdfHeight - 20; // margem top + bottom
let heightLeft = imgHeight;
let pageIndex = 0;

// Primeira página
pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
heightLeft -= pageContentHeight;

// Páginas seguintes
while (heightLeft > 0) {
  pageIndex++;
  pdf.addPage();
  const yOffset = -(pageContentHeight * pageIndex) + 10;
  pdf.addImage(imgData, "PNG", 10, yOffset, imgWidth, imgHeight);
  heightLeft -= pageContentHeight;
}
```

## Arquivo alterado
- `src/components/tickets/RFCReportPreview.tsx` — apenas a função `generatePDF` (linhas 73-84)

