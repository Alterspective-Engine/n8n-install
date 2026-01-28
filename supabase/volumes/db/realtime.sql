-- Realtime schema for Supabase
-- This creates the realtime schema for real-time subscriptions

BEGIN;

-- Create publication for realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

COMMIT;
