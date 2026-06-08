## Diagnóstico

Encontrei dois problemas reais na anexação de arquivos durante a criação do ticket (`FileUploadZone.tsx` + `NewTicketDialog.tsx`). O erro "desaparece rápido" porque a falha acontece silenciosamente no fluxo de compressão de imagens — o arquivo some da lista antes do submit.

### Problema 1 — Race condition no FileUploadZone (causa principal)

No `processFiles`, ao anexar uma imagem:

1. Adiciona um item temporário: `onFilesChange([...files, tempFileWithPreview])`
2. Aguarda compressão (`await compressImageFile`)
3. No `reader.onload`, faz: `const currentFiles = files.slice()` — mas `files` aqui é o array **antigo** capturado no closure (vazio, sem o item temporário).
4. Faz `currentFiles.map(f => f.id === fileId ? updated : f)` — como o id não existe no array antigo, nada é substituído.
5. Chama `onFilesChange(updatedFiles)` com o array antigo, **apagando o arquivo recém-adicionado**.

Resultado: ao anexar um print, ele aparece por um instante e some. Se o usuário envia o ticket antes da compressão terminar, vai sem evidência; se espera, a lista é zerada.

O mesmo padrão de closure stale afeta o bloco que adiciona arquivos não-imagem em lote.

### Problema 2 — Nome de arquivo não sanitizado

`uploadTicketFiles` monta o path como `${clientId}/${ticketNumber}/${fileItem.file.name}`. Prints de tela costumam ter nomes como `Captura de tela 2026-06-08 às 13.45.15.png` (espaços, acentos, `:`). O Supabase Storage rejeita vários desses caracteres com erro `InvalidKey`, e o catch só mostra um toast rápido — coerente com "erro muito rápido que não consegui observar".

## Correções

### 1. `src/components/tickets/FileUploadZone.tsx`
- Trocar todas as chamadas `onFilesChange([...files, ...])` por uma forma que use o estado mais recente. Como `onFilesChange` é o setter do pai (`setUploadFiles`), passar uma função updater não funciona direto — então vou manter um `filesRef` interno (`useRef`) sincronizado via `useEffect`, e usar `filesRef.current` dentro de `processFiles` e do `reader.onload` em vez do `files` do closure.
- Adicionar `try/catch` no bloco do `reader.onload` para nunca deixar o item "preso" em `isCompressing: true`.
- Logar com `console.error` qualquer falha de compressão e manter o arquivo original ao invés de descartar.

### 2. `src/components/tickets/NewTicketDialog.tsx` (função `uploadTicketFiles`)
- Sanitizar o nome do arquivo antes de montar o path: normalizar acentos (NFD + remover diacríticos), substituir qualquer caractere fora de `[A-Za-z0-9._-]` por `_`, e prefixar com timestamp para evitar colisão (`Date.now()_nome.ext`). Manter o nome original no campo `name` da Evidence (para exibir bonito), só o `path` é sanitizado.
- Melhorar o `catch` do `onSubmit` para mostrar `error.message || error.error || JSON.stringify(error)` no toast, com `duration: 8000`, para que erros futuros fiquem visíveis.

### 3. Verificação
Após implementar, abrir o preview, criar um ticket anexando:
- Um print com nome contendo espaços/acentos.
- Um PDF normal.

Confirmar pelos console logs (`📤 Fazendo upload...`, `✅ Evidências salvas`) e pela aba Anexos do ticket criado.

## Escopo

Mudanças apenas em 2 arquivos frontend. Sem alteração de schema, RLS, edge functions ou bucket — as políticas de storage e o bucket `tickets` já estão corretos.
