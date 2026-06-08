CREATE UNIQUE INDEX IF NOT EXISTS uniq_db_instance_per_machine
  ON public.database_instances (client_id, machine_id, instance_name, environment, criticality)
  WHERE machine_id IS NOT NULL;