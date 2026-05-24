## Objetivo

Aplicar máscara visual de CNPJ (`00.000.000/0000-00`) em todos os inputs e exibições do sistema, melhorando legibilidade e padronização.

## Estratégia

Criar um utilitário central `src/lib/cnpjUtils.ts` (espelhando o padrão de `phoneUtils.ts`) com:
- `formatCnpj(value)` — formata uma string em `00.000.000/0000-00` (aceita parcial durante digitação)
- `unformatCnpj(value)` — retorna apenas dígitos (máx 14)
- `isValidCnpj(value)` — validação opcional via dígitos verificadores

A persistência no banco continua como string. Vamos salvar **com a máscara** (consistente com o que já existe hoje no banco) para não quebrar registros antigos. A formatação é aplicada na entrada de qualquer valor, então mesmo dados antigos sem máscara serão exibidos formatados.

## Alterações

### 1. Novo arquivo `src/lib/cnpjUtils.ts`
Funções utilitárias de formatação/limpeza/validação.

### 2. Inputs de CNPJ (digitação com máscara em tempo real)
- `src/components/clients/ClientDialog.tsx` (campo CNPJ na aba "Informações Básicas") — aplicar `formatCnpj` no `onChange`, limitar a 18 chars.
- `src/pages/TenantAdmin.tsx` (form Novo Tenant) — mesmo tratamento.
- `src/pages/TenantDetail.tsx` (form Editar Tenant) — mesmo tratamento.

### 3. Exibições de CNPJ (garantir máscara mesmo se vier sem formatação do banco)
- `src/pages/Clients.tsx` linha 132 — `CNPJ: {formatCnpj(client.cnpj)}`
- `src/pages/TenantDetail.tsx` linha 476 — `CNPJ: {tenant.cnpj ? formatCnpj(tenant.cnpj) : "N/A"}`
- `src/pages/TenantAdmin.tsx` linha 482 — `{formatCnpj(tenant.cnpj)}`

### 4. Validação leve (opcional, não bloqueante)
No `clientSchema` (ClientDialog) e nos forms de tenant, manter o campo opcional. Validar formato (14 dígitos) apenas se preenchido, exibindo mensagem amigável.

## Fora de escopo
- Não alterar dados existentes no banco (sem migration).
- Não validar dígitos verificadores como obrigatório — apenas o comprimento.
