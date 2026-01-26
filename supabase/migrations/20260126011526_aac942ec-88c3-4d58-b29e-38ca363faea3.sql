-- Criar tabela de configurações do sistema
CREATE TABLE public.system_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Super admins manage configs"
  ON public.system_configs FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated users can view configs"
  ON public.system_configs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Inserir configuração inicial de dias de inatividade
INSERT INTO public.system_configs (key, value, description)
VALUES (
  'ticket_inactivity_days',
  '7',
  'Número de dias sem atualização para desbloquear ticket automaticamente'
);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_system_configs_updated_at
  BEFORE UPDATE ON public.system_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();