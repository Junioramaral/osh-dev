## Objetivo

Corrigir o contato do ticket **#00101014** que foi cadastrado erroneamente como `suporte@otimizzo.com` (Junior Amaral) para `juliane@atpppoa.com.br`.

## Estado atual no banco

- `tickets.id` = `dde3ad46-279d-4f29-85f0-31a2326839a5`
- `contact_email` = `suporte@otimizzo.com`
- `contact_name` = `Junior Amaral`
- `client_id` = `d47fdc41-b35c-4e34-886a-bf570b2c27ab` (ATP)

Não existe profile cadastrado com o e-mail `juliane@atpppoa.com.br`, então é uma atualização pontual só dos campos de contato do ticket.

## Ação

Atualizar somente o ticket #00101014:

- `contact_email` → `juliane@atpppoa.com.br`
- `contact_name` → **a confirmar com você** (sugestão: `Juliane`)

## Perguntas antes de executar

1. Qual nome devo colocar em `contact_name`? (Juliane Athanázio)
2. Quer que eu também grave uma entrada em `ticket_history` registrando a alteração (auditoria), com o motivo "Correção de contato cadastrado erroneamente"?

## Fora de escopo

- Não vou criar profile/usuário para `juliane@atpppoa.com.br`.
- Não vou reenviar nenhum e-mail antigo do ticket.
- Não mexo em outros tickets — somente o `#00101014`.
- Mudança feita via tool de dados (UPDATE direto), sem migration de schema.