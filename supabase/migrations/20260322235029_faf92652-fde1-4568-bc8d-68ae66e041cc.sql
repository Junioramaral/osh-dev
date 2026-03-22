
-- Create user_queues junction table
CREATE TABLE public.user_queues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_id uuid NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, queue_id)
);

ALTER TABLE public.user_queues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage user_queues" ON public.user_queues
  FOR ALL TO authenticated USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "View own queues" ON public.user_queues
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Otimizzo view user_queues" ON public.user_queues
  FOR SELECT TO authenticated USING (is_otimizzo_user(auth.uid()));

-- Update get_analyst_queue_ids to use user_queues instead of teams_queues
CREATE OR REPLACE FUNCTION public.get_analyst_queue_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(uq.queue_id), ARRAY[]::uuid[])
  FROM user_queues uq
  WHERE uq.user_id = _user_id
$$;
