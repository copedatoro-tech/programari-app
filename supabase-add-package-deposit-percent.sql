alter table public.profiles
add column if not exists package_deposit_percent integer not null default 100;

update public.profiles
set package_deposit_percent = coalesce(package_deposit_percent, deposit_percent, 100);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_package_deposit_percent_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_package_deposit_percent_range
    check (package_deposit_percent between 10 and 100)
    not valid;

    alter table public.profiles
    validate constraint profiles_package_deposit_percent_range;
  end if;
end $$;

comment on column public.profiles.package_deposit_percent is
'Online payment percentage for package bookings. 100 means full payment, lower values mean deposit.';
