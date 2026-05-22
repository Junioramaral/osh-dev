## Filtrar Engine pelo cliente em "Nova Instância de Banco"

### Problema
No `DatabaseDialog.tsx` o campo **Engine** mostra todas as opções fixas (PostgreSQL, MySQL, Oracle, MongoDB, SQL Server) independente do cliente escolhido. A tabela `clients` já tem o campo `db_engines` (array com os engines contratados pelo cliente — ex.: ATPPOA só tem Oracle) e `segments` (DB/APP/...).

### Mudanças em `src/components/databases/DatabaseDialog.tsx`

1. **Buscar `db_engines` e `segments` junto com o cliente selecionado**
   - Alterar o `useQuery` de clients para trazer também `db_engines` e `segments`.
   - Criar `selectedClient = clients.find(c => c.id === selectedClientId)`.

2. **Filtrar opções do Select de Engine**
   - Lista base de engines vem do hook `useDatabaseEngines` (tabela `database_engines`) — já é o padrão dinâmico do sistema. Se preferir manter as fixas atuais, filtramos diretamente pelo array do cliente.
   - Renderizar apenas as engines presentes em `selectedClient.db_engines`.
   - Se nenhum cliente está selecionado: desabilitar o Select com placeholder "Selecione o cliente primeiro".
   - Se o cliente não tem nenhum engine cadastrado: mostrar mensagem "Nenhum engine cadastrado para este cliente" e desabilitar o campo (orientar a editar o cliente).

3. **Resetar o engine quando trocar de cliente**
   - `useEffect` observando `selectedClientId`: se o valor atual de `engine` não está em `db_engines` do novo cliente, limpar o campo (`form.setValue("engine", "")`). Não limpar quando estiver em modo edição inicial.

4. **Validar segmento DB (opcional, recomendado)**
   - Se `selectedClient.segments` não inclui `'DB'`, exibir alerta no topo do formulário: "Este cliente não possui o segmento DB ativo" e desabilitar o submit. Isso evita cadastrar banco para cliente que só tem APP.

5. **Ajuste no schema Zod**
   - Trocar o `z.enum([...])` por `z.string().min(1, "Selecione um engine")` para aceitar a lista dinâmica do cliente sem quebrar o type.

### Comportamento esperado
- Super admin abre "Nova Instância" → escolhe ATPPOA → o select de Engine passa a mostrar apenas "Oracle".
- Se trocar para um cliente sem engines, o campo fica desabilitado com mensagem.
- Edição existente continua funcionando: o engine atual permanece selecionado.

### Fora de escopo
- Não alterar a tabela `clients` nem migrações.
- Não mexer em outras telas (Applications/Machines).
