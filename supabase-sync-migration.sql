-- Run this after the original supabase-schema.sql if the database already exists.
-- It is safe to run more than once.

alter table public.activities add column if not exists legacy_id text;
create unique index if not exists activities_legacy_id_idx on public.activities(legacy_id) where legacy_id is not null;

create table if not exists public.login_events (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.profiles(id) on delete cascade,
	identifier text not null,
	login_method text not null default 'supabase' check (login_method in ('supabase', 'offline')),
	user_agent text,
	created_at timestamptz not null default timezone('utc', now())
);
alter table public.login_events enable row level security;
create index if not exists login_events_user_id_idx on public.login_events(user_id, created_at desc);
create index if not exists login_events_created_at_idx on public.login_events(created_at desc);

drop policy if exists login_events_read on public.login_events;
create policy login_events_read on public.login_events for select to authenticated
using (user_id = auth.uid() or public.is_main_admin());
drop policy if exists login_events_insert on public.login_events;
create policy login_events_insert on public.login_events for insert to authenticated
with check (user_id = auth.uid());

 drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports
for update to authenticated
using (sent_by = auth.uid() or public.is_main_admin())
with check (sent_by = auth.uid() or public.is_main_admin());

drop policy if exists logs_update on public.activity_logs;
create policy logs_update on public.activity_logs
for update to authenticated
using (user_id = auth.uid() or public.is_main_admin())
with check (user_id = auth.uid() or public.is_main_admin());

drop policy if exists activities_update on public.activities;
create policy activities_update on public.activities
for update to authenticated
using (created_by = auth.uid() or public.is_main_admin())
with check (created_by = auth.uid() or public.is_main_admin());
