-- Migration: keep WhatsApp AI conversations separate per connected WhatsApp number.
-- Run after supabase-add-whatsapp-ai-receptionist.sql and after work-location WhatsApp connections.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_ai_conversations_user_id_customer_phone_key'
      AND conrelid = 'public.whatsapp_ai_conversations'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_ai_conversations
      DROP CONSTRAINT whatsapp_ai_conversations_user_id_customer_phone_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'whatsapp_ai_conversations_connection_customer_key'
      AND conrelid = 'public.whatsapp_ai_conversations'::regclass
  ) THEN
    ALTER TABLE public.whatsapp_ai_conversations
      ADD CONSTRAINT whatsapp_ai_conversations_connection_customer_key
      UNIQUE (connection_id, customer_phone);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_conversations_connection_id
  ON public.whatsapp_ai_conversations(connection_id);
