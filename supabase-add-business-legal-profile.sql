-- Migration: Business legal profile fields
-- These fields identify the real legal/business entity behind a Chronos account.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_legal_name text,
  ADD COLUMN IF NOT EXISTS business_tax_id text,
  ADD COLUMN IF NOT EXISTS business_tax_country text,
  ADD COLUMN IF NOT EXISTS business_registered_address text,
  ADD COLUMN IF NOT EXISTS business_billing_email text;

COMMENT ON COLUMN public.profiles.business_legal_name IS
  'Registered legal name of the business using Chronos.';
COMMENT ON COLUMN public.profiles.business_tax_id IS
  'Business tax identifier such as CUI, CIF, VAT ID, NIF, NIP, or equivalent.';
COMMENT ON COLUMN public.profiles.business_tax_country IS
  'Country associated with the business tax identifier.';
COMMENT ON COLUMN public.profiles.business_registered_address IS
  'Registered fiscal/legal address of the business.';
COMMENT ON COLUMN public.profiles.business_billing_email IS
  'Billing or administrative email for legal/business communication.';
