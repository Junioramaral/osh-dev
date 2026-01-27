
# Plano: Corrigir Endpoint da API do Resend para Emails Inbound

## Problema Identificado

O conteúdo dos emails de resposta está chegando vazio porque a função está usando o **endpoint errado** da API do Resend:

| Situação Atual | Situação Correta |
|----------------|------------------|
| `https://api.resend.com/emails/${email_id}` | `https://api.resend.com/emails/receiving/${email_id}` |
| Retorna emails **enviados** | Retorna emails **recebidos** |
| Não encontra o email_id de inbound | Retorna html e text do email recebido |

### Evidência no Banco de Dados

```
content: ""  ← Vazio para comentários de email
sender_email: contato@lexisflow.adv.br
source: email
```

O comentário é criado, mas sem conteúdo porque a API retorna vazio ou erro para o endpoint errado.

## Alteração Necessária

### Arquivo: `supabase/functions/receive-email-reply/index.ts`

**Linha 251-252** - Alterar a URL do endpoint:

```text
ANTES:
const emailDetailResponse = await fetch(
  `https://api.resend.com/emails/${email_id}`,

DEPOIS:
const emailDetailResponse = await fetch(
  `https://api.resend.com/emails/receiving/${email_id}`,
```

### Adicionar Logs de Debug

Para garantir visibilidade do conteúdo recebido, adicionar logs após buscar o email:

```typescript
if (emailDetailResponse.ok) {
  const emailDetail = await emailDetailResponse.json();
  console.log("Email content fetched - text length:", emailDetail.text?.length || 0);
  console.log("Email content fetched - html length:", emailDetail.html?.length || 0);
  emailContent = emailDetail.text || emailDetail.html || text || "";
}
```

## Fluxo Corrigido

```text
┌────────────────────────────────────────┐
│ Webhook recebido com email_id          │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ GET /emails/receiving/{email_id}       │
│ (antes: /emails/{email_id} ← ERRADO)   │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ Response:                              │
│ {                                      │
│   "html": "<p>Conteúdo do email</p>",  │
│   "text": "Conteúdo do email",         │
│   ...                                  │
│ }                                      │
└────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────┐
│ cleanContent = Limpa quoted text       │
│ Insere comentário com conteúdo real    │
└────────────────────────────────────────┘
```

## Resumo das Mudanças

| Linha | Mudança |
|-------|---------|
| 251-252 | Corrigir URL: `/emails/${email_id}` → `/emails/receiving/${email_id}` |
| 260-262 | Adicionar logs de debug para visualizar tamanho do conteúdo |

## Resultado Esperado

- Emails de resposta terão seu conteúdo exibido corretamente
- Comentários serão inseridos com o texto real da mensagem
- Logs mostrarão o tamanho do conteúdo recebido para debugging
