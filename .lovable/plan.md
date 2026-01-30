
# Plano: Reformular Lancamento de Horas com Data, Horarios e Projeto

## Objetivo

Redesenhar o dialog de lancamento de horas para incluir:
1. Calendario para selecionar a data do trabalho
2. Campos de hora inicial e hora final (calcula horas automaticamente)
3. Validacao de horario comercial (8:00-18:30) vs hora-extra
4. Seletor de projeto filtrado pelo cliente do ticket

---

## 1. Alteracoes no Banco de Dados

Adicionar novas colunas na tabela `ticket_time_logs`:

```sql
ALTER TABLE public.ticket_time_logs 
ADD COLUMN project_id uuid REFERENCES public.client_projects(id),
ADD COLUMN work_date date NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN start_time time NOT NULL DEFAULT '08:00',
ADD COLUMN end_time time NOT NULL DEFAULT '18:00';

CREATE INDEX idx_time_logs_project ON public.ticket_time_logs(project_id);
CREATE INDEX idx_time_logs_work_date ON public.ticket_time_logs(work_date);
```

---

## 2. Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/tickets/TimeLogDialog.tsx` | Redesenhar formulario completo |
| `src/hooks/useTimeLogMutations.ts` | Adicionar novos campos na mutation |
| `src/components/tickets/TimeLogEditDialog.tsx` | Adicionar campos de data, hora e projeto |
| `src/hooks/useClientProjects.ts` | Adicionar query para buscar projetos ativos |

---

## 3. Interface do Usuario

### Novo Dialog de Lancamento de Horas

```text
┌────────────────────────────────────────────────────────────────────┐
│  [Clock] Registrar Horas Trabalhadas                               │
│  Ticket #00000123 - Erro no sistema                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Data do Trabalho *                                                │
│  [📅 30/01/2026          ▼]                                        │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐                        │
│  │ Hora Inicial *   │  │ Hora Final *     │                        │
│  │ [08:00]          │  │ [18:30]          │  = 10.5 horas          │
│  └──────────────────┘  └──────────────────┘                        │
│                                                                    │
│  ⚠️ Horario fora do comercial detectado (antes 8h ou apos 18:30)   │
│  Selecione um projeto de hora-extra.                               │
│                                                                    │
│  Projeto *                                                         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Selecione um projeto...                                   ▼  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │ ○ LEXIS-Sustentacao                                          │  │
│  │ ○ LEXIS-Novas Funcionalidades                                │  │
│  │ ● LEXIS-Hora-Extra [Badge: HE]            <-- Obrigatorio    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  Descricao do Trabalho                                             │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Analise de performance do banco...                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
│                              [Cancelar]  [Registrar Horas]         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 4. Logica de Validacao

### Horario Comercial
- **Normal**: 08:00 ate 18:30
- **Hora-Extra**: Qualquer horario fora desse intervalo

### Regras de Validacao

```typescript
function isBusinessHours(start: string, end: string): boolean {
  const startMinutes = parseTime(start);  // "08:00" -> 480
  const endMinutes = parseTime(end);      // "18:30" -> 1110
  
  const BUSINESS_START = 8 * 60;          // 08:00 = 480
  const BUSINESS_END = 18 * 60 + 30;      // 18:30 = 1110
  
  return startMinutes >= BUSINESS_START && endMinutes <= BUSINESS_END;
}

function calculateHours(start: string, end: string): number {
  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);
  return (endMinutes - startMinutes) / 60;  // Retorna horas decimais
}
```

### Validacao de Projeto

| Cenario | Projeto Obrigatorio? | Projetos Disponiveis |
|---------|---------------------|---------------------|
| Dentro horario comercial | Opcional | Todos os projetos ativos do cliente |
| Fora horario comercial | Obrigatorio | Apenas projetos com `is_overtime = true` |

---

## 5. Detalhes Tecnicos

### 5.1 Props do TimeLogDialog (atualizado)

```typescript
interface TimeLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: {
    id: string;
    ticket_number: string;
    title: string;
    client_id: string;  // NOVO - necessario para buscar projetos
  };
}
```

### 5.2 Estado do Formulario

```typescript
const [workDate, setWorkDate] = useState<Date>(new Date());
const [startTime, setStartTime] = useState("08:00");
const [endTime, setEndTime] = useState("18:00");
const [projectId, setProjectId] = useState<string | null>(null);
const [description, setDescription] = useState("");

// Calculos derivados
const isOutsideBusinessHours = !isBusinessHours(startTime, endTime);
const calculatedHours = calculateHours(startTime, endTime);
const requiresOvertimeProject = isOutsideBusinessHours;
```

### 5.3 Componentes Utilizados

- `Calendar` + `Popover` para DatePicker (seguindo padrao Shadcn)
- `Input type="time"` para hora inicial e final
- `Select` para selecao de projeto
- `Badge` com icone de Clock para indicar projetos hora-extra

### 5.4 Mutation Atualizada

```typescript
interface AddTimeLogParams {
  ticketId: string;
  projectId?: string;
  workDate: string;      // "2026-01-30"
  startTime: string;     // "08:00"
  endTime: string;       // "18:30"
  hours: number;         // Calculado automaticamente
  description?: string;
}
```

---

## 6. Fluxo do Usuario

```text
1. Analista clica "Registrar Horas"
        │
        ▼
2. Dialog abre com data de hoje
   e horarios 08:00-18:00 pre-preenchidos
        │
        ▼
3. Analista ajusta data e horarios
        │
        ├─── Horario dentro 8h-18:30 ───┐
        │                               │
        │                               ▼
        │                    Projeto: Opcional
        │                    (mostra todos)
        │
        └─── Horario fora 8h-18:30 ────┐
                                       │
                                       ▼
                          ⚠️ Alerta aparece
                          Projeto: Obrigatorio
                          (filtra so is_overtime=true)
        │
        ▼
4. Analista seleciona projeto (se aplicavel)
        │
        ▼
5. Adiciona descricao (opcional)
        │
        ▼
6. Clica "Registrar Horas"
        │
        ▼
7. Sistema salva com todos os campos
```

---

## 7. Atualizacao do TicketSidebar

O TicketSidebar ja passa o ticket para o TimeLogDialog. Precisamos garantir que `client_id` esteja disponivel:

```typescript
// Ja existe no ticket carregado por useTicketDetail
<TimeLogDialog
  open={showTimeLogDialog}
  onOpenChange={setShowTimeLogDialog}
  ticket={{
    id: ticket.id,
    ticket_number: ticket.ticket_number,
    title: ticket.title,
    client_id: ticket.client_id,  // ADICIONAR
  }}
/>
```

---

## 8. Resultado Visual

### Lancamento Normal (dentro horario comercial)
```text
┌─────────────────────────────────────────────────────────────┐
│  Data: 30/01/2026                                           │
│  Horario: 08:00 - 12:30                    = 4.5 horas      │
│  Projeto: LEXIS-Sustentacao (opcional)                      │
└─────────────────────────────────────────────────────────────┘
```

### Lancamento Hora-Extra (fora horario comercial)
```text
┌─────────────────────────────────────────────────────────────┐
│  Data: 30/01/2026                                           │
│  Horario: 19:00 - 22:00                    = 3.0 horas      │
│  ⚠️ Trabalho fora do horario comercial                       │
│  Projeto: LEXIS-HE [Badge HE] * (obrigatorio)               │
└─────────────────────────────────────────────────────────────┘
```
