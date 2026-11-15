-- Run only after operator approval and after the Supabase Data API is disabled.
-- Connect to the verified Session pooler as postgres with TLS verify-full.
\set ON_ERROR_STOP on
BEGIN;

DO $guard$
BEGIN
  IF current_database() <> 'postgres' OR current_user <> 'postgres'
     OR current_setting('server_version_num')::integer < 170000 THEN
    RAISE EXCEPTION 'Unexpected database, role, or PostgreSQL version';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) THEN
    RAISE EXCEPTION 'Destination public schema is not empty';
  END IF;
  IF to_regprocedure('public.rls_auto_enable()') IS NULL THEN
    RAISE EXCEPTION 'Expected preexisting RLS event-trigger function is absent';
  END IF;
END
$guard$;

-- Alembic creates as postgres. Remove explicit per-schema API grants first.
-- PostgreSQL's global PUBLIC function default cannot be revoked per schema;
-- keep the Data API disabled until the post-schema script revokes access on
-- every public function before any sensitive data is loaded.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role;
-- Existing public SECURITY DEFINER event-trigger function is not an API.
REVOKE ALL ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
