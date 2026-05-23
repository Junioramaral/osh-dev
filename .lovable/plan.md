## Problema

No editor (TipTap) cada `Enter` cria um novo parágrafo `<p>...</p>`. Quando você pressiona Enter duas vezes para criar uma "linha em branco", o TipTap salva um parágrafo vazio: `<p></p>`.

No editor isso aparece com altura visível (TipTap renderiza placeholder de bloco vazio). Mas na tela de visualização (`FAQArticleViewDialog`), o HTML é injetado via `dangerouslySetInnerHTML` e:

1. Parágrafos vazios (`<p></p>`) colapsam para altura 0 no navegador — não ocupam espaço.
2. A regra atual em `src/index.css` é `.faq-rich-content p { margin: 0.25rem 0; }` — margem mínima, então mesmo parágrafos com conteúdo ficam quase grudados.
3. `DOMPurify.sanitize()` mantém os `<p></p>` vazios, mas sem conteúdo eles não geram caixa visível.

Resultado: o texto aparece todo "colado" sem o espaçamento que você criou com Enter.

## Solução (apenas CSS, em `src/index.css`)

Ajustar as regras de `.faq-rich-content` para:

1. **Dar altura a parágrafos vazios** para preservar as quebras de linha em branco:
   ```css
   .faq-rich-content p:empty::before { content: "\00a0"; }
   ```
   (Também cobrir `<p><br></p>`, padrão alternativo de linha vazia.)

2. **Aumentar a margem entre parágrafos** para um espaçamento natural de leitura (estilo Word):
   ```css
   .faq-rich-content p { margin: 0 0 0.75rem 0; line-height: 1.6; }
   .faq-rich-content p:last-child { margin-bottom: 0; }
   ```

3. **Garantir que blocos vazios entre headings/listas também respirem** com `min-height: 1em` nos parágrafos.

Nada muda no editor, no schema do banco, no `FAQArticleDialog` nem no fluxo de salvamento — o HTML continua o mesmo. A correção é puramente de renderização.

## Arquivos afetados

- `src/index.css` — atualizar bloco `.faq-rich-content` (regras de `p`, adicionar `p:empty::before` e variante `p:has(br:only-child)`).

## Fora de escopo

- Não alterar o editor TipTap.
- Não migrar conteúdo existente no banco.
- Não mexer em outros campos/textareas do projeto.
