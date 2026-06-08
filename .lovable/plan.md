# Corrigir reset indevido no diálogo "Nova Instância de Banco de Dados"

## Causa

Em `src/components/databases/DatabaseDialog.tsx` existem dois `useEffect` que dependem do objeto `profile` do `AuthContext`:

1. Linhas 122–126: força `client_id` para `profile.client_id` sempre que `profile` muda.
2. Linhas 142–168: chama `form.reset(...)` no modo criação sempre que `profile` muda, apagando tudo que foi digitado e voltando o cliente para o do usuário logado (Otimizzo).

Quando o usuário troca de aba/janela para copiar uma informação e volta, o Supabase revalida a sessão e o `AuthContext` emite um novo objeto `profile` (mesma referência lógica, nova referência em memória). Isso dispara os dois efeitos e o formulário é resetado — exatamente o sintoma descrito (cliente volta para "Otimizzo" e campos são apagados).

O mesmo padrão pode existir em outros diálogos, mas o usuário só relatou este. Mantenho o escopo apenas neste arquivo.

## Mudanças

**Arquivo:** `src/components/databases/DatabaseDialog.tsx`

1. **Resetar o formulário apenas na transição de `open` (false → true)**, não sempre que `profile` mudar. Usar um `useRef` (`wasOpenRef`) ou condicionar o efeito a executar somente quando `open` passa a `true`. As dependências do efeito de reset passam a ser apenas `[open, database?.id]`; os valores de `profile` são lidos dentro do efeito sem entrar nas dependências.

2. **Remover o efeito das linhas 122–126** que força `client_id` ao `profile.client_id` em toda mudança de `profile`. A inicialização correta já acontece no efeito de reset (que roda na abertura). O campo continua `disabled` para não-super-admin, então não há risco de o usuário enviar outro `client_id`.

3. Manter intacto o efeito que limpa o `engine` quando o cliente selecionado não suporta mais aquele engine (linhas 129–140), pois ele depende de `selectedClientId`/`clients`, não de `profile`.

## Validação

- Abrir "Nova Instância de Banco de Dados", selecionar um cliente diferente do padrão (ex.: ATPPOA), preencher alguns campos, trocar de aba, voltar: cliente e campos devem permanecer.
- Abrir o diálogo em modo edição: deve continuar carregando os dados da instância normalmente.
- Usuário não super-admin: campo Cliente continua bloqueado e pré-preenchido com o cliente do perfil.
