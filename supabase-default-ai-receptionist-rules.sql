-- Migration: make AI receptionist start with the full standard rule set.

alter table public.business_whatsapp_connections
  alter column ai_receptionist_rules set default
    '["confirm_before_booking","offer_only_available_slots","handoff_on_uncertainty","mention_payment_policy","ask_for_missing_details"]'::jsonb;

update public.business_whatsapp_connections
set ai_receptionist_rules =
  '["confirm_before_booking","offer_only_available_slots","handoff_on_uncertainty","mention_payment_policy","ask_for_missing_details"]'::jsonb
where ai_receptionist_rules is null
   or ai_receptionist_rules = '[]'::jsonb;
