-- Update all existing clients with LexisFlow SLA values
UPDATE clients SET
  sla_db_p1_first_response = 15, sla_db_p1_resolution = 240,
  sla_db_p2_first_response = 30, sla_db_p2_resolution = 480,
  sla_db_p3_first_response = 240, sla_db_p3_resolution = 2880,
  sla_db_p4_first_response = 1400, sla_db_p4_resolution = 4320,
  sla_app_p1_first_response = 15, sla_app_p1_resolution = 240,
  sla_app_p2_first_response = 30, sla_app_p2_resolution = 480,
  sla_app_p3_first_response = 240, sla_app_p3_resolution = 2880,
  sla_app_p4_first_response = 1400, sla_app_p4_resolution = 4320;

-- Update column defaults for new tenants
ALTER TABLE clients
  ALTER COLUMN sla_db_p3_first_response SET DEFAULT 240,
  ALTER COLUMN sla_db_p3_resolution SET DEFAULT 2880,
  ALTER COLUMN sla_db_p4_first_response SET DEFAULT 1400,
  ALTER COLUMN sla_db_p4_resolution SET DEFAULT 4320,
  ALTER COLUMN sla_app_p3_first_response SET DEFAULT 240,
  ALTER COLUMN sla_app_p3_resolution SET DEFAULT 2880,
  ALTER COLUMN sla_app_p4_first_response SET DEFAULT 1400,
  ALTER COLUMN sla_app_p4_resolution SET DEFAULT 4320;