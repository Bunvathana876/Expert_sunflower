-- Run only after operator approval and successful Alembic upgrade to 0004.
-- No application data is loaded until this transaction commits and is verified.
\set ON_ERROR_STOP on
BEGIN;

DO $guard$
DECLARE
  table_count integer;
  revision_count integer;
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
     OR current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'Unexpected database, role, or PostgreSQL version';
  END IF;
  SELECT count(*) INTO table_count
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r';
  IF table_count <> 20 THEN
    RAISE EXCEPTION 'Expected 20 public tables, found %', table_count;
  END IF;
  SELECT count(*) INTO revision_count
  FROM public.alembic_version WHERE version_num = '0004';
  IF revision_count <> 1 OR (SELECT count(*) FROM public.alembic_version) <> 1 THEN
    RAISE EXCEPTION 'Destination Alembic revision is not exactly 0004';
  END IF;
END
$guard$;

REVOKE ALL ON ALL TABLES IN SCHEMA public
  FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
  FROM anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.alembic_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_selected_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnosis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disease_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_ai_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

COMMIT;
