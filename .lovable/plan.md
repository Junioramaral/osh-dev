

# Plano: Corrigir Verificação de Assinatura do Webhook Resend

## Problema Identificado

A função `receive-email-reply` está retornando erro 401 porque a verificação de assinatura está incorreta. O Resend usa **Svix** para webhooks e o formato é diferente do implementado atualmente.

## Diferenças Entre Implementação Atual e Correta

| Aspecto | Implementação Atual | Implementação Correta |
|---------|---------------------|----------------------|
| Formato do Secret | Usado diretamente como texto | Remover prefixo `whsec_` e decodificar de Base64 |
| Signed Content | `${timestamp}.${payload}` | `${svix_id}.${svix_timestamp}.${body}` |
| Formato da Assinatura | Comparação hexadecimal | Formato `v1,BASE64_SIGNATURE` (decodificar) |
| Comparação | String simples | Comparar múltiplas assinaturas possíveis |

## Alterações Necessárias

### Arquivo: `supabase/functions/receive-email-reply/index.ts`

A função `verifyWebhookSignature` será completamente reescrita para:

1. **Extrair o secret real** removendo o prefixo `whsec_` e decodificando de Base64
2. **Construir o signedContent** no formato correto: `${svix_id}.${svix_timestamp}.${body}`
3. **Calcular o HMAC-SHA256** usando o secret decodificado
4. **Comparar com cada assinatura** no header (formato `v1,base64signature v1,base64signature2`)
5. **Retornar true** se qualquer assinatura corresponder

## Detalhes Técnicos

### Nova Função de Verificação

```text
Fluxo de Verificação:
                                    
┌─────────────────────────────────┐  
│ Secret: whsec_ABC123...         │  
│ Remove "whsec_" prefix          │  
│ Base64 decode → bytes           │  
└─────────────────────────────────┘  
                 │                   
                 ▼                   
┌─────────────────────────────────┐  
│ SignedContent =                 │  
│ svix_id.svix_timestamp.body     │  
└─────────────────────────────────┘  
                 │                   
                 ▼                   
┌─────────────────────────────────┐  
│ HMAC-SHA256(secretBytes,        │  
│             signedContent)      │  
│ Result → Base64 encode          │  
└─────────────────────────────────┘  
                 │                   
                 ▼                   
┌─────────────────────────────────┐  
│ Header: "v1,sig1 v1,sig2"       │  
│ Split by space                  │  
│ Extract signature after "v1,"   │  
│ Compare with computed signature │  
└─────────────────────────────────┘  
```

### Código da Nova Implementação

A nova função de verificação:

1. Decodifica o secret de Base64 (removendo prefixo `whsec_`)
2. Cria o payload assinado: `svix_id.svix_timestamp.body`
3. Gera HMAC-SHA256 e codifica em Base64
4. Extrai todas as assinaturas do header (formato `v1,signature`)
5. Compara cada uma com a assinatura calculada

### Atualização do Handler

O handler será atualizado para passar o `svixId` para a função de verificação, pois ele faz parte do signed content.

## Resumo das Mudanças

| Linha Aprox. | Mudança |
|--------------|---------|
| 31-63 | Reescrever `verifyWebhookSignature` com lógica Svix correta |
| 88-89 | Garantir que `svixId` está sendo usado |
| 105-110 | Passar `svixId` para a função de verificação |

## Resultado Esperado

Após a implementação:
- Webhook do Resend será verificado corretamente
- Emails de resposta serão processados e adicionados como comentários
- Erro 401 será eliminado para requisições legítimas

