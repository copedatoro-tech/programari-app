-- Migration: WhatsApp Business connection per work location.
-- Run after supabase-add-business-whatsapp-connections.sql.

ALTER TABLE public.business_whatsapp_connections
  ADD COLUMN IF NOT EXISTS work_location_id text NOT NULL DEFAULT '__default__';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_whatsapp_connections_user_id_key'
      AND conrelid = 'public.business_whatsapp_connections'::regclass
  ) THEN
    ALTER TABLE public.business_whatsapp_connections
      DROP CONSTRAINT business_whatsapp_connections_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS business_whatsapp_connections_user_location_key
  ON public.business_whatsapp_connections(user_id, work_location_id);

CREATE INDEX IF NOT EXISTS idx_business_whatsapp_connections_work_location_id
  ON public.business_whatsapp_connections(work_location_id);

COMMENT ON COLUMN public.business_whatsapp_connections.work_location_id IS
  'Chronos work location id for this WhatsApp connection. __default__ is the fallback connection for all locations.';
