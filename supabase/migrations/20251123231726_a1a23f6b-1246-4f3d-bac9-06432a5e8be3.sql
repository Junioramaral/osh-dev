-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar cron job para executar a cada 15 minutos
SELECT cron.schedule(
  'sla-monitor-job',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://ukrgzsntvddzwtmccwbf.supabase.co/functions/v1/sla-monitor',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrcmd6c250dmRkend0bWNjd2JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MTkxNDEsImV4cCI6MjA3ODA5NTE0MX0.gVTZbSuU2cIYjjpqtAwMlGHm4P-p8z4AlnH2z4dz62A"}'::jsonb,
      body := json_build_object('time', now())::jsonb
    ) as request_id;
  $$
);

-- Comentário para documentação
COMMENT ON EXTENSION pg_cron IS 'Agendador de tarefas para executar SLA monitor a cada 15 minutos';