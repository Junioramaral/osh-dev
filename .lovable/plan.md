

# Edge Function: Notificacao de Aprovacao/Rejeicao de RFC

## Objetivo

Criar uma edge function `send-rfc-decision-notification` que envia um e-mail ao criador da RFC informando se ela foi aprovada ou rejeitada, incluindo o comentario do gestor. Integrar a chamada nos handlers `handleApprove` e `handleReject` da pagina `RFCApproval.tsx`.

---

## Arquivos a criar/modificar

### 1. `supabase/functions/send-rfc-decision-notification/index.ts` (Novo)

Edge function que recebe os dados da decisao e envia e-mail via Resend. Segue o mesmo padrao de autenticacao e estrutura das funcoes existentes (`send-resolution-notification`, `send-comment-notification`).

**Parametros de entrada (JSON body):**
- `ticketId` - UUID do ticket RFC
- `ticketNumber` - Numero do ticket
- `ticketTitle` - Titulo
- `contactEmail` - Email do criador da RFC (campo `contact_email` do ticket)
- `contactName` - Nome do criador (campo `contact_name` do ticket)
- `decision` - `"aprovada"` ou `"rejeitada"`
- `comentario` - Texto do gestor
- `gestorName` - Nome do gestor que tomou a decisao

**Logica:**
1. Validar autenticacao (JWT)
2. Verificar que o usuario e Otimizzo ou Super Admin
3. Montar template HTML com cores diferenciadas:
   - Aprovada: header verde, badge "APROVADA", icone de check
   - Rejeitada: header vermelho, badge "REJEITADA", icone X
4. Enviar via Resend com `from: noreply@resend.otimizzo.com`
5. Subject: `[RFC #XXXX] Aprovada - Titulo` ou `[RFC #XXXX] Rejeitada - Titulo`

**Template do e-mail:**
- Header colorido (verde ou vermelho conforme decisao)
- Badge de status (APROVADA / REJEITADA)
- Info do ticket: numero, titulo, data de criacao
- Caixa com comentario do gestor e nome
- Se rejeitada: nota informando que a RFC retornou para rascunho para ajustes
- Footer padrao Otimizzo

### 2. `supabase/config.toml` — Registrar a nova funcao

```toml
[functions.send-rfc-decision-notification]
verify_jwt = false
```

### 3. `src/pages/RFCApproval.tsx` — Chamar a edge function

Modificar `handleApprove` e `handleReject` para, apos o update de status e insercao do comentario, buscar os dados do ticket (`contact_email`, `contact_name`) e invocar a edge function:

```typescript
// Buscar dados do ticket para notificacao
const { data: ticketData } = await supabase
  .from("tickets")
  .select("contact_email, contact_name, ticket_number, title")
  .eq("id", selectedRfcId)
  .single();

// Enviar notificacao (fire-and-forget, nao bloqueia o fluxo)
supabase.functions.invoke("send-rfc-decision-notification", {
  body: {
    ticketId: selectedRfcId,
    ticketNumber: ticketData.ticket_number,
    ticketTitle: ticketData.title,
    contactEmail: ticketData.contact_email,
    contactName: ticketData.contact_name,
    decision: "aprovada", // ou "rejeitada"
    comentario: comentario.trim(),
    gestorName: profile?.full_name ?? "Gestor",
  },
});
```

A chamada e fire-and-forget — se o envio falhar, nao impede a aprovacao/rejeicao ja concluida. Apenas um `console.error` para registro.

---

## Sequencia de implementacao

```text
1. supabase/functions/send-rfc-decision-notification/index.ts (criar)
2. supabase/config.toml (registrar funcao)
3. src/pages/RFCApproval.tsx (integrar chamada nos handlers)
```

## O que NAO muda

- Fluxo de aprovacao/rejeicao (status update + comentario interno)
- Outras edge functions existentes
- Schema do banco de dados
- RLS policies
