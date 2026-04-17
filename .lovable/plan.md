

# Reordenar campos DB e adicionar filtros em cascata no NewTicketDialog

## Objetivo

Quando o cliente abrir um chamado de DB, os campos devem aparecer e filtrar nesta ordem:

**Engine → Ambiente → Máquina → Instância DB**

E cada seleção deve filtrar a próxima:
- **Engine** selecionado → filtra Máquinas e Instâncias que têm aquele engine
- **Ambiente** selecionado → filtra Máquinas e Instâncias daquele ambiente
- **Máquina** selecionada → mostra apenas Instâncias daquela máquina

## O que precisa mudar

### Arquivo único: `src/components/tickets/NewTicketDialog.tsx`

#### 1. Reordenar JSX (linhas 938-1021)
Mudar o layout para a sequência desejada:
- **Linha 1 (grid 2 col)**: Engine + Ambiente
- **Linha 2 (grid 2 col)**: Máquina + Instância DB

#### 2. Atualizar query de Máquinas (linhas 320-333)
Adicionar `environment` ao SELECT e filtrar por engine + ambiente:
```ts
// Hoje: filtra apenas por client_id
// Novo: também filtra por engine (via database_instances) e environment
queryKey: ["machines", selectedClientId, selectedDbEngine, selectedDbEnvironment]
```
Buscar máquinas que:
- Pertencem ao cliente
- Têm `environment` = ambiente selecionado (se selecionado)
- Possuem ao menos uma `database_instance` com o engine selecionado (se selecionado)

#### 3. Atualizar query de Instâncias DB (linhas 254-269)
Adicionar filtros por `environment` e `machine_id`:
```ts
queryKey: ["db-instances", selectedClientId, selectedDbEngine, selectedDbEnvironment, selectedDbMachineId]
```
Filtrar por:
- `client_id` (já existe)
- `engine` (já existe)
- `environment` se selecionado
- `machine_id` se selecionado

#### 4. Adicionar useEffects de limpeza em cascata
Quando o usuário trocar:
- **Engine** → limpar Ambiente, Máquina, Instância
- **Ambiente** → limpar Máquina, Instância
- **Máquina** → limpar Instância

#### 5. Adicionar `watch` para os novos campos
```ts
const selectedDbEnvironment = watch("db_environment");
const selectedDbMachineId = watch("db_machine_id");
```

## Pontos de atenção (sem quebrar nada)

- **Ambiente vira obrigatório?** Hoje é opcional no schema. Recomendo manter opcional, mas se vazio, não filtra.
- **Máquina continua opcional?** Sim — se não selecionar máquina, mostra todas as instâncias compatíveis com engine + ambiente.
- **Auto-seleção de engine única** (linhas 433-437) continua funcionando.
- **Compatibilidade**: A coluna `machines.environment` é `text` e `database_instances.environment` é enum — os valores ("prod", "hom", "qa", "dev") devem bater. Verificar dados existentes antes para confirmar consistência.

## Arquivos alterados
- `src/components/tickets/NewTicketDialog.tsx` (única alteração)

