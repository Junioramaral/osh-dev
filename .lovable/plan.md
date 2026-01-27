
Contexto do problema (o que vemos agora)
- No ticket 00000006 existem 4 comentários; 2 deles vieram via email (source='email'), mas com content vazio.
- Logs da função mostram que ela ainda processou “Processing email from: noreply@otimizzo.com …” e depois falhou com “Sender email does not match ticket contact…”. Isso indica que o filtro “systemEmails” não está pegando o remetente em alguns casos.
- O cliente continua recebendo um “email com a própria mensagem” e, em alguns casos, a resposta nem chega no sistema (provável bounce/loop + reply-to errado).

Principais causas prováveis (com base no código atual)
1) parseEmailAddress frágil (não dá trim antes do regex)
- Se o “from” vier com espaços/quebras de linha (“Otimizzo … <noreply@otimizzo.com>␠”), o regex pode não casar e o fallback retorna a string inteira como “email”.
- Aí o systemEmails.includes(...) não bate e a função segue processando, gerando o erro que apareceu nos logs.

2) Reply-To dos emails para o cliente está apontando para suporte@otimizzo.com (e não para um endereço “ticket-XXXX@…”)
- Hoje send-comment-notification envia:
  - from: noreply@otimizzo.com
  - replyTo: suporte@otimizzo.com
- Se o domínio/caixa “suporte@otimizzo.com” não estiver corretamente configurado no Resend Receiving (ou não existir/catch-all), o reply pode gerar bounce para o cliente (ele “recebe de volta” o que enviou) e o webhook pode nem disparar, por isso o comentário não é inserido.

3) A função receive-email-reply depende apenas do assunto para achar o ticket
- Se o cliente responder mudando o assunto (ou o cliente de email não mantiver o padrão), a extração falha e a função ignora.
- A payload tem “to: string[]”; isso é mais confiável se usarmos um reply-to do tipo ticket-00000006@otimizzo.com.

4) Falta de idempotência / duplicidade
- Já existem 2 comentários com o mesmo email_message_id (5505...), indicando retry/reprocessamento. Precisamos bloquear inserção duplicada por email_id.

O que vamos implementar (mudanças planejadas)

A) receive-email-reply (supabase/functions/receive-email-reply/index.ts)
1. Tornar parseEmailAddress robusto
- Fazer trim antes do match:
  - const normalized = fromString.trim();
  - match = normalized.match(...)
- Garantir que o “email” retornado também venha trimado.

2. Normalizar email para comparações (systemEmails e validação)
- Criar helper: normalizeEmail(email) => email?.trim().toLowerCase() || ""
- Usar normalizeEmail(parsedFrom.email) em:
  - systemEmails.includes(...)
  - comparação com ticket.contact_email

3. Ignorar emails do sistema e também “bounces” comuns
- Além de noreply@ e suporte@, ignorar remetentes típicos de bounce:
  - mailer-daemon@, postmaster@ (ou se subject contiver “Undelivered Mail Returned…” etc)
- Importante: para esses casos e para “sender não autorizado”, retornar 200 (OK) com mensagem “ignored”, para evitar retries do Resend e evitar que isso vire uma “tempestade” de webhooks.

4. Extrair ticket_number pelo destinatário (to) antes do subject
- Implementar extractTicketNumberFromTo(to: string[])
  - procurar padrão: /ticket-(\d+)/ em qualquer endereço do array
- Fluxo:
  - ticketNumber = extractFromTo(to) || extractFromSubject(subject)
  - Se não achar, logar e retornar 200 (ignorado)

5. Buscar o conteúdo do email e garantir texto mesmo quando vier só HTML
- Continuar usando GET /emails/receiving/:id
- Se emailDetail.text vier null e emailDetail.html vier preenchido:
  - converter html básico para texto (strip tags + decode básico), para não salvar content vazio nem HTML cru.

6. Idempotência por email_id
- Antes de inserir:
  - query em ticket_comments onde email_message_id = email_id
  - se existir, retornar 200 “already_processed”
- Isso evita duplicar comentários quando o Resend reenviar webhooks.

7. Reduzir pontos de falha na inserção
- Remover (ou tornar opcional com maybeSingle) a busca de “profile” que hoje está errada (eq client_id = ticket.id) e não é necessária para comentários de email.
- Inserir author_id = null para replies por email.

B) Corrigir Reply-To nos emails enviados ao cliente (para permitir replies estáveis)
1. send-comment-notification (supabase/functions/send-comment-notification/index.ts)
- Alterar replyTo: "suporte@otimizzo.com"
- Para: replyTo: `ticket-${ticketNumber}@otimizzo.com`
- Manter headers de In-Reply-To/References (ok), mas o mais importante é o replyTo real.

2. send-resolution-notification (supabase/functions/send-resolution-notification/index.ts)
- Mesma correção do replyTo para ticket-${ticketNumber}@otimizzo.com
- (Ele também hoje usa suporte@otimizzo.com)

C) Evitar loop/ruído com emails para analista
- send-analyst-notification atualmente não define replyTo; alguns clientes de email podem responder para noreply@otimizzo.com, gerando inbound.
- Ajuste planejado:
  - Definir replyTo: suporte@otimizzo.com (ou outro endereço “não inbound”) para reduzir chance de reply gerar webhook.
  - E manter a proteção no receive-email-reply (ignorando sistema/bounce) como rede de segurança.

D) Checagem rápida de configuração no Resend (passo operacional)
Para esse fluxo funcionar de ponta a ponta, o domínio otimizzo.com precisa estar com Receiving habilitado e aceitando:
- ticket-00000006@otimizzo.com (idealmente catch-all ticket-*@otimizzo.com)
Se hoje só suporte@ existe (ou não existe), os replies podem estar “voltando” como bounce pro cliente.

Plano de teste (para confirmar que resolveu)
1) Enviar um comentário “externo” pelo sistema (staff -> cliente), garantindo que o email vai com Reply-To: ticket-00000006@otimizzo.com
2) Cliente responde esse email
3) Verificar:
- receive-email-reply logs mostram:
  - ticketNumber extraído via “to”
  - emailDetail.text/html com tamanho > 0
  - “insert ticket_comments ok”
- O ticket passa a ter 5 comentários (um novo source='email' com content preenchido)
- Não há mais emails “espelho”/bounce para o cliente
- Não há duplicidade (email_id já processado)

Entrega (o que será alterado)
- Code changes:
  - supabase/functions/receive-email-reply/index.ts
  - supabase/functions/send-comment-notification/index.ts
  - supabase/functions/send-resolution-notification/index.ts
  - supabase/functions/send-analyst-notification/index.ts (opcional, recomendado)
- Sem mudanças de schema; apenas lógica e robustez.

Risco/observações
- Se o Resend Receiving não estiver configurado para aceitar ticket-*@otimizzo.com, mesmo com replyTo correto o inbound não chega. Nesse caso, a correção de código vai estar pronta, mas será necessário ajustar o receiving no Resend.
