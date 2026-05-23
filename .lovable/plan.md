## Objetivo

Substituir os campos `Textarea` simples de **Sintomas**, **Problema** e **Solução** no diálogo de criação/edição de artigos da Base de Conhecimento por um editor rich text (estilo Word), com: negrito, itálico, sublinhado, tachado, títulos (H1/H2/H3), lista com marcadores, lista numerada, alinhamento (esquerda/centro/direita/justificado), tamanho/família de fonte, cor de texto, link, desfazer/refazer e limpar formatação.

## Abordagem técnica

Usar **TipTap** (`@tiptap/react` + `@tiptap/starter-kit` + extensões: `underline`, `text-align`, `text-style`, `color`, `font-family`, `link`). É leve, headless e se integra bem com React Hook Form. Os campos passarão a armazenar **HTML** (string), mantendo compatibilidade com o schema atual (colunas `text` em `faq_articles.symptoms/problem/solution`).

## Itens da implementação

1. **Novo componente** `src/components/ui/rich-text-editor.tsx`
   - Toolbar fixa no topo com botões agrupados:
     - Família de fonte (select) + Tamanho (select com presets: 12/14/16/18/20/24/28)
     - B / I / U / S (tachado)
     - H1 / H2 / H3 / parágrafo
     - Lista com marcadores / Lista numerada
     - Alinhamento: esquerda / centro / direita / justificado
     - Cor do texto (color picker)
     - Inserir link / remover link
     - Desfazer / refazer / limpar formatação
   - Props: `value: string`, `onChange: (html: string) => void`, `placeholder?: string`, `minHeight?: string`, `error?: boolean`
   - Estilizado via tokens semânticos (`border-input`, `bg-background`, `text-foreground`, `ring-ring`) para casar com o restante do design system, em vez de cores hardcoded.

2. **Estilos do conteúdo** em `src/index.css`
   - Classe `.faq-rich-content` com regras para `h1/h2/h3`, `ul/ol`, `a`, `strong`, `em`, `u`, `s`, e alinhamentos, garantindo render consistente no editor e na visualização.

3. **Atualizar `src/components/faq/FAQArticleDialog.tsx`**
   - Trocar os três `<Textarea>` (Sintomas/Problema/Solução) pelo `<RichTextEditor>` dentro dos respectivos `FormField`.
   - Ajustar a validação Zod: como o valor passa a ser HTML, a regra `min(10)` ficaria enganosa (tags inflam o tamanho). Mudar para uma validação que considere o texto puro (strip de tags) com mínimo de 10 caracteres.

4. **Atualizar `src/components/faq/FAQArticleViewDialog.tsx`**
   - Renderizar os três campos como HTML (`dangerouslySetInnerHTML`) dentro de um container com a classe `.faq-rich-content`, em vez de texto plano. Sanitizar com `DOMPurify` antes de renderizar para evitar XSS, já que admins podem inserir HTML.

5. **Compatibilidade com artigos antigos**
   - Conteúdo legado em texto puro continua válido (o editor aceita string sem tags). Não é necessária migração de dados.

6. **Dependências a adicionar**
   - `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-text-style`, `@tiptap/extension-color`, `@tiptap/extension-font-family`, `@tiptap/extension-link`, `dompurify` + `@types/dompurify`.

## Fora de escopo

- Não altero o `Textarea` de outras telas (descrição de tickets, comentários, etc.) — só os três campos da FAQ pedidos.
- Não mexo em busca/full-text (a coluna continua armazenando o conteúdo; a busca atual em `symptoms/title` continua funcionando, apenas indexando o HTML — caso queira ignorar tags na busca, fica para um próximo passo).
- Sem upload de imagem dentro do editor neste momento (anexos continuam no `FileUploadZone` existente). Posso adicionar depois se quiser.

## Arquivos a editar/criar

- criar `src/components/ui/rich-text-editor.tsx`
- editar `src/components/faq/FAQArticleDialog.tsx`
- editar `src/components/faq/FAQArticleViewDialog.tsx`
- editar `src/index.css` (estilos `.faq-rich-content`)
- `package.json` (novas dependências)
