-- Adicionar novos valores ao ENUM ticket_type
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'problema';
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'service_request';