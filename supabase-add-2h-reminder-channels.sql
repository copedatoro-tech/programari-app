-- Migration: separate 2-hour reminder channels for email and WhatsApp.

alter table public.profiles
  add column if not exists reminder_2h_email_enabled boolean not null default true,
  add column if not exists reminder_2h_whatsapp_enabled boolean not null default false;

alter table public.appointments
  add column if not exists reminder_2h_email_sent boolean not null default false,
  add column if not exists reminder_2h_whatsapp_sent boolean not null default false;

-- Preserve the old single-channel state for existing appointments.
update public.appointments
set
  reminder_2h_email_sent = true
where reminder_2h_sent = true
  and reminder_2h_email_sent = false;

comment on column public.profiles.reminder_2h_email_enabled is
  'Whether the business sends the optional 2-hour reminder by email.';

comment on column public.profiles.reminder_2h_whatsapp_enabled is
  'Whether the business sends the optional 2-hour reminder by WhatsApp from its connected business number.';

comment on column public.appointments.reminder_2h_email_sent is
  'Whether the optional 2-hour reminder was sent to this appointment by email.';

comment on column public.appointments.reminder_2h_whatsapp_sent is
  'Whether the optional 2-hour reminder was sent to this appointment by WhatsApp.';
