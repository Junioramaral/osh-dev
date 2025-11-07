import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Server, Database, AppWindow, ArrowRight, Shield, Users, Clock } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Server className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Otimizzo Service Hub</h1>
              <p className="text-sm text-muted-foreground">Service Desk Profissional</p>
            </div>
          </div>
          <Button onClick={() => navigate("/auth")} size="lg">
            Acessar Sistema
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-5xl font-bold text-foreground mb-6">
            Gestão Completa de Service Desk
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Plataforma multi-tenant para suporte especializado em Bancos de Dados e Aplicativos.
            Controle total de SLA, tickets segmentados e gestão de equipes.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/auth")} size="lg" className="gap-2">
              Começar Agora
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button onClick={() => navigate("/auth")} variant="outline" size="lg">
              Login
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Suporte a Bancos de Dados</h3>
            <p className="text-muted-foreground text-sm">
              Equipes especializadas para Oracle, PostgreSQL, MySQL, MongoDB e SQL Server com filas dedicadas por engine.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4">
              <AppWindow className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gestão de Aplicativos</h3>
            <p className="text-muted-foreground text-sm">
              Suporte dedicado para ContaDia, Sec4File e LexisFlow com catálogo completo de instâncias e módulos.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-success/10 rounded-lg mb-4">
              <Shield className="w-6 h-6 text-success" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-tenant Seguro</h3>
            <p className="text-muted-foreground text-sm">
              Isolamento completo de dados por cliente com controle de acesso baseado em roles (RBAC).
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-warning/10 rounded-lg mb-4">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">SLA Configurável</h3>
            <p className="text-muted-foreground text-sm">
              SLAs customizados por cliente, segmento e prioridade com alertas automáticos de vencimento.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Sistema de Lock</h3>
            <p className="text-muted-foreground text-sm">
              Reserva de tickets com TTL configurável para evitar conflitos e garantir atendimento focado.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4">
              <Server className="w-6 h-6 text-accent" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Catálogo Completo</h3>
            <p className="text-muted-foreground text-sm">
              Gestão de máquinas, instâncias de banco de dados e aplicativos com relacionamentos e criticidade.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-primary to-accent p-8 rounded-lg text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Pronto para otimizar seu Service Desk?</h3>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            Comece agora mesmo e experimente a gestão profissional de tickets com segmentação, SLA e controle total.
          </p>
          <Button onClick={() => navigate("/auth")} size="lg" variant="secondary">
            Acessar Plataforma
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
