

# Reordenar campos APP e adicionar filtros em cascata no NewTicketDialog

## Objetivo

Quando o cliente abrir um chamado de **Aplicação (APP)**, os campos devem aparecer e filtrar nesta ordem:

**Produto → Ambiente → Máquina → Instância APP → Módulo**

E cada seleção filtra a próxima:
- **Produto** → filtra Instâncias e Máquinas relacionadas àquele produto + cliente
- **Ambiente** → filtra Máquinas e Instâncias daquele ambiente
- **Máquina** → mostra apenas Instâncias daquela máquina
- **Instância** → carrega Módulos disponíveis (`active_modules` da instância)

## O que precisa mudar (arquivo único: `src/components/tickets/NewTicketDialog.tsx`)

### 1. Adicionar `watch` para novos campos APP
```ts
const selectedAppEnvironment = watch("app_environment");
const selectedAppMachineId = watch("app_machine_id");
const selectedAppInstanceId = watch("app_instance_id");
```

### 2. Atualizar query `appInstances` (linhas 313-326)
Incluir `machine_id` e `active_modules` no SELECT, e filtrar por `environment` + `machine_id`:
```ts
queryKey: ["app-instances", selectedClientId, selectedAppProductId, selectedAppEnvironment, selectedAppMachineId]
.eq("client_id", selectedClientId)
.eq("product_id", selectedAppProductId)
.maybeFilter("environment", selectedAppEnvironment)
.maybeFilter("machine_id", selectedAppMachineId)
```

### 3. Atualizar query `machines` (linhas 329-373)
Adicionar bloco para segmento APP que filtra máquinas pelas que possuem `application_instances` com o produto/ambiente selecionados:
- Se `segment === "APP"` e `selectedAppProductId`: buscar `application_instances` por `product_id` (+ `environment` se houver) → coletar `machine_id`s → buscar máquinas com `.in("id", ids)` e opcionalmente `.eq("environment", ...)`
- Mantém comportamento DB inalterado

### 4. Nova query/derivado para Módulos
Buscar `active_modules` da instância selecionada (campo já existe em `application_instances`, conforme `ApplicationInstanceDialog.tsx`):
```ts
const { data: appInstanceDetail } = useQuery({
  queryKey: ["app-instance-modules", selectedAppInstanceId],
  queryFn: async () => {
    const { data } = await supabase
      .from("application_instances")
      .select("active_modules")
      .eq("id", selectedAppInstanceId).single();
    return data;
  },
  enabled: !!selectedAppInstanceId && segment === "APP",
});
const availableModules = (appInstanceDetail?.active_modules as string[]) || [];
```

### 5. Reordenar JSX (linhas 1147-1236)
Nova estrutura visual em duas linhas:
- **Linha 1 (grid 2 col)**: Produto + Ambiente
- **Linha 2 (grid 3 col)**: Máquina + Instância APP + Módulo

O campo **Módulo** muda de `<Input>` livre para `<Select>` populado por `availableModules` (com fallback para Input livre se a instância não tiver módulos cadastrados, para não quebrar fluxos existentes).

### 6. useEffects de limpeza em cascata
```ts
// Trocar Produto → limpar Ambiente, Máquina, Instância, Módulo
useEffect(() => { if (segment !== "APP") return;
  setValue("app_environment", undefined);
  setValue("app_machine_id", undefined);
  setValue("app_instance_id", undefined);
  setValue("app_module", undefined);
}, [selectedAppProductId]);

// Trocar Ambiente → limpar Máquina, Instância, Módulo
// Trocar Máquina → limpar Instância, Módulo
// Trocar Instância → limpar Módulo
```

### 7. Auto-seleção (manter compatibilidade)
- Auto-seleção de produto único (linhas 459-463) ✅ mantém
- Auto-seleção de instância única (linhas 466-470) ✅ mantém
- Adicionar: auto-seleção de máquina única quando filtrada

## Pontos de atenção (sem quebrar nada)

- **Ambiente continua opcional?** Hoje é opcional. Manter opcional — se vazio, não filtra.
- **Máquina continua opcional?** Sim — instâncias podem não ter `machine_id`.
- **Módulo continua opcional?** Sim — se a instância não tiver `active_modules`, mostra Input livre como hoje.
- **Compatibilidade de tipos**: `application_instances.environment` é enum (`prod|hom|qa|dev`) e `machines.environment` é text — valores já alinhados.
- **Validação Zod**: schema atual exige só `app_product_id` e `app_instance_id`. Mantém igual.

## Arquivo alterado
- `src/components/tickets/NewTicketDialog.tsx` (única alteração)

