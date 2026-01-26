

## Correção: Permitir Segmentos Dinâmicos na Tabela Teams

### Problema Identificado

O erro ocorre porque:
1. A tabela `teams` tem a coluna `segment` do tipo **enum `ticket_segment`** do PostgreSQL
2. Este enum só aceita os valores fixos: `'DB'` e `'APP'`
3. Você criou um novo segmento "INFRA" na tabela `segments`
4. Ao tentar criar um time com segmento "INFRA", o banco rejeita porque não é um valor válido no enum

### Solução

Alterar a coluna `segment` da tabela `teams` de `ticket_segment` (enum) para `TEXT`, permitindo qualquer código de segmento da tabela `segments`.

---

### Migração de Banco de Dados

```sql
-- Alterar coluna segment de enum para TEXT
ALTER TABLE public.teams 
ALTER COLUMN segment TYPE TEXT 
USING segment::TEXT;
```

Esta migração:
- Converte a coluna de enum para TEXT
- Preserva os dados existentes ('DB', 'APP')
- Permite novos valores como 'INFRA'

---

### Atualização do TeamDialog.tsx

Ajustar o TypeScript para refletir que `segment` agora aceita qualquer string (não apenas 'DB' | 'APP'):

**Alterações:**
- Linha 45: Mudar `segment: "DB" | "APP"` para `segment: string`
- Linhas 89 e 113: Remover o cast `as "DB" | "APP"` pois não é mais necessário

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Alterar `teams.segment` de enum para TEXT |
| `src/components/settings/TeamDialog.tsx` | Atualizar tipos TypeScript |

---

### Impacto

- **Baixo risco**: Apenas a tabela `teams` é afetada
- **Compatibilidade**: Dados existentes ('DB', 'APP') continuam funcionando
- **Flexibilidade**: Qualquer segmento cadastrado na tabela `segments` pode ser usado

---

### Nota sobre Outras Tabelas

As tabelas `tickets`, `faq_articles` e `ticket_categories` também usam o enum `ticket_segment`. Para usar segmentos dinâmicos nessas tabelas, será necessário aplicar migrações similares (Fase 2 do plano original). Por enquanto, esta correção foca apenas na tabela `teams`.

