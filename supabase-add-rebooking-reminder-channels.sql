-- Migration: separate rebooking reminder channels for email and WhatsApp.

alter table public.profiles
  add column if not exists rebooking_reminder_email_enabled boolean not null default true,
  add column if not exists rebooking_reminder_whatsapp_enabled boolean not null default false;

alter table public.client_cases
  add column if not exists last_rebooking_email_sent date,
  add column if not exists last_rebooking_whatsapp_sent date;

-- Preserve the legacy single-channel marker as an email marker.
update public.client_cases
set last_rebooking_email_sent = last_rebooking_reminder_sent
where last_rebooking_reminder_sent is not null
  and last_rebooking_email_sent is null;

comment on column public.profiles.rebooking_reminder_email_enabled is
  'Whether rebooking reminders are sent by email.';

comment on column public.profiles.rebooking_reminder_whatsapp_enabled is
  'Whether rebooking reminders are sent by WhatsApp from the connected business number.';

comment on column public.client_cases.last_rebooking_email_sent is
  'Last date when a rebooking reminder was sent by email for this client.';

comment on column public.client_cases.last_rebooking_whatsapp_sent is
  'Last date when a rebooking reminder was sent by WhatsApp for this client.';
