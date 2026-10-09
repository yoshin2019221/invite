-- One reply per household (personal links). Device-based replies keep their own index.
create unique index if not exists rsvps_household_uniq
  on public.rsvps (household_id)
  where household_id is not null;
