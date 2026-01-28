-- Webhooks schema for Supabase
-- This creates the supabase_functions schema for edge functions integration

BEGIN;

-- Create schema for functions
CREATE SCHEMA IF NOT EXISTS supabase_functions;

-- Grant access
GRANT USAGE ON SCHEMA supabase_functions TO anon, authenticated, service_role;

COMMIT;
