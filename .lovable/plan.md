
## O que o print + logs provam (por que “não extrai o conteúdo”)
O seu fluxo de “receber a resposta do cliente” está chegando na função e salvando o comentário, mas **não consegue obter o corpo do email**.

Nos logs da Edge Function `receive-email-reply`, aparecem exatamente estes dois pontos:

1) **O webhook NÃO está trazendo o corpo** (isso é normal no Resend Receiving):
- `Webhook payload preview: {"hasText":false,"textLength":0,"hasHtml":false,"htmlLength":0}`

2) A função tenta buscar o corpo via API do Resend, mas **a chave atual não tem permissão**:
- `Resend API response status: 401`
- `Resend API error: 401 {"message":"This API key is restricted to only send emails","name":"restricted_api_key"}`

Ou seja: **o código está fazendo o correto (buscar o conteúdo pelo endpoint de receiving), mas o Resend bloqueia** porque a `RESEND_API_KEY` configurada no Supabase é “send-only”.

Resultado: o comentário é criado, mas cai no placeholder:
`[Conteúdo do email não pôde ser extraído]` (igual no print).

---

## Correção real (não é só código): trocar a API Key do Resend
### Passo A — Criar uma API Key com acesso a Receiving
No Resend:
1. Vá em **API Keys**
2. **Create API Key**
3. Escolha uma key **Full access** (ou que permita “Receiving / Read received emails”, dependendo do painel)
4. Copie a key nova (normalmente começa com `re_...`)

### Passo B — Atualizar o segredo no Supabase
No Supabase (seu projeto `ukrgzsntvddzwtmccwbf`):
1. Vá em **Settings → Functions → Secrets**
2. Atualize o valor do segredo **`RESEND_API_KEY`** para a key nova (Full access)

Observação: como o envio já está funcionando hoje, essa troca não quebra envio — uma key Full access também envia.

### Passo C — Teste de validação
1. Envie um comentário para o cliente (para gerar email com Reply-To `ticket-00000006@resend.otimizzo.com`)
2. Peça para o cliente responder
3. Verifique no log da função `receive-email-reply` se agora aparece:
   - `Resend API response status: 200`
   - `Content from API text...` ou `Content from API HTML...`
4. O comentário no ticket deve vir com o texto real, não mais com placeholder

---

## Melhorias de código (para evitar “ficar cego” quando isso acontecer)
Mesmo com a correção acima, vale melhorar o código para ficar autoexplicativo quando ocorrer 401:

### 1) Placeholder mais informativo
Se receber `restricted_api_key`, salvar como:
- `[Falha ao extrair conteúdo: RESEND_API_KEY sem permissão para Receiving. Gere uma API key Full access no Resend e atualize o segredo no Supabase.]`

### 2) Separar chaves (opcional, recomendado)
Adicionar suporte a uma env específica só para receiving, por exemplo:
- `RESEND_RECEIVING_API_KEY`
e o código usa essa primeiro; se não existir, cai para `RESEND_API_KEY`.

Vantagem: você pode manter uma chave “send-only” para envio e uma chave “receiving” separada para leitura.

### 3) (Opcional) Backfill dos comentários antigos
Criar uma Edge Function/admin script para:
- buscar `ticket_comments` com `source='email'` e `content='[Conteúdo do email não pôde ser extraído]'`
- usar `email_message_id` para chamar a API Receiving
- atualizar `content` com o texto correto

---

## Ordem de execução
1) Você cria/atualiza a API key no Resend (Full access) e atualiza o segredo no Supabase
2) Eu (em modo de implementação) faço as melhorias de código (itens “Melhorias de código”)
3) Teste com um novo reply do cliente
4) (Opcional) rodar backfill para corrigir os comentários antigos

---

## Por que isso acontece especificamente no seu caso
- O Resend Receiving Webhook normalmente envia **metadados + email_id**, e o conteúdo completo é buscado via API.
- Sua key atual está explicitamente marcada como **“restricted to only send emails”**, então ela nunca vai conseguir ler emails recebidos.
