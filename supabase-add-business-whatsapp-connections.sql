-- Migration: WhatsApp Business connection per Chronos business
-- Run this in Supabase SQL editor before enabling per-business WhatsApp sending.

CREATE TABLE IF NOT EXISTS public.business_whatsapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name text,
  country_code text,
  default_language text NOT NULL DEFAULT 'ro',
  display_phone_number text,
  waba_id text,
  phone_number_id text,
  access_token text,
  status text NOT NULL DEFAULT 'not_connected',
  templates_status text NOT NULL DEFAULT 'not_configured',
  last_error text,
  connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_business_whatsapp_connections_user_id
  ON public.business_whatsapp_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_business_whatsapp_connections_phone_number_id
  ON public.business_whatsapp_connections(phone_number_id);

ALTER TABLE public.business_whatsapp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their WhatsApp connection" ON public.business_whatsapp_connections;
CREATE POLICY "Owners can read their WhatsApp connection"
  ON public.business_whatsapp_connections
  FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates intentionally go through server-side Chronos routes using
-- the service role, because the table will contain sensitive Meta tokens.

COMMENT ON TABLE public.business_whatsapp_connections IS
  'Per-business WhatsApp Business Platform connection used for automated confirmations, reminders, and AI receptionist.';
COMMENT ON COLUMN public.business_whatsapp_connections.access_token IS
  'Sensitive Meta access token. Never expose this column to the browser; server-side routes must read it with the service role only.';
