-- GharInvite initial schema.
-- Guests and no-login hosts never talk to the database directly: every write goes
-- through the server API (service role). RLS therefore only exposes data to signed-in owners.

create extension if not exists pgcrypto;

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  occasion text not null
    check (occasion in ('birthday', 'housewarming', 'pooja', 'baby', 'party')),
  title text not null,
  host_names text not null,
  starts_at timestamptz not null,
  timezone text not null default 'Asia/Kolkata',
  venue_name text,
  address text,
  map_url text,
  message text,
  details jsonb not null default '{}'::jsonb,
  theme text not null default 'haldi',
  language text not null default 'en' check (language in ('en', 'hi')),
  photo_path text,
  owner_id uuid references auth.users (id) on delete set null,
  edit_token_hash text not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_owner_idx on public.events (owner_id);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  link_token text unique,
  created_at timestamptz not null default now()
);

create index households_event_idx on public.households (event_id);

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  guest_name text not null,
  status text not null check (status in ('coming', 'not_coming', 'maybe')),
  headcount integer not null default 1 check (headcount between 0 and 12),
  note text,
  device_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'not_coming' or headcount >= 1)
);

create index rsvps_event_idx on public.rsvps (event_id);
create unique index rsvps_event_device_uniq
  on public.rsvps (event_id, device_token_hash)
  where device_token_hash is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();
create trigger rsvps_touch before update on public.rsvps
  for each row execute function public.touch_updated_at();

-- Headcount is always computed here, never trusted from the client.
create or replace function public.event_totals(p_event_id uuid)
returns table (coming_people bigint, not_coming_households bigint, maybe_households bigint)
language sql
stable
as $$
  select
    coalesce(sum(headcount) filter (where status = 'coming'), 0),
    count(*) filter (where status = 'not_coming'),
    count(*) filter (where status = 'maybe')
  from public.rsvps
  where event_id = p_event_id;
$$;

alter table public.events enable row level security;
alter table public.households enable row level security;
alter table public.rsvps enable row level security;

create policy "owners read own events" on public.events
  for select using (owner_id = auth.uid());
create policy "owners update own events" on public.events
  for update using (owner_id = auth.uid());
create policy "owners read own households" on public.households
  for select using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  );
create policy "owners read own rsvps" on public.rsvps
  for select using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
  );
