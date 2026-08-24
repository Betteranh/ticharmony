-- Postgres superusers (and table owners without FORCE) always bypass RLS.
-- The default role created by the official postgres Docker image via
-- POSTGRES_USER is a superuser, which silently defeats every policy in the
-- previous migration. The application MUST connect as a separate,
-- non-superuser, non-owner role so RLS is actually enforced.
--
-- Dev-only password below; rotate it via `ALTER ROLE app_user WITH PASSWORD '...'`
-- using a secrets-managed value for any non-local environment.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev_pw' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
