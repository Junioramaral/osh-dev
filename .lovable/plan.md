# Bancos de Dados — duplicatas e nova coluna Máquina

## Diagnóstico das "duplicatas"

Consultei o banco para o cliente **ATPPOA** (ambiente Produção). Resultado:

| Nome      | Máquina       | IP             | Criticidade | ID                       |
|-----------|---------------|----------------|-------------|--------------------------|
| tripoa1   | atplxdb04     | 192.168.3.86   | crítica     | ee017dd2…                |
| tripoa1   | atplxdb06     | 192.168.3.90   | alta        | df8296f9…  ← duplicata real |
| tripoa1   | atplxdb06     | 192.168.3.90   | alta        | a218173e…  ← duplicata real |
| tripoa2   | atplxdb05     | 192.168.3.88   | crítica     | …                        |
| tripoahist| atplxdb06     | 192.168.3.90   | alta        | …                        |
| tripoahist| atplxdb06     | 192.168.3.90   | crítica     | …                        |

Conclusões:
- **Só 1 duplicata real e exata** (mesmo nome + máquina + ambiente + engine + criticidade): os dois `tripoa1` em `atplxdb06 / alta`, criados com ~19 min de diferença. Provável duplo clique em "Criar".
- Os demais registros que parecem duplicados são, na verdade, instâncias diferentes (máquinas distintas ou criticidades distintas). A tela só exibe `Nome da Instância`, então o usuário não consegue diferenciar.

## Mudanças propostas

### 1. Nova primeira coluna "Máquina (IP)" em `src/pages/Databases.tsx`
- Adicionar coluna como primeira da tabela em cada grupo de ambiente.
- Conteúdo: `hostname (ip_address)`; se não houver máquina vinculada, mostrar `—`.
- Ajustar o `select` da query `databases` para trazer `machines(hostname, ip_address)`.
- Adicionar ordenação por esse campo (mesmo padrão dos outros cabeçalhos).

### 2. Remover a duplicata real
- Excluir a instância `a218173e-b650-43fe-8c87-6ad15c8ca380` (a mais recente das duas idênticas) via migration `DELETE`.

### 3. Prevenir duplicatas futuras
- Adicionar índice único parcial em `database_instances`:
  ```sql
  CREATE UNIQUE INDEX uniq_db_instance_per_machine
    ON public.database_instances (client_id, machine_id, instance_name, environment)
    WHERE machine_id IS NOT NULL;
  ```
  (Usa índice parcial para não bloquear instâncias sem máquina.)
- Em `useCreateDatabase`, capturar o erro `23505` (violação de unicidade) e mostrar toast amigável: "Já existe uma instância com este nome nesta máquina/ambiente."

### Fora de escopo
- Não vou apagar os pares `tripoahist` (alta vs crítica) nem os `tripoa1` em máquinas diferentes — são registros legítimos. Se você confirmar que algum deve sumir, removo depois.

## Arquivos afetados
- `src/pages/Databases.tsx` (nova coluna + ordenação + query)
- `src/hooks/useDatabaseMutations.ts` (tratamento do erro 23505)
- Nova migration: índice único + DELETE da linha duplicada
