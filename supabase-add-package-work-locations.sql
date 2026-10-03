alter table public.packages
add column if not exists work_location_ids text[] not null default '{}';

comment on column public.packages.work_location_ids is
'Work location IDs where this package is offered. Empty keeps legacy behavior until the package is edited.';
