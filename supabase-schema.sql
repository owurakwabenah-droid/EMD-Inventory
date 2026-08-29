-- EMD Inventory System - Supabase/PostgreSQL schema
-- Run this entire file in Supabase SQL Editor.
-- Authentication uses Supabase Auth (auth.users). Never store plaintext passwords.

create extension if not exists pgcrypto;

-- ---------- Shared helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------- Users and access control ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username) and length(username) between 3 and 50),
  email text not null unique,
  role text not null default 'limited' check (role in ('main', 'limited')),
  avatar_url text,
  password_changed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_main_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'main'
  );
$$;

create table if not exists public.permissions (
  code text primary key,
  description text not null
);

create table if not exists public.profile_permissions (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (profile_id, permission_code)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_username text;
  new_role text;
begin
  new_username := lower(coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)));
  new_role := case when new_username = 'boison' then 'main' else 'limited' end;

  insert into public.profiles (id, username, email, role)
  values (
    new.id,
    new_username,
    new.email,
    new_role
  )
  on conflict (id) do nothing;

  if new_role = 'main' then
    insert into public.profile_permissions (profile_id, permission_code)
    select new.id, code from public.permissions
    on conflict do nothing;
  else
    insert into public.profile_permissions (profile_id, permission_code)
    values
      (new.id, 'dashboard'),
      (new.id, 'new-order'),
      (new.id, 'track-orders'),
      (new.id, 'history'),
      (new.id, 'customers'),
      (new.id, 'daily-report'),
      (new.id, 'activity-log')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

insert into public.permissions (code, description) values
  ('dashboard', 'View dashboard'),
  ('new-order', 'Create orders'),
  ('track-orders', 'View orders and inventory'),
  ('history', 'View order history'),
  ('customers', 'Manage customers'),
  ('daily-report', 'Create daily reports'),
  ('report-tracker', 'Track sent reports'),
  ('activity-log', 'View audit log'),
  ('backup', 'Export and restore data'),
  ('edit-orders', 'Edit order quantities'),
  ('edit-inventory', 'Restock inventory'),
  ('user-management', 'Manage users'),
  ('product-management', 'Manage products'),
  ('activities', 'Manage activities'),
  ('manage-music', 'Manage music')
on conflict (code) do nothing;

-- ---------- Products and inventory ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_ghs numeric(12,2) not null check (price_ghs >= 0),
  stock integer not null default 0 check (stock >= 0),
  is_disabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger products_updated_at
before update on public.products
for each row execute procedure public.set_updated_at();

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_change integer not null check (quantity_change <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  reason text not null check (reason in ('sale', 'restock', 'order_edit', 'import', 'adjustment')),
  reference_id uuid,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------- Customers ----------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique check (phone ~ '^[0-9]{10}$'),
  status text not null default 'active' check (status in ('active', 'inactive')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger customers_updated_at
before update on public.customers
for each row execute procedure public.set_updated_at();

-- ---------- Registration packages ----------
create table if not exists public.registration_packages (
  id uuid primary key default gen_random_uuid(),
  package_key text not null unique,
  name text not null,
  description text not null,
  price_usd numeric(12,2) not null check (price_usd >= 0),
  price_ghs numeric(12,2) not null check (price_ghs >= 0),
  registration_fee_usd numeric(12,2) not null default 10 check (registration_fee_usd >= 0),
  registration_fee_ghs numeric(12,2) not null default 100 check (registration_fee_ghs >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger registration_packages_updated_at
before update on public.registration_packages
for each row execute procedure public.set_updated_at();

insert into public.registration_packages (package_key, name, description, price_usd, price_ghs) values
  ('starter', 'Starter Pack', 'Perfect for beginners', 20, 200),
  ('chairman', 'Chairman', 'For growing businesses', 40, 400),
  ('director', 'Director', 'Premium business package', 80, 800),
  ('executive', 'Executive', 'Enterprise level', 240, 2400),
  ('emperor', 'Emperor', 'Ultimate premium', 480, 4800),
  ('vip', 'VIP', 'Exclusive VIP access', 1440, 14400),
  ('president', 'President', 'Presidential elite status', 2880, 28800)
on conflict (package_key) do nothing;

-- ---------- Orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  order_date date not null default current_date,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  destination text not null,
  action_type text not null default 'repurchase' check (action_type in ('repurchase', 'new-registration')),
  registration_package_id uuid references public.registration_packages(id) on delete set null,
  registration_package_name text,
  registration_fee_ghs numeric(12,2) not null default 0 check (registration_fee_ghs >= 0),
  subtotal_ghs numeric(12,2) not null default 0 check (subtotal_ghs >= 0),
  total_ghs numeric(12,2) not null default 0 check (total_ghs >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (action_type <> 'new-registration' or registration_package_id is not null)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price_ghs numeric(12,2) not null check (unit_price_ghs >= 0),
  total_ghs numeric(12,2) generated always as (quantity * unit_price_ghs) stored,
  created_at timestamptz not null default timezone('utc', now())
);

create trigger orders_updated_at
before update on public.orders
for each row execute procedure public.set_updated_at();

-- ---------- Reports and audit history ----------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_number text not null unique,
  sent_by uuid references public.profiles(id) on delete set null,
  sent_to uuid references public.profiles(id) on delete set null,
  total_orders integer not null default 0 check (total_orders >= 0),
  total_revenue_ghs numeric(12,2) not null default 0 check (total_revenue_ghs >= 0),
  status text not null default 'delivered' check (status in ('queued', 'delivered', 'failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  user_id uuid references public.profiles(id) on delete set null,
  username text,
  action text not null,
  details text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  identifier text not null,
  login_method text not null default 'supabase' check (login_method in ('supabase', 'offline')),
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  activity_type text not null check (activity_type in ('Team Building', 'Training', 'Meeting', 'Event', 'Workshop', 'Conference', 'Other')),
  location text not null,
  outcome text not null,
  activity_date date not null,
  frequency text not null,
  icon text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------- Access grants and music ----------
create table if not exists public.restock_access (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, product_id)
);

create table if not exists public.music_tracks (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes >= 0),
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default timezone('utc', now())
);

-- ---------- Indexes ----------
create index if not exists orders_order_date_idx on public.orders(order_date desc);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_created_by_idx on public.orders(created_by);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists inventory_movements_product_id_idx on public.inventory_movements(product_id, created_at desc);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);
create index if not exists login_events_user_id_idx on public.login_events(user_id, created_at desc);
create index if not exists login_events_created_at_idx on public.login_events(created_at desc);
create index if not exists activities_activity_date_idx on public.activities(activity_date desc);
create index if not exists reports_created_at_idx on public.reports(created_at desc);

-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.permissions enable row level security;
alter table public.profile_permissions enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.registration_packages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reports enable row level security;
alter table public.activity_logs enable row level security;
alter table public.login_events enable row level security;
alter table public.activities enable row level security;
alter table public.restock_access enable row level security;
alter table public.music_tracks enable row level security;
alter table public.app_settings enable row level security;

-- Authenticated users can use operational data. Main admin controls configuration.
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated using (id = auth.uid() or public.is_main_admin()) with check (id = auth.uid() or public.is_main_admin());
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy profile_permissions_read on public.profile_permissions for select to authenticated using (true);
create policy profile_permissions_admin on public.profile_permissions for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());

create policy products_read on public.products for select to authenticated using (true);
create policy products_admin_write on public.products for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());
create policy inventory_movements_read on public.inventory_movements for select to authenticated using (true);
create policy inventory_movements_write on public.inventory_movements for insert to authenticated with check (changed_by = auth.uid());

create policy customers_read on public.customers for select to authenticated using (true);
create policy customers_insert on public.customers for insert to authenticated with check (added_by = auth.uid());
create policy customers_admin_update on public.customers for update to authenticated using (public.is_main_admin()) with check (public.is_main_admin());
create policy customers_admin_delete on public.customers for delete to authenticated using (public.is_main_admin());

create policy packages_read on public.registration_packages for select to authenticated using (is_active = true or public.is_main_admin());
create policy packages_admin_write on public.registration_packages for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());

