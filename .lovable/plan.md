# Troca de Senha do Usuário Logado

## Recomendação UX/UI

A melhor prática é **manter a troca de senha dentro do "Meu Perfil"**, mas em uma **aba separada chamada "Segurança"**. Isso porque:

- O usuário já associa "perfil" como o lugar de gerenciar a própria conta (padrão Google, GitHub, Notion, Linear).
- Dados pessoais (nome, foto, telefone) e dados sensíveis (senha) devem ficar **visualmente separados** para evitar erros e reforçar a percepção de segurança.
- Evita criar uma nova rota/menu só para senha, mantendo a navegação enxuta.

## Estrutura proposta

Reorganizar o `ProfileEditDialog` com duas abas (`Tabs` do shadcn):

```text
┌─ Meu Perfil ────────────────────────┐
│  [ Dados Pessoais ] [ Segurança ]   │
├─────────────────────────────────────┤
│  (conteúdo da aba ativa)            │
└─────────────────────────────────────┘
```

### Aba "Dados Pessoais" (atual)
- Avatar, Nome, Telefone, E-mail (já existe — sem mudanças).

### Aba "Segurança" (nova)
Campos:
- **Senha atual** (obrigatório — reautenticação)
- **Nova senha** (com indicador visual de força: fraca/média/forte)
- **Confirmar nova senha**
- Requisitos visíveis em tempo real:
  - mínimo 8 caracteres
  - 1 letra maiúscula
  - 1 número
  - 1 caractere especial
- Botão "Alterar senha" desabilitado até que tudo esteja válido.
- Após sucesso: toast de confirmação + manter usuário logado (sem reload).

## Implementação técnica

1. **`ProfileEditDialog.tsx`**: envolver conteúdo em `<Tabs>` com `TabsList` (Dados Pessoais / Segurança) e dois `TabsContent`.
2. **Novo componente `PasswordChangeForm.tsx`** dentro de `src/components/profile/`:
   - Reautentica chamando `supabase.auth.signInWithPassword({ email: user.email, password: currentPassword })` para validar a senha atual.
   - Se ok, chama `supabase.auth.updateUser({ password: newPassword })`.
   - Trata erros: senha atual incorreta, nova senha fraca, falha de rede.
3. **Componente auxiliar de força de senha** (barra colorida + checklist) reaproveitando tokens semânticos do design system (sem cores hardcoded).
4. Dialog cresce levemente em altura (`sm:max-w-md` mantido); tabs evitam scroll excessivo.

## Fora de escopo
- Autenticação em dois fatores (2FA) — pode ser proposta futura na mesma aba "Segurança".
- Histórico de sessões / dispositivos conectados — idem.
- Logout de outras sessões após troca — opcional, posso incluir se desejar (`supabase.auth.signOut({ scope: 'others' })`).

## Pergunta opcional
Quer que eu inclua o **logout automático das outras sessões** após a troca de senha? É uma boa prática de segurança (padrão GitHub/Google), mas adiciona uma linha extra de UX a comunicar ao usuário.
