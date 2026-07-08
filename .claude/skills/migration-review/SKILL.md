# Skill: migration-review

## Objetivo
Revisar qualquer migration SQL do Supabase (OSH) antes de ser aplicada,
prevenindo quebra de dados existentes, RLS mal configurado, e migrações
não reversíveis.

## Quando usar esta skill
Invocar sempre que:
- Uma nova migration for criada em `/supabase/migrations`
- Antes de rodar `supabase db push` (local ou remoto)
- Ao revisar migrations do plano multi-tenant (001 a 014 e futuras)

## Checklist de revisão

### Segurança e estrutura
- [ ] Toda `ALTER TABLE ... ADD COLUMN` em tabela com dados existentes
      define um `DEFAULT` ou é `NULLABLE`, para não quebrar linhas atuais
- [ ] Colunas `NOT NULL` novas em tabela populada: migration faz
      `UPDATE` de backfill antes de aplicar o `NOT NULL`
- [ ] Toda FK nova (`REFERENCES`) declara `ON DELETE` explícito
      (`CASCADE`, `RESTRICT` ou `SET NULL` — nunca deixar implícito)
- [ ] Nenhuma migration já aplicada é editada — sempre criar uma nova
      migration corretiva
- [ ] Nome do arquivo segue o padrão `NNN_descricao_curta.sql`
      (numeração sequencial, sem pular nem repetir)

### RLS (ver também skill rls-policy)
- [ ] Toda tabela nova com dado de tenant tem `ENABLE ROW LEVEL SECURITY`
      na mesma migration que a cria (não deixar para depois)
- [ ] Nenhuma policy usa `OR is_platform_admin()` fora de `tenants` e
      `platform_admins` (ver skill tenant-audit)

### Performance
- [ ] Índice criado para toda FK usada em filtro (`tenant_id`,
      `client_id`, etc.)
- [ ] Migrations grandes em tabela populada avaliam necessidade de
      `CONCURRENTLY` no índice (evitar lock longo em produção)

### Reversibilidade
- [ ] Se a migration for destrutiva (`DROP COLUMN`, `DROP TABLE`),
      existe um plano de rollback documentado no topo do arquivo como
      comentário SQL
- [ ] Dados sensíveis nunca são apagados sem antes existir backup/export

### Ambiente
- [ ] Migration foi testada primeiro em OSH-DEV (dump/restore local)
      antes de ir para produção
- [ ] `package-lock.json` / dependências relacionadas (se a migration
      exigir lib nova) estão sincronizadas

## Processo sugerido
1. Rodar este checklist migration por migration antes de aplicar
2. Se algo falhar, propor correção e aguardar aprovação — nunca aplicar
   migration sozinho sem confirmação (ver `.claude/settings.json`)
3. Após aprovação: aplicar primeiro em OSH-DEV, validar, só depois
   propor aplicar em produção
