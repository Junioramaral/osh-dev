

# Plano: Corrigir Extração de Conteúdo do Email

## Problema Identificado

O sistema está recebendo os emails corretamente (extração de ticket via endereço `ticket-XXXXX@resend.otimizzo.com` funcionou!), mas o **conteúdo não está sendo extraído**.

### Evidência dos Logs
```
2026-01-28T00:29:59Z INFO Warning: Email content is empty after processing
2026-01-28T00:29:59Z INFO Final content length: 41
```

O log "Email content fetched" que deveria aparecer se a API fosse chamada com sucesso **NÃO APARECE**, indicando que:
1. A chamada à API do Resend falhou
2. OU a resposta não foi OK (status != 200)
3. OU `text` e `html` vieram vazios

### Causa Provável

O código atual **não loga** quando a resposta da API não é OK:
```typescript
if (emailDetailResponse.ok) {
  // só entra aqui se status 200
} 
// PROBLEMA: não há else para logar o erro!
```

## Solução Proposta

### 1. Adicionar Logs Detalhados na Chamada à API

Quando a resposta não for OK, precisamos logar o status e o corpo da resposta para entender o problema:

```typescript
if (RESEND_API_KEY && email_id) {
  try {
    console.log("Fetching email content from Resend API for email_id:", email_id);
    
    const emailDetailResponse = await fetch(
      `https://api.resend.com/emails/receiving/${email_id}`,
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      }
    );

    console.log("Resend API response status:", emailDetailResponse.status);

    if (emailDetailResponse.ok) {
      const emailDetail = await emailDetailResponse.json();
      console.log("Email detail received:", JSON.stringify({
        hasText: !!emailDetail.text,
        textLength: emailDetail.text?.length || 0,
        hasHtml: !!emailDetail.html,
        htmlLength: emailDetail.html?.length || 0,
      }));
      
      // ... resto do código
    } else {
      // NOVO: Logar quando a resposta não for OK
      const errorBody = await emailDetailResponse.text();
      console.error("Resend API error:", emailDetailResponse.status, errorBody);
    }
  } catch (error) {
    console.error("Error fetching email details:", error);
  }
}
```

### 2. Usar Dados do Webhook como Fallback

O webhook do Resend **já inclui** `text` e `html` no payload inicial. Atualmente priorizamos a API, mas devemos garantir que usamos o webhook como fallback robusto:

```typescript
// Usar dados do webhook primeiro se disponíveis
let emailContent = "";

// Tentar do webhook primeiro
if (text && text.trim()) {
  emailContent = text;
  console.log("Using text from webhook payload, length:", text.length);
} else if (html && html.trim()) {
  emailContent = htmlToText(html);
  console.log("Using HTML from webhook payload (converted), length:", emailContent.length);
}

// Se vazio, tentar da API (mais completo)
if (!emailContent && RESEND_API_KEY && email_id) {
  // ... chamada à API
}
```

### 3. Verificar se o Webhook Está Enviando Conteúdo

Adicionar log para ver o que o webhook está enviando:

```typescript
console.log("Webhook payload preview:", JSON.stringify({
  from: parsedFrom.email,
  subject: subject,
  hasText: !!text,
  textLength: text?.length || 0,
  hasHtml: !!html,
  htmlLength: html?.length || 0,
}));
```

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/receive-email-reply/index.ts` | Adicionar logs detalhados e melhorar fallback |

## Mudanças Específicas

### receive-email-reply/index.ts

**Após linha 291 (depois de logar "Processing email from:"):**
```typescript
// Adicionar log do payload do webhook
console.log("Webhook payload preview:", JSON.stringify({
  hasText: !!text,
  textLength: text?.length || 0,
  hasHtml: !!html,
  htmlLength: html?.length || 0,
}));
```

**Linhas 365-396 (busca de conteúdo):**
```typescript
// Reescrever a lógica de busca de conteúdo
let emailContent = "";

// PASSO 1: Tentar extrair do payload do webhook primeiro
if (text && text.trim()) {
  emailContent = text.trim();
  console.log("Content from webhook text, length:", emailContent.length);
} else if (html && html.trim()) {
  emailContent = htmlToText(html);
  console.log("Content from webhook HTML (converted), length:", emailContent.length);
}

// PASSO 2: Se vazio, tentar da API do Resend (mais completo)
if (!emailContent && RESEND_API_KEY && email_id) {
  try {
    console.log("Fetching full email content from Resend API...");
    
    const emailDetailResponse = await fetch(
      `https://api.resend.com/emails/receiving/${email_id}`,
      {
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
      }
    );

    console.log("Resend API response status:", emailDetailResponse.status);

    if (emailDetailResponse.ok) {
      const emailDetail = await emailDetailResponse.json();
      console.log("API response:", JSON.stringify({
        hasText: !!emailDetail.text,
        textLength: emailDetail.text?.length || 0,
        hasHtml: !!emailDetail.html,
        htmlLength: emailDetail.html?.length || 0,
      }));
      
      if (emailDetail.text && emailDetail.text.trim()) {
        emailContent = emailDetail.text.trim();
      } else if (emailDetail.html && emailDetail.html.trim()) {
        emailContent = htmlToText(emailDetail.html);
      }
    } else {
      const errorBody = await emailDetailResponse.text();
      console.error("Resend API error:", emailDetailResponse.status, errorBody);
    }
  } catch (error) {
    console.error("Error fetching email details:", error);
  }
}

// PASSO 3: Limpar conteúdo (remover quoted text)
let cleanContent = emailContent.split(/On .* wrote:|Em .* escreveu:|Sent with .*/i)[0].trim();

// PASSO 4: Se ainda vazio, usar placeholder
if (!cleanContent) {
  console.log("Warning: Email content is empty after all attempts");
  cleanContent = "[Conteúdo do email não pôde ser extraído]";
}

console.log("Final content length:", cleanContent.length);
```

## Resultado Esperado

Após as alterações, os logs mostrarão:
1. Se o webhook já contém `text` ou `html`
2. O status da resposta da API do Resend
3. Se a API retornou conteúdo
4. Qual fonte foi usada para o conteúdo final

Isso nos permitirá diagnosticar exatamente onde o conteúdo está sendo perdido e corrigir o problema de forma definitiva.

## Fluxo Corrigido

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Webhook recebido com text/html                           │
│    → Tentar usar texto do webhook primeiro                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (se vazio)
┌─────────────────────────────────────────────────────────────┐
│ 2. Chamar API /emails/receiving/{id}                        │
│    → Logar status da resposta                               │
│    → Logar erro se não OK                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Limpar conteúdo                                          │
│    → Remover quoted text                                    │
│    → Remover "Sent with..." do Hostinger Mail               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Salvar comentário                                        │
└─────────────────────────────────────────────────────────────┘
```

## Observação Importante

Note que no print do email do cliente há "Sent with Hostinger Mail" no final. A regex atual para limpar quoted text não remove isso. Vamos adicionar esse padrão na limpeza.

