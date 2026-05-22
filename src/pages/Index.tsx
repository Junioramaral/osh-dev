import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import dashboardScreenshot from "@/assets/dashboard-screenshot.png";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Database, 
  AppWindow, 
  ArrowRight, 
  Shield, 
  Users, 
  Clock,
  BarChart3,
  Star,
  BookOpen,
  FileBarChart,
  Mail,
  Ticket,
  Lock,
  Layers,
  Eye,
  CheckCircle,
  TrendingUp,
  Bell,
  MessageSquare,
  Settings,
  MonitorDot,
  Briefcase,
  HeadphonesIcon
} from "lucide-react";
import { GitPullRequest, Timer, Building2, Inbox, UserCheck, FileText, Zap, Award } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Server className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Otimizzo Service Hub</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Service Desk Profissional</p>
              </div>
            </div>
            
            <nav className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => scrollToSection("features")} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Funcionalidades
              </button>
              <button 
                onClick={() => scrollToSection("benefits")} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Benefícios
              </button>
              <button 
                onClick={() => scrollToSection("personas")} 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Para quem
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/auth")}>
                Login
              </Button>
              <Button onClick={() => navigate("/auth")} className="gap-2">
                Acessar
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Ticket className="w-4 h-4" />
                Service Desk Multi-tenant
              </div>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Transforme seu Suporte em{" "}
                <span className="text-primary">Vantagem Competitiva</span>
              </h2>
              <p className="text-lg text-muted-foreground max-w-xl">
                Plataforma completa de Service Desk multi-tenant para equipes de Bancos de Dados e Aplicativos.
                Tickets, RFCs, SLA, CSAT, apontamento de horas, relatórios automáticos e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => navigate("/auth")} size="lg" className="gap-2">
                  Começar Agora
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button 
                  onClick={() => scrollToSection("features")} 
                  variant="outline" 
                  size="lg"
                >
                  Conhecer Funcionalidades
                </Button>
              </div>
            </div>

            {/* Hero Image Placeholder */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/10 via-accent/10 to-muted border border-border shadow-2xl overflow-hidden">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <div className="w-full max-w-sm space-y-4">
                    {/* Mock Dashboard Header */}
                    <div className="flex items-center gap-3 p-3 bg-background/80 rounded-lg border border-border">
                      <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2 bg-muted-foreground/20 rounded w-24" />
                        <div className="h-2 bg-muted-foreground/10 rounded w-16 mt-1" />
                      </div>
                    </div>
                    {/* Mock Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-background/80 rounded-lg border border-border">
                        <div className="text-2xl font-bold text-primary">42</div>
                        <div className="text-xs text-muted-foreground">Tickets Abertos</div>
                      </div>
                      <div className="p-3 bg-background/80 rounded-lg border border-border">
                        <div className="text-2xl font-bold text-success">98%</div>
                        <div className="text-xs text-muted-foreground">SLA Cumprido</div>
                      </div>
                    </div>
                    {/* Mock Chart Area */}
                    <div className="h-24 bg-background/80 rounded-lg border border-border p-3 flex items-end gap-1">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-primary/60 rounded-t"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    Interface intuitiva e profissional
                  </p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">99.5%</div>
              <p className="text-sm text-muted-foreground">SLA Compliance</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary flex items-center justify-center gap-1">
                4.8<Star className="w-5 h-5 fill-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Satisfação Média</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">&lt; 2h</div>
              <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl md:text-4xl font-bold text-primary">10+</div>
              <p className="text-sm text-muted-foreground">Tipos de Relatórios</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tudo que você precisa para um suporte de excelência
            </h3>
            <p className="text-muted-foreground">
              Funcionalidades completas para gerenciar tickets, SLAs, satisfação e muito mais.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Tickets */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
                  <Ticket className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Gestão de Tickets</h4>
                <p className="text-muted-foreground text-sm">
                  Timeline, comentários, anexos, categorias e ações em lote.
                  Lock com TTL, auto-alocação ao analista e liberação automática após inatividade.
                </p>
              </CardContent>
            </Card>

            {/* Feature: RFC */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4 group-hover:bg-accent/20 transition-colors">
                  <GitPullRequest className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Gestão de Mudanças (RFC)</h4>
                <p className="text-muted-foreground text-sm">
                  Workflow completo de RFCs com etapas, aprovação obrigatória do gestor,
                  portal de execução para o cliente e geração de PDF da mudança.
                </p>
              </CardContent>
            </Card>

            {/* Feature: Time Tracking */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mb-4 group-hover:bg-success/20 transition-colors">
                  <Timer className="w-6 h-6 text-success" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Apontamento de Horas</h4>
                <p className="text-muted-foreground text-sm">
                  Registro manual em horário comercial (08:00–18:30), com projetos de
                  hora extra, controle por cliente e janela de edição de 48h.
                </p>
              </CardContent>
            </Card>

            {/* Feature 2: SLA */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Monitoramento SLA</h4>
                <p className="text-muted-foreground text-sm">
                  SLAs por segmento e prioridade com horário comercial e feriados.
                  Alertas automáticos por email quando próximo de vencer.
                </p>
              </CardContent>
            </Card>

            {/* Feature 3: CSAT */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg mb-4 group-hover:bg-warning/20 transition-colors">
                  <Star className="w-6 h-6 text-warning" />
                </div>
                <h4 className="text-lg font-semibold mb-2">CSAT & Analytics</h4>
                <p className="text-muted-foreground text-sm">
                  Pesquisa de 1–5 estrelas enviada na resolução, dashboard de satisfação
                  com alertas, ranking de analistas e score combinado SLA+CSAT.
                </p>
              </CardContent>
            </Card>

            {/* Feature 4: FAQ */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4 group-hover:bg-accent/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-accent" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Base de Conhecimento</h4>
                <p className="text-muted-foreground text-sm">
                  Artigos FAQ com visibilidade privada, por cliente ou global.
                  Busca, contagem de visualizações, histórico e destaque de termos.
                </p>
              </CardContent>
            </Card>

            {/* Feature 5: Reports */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mb-4 group-hover:bg-success/20 transition-colors">
                  <FileBarChart className="w-6 h-6 text-success" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Relatórios Avançados</h4>
                <p className="text-muted-foreground text-sm">
                  Mensal, performance, tempo de resolução, ranking de encerramento,
                  distribuição de filas, horas por cliente e mais — com envio automático.
                </p>
              </CardContent>
            </Card>

            {/* Feature 6: Email Inbound */}
            <Card className="group hover:shadow-lg transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4 group-hover:bg-primary/20 transition-colors">
                  <Inbox className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-lg font-semibold mb-2">Email Bidirecional</h4>
                <p className="text-muted-foreground text-sm">
                  Notificações via Resend e webhook inbound: o cliente responde pelo email
                  e o comentário é adicionado automaticamente ao ticket correspondente.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Screenshot Section */}
      <section className="py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Interface moderna e intuitiva
            </h3>
            <p className="text-muted-foreground">
              Dashboard completo com visão 360° do seu suporte técnico
            </p>
          </div>

          {/* Dashboard Screenshot */}
          <div className="max-w-5xl mx-auto">
            <div className="rounded-xl border border-border shadow-2xl overflow-hidden">
              <img 
                src={dashboardScreenshot} 
                alt="Otimizzo Service Hub Dashboard - Interface completa de gestão de tickets" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Features Grid */}
      <section id="benefits" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Recursos adicionais para máxima produtividade
            </h3>
            <p className="text-muted-foreground">
              Funcionalidades que fazem a diferença no dia a dia da sua equipe
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Multi-tenant Seguro</h4>
                <p className="text-sm text-muted-foreground">
                  Isolamento completo de dados por cliente com RBAC configurável
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Catálogo de Infraestrutura</h4>
                <p className="text-sm text-muted-foreground">
                  Máquinas, instâncias de BD e aplicativos com criticidade
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Sistema de Lock</h4>
                <p className="text-sm text-muted-foreground">
                  Reserva de tickets com TTL para evitar conflitos entre analistas
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-success" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Ações em Lote</h4>
                <p className="text-sm text-muted-foreground">
                  Atribuição massiva de analista, fila, equipe e status
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <AppWindow className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Filas por Especialidade</h4>
                <p className="text-sm text-muted-foreground">
                  Segmentação entre DB (Oracle, PG, MySQL) e APP (ContaDia, Sec4File)
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Auditoria Completa</h4>
                <p className="text-sm text-muted-foreground">
                  Papel de viewer para compliance e acompanhamento executivo
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Portal do Tenant Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Cada organização gerencia seus próprios usuários, equipes e relatórios
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-success" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Auto-alocação Inteligente</h4>
                <p className="text-sm text-muted-foreground">
                  Atribuição automática por segmento e liberação após 7 dias inativos
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Times com Cores</h4>
                <p className="text-sm text-muted-foreground">
                  Times de DB (azul) e APP (verde), com gestão e responsáveis por fila
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">Notificações Inteligentes</h4>
                <p className="text-sm text-muted-foreground">
                  Roteamento por papel para analistas, gestores e clientes
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">RFC com PDF</h4>
                <p className="text-sm text-muted-foreground">
                  Documentação automática de mudanças em PDF para envio ao cliente
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Personas Section */}
      <section id="personas" className="py-16 md:py-24 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Benefícios para cada perfil
            </h3>
            <p className="text-muted-foreground">
              Funcionalidades específicas para gestores, analistas e clientes
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Tabs defaultValue="gestores" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-8">
                <TabsTrigger value="gestores" className="gap-2">
                  <Briefcase className="w-4 h-4" />
                  <span className="hidden sm:inline">Gestores</span>
                </TabsTrigger>
                <TabsTrigger value="analistas" className="gap-2">
                  <HeadphonesIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Analistas</span>
                </TabsTrigger>
                <TabsTrigger value="clientes" className="gap-2">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Clientes</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="gestores" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Visão 360° do Suporte</h4>
                        <p className="text-sm text-muted-foreground">
                          Dashboard executivo com métricas de SLA, CSAT, volume de tickets e performance da equipe
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <FileBarChart className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Relatórios Executivos Automáticos</h4>
                        <p className="text-sm text-muted-foreground">
                          Relatórios mensais enviados automaticamente para gestores e clientes
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Configuração de SLAs por Cliente</h4>
                        <p className="text-sm text-muted-foreground">
                          SLAs customizados por segmento e prioridade para cada contrato
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analistas" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">"Meus Tickets" Pessoal</h4>
                        <p className="text-sm text-muted-foreground">
                          Dashboard focado nos tickets atribuídos ao analista com filtros rápidos
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Base de Conhecimento Integrada</h4>
                        <p className="text-sm text-muted-foreground">
                          Acesso rápido a artigos FAQ e vinculação com tickets para resolução ágil
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Alertas de SLA em Tempo Real</h4>
                        <p className="text-sm text-muted-foreground">
                          Notificações visuais e por email quando SLA está próximo de vencer
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="clientes" className="space-y-4">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Ticket className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Portal de Autoatendimento</h4>
                        <p className="text-sm text-muted-foreground">
                          Abertura e acompanhamento de tickets de forma autônoma
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Resposta por Email</h4>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações e responda diretamente pelo email sem acessar o portal
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <h4 className="font-semibold">Pesquisa de Satisfação</h4>
                        <p className="text-sm text-muted-foreground">
                          Avalie o atendimento após a resolução e contribua para a melhoria contínua
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-8 md:p-12 text-center text-primary-foreground relative overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  Pronto para Elevar seu Suporte?
                </h3>
                <p className="text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                  Comece agora mesmo e experimente a gestão profissional de tickets com segmentação, 
                  SLA configurável e controle total da sua operação.
                </p>
                <Button 
                  onClick={() => navigate("/auth")} 
                  size="lg" 
                  variant="secondary"
                  className="gap-2"
                >
                  Acessar Plataforma
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" />
              <span className="font-semibold">Otimizzo Service Hub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Otimizzo. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
