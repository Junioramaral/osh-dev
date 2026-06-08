## Cascata Ambiente → Máquina → Instância no novo ticket

Arquivo: `src/components/tickets/NewTicketDialog.tsx`

A lógica de filtragem em cascata já existe (queries e `setValue` que limpam filhos), mas a UI mostra os campos habilitados o tempo todo. Vou bloquear os selects filhos até o pai estar preenchido.

### Segmento DB
- **Máquina**: desabilitar até `db_environment` ter valor. Placeholder muda para "Selecione o ambiente primeiro" quando desabilitado; "Selecione a máquina" quando habilitado.
- **Instância DB**: desabilitar até `db_machine_id` ter valor. Placeholders análogos.

### Segmento APP
- **Máquina**: desabilitar até `app_environment` ter valor.
- **Instância APP**: desabilitar até `app_machine_id` ter valor.
- **Módulo**: já depende de instância — manter, mas garantir desabilitado até instância escolhida (se ainda não estiver).

### Detalhes técnicos
- Usar a prop `disabled` do `<Select>` (shadcn) baseada em `!watch(parent)`.
- Texto do `SelectValue placeholder` muda conforme estado.
- Manter o auto-preenchimento existente (quando há só uma máquina) mas só quando o ambiente já foi escolhido — comportamento já consistente com a cascata atual.
- Sem alterações em queries, schema ou backend.
