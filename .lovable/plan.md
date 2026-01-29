
# Plano: Atualizar Landing Page com Novas Funcionalidades

## Análise do Sistema Atual

O Otimizzo Service Hub é uma plataforma completa de Service Desk multi-tenant com as seguintes funcionalidades:

### Funcionalidades Principais Identificadas

| Categoria | Funcionalidade | Descrição |
|-----------|---------------|-----------|
| **Gestão de Tickets** | Sistema completo de tickets | Criação, acompanhamento, comentários, anexos, timeline |
| **Gestão de Tickets** | Meus Tickets | Dashboard pessoal do analista |
| **Gestão de Tickets** | Ações em lote (Bulk) | Atribuir analista, fila, equipe, status em massa |
| **Gestão de Tickets** | Sistema de Lock | Reserva de tickets com TTL para evitar conflitos |
| **SLA** | Monitoramento em tempo real | Dashboard com métricas de compliance |
| **SLA** | Alertas automáticos | Notificações por email quando SLA próximo de vencer |
| **SLA** | Reconhecimento (Acknowledge) | Analistas confirmam ciência de SLA em risco |
| **Satisfação** | CSAT Dashboard | Pesquisa de satisfação com rating 1-5 estrelas |
| **Satisfação** | Ranking de analistas | Performance baseada em avaliações |
| **Conhecimento** | Base de Conhecimento (FAQ) | Artigos com 3 níveis de visibilidade |
| **Relatórios** | 7 tipos de relatórios | Mensal, Performance, Categorias, Comparativo, Tempo, Ranking, Filas |
| **Relatórios** | Envio automático por email | Relatórios mensais automáticos para clientes |
| **Infraestrutura** | Catálogo de Máquinas | Servidores e VMs do cliente |
| **Infraestrutura** | Bancos de Dados | Instâncias Oracle, PostgreSQL, MySQL, MongoDB, SQL Server |
| **Infraestrutura** | Aplicativos | ContaDia, Sec4File, LexisFlow com módulos |
| **Comunicação** | Notificações por Email | Via Resend com reply-to para conversas |
| **Comunicação** | Respostas por Email | Clientes respondem diretamente pelo email |
| **Segurança** | Multi-tenant RBAC | Isolamento de dados, roles configuráveis |
| **Segurança** | Auditoria | Papel de viewer/auditor |

---

## Proposta de Redesign da Landing Page

### Estrutura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER (Logo + Navegação + CTAs)                            │
├─────────────────────────────────────────────────────────────┤
│ HERO SECTION (Título impactante + Imagem/Mockup)            │
├─────────────────────────────────────────────────────────────┤
│ ESTATÍSTICAS (Números do sistema - credibilidade)           │
├─────────────────────────────────────────────────────────────┤
│ FEATURES PRINCIPAIS (6 cards destacados)                    │
├─────────────────────────────────────────────────────────────┤
│ SCREENSHOT/MOCKUP SECTION (Imagem do Dashboard)             │
├─────────────────────────────────────────────────────────────┤
│ FEATURES SECUNDÁRIAS (Grid 3x2 com ícones)                  │
├─────────────────────────────────────────────────────────────┤
│ BENEFÍCIOS POR PERSONA (Tabs: Gestor / Analista / Cliente)  │
├─────────────────────────────────────────────────────────────┤
│ CTA FINAL (Chamada para ação)                               │
├─────────────────────────────────────────────────────────────┤
│ FOOTER (Copyright)                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhamento das Seções

### 1. Header Redesenhado
- Logo Otimizzo com ícone Server
- Links de navegação suave (scroll para seções)
- Botões "Acessar" e "Saiba Mais"

### 2. Hero Section Modernizado
**Título**: "Transforme seu Suporte em Vantagem Competitiva"

**Subtítulo**: "Plataforma completa de Service Desk para equipes de suporte a Bancos de Dados e Aplicativos. Controle SLA, CSAT, relatórios e muito mais."

**Área de imagem**: Placeholder para screenshot do dashboard (210x297mm para futuras imagens)

### 3. Seção de Estatísticas (Social Proof)
Cards horizontais com números:
- "99.5% SLA Compliance"
- "4.8/5 Satisfação Média"
- "< 2h Tempo de Resposta"
- "7 Tipos de Relatórios"

### 4. Features Principais (Grid 3x2)

| Feature | Ícone | Descrição |
|---------|-------|-----------|
| Gestão de Tickets | Ticket | Sistema completo com timeline, comentários e ações em lote |
| Monitoramento SLA | BarChart3 | Dashboards em tempo real com alertas automáticos |
| Satisfação (CSAT) | Star | Pesquisa de satisfação com ranking de analistas |
| Base de Conhecimento | BookOpen | Artigos com 3 níveis de visibilidade e busca |
| Relatórios Avançados | FileBarChart | 7 tipos de relatórios com envio automático por email |
| Notificações Email | Mail | Comunicação bidirecional via email |

### 5. Área de Screenshot
- Container com sombra elegante
- Placeholder para imagem do dashboard (usuário pode adicionar depois)
- Texto: "Interface intuitiva e profissional"

### 6. Features Secundárias (Grid 2x3)

| Feature | Descrição |
|---------|-----------|
| Multi-tenant Seguro | Isolamento completo de dados por cliente |
| Catálogo de Infraestrutura | Máquinas, BDs e Aplicativos |
| Sistema de Lock | Reserva de tickets com TTL |
| Ações em Lote | Atribuição massiva de tickets |
| Filas por Especialidade | Segmentação DB e APP |
| Auditoria Completa | Papel de viewer para compliance |

### 7. Benefícios por Persona (Tabs)

**Gestores**:
- Visão 360° do suporte
- Relatórios executivos automáticos
- Métricas de SLA e CSAT

**Analistas**:
- "Meus Tickets" pessoal
- Base de conhecimento
- Alertas de SLA

**Clientes**:
- Portal de autoatendimento
- Resposta por email
- Pesquisa de satisfação

### 8. CTA Final
Gradiente primário com:
- Título: "Pronto para Elevar seu Suporte?"
- Botão: "Começar Agora"

---

## Código a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Index.tsx` | Reescrever completamente com nova estrutura |

---

## Sobre Imagens

A landing page terá **áreas preparadas para imagens**:
1. **Hero Section**: Espaço para mockup/screenshot do dashboard (pode ser adicionado depois)
2. **Feature Showcase**: Container para screenshot da interface

Como não há imagens no projeto atualmente, criaremos containers com:
- Placeholder visual com ícones
- Gradiente sutil de fundo
- Texto indicando onde adicionar screenshot

O usuário pode depois fazer upload de screenshots reais do sistema.

---

## Benefícios do Redesign

1. **Hierarquia Visual Clara**: Seções bem definidas guiam o visitante
2. **Social Proof**: Estatísticas geram credibilidade
3. **Personas Específicas**: Cada tipo de usuário se identifica
4. **Preparado para Imagens**: Containers prontos para screenshots
5. **Responsivo**: Layout adaptável para mobile e desktop
6. **Coerência Visual**: Usa design system existente (cores, componentes)

---

## Ícones Utilizados (Lucide)

- Server, Database, AppWindow (infraestrutura)
- Ticket, UserCheck, Clock (tickets)
- BarChart3, Star, FileBarChart (métricas)
- BookOpen, Mail, Shield (features)
- Users, ArrowRight (CTAs)
