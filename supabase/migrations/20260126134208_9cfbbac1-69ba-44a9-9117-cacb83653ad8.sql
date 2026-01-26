-- Function to get queue IDs for an analyst based on their team
CREATE OR REPLACE FUNCTION public.get_analyst_queue_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    array_agg(tq.queue_id),
    ARRAY[]::uuid[]
  )
  FROM profiles p
  JOIN teams_queues tq ON tq.team_id = p.team_id
  WHERE p.id = _user_id
$$;

-- Function to check if an analyst can view a specific ticket based on queue
CREATE OR REPLACE FUNCTION public.can_analyst_view_ticket(_user_id uuid, _ticket_queue_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- If ticket has no queue, allow access (fallback)
    _ticket_queue_id IS NULL
    OR
    -- Check if ticket's queue is in analyst's team queues
    _ticket_queue_id = ANY(public.get_analyst_queue_ids(_user_id))
$$;

-- Helper function to check if user is an analyst (has analyst_db or analyst_app role)
CREATE OR REPLACE FUNCTION public.is_analyst(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id 
    AND role IN ('analyst_db', 'analyst_app')
  )
$$;