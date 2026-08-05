-- Migration: add stripe_price_id and monthly_appointment_limit to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monthly_appointment_limit integer;

-- Optional: set sensible defaults for existing accounts if you want
-- UPDATE public.profiles SET monthly_appointment_limit = 30 WHERE monthly_appointment_limit IS NULL;

-- Index for faster lookup by stripe_price_id (optional)
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_price_id ON public.profiles (stripe_price_id);

-- End of migration
