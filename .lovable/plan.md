# Padronizar e-mails para compatibilidade Outlook + Webmail

## Contexto

A correção anterior aplicada ao e-mail de RFC (layout quebrava no Outlook) precisa ser estendida. Auditando as Edge Functions de e-mail, identifiquei que **6 das 7 funções** ainda usam padrões que o Outlook (desktop, especialmente Windows com Word rendering engine) não renderiza corretamente:

- `display: flex` / `display: grid` → Outlook ignora, quebra o layout em coluna única desalinhada
- `<style>` no `<head>` com classes → Outlook desktop suporta parcialmente, mas falha em muitos casos (Outlook.com, mobile)
- `linear-gradient(...)` em backgrounds → Outlook não renderiza, fica sem cor de fundo
- `border-radius`, `box-shadow` → ignorados pelo Outlook desktop
- `<div>` empilhado para colunas → não vira coluna no Outlook
- Emojis grandes via `font-size` → renderização inconsistente

## Funções afetadas

| Função | Problemas detectados | Severidade |
|---|---|---|
| `send-monthly-report` | flex em métricas, gradient header, bar-chart em flex, classes CSS | **Alta** (quebra muito no Outlook) |
| `send-resolution-notification` | gradient header, gradient no CTA do CSAT, classes CSS | Alta |
| `send-rfc-decision-notification` | gradient header dinâmico, classes CSS | Alta |
| `send-comment-notification` | classes CSS, layout div | Média |
| `send-analyst-notification` | classes CSS, layout div, botão action | Média |
| `send-analyst-assignment-notification` | divs com `background:` inline (funciona razoável), sem gradient | Baixa (já quase ok) |
| `send-rfc-report` | **já foi corrigido** | — |

`submit-feedback` não envia e-mail (não precisa ajuste).

## O que será feito

Aplicar o **mesmo padrão "email-safe" do `send-rfc-report`** em todas as outras funções:

1. **Substituir `<div>` por `<table role="presentation">`** para todo o esqueleto (container, header, content, footer, cards de métricas).
2. **Remover `display: flex` e `display: grid`** — usar `<table>` com `<td>` para colunas (ex.: cards de métricas lado a lado).
3. **Trocar `linear-gradient(...)` por cor sólida** (cor principal do gradiente atual) — mantém identidade visual sem quebrar no Outlook.
4. **Mover todo CSS para `style=""` inline** em cada elemento (eliminar `<style>` no `<head>`, exceto `body` reset).
5. **Substituir bar-chart flex** do relatório mensal por barras feitas com `<table>` + `<td>` com `background-color` e `height`.
6. **Manter idêntica a aparência** em webmail moderno (Gmail, Apple Mail, etc.) — as mudanças são estruturais, não visuais.

## Detalhes técnicos por função

- **send-monthly-report**: maior refatoração. Cards de métricas (`.metrics` flex) → tabela 4 colunas. Bar-chart → tabela com altura proporcional via `height` + `background-color`. Headers de seção e badges convertidos para inline-style.
- **send-resolution-notification**: gradient verde → `#28a745` sólido no header e no botão CSAT. Bloco CSAT (centralizado com gradient bg) → `<table>` centralizada com cor sólida.
- **send-rfc-decision-notification**: gradients dinâmicos (aprovado/reprovado) → cores sólidas dinâmicas (`#28a745` / `#dc3545`).
- **send-comment-notification** e **send-analyst-notification**: converter wrapper `.container/.header/.content/.footer` para tabelas; mover estilos para inline.
- **send-analyst-assignment-notification**: pequenos ajustes — envolver em tabela presentation para garantir centralização em Outlook.

## Fora de escopo

- Não vou alterar conteúdo textual, assuntos, lógica de envio, destinatários, anexos, headers (Reply-To, In-Reply-To), nem a função `submit-feedback`.
- Não vou mexer em `receive-email-reply` (recebimento, não envio).
- Não introduzo bibliotecas (React Email etc.) — mantenho HTML inline como já é hoje.

## Validação

Após o ajuste, os HTMLs gerados seguirão o mesmo padrão que já validamos no `send-rfc-report` (que renderiza corretamente no Outlook). Você pode testar disparando um e-mail real de cada tipo após implementação.
