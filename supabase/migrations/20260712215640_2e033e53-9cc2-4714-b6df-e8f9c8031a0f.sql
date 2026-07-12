
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, authenticated, service_role, anon;

ALTER EXTENSION btree_gist SET SCHEMA extensions;