create policy orders_read on public.orders for select to authenticated using (true);
create policy orders_insert on public.orders for insert to authenticated with check (created_by = auth.uid());
create policy orders_update on public.orders for update to authenticated using (created_by = auth.uid() or public.is_main_admin()) with check (created_by = auth.uid() or public.is_main_admin());
create policy order_items_read on public.order_items for select to authenticated using (true);
create policy order_items_insert on public.order_items for insert to authenticated with check (exists (select 1 from public.orders o where o.id = order_id and (o.created_by = auth.uid() or public.is_main_admin())));
create policy order_items_update on public.order_items for update to authenticated using (exists (select 1 from public.orders o where o.id = order_id and (o.created_by = auth.uid() or public.is_main_admin()))) with check (true);

create policy reports_read on public.reports for select to authenticated using (sent_by = auth.uid() or sent_to = auth.uid() or public.is_main_admin());
create policy reports_insert on public.reports for insert to authenticated with check (sent_by = auth.uid());
create policy reports_update on public.reports for update to authenticated using (sent_by = auth.uid() or public.is_main_admin()) with check (sent_by = auth.uid() or public.is_main_admin());
create policy logs_read on public.activity_logs for select to authenticated using (public.is_main_admin() or user_id = auth.uid());
create policy logs_insert on public.activity_logs for insert to authenticated with check (user_id = auth.uid());
create policy logs_update on public.activity_logs for update to authenticated using (user_id = auth.uid() or public.is_main_admin()) with check (user_id = auth.uid() or public.is_main_admin());
create policy login_events_read on public.login_events for select to authenticated using (user_id = auth.uid() or public.is_main_admin());
create policy login_events_insert on public.login_events for insert to authenticated with check (user_id = auth.uid());
create policy activities_read on public.activities for select to authenticated using (true);
create policy activities_insert on public.activities for insert to authenticated with check (created_by = auth.uid());
create policy activities_update on public.activities for update to authenticated using (created_by = auth.uid() or public.is_main_admin()) with check (created_by = auth.uid() or public.is_main_admin());
create policy activities_admin_delete on public.activities for delete to authenticated using (public.is_main_admin() or created_by = auth.uid());

create policy restock_access_read on public.restock_access for select to authenticated using (profile_id = auth.uid() or public.is_main_admin());
create policy restock_access_admin_write on public.restock_access for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());
create policy music_read on public.music_tracks for select to authenticated using (true);
create policy music_admin_write on public.music_tracks for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());
create policy settings_read on public.app_settings for select to authenticated using (true);
create policy settings_admin_write on public.app_settings for all to authenticated using (public.is_main_admin()) with check (public.is_main_admin());

-- Storage bucket for audio files. Create the bucket in Storage or run this statement.
insert into storage.buckets (id, name, public)
values ('emd-music', 'emd-music', false)
on conflict (id) do nothing;

create policy music_storage_read on storage.objects for select to authenticated
using (bucket_id = 'emd-music');
create policy music_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'emd-music' and public.is_main_admin());
create policy music_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'emd-music' and public.is_main_admin());
