-- Migration: Structured settings for Chronos AI Receptionist
-- Run after supabase-add-whatsapp-ai-receptionist.sql.

ALTER TABLE public.business_whatsapp_connections
  ADD COLUMN IF NOT EXISTS ai_receptionist_tone text NOT NULL DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS ai_receptionist_rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_receptionist_featured_service_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_receptionist_handoff_country text;

COMMENT ON COLUMN public.business_whatsapp_connections.ai_receptionist_tone IS
  'Preferred communication tone for the WhatsApp AI Receptionist.';
COMMENT ON COLUMN public.business_whatsapp_connections.ai_receptionist_rules IS
  'Structured rule keys that constrain how the AI Receptionist replies and escalates.';
COMMENT ON COLUMN public.business_whatsapp_connections.ai_receptionist_featured_service_ids IS
  'Service IDs that should be highlighted first by the AI Receptionist.';
COMMENT ON COLUMN public.business_whatsapp_connections.ai_receptionist_handoff_country IS
  'Country code used to format the manual handoff phone number.';
