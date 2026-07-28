alter table public.profiles
add column if not exists work_locations jsonb not null default '[]'::jsonb;

comment on column public.profiles.work_locations is 'Business work locations shown on public booking pages and saved on appointments.';

alter table public.appointments
add column if not exists work_location_id text,
add column if not exists work_location_name text,
add column if not exists work_location_address text,
add column if not exists work_location_maps_url text;

comment on column public.appointments.work_location_id is 'Selected work location id from profiles.work_locations at booking time.';
comment on column public.appointments.work_location_name is 'Selected work location name saved at booking time.';
comment on column public.appointments.work_location_address is 'Selected work location address saved at booking time.';
comment on column public.appointments.work_location_maps_url is 'Google Maps URL for the selected work location.';

create or replace view public.profiles_public as
select
  id,
  full_name,
  phone,
  email,
  avatar_url,
  slug,
  working_hours,
  manual_blocks,
  has_stripe_account,
  stripe_onboarded,
  currency,
  require_payment_at_booking,
  work_locations
from public.profiles
where slug is not null;
