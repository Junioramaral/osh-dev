## Permitir qualquer tipo de arquivo no upload

O componente `FileUploadZone` (usado na abertura do chamado, comentários e anexos) bloqueia extensões como `.sql` por causa de uma lista fixa de MIME types (`allowedTypes`). Vou remover essa restrição.

### Alterações em `src/components/tickets/FileUploadZone.tsx`

1. **Remover a checagem `allowedTypes`** dentro de `validateFile`. Mantém apenas a validação de tamanho (`maxSizeMB`).
2. **Atualizar o `<input type="file">`**: trocar `accept="image/*,.pdf,.doc,..."` por `accept="*/*"` para que o seletor do sistema mostre todos os arquivos.

Nenhuma outra lógica muda: compressão de imagens continua só para `file.type.startsWith("image/")`, limites de quantidade/tamanho permanecem, e os componentes que usam o Zone (`NewTicketDialog`, `TicketAttachments`, etc.) não precisam de ajuste.