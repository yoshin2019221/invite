-- Rich templates: add the wedding occasion and a per-event template id.
alter table public.events drop constraint if exists events_occasion_check;
alter table public.events add constraint events_occasion_check
  check (occasion in ('birthday','housewarming','pooja','baby','party','wedding'));
alter table public.events add column if not exists template text not null default 'classic';
