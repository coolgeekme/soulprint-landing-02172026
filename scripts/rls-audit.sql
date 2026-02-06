-- RLS Audit Script for SoulPrint
-- Run in Supabase SQL Editor to check RLS status of all tables
-- Any table showing 'RLS DISABLED' is a security risk

-- 1. Check RLS status of all public tables
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  CASE
    WHEN c.relrowsecurity THEN 'OK - RLS Enabled'
    ELSE 'SECURITY RISK - RLS DISABLED'
  END AS status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- ordinary tables only
ORDER BY c.relrowsecurity ASC, c.relname;

-- 2. List all existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Tables with RLS enabled but NO policies (effectively locked out)
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policies p ON p.tablename = c.relname AND p.schemaname = 'public'
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND p.policyname IS NULL;
