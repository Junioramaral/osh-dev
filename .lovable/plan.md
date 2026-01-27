

# Plano: Prevenir Loop de Email - Ignorar Emails do Próprio Sistema

## Problema Identificado

Existe um **loop de notificação** no sistema:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 1. Cliente responde ao email do ticket                         │
│    From: contato@lexisflow.adv.br                               │
│    Subject: Re: [Ticket #00000006] Nova atualização...          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. receive-email-reply processa ✓                               │
│    - Insere comentário                                          │
│    - Chama send-analyst-notification                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. send-analyst-notification envia email para analista          │
│    From: noreply@otimizzo.com                                   │
│    Subject: [Ticket #00000006] Nova resposta do cliente...      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Resend aciona webhook novamente! ← PROBLEMA                  │
│    O email do sistema também ativa o inbound webhook            │
│    porque contém [Ticket #XXXXX] no assunto                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. receive-email-reply tenta processar                          │
│    From: noreply@otimizzo.com                                   │
│    Erro: "Sender email does not match ticket contact"           │
└─────────────────────────────────────────────────────────────────┘
```

### Evidência dos Logs

```
23:00:31 - Processing email from: contato@lexisflow.adv.br ✓
23:00:34 - Analyst notified successfully ✓
23:00:39 - Processing email from: noreply@otimizzo.com ← LOOP!
23:00:44 - Processing email from: noreply@otimizzo.com ← LOOP!
```

## Solução Proposta

Adicionar verificação no início da função `receive-email-reply` para **ignorar emails enviados pelo próprio sistema** antes de qualquer processamento.

### Arquivo: `supabase/functions/receive-email-reply/index.ts`

#### Alteração: Ignorar Emails do Sistema

Após parsear o endereço de email, verificar se o remetente é o próprio sistema:

```typescript
// Parsear o endereço de email
const parsedFrom = parseEmailAddress(from);

// NOVA VERIFICAÇÃO: Ignorar emails enviados pelo próprio sistema
const systemEmails = [
  "noreply@otimizzo.com",
  "suporte@otimizzo.com"
];

if (systemEmails.includes(parsedFrom.email?.toLowerCase() || "")) {
  console.log("Ignoring email from system address:", parsedFrom.email);
  return new Response(
    JSON.stringify({ message: "System email ignored" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

console.log("Processing email from:", parsedFrom.email, ...);
```

## Resumo das Mudanças

| Arquivo | Mudança |
|---------|---------|
| `receive-email-reply/index.ts` | Adicionar verificação após linha 199 para ignorar emails de `noreply@otimizzo.com` |

## Fluxo Corrigido

```text
┌───────────────────────────────────────┐
│ Webhook recebido                      │
└───────────────────────────────────────┘
                 │
                 ▼
┌───────────────────────────────────────┐
│ Verificar remetente                   │
│ É noreply@otimizzo.com?               │
└───────────────────────────────────────┘
        │               │
        │ SIM           │ NÃO
        ▼               ▼
┌──────────────┐  ┌────────────────────┐
│ Ignorar      │  │ Processar email    │
│ (return 200) │  │ normalmente        │
└──────────────┘  └────────────────────┘
```

## Resultado Esperado

- Emails enviados pelo sistema (`noreply@otimizzo.com`) serão ignorados silenciosamente
- Emails de clientes continuarão sendo processados normalmente
- O loop de notificação será eliminado
- Logs mostrarão "Ignoring email from system address" para emails do sistema

