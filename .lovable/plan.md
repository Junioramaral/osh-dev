## Diagnóstico

- O cadastro da usuária existe em `profiles`: o nome completo e o telefone estão salvos para `juliane@atppoa.com.br`.
- O problema está no frontend: o modal `Meu Perfil` inicializa os campos antes do `profile` terminar de carregar no `AuthContext`. Quando os dados chegam depois, os campos do formulário não são sincronizados, então aparecem apenas os placeholders de nome/telefone enquanto o e-mail aparece porque vem direto da sessão autenticada.

## Plano de correção

1. Atualizar `ProfileEditDialog.tsx` para sincronizar os campos quando o modal estiver aberto e os dados do `profile` chegarem ou mudarem.
2. Usar fallback seguro para nome/telefone vindos de `user.user_metadata` caso o `profile` ainda esteja carregando, mantendo `profiles` como fonte principal.
3. Evitar sobrescrever alterações que o usuário já digitou no modal, sincronizando apenas ao abrir ou quando os dados chegam inicialmente vazios.
4. Manter a aba de Segurança e a troca de senha sem alterações.

## Resultado esperado

Ao abrir `Meu Perfil`, Juliane verá automaticamente o nome completo e telefone cadastrados, mesmo se o perfil carregar alguns instantes depois do login.