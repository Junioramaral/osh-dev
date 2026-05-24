## Causa
No `ClientProjectsTab.tsx`, a aba de Projetos é renderizada dentro do `<form>` do `ClientDialog`. Os botões internos (Salvar, Cancelar, Novo Projeto, editar, excluir, toggle) não declaram `type="button"`, então o HTML padrão os trata como `type="submit"`. Ao clicar em "Salvar" do projeto:
1. O projeto é criado (toast "Projeto criado com sucesso!").
2. O click também submete o form do cliente, disparando "Cliente atualizado com sucesso!" e fechando o diálogo — voltando o usuário para a listagem de clientes.

O replay confirma os dois toasts em sequência.

## Correção
Em `src/components/clients/ClientProjectsTab.tsx`, adicionar `type="button"` em todos os `<Button>`:
- "Novo Projeto"
- "Cancelar" e "Salvar" do formulário de novo projeto
- "Cancelar" e "Salvar" do formulário de edição
- Botões de ícone (editar, excluir)

Sem isso, qualquer click dentro da aba pode submeter o form externo. Fora de escopo: alterações em hooks, RLS ou no `ClientDialog`.