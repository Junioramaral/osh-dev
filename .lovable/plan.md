
# Plano: Corrigir Estrutura do Payload do Webhook Resend

## Problema Identificado

O erro `TypeError: Cannot read properties of undefined (reading 'toLowerCase')` ocorre porque o código assume que o campo `from` é um **objeto** com propriedades `email` e `name`, mas a API do Resend envia `from` como uma **string** no formato:

```
"Acme <email@example.com>"
```

### Evidência dos Logs

```
Processing email from: undefined Subject: Re: [Ticket #00000006]...
```

O `from.email` retorna `undefined` porque `from` é uma string, não um objeto.

## Alterações Necessárias

### Arquivo: `supabase/functions/receive-email-reply/index.ts`

#### 1. Corrigir Interface `EmailReceivedPayload`

Alterar o tipo do campo `from` de objeto para string:

```text
ANTES:
from: {
  email: string;
  name?: string;
};

DEPOIS:
from: string;  // Formato: "Name <email@example.com>"
```

#### 2. Criar Função para Parsear Endereço de Email

Adicionar função utilitária para extrair email e nome da string:

```typescript
function parseEmailAddress(fromString: string): { email: string; name: string } {
  // Formato: "Name <email@example.com>" ou "email@example.com"
  const match = fromString?.match(/^(?:(.+?)\s*)?<(.+)>$/);
  if (match) {
    return {
      name: match[1]?.trim() || "",
      email: match[2].trim()
    };
  }
  // Fallback: assume que é só o email
  return {
    name: "",
    email: fromString?.trim() || ""
  };
}
```

#### 3. Adicionar Validações de Entrada com Null Checks

Validar se `data` existe antes de processar:

```typescript
// Validar que os dados necessários existem
if (!webhookData.data) {
  console.log("No data in webhook payload");
  return new Response(...);
}

const { from, subject, text, html, email_id } = webhookData.data;

// Validar campos obrigatórios
if (!from || !subject) {
  console.log("Missing required fields: from or subject");
  return new Response(...);
}
```

#### 4. Atualizar Todas as Referências a `from`

Usar a função de parse e optional chaining:

```text
Linha 161: from.email → parsedFrom.email
Linha 193: from.email.toLowerCase() → parsedFrom.email?.toLowerCase()
Linha 249: from.email → parsedFrom.email
Linha 250: from.name → parsedFrom.name
Linha 268: from.email → parsedFrom.email
Linha 302: from.name → parsedFrom.name
Linha 303: from.email → parsedFrom.email
```

## Resumo das Mudanças

| Seção | Mudança |
|-------|---------|
| Linhas 14-28 | Corrigir interface - `from` como string |
| Após linha 95 | Adicionar função `parseEmailAddress()` |
| Linhas 149-161 | Adicionar validação de entrada |
| Linhas 159-161 | Parsear `from` e usar resultado |
| Linhas 193-204 | Usar `parsedFrom.email?.toLowerCase()` |
| Linhas 249-252 | Usar `parsedFrom.email` e `parsedFrom.name` |
| Linhas 268-269 | Usar `parsedFrom.email` no metadata |
| Linhas 302-303 | Usar `parsedFrom` na notificação |

## Fluxo Corrigido

```text
┌─────────────────────────────────────┐
│ Webhook Payload                     │
│ from: "Cliente <cliente@email.com>" │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ parseEmailAddress(from)             │
│ → { email: "cliente@email.com",     │
│     name: "Cliente" }               │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Usar parsedFrom.email para:        │
│ - Log                               │
│ - Validação com ticket.contact_email│
│ - Inserir comentário                │
│ - Histórico                         │
│ - Notificação ao analista           │
└─────────────────────────────────────┘
```

## Resultado Esperado

- Emails de resposta serão processados corretamente
- Comentários serão inseridos no banco de dados
- Erro `TypeError` será eliminado
- Validações robustas evitarão crashes futuros
