-- Run this in Supabase SQL Editor before using specialist photos.
alter table public.staff
add column if not exists photo_url text;

comment on column public.staff.photo_url is 'Optional public image URL used on the booking page for this specialist.';
