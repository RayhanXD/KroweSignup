-- Diagnostics for auth user deletion blockers.
-- Provides RPC-friendly functions to inspect foreign keys that reference auth.users.

CREATE OR REPLACE FUNCTION public.list_auth_user_fk_delete_rules()
RETURNS TABLE (
  table_schema text,
  table_name text,
  column_name text,
  constraint_name text,
  delete_rule text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    ns.nspname::text AS table_schema,
    cls.relname::text AS table_name,
    att.attname::text AS column_name,
    con.conname::text AS constraint_name,
    CASE con.confdeltype
      WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT'
      WHEN 'c' THEN 'CASCADE'
      WHEN 'n' THEN 'SET NULL'
      WHEN 'd' THEN 'SET DEFAULT'
      ELSE con.confdeltype::text
    END AS delete_rule
  FROM pg_constraint con
  JOIN pg_class cls ON cls.oid = con.conrelid
  JOIN pg_namespace ns ON ns.oid = cls.relnamespace
  JOIN pg_class refcls ON refcls.oid = con.confrelid
  JOIN pg_namespace refns ON refns.oid = refcls.relnamespace
  JOIN unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ordinality) ON true
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ck.attnum
  WHERE con.contype = 'f'
    AND refns.nspname = 'auth'
    AND refcls.relname = 'users'
  ORDER BY ns.nspname, cls.relname, con.conname, ck.ordinality;
$$;

CREATE OR REPLACE FUNCTION public.list_auth_user_delete_blockers()
RETURNS TABLE (
  table_schema text,
  table_name text,
  column_name text,
  constraint_name text,
  delete_rule text
)
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.list_auth_user_fk_delete_rules()
  WHERE delete_rule IN ('NO ACTION', 'RESTRICT');
$$;

COMMENT ON FUNCTION public.list_auth_user_fk_delete_rules IS
  'Lists all foreign-key delete rules for constraints that reference auth.users.';

COMMENT ON FUNCTION public.list_auth_user_delete_blockers IS
  'Lists auth.users foreign keys that can block user deletion (NO ACTION/RESTRICT).';
