-- Run this after the original supabase-schema.sql if the database already exists.
-- It is safe to run more than once.

alter table public.activities add column if not exists legacy_id text;
create unique index if not exists activities_legacy_id_idx on public.activities(legacy_id) where legacy_id is not null;

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
