-- Migration: WhatsApp AI Receptionist foundation
-- Run this after supabase-add-business-whatsapp-connections.sql.

ALTER TABLE public.business_whatsapp_connections
  ADD COLUMN IF NOT EXISTS ai_receptionist_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_receptionist_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS ai_receptionist_handoff_phone text,
  ADD COLUMN IF NOT EXISTS ai_receptionist_notes text;

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.business_whatsapp_connections(id) ON DELETE SET NULL,
  customer_phone text NOT NULL,
  customer_name text,
  status text NOT NULL DEFAULT 'open',
  language text,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, customer_phone)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_conversations_user_id
  ON public.whatsapp_ai_conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_conversations_customer_phone
  ON public.whatsapp_ai_conversations(customer_phone);

CREATE TABLE IF NOT EXISTS public.whatsapp_ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_ai_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type text NOT NULL DEFAULT 'text',
  whatsapp_message_id text,
  content text,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_messages_conversation_id
  ON public.whatsapp_ai_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_ai_messages_user_id
  ON public.whatsapp_ai_messages(user_id);

ALTER TABLE public.whatsapp_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_ai_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read their WhatsApp AI conversations" ON public.whatsapp_ai_conversations;
CREATE POLICY "Owners can read their WhatsApp AI conversations"
  ON public.whatsapp_ai_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owners can read their WhatsApp AI messages" ON public.whatsapp_ai_messages;
CREATE POLICY "Owners can read their WhatsApp AI messages"
  ON public.whatsapp_ai_messages
  FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON COLUMN public.business_whatsapp_connections.ai_receptionist_enabled IS
  'When true, Chronos may answer inbound WhatsApp messages for this business through the AI receptionist.';
COMMENT ON TABLE public.whatsapp_ai_conversations IS
  'Inbound WhatsApp customer conversations handled or prepared for Chronos AI Receptionist.';
COMMENT ON TABLE public.whatsapp_ai_messages IS
  'Raw and normalized WhatsApp messages for AI Receptionist audit and future handoff.';
