## Exibir nome completo do ambiente em "Informações Técnicas"

### Problema
Em `TicketDetails.tsx` (linhas 269 e 278), o campo "Ambiente" é renderizado direto a partir do valor do enum salvo no banco (`prod`, `hom`, `qa`, `dev`), aparecendo abreviado.

### Solução
Criar uma função utilitária local `formatEnvironment(env)` que converta:
- `prod` → "Produção"
- `hom` → "Homologação"
- `qa` → "QA"
- `dev` → "Desenvolvimento"

E aplicá-la nos dois `InfoRow` de Ambiente (DB e APP).

### Arquivos
- `src/components/tickets/TicketDetails.tsx` — adicionar helper e usar nos dois pontos.

Observação: o valor permanece como enum no banco (sem alteração de schema). Apenas a exibição é traduzida.