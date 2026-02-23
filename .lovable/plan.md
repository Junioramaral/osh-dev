
# Modal de Conclusao de RFC com Email e Registro no Historico

## O que muda

Ao clicar em "Concluir RFC" (quando 100% dos passos estao concluidos), em vez de concluir imediatamente, abre um modal onde o analista escreve uma mensagem de conclusao. Ao confirmar:

1. O status da RFC muda para "resolvido"
2. Um email e enviado ao cliente informando que a RFC foi concluida
3. A mensagem e registrada como comentario no ticket para historico

## Detalhes Tecnicos

### 1. Criar componente `RFCCompleteDialog`

**Novo arquivo: `src/components/tickets/RFCCompleteDialog.tsx`**

Modal similar ao `TicketResolveDialog` existente, com:
- Informacoes do ticket (numero, titulo, cliente)
- Campo de texto para a mensagem de conclusao (minimo 10 caracteres)
- Botoes Cancelar e Confirmar

### 2. Modificar `src/pages/RFCExecution.tsx`

- Adicionar estado `showCompleteDialog` (boolean)
- O botao "Concluir RFC" (linha 331) passa a abrir o modal em vez de chamar `handleMarkConcluida` diretamente
- Reescrever `handleMarkConcluida` para receber a mensagem e:
  1. Buscar dados do ticket (contact_email, contact_name, created_at)
  2. Buscar perfil do usuario logado (full_name)
  3. Atualizar status para "resolvido" com `resolved_at` e `resolved_by`
  4. Inserir comentario em `ticket_comments` com a mensagem
  5. Chamar edge function `send-resolution-notification` para enviar email ao cliente
  6. Invalidar queries relevantes

### Fluxo

```text
[Todos passos concluidos]
        |
        v
[Clica "Concluir RFC"]
        |
        v
[Modal abre - preenche mensagem]
        |
        v
[Confirma]
        |
        +---> UPDATE tickets (status=resolvido, resolved_at, resolved_by)
        +---> INSERT ticket_comments (mensagem de conclusao)
        +---> CALL send-resolution-notification (email ao cliente)
```

### Arquivos

- **Novo**: `src/components/tickets/RFCCompleteDialog.tsx`
- **Editado**: `src/pages/RFCExecution.tsx`

### O que NAO muda

- Edge function `send-resolution-notification` (ja existe e sera reutilizada)
- Banco de dados (nenhuma migracao)
- Outros componentes
