

# Observacoes dos Passos RFC na Timeline

## Objetivo

Adicionar as observacoes (campo `observacao`) dos passos RFC nos eventos da timeline, com um botao de seta para baixo/cima para expandir e recolher, identico ao padrao usado no portal do cliente (ClientRFCPortal).

---

## Mudanca

### Arquivo: `src/components/tickets/TicketTimeline.tsx`

1. **Passar `observacao` nos eventos RFC**: Ao criar os eventos `rfc_step_started` e `rfc_step_completed`, incluir o campo `observacao` do passo no objeto do evento.

2. **Adicionar estado de expansao no `TimelineItem`**: Adicionar um estado local `expanded` no componente `TimelineItem` para controlar a visibilidade da observacao.

3. **Renderizar botao de seta e observacao**: Para eventos do tipo `rfc_step_started` e `rfc_step_completed` que possuem `observacao`, mostrar:
   - Um botao com icone `ChevronDown` / `ChevronUp` ao lado do label do evento
   - Quando expandido, um card com o texto da observacao (mesmo estilo dos cards de `content` e `description` ja existentes)

---

## Detalhes Tecnicos

### Dados do evento

Nos blocos que criam eventos RFC (linhas 159-186), adicionar `observacao: step.observacao` ao objeto do evento, tanto para `rfc_step_started` quanto para `rfc_step_completed`.

### Componente TimelineItem

- Importar `ChevronDown` e `ChevronUp` de lucide-react
- Adicionar `const [expanded, setExpanded] = useState(false)` dentro do componente
- Importar `useState` (ja esta importado no arquivo)
- Ao lado do label (linha 74), para eventos RFC com `observacao`, renderizar um botao de toggle
- Abaixo do label, quando `expanded === true`, renderizar o texto da observacao em um Card identico ao padrao existente (linhas 82-91)

### Visual

O botao de seta aparece apenas nos eventos `rfc_step_started` e `rfc_step_completed` que tenham `observacao` preenchida. O comportamento e identico ao do portal do cliente: clica na seta para baixo, expande a observacao; clica na seta para cima, recolhe.

### Arquivos a modificar

- `src/components/tickets/TicketTimeline.tsx`

### O que NAO muda

- Nenhum outro componente ou pagina
- Nenhuma query ou banco de dados
- O portal do cliente permanece identico

