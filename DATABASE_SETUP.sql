-- EMD Inventory Management System - Database Schema Setup
-- Run this SQL script in your Supabase project to initialize all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Core Tables
-- ============================================================================

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  stock integer DEFAULT 0,
  price numeric(10, 2),
  retail_price numeric(10, 2),
  distributor_price numeric(10, 2),
  package_size text,
  is_active boolean DEFAULT true,
  enabled boolean DEFAULT true,
  status text DEFAULT 'In stock',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage products" ON public.products
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  phone text,
  email text,
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on customers" ON public.customers
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage customers" ON public.customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number text UNIQUE,
  customer_id uuid REFERENCES public.customers(id),
  customer_name text,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  status text DEFAULT 'Pending',
  order_date timestamp with time zone DEFAULT timezone('utc'::text, now()),
  total_amount numeric(10, 2),
  grand_total numeric(10, 2),
  channel text DEFAULT 'Retail',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on orders" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert orders" ON public.orders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = created_by OR auth.role() = 'authenticated');

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  product_name text,
  quantity integer DEFAULT 1,
  unit_price numeric(10, 2),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on order_items" ON public.order_items
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage order_items" ON public.order_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  user_name text,
  action text NOT NULL,
  category text,
  title text,
  details jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on activity_logs" ON public.activity_logs
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Reports table (for daily reports and tracking)
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id text UNIQUE,
  sent_by text NOT NULL,
  sent_to text NOT NULL,
  total_orders integer,
  total_revenue numeric(10, 2),
  status text DEFAULT 'Queued',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on reports" ON public.reports
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to create reports" ON public.reports
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Tracks table (for music manager)
CREATE TABLE IF NOT EXISTS public.tracks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  artist text NOT NULL,
  duration text,
  playlist text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on tracks" ON public.tracks
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to manage tracks" ON public.tracks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- Auth & Profile Tables (Extended)
-- ============================================================================

-- Profiles table (extend auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  email text,
  full_name text,
  avatar_url text,
  role text DEFAULT 'sales',
  status text DEFAULT 'Active',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow users to update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Login events tracking
CREATE TABLE IF NOT EXISTS public.login_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  logged_in_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to create login_events" ON public.login_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Profile permissions (role-based access)
CREATE TABLE IF NOT EXISTS public.profile_permissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile_id, permission)
);

ALTER TABLE public.profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on profile_permissions" ON public.profile_permissions
  FOR SELECT USING (true);

-- Restock access control
CREATE TABLE IF NOT EXISTS public.restock_access (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  can_approve boolean DEFAULT false,
  can_request boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  UNIQUE(profile_id)
);

ALTER TABLE public.restock_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read restock_access" ON public.restock_access
  FOR SELECT USING (auth.role() = 'authenticated');

-- Application settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on app_settings" ON public.app_settings
  FOR SELECT USING (true);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON public.orders(created_by);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON public.login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON public.login_events(created_at DESC);

-- ============================================================================
-- Seed Initial Data
-- ============================================================================

-- Seed products with EMD catalog (if not already present)
INSERT INTO public.products (name, stock, price, retail_price, distributor_price, package_size, is_active)
VALUES
  ('PAIN VILE OIL', 30, 250, 250, 180, NULL, true),
  ('SOFT LAX', 25, 350, 350, 280, NULL, true),
  ('CHODEX 3', 18, 350, 350, 280, NULL, true),
  ('GARLIC', 40, 350, 350, 280, NULL, true),
  ('UTRITONE', 22, 350, 350, 280, '60 caps', true),
  ('B COMFORT CAPSULES', 28, 350, 350, 280, '60 caps', true),
  ('BEHER 3', 35, 350, 350, 280, '60 caps', true),
  ('B COMFORT OIL', 15, 250, 250, 180, NULL, true),
  ('TC DENTAL', 20, 250, 250, 160, NULL, true),
  ('ADINO PLUS', 33, 350, 350, 280, '60 caps', true),
  ('IBHER JUICE', 12, 400, 400, 300, NULL, true),
  ('ESPI HIST', 19, 400, 400, 300, NULL, true),
  ('IQ VISION', 27, 350, 350, 280, '60 caps', true),
  ('CLEAN DETOX', 31, 350, 350, 280, '60 caps', true),
  ('CABUL 500', 24, 350, 350, 280, '60 caps', true),
  ('VITATRACE', 16, 400, 400, 320, '60 caps', true),
  ('HORITE EYE DROP', 4, 250, 250, 160, NULL, true),
  ('FORCE 4', 29, 350, 350, 280, '60 caps', true),
  ('NEUTRI F', 23, 350, 350, 280, '60 caps', true),
  ('CUSHVITE', 17, 400, 400, 300, NULL, true),
  ('NONI JUICE', 14, 450, 450, 360, NULL, true),
  ('GOURD JUICE', 26, 400, 400, 300, NULL, true),
  ('DURAVINE', 21, 400, 400, 300, NULL, true),
  ('VITA PX', 42, 400, 400, 300, NULL, true),
  ('DYNAMIC SLIM', 19, 400, 400, 300, NULL, true),
  ('HAVITASTONIC', 28, 400, 400, 300, NULL, true),
  ('PEPTO REST', 32, 350, 350, 280, '60 caps', true),
  ('VILE-Q TABLET', 13, 350, 350, 280, '60 tablets', true),
  ('GREEN TEA', 37, 350, 350, 280, '60 tablets', true),
  ('CARDAMOM TEA', 11, 200, 200, 200, NULL, true),
  ('PRO -X', 25, 350, 350, 280, '60 caps', true),
  ('ART PLUS TONIC', 18, 400, 400, 300, NULL, true),
  ('DYNAMIC LIV FORTE', 30, 350, 350, 280, NULL, true),
  ('CALCOL JUICE', 22, 400, 400, 300, NULL, true),
  ('CEDAR MOL JUICE', 16, 400, 400, 300, NULL, true),
  ('VARICLEAR', 38, 350, 350, 280, '60 caps', true),
  ('FS-DESIRE CAPSULES', 10, 300, 300, 200, '30 caps', true),
  ('FS-DESIRE OIL', 8, 250, 250, 180, NULL, true),
  ('DAN-JAAN10 CAPSULES', 34, 350, 350, 280, '60 caps', true),
  ('EVERTUSI DROP', 6, 250, 250, 180, NULL, true)
ON CONFLICT (name) DO NOTHING;

-- Seed initial customers (optional)
INSERT INTO public.customers (name, phone, email, status)
VALUES
  ('Grace Agyeman', '024 123 9876', 'grace@example.com', 'VIP'),
  ('Abdul Rahman', '020 754 3001', 'abdul@example.com', 'Active'),
  ('Martha Mensah', '055 210 4455', 'martha@example.com', 'Pending'),
  ('Thelma Amankwa', '027 114 9080', 'thelma@example.com', 'Active'),
  ('Kwame Boateng', '024 567 8901', 'kwame@example.com', 'Active')
ON CONFLICT DO NOTHING;

-- Seed sample tracks (optional)
INSERT INTO public.tracks (title, artist, duration, playlist)
VALUES
  ('Morning Hustle', 'The Mix Desk', '3:42', 'Sales Flow'),
  ('Momentum Drive', 'Urban Pulse', '4:05', 'Warehouse'),
  ('Blue Hours', 'Aurora Coast', '3:18', 'Focus'),
  ('Energy Boost', 'Electric Vibes', '3:50', 'Sales Flow'),
  ('Deep Focus', 'Ambient Studios', '4:32', 'Focus')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Notes
-- ============================================================================
-- 1. All tables have Row Level Security (RLS) enabled
-- 2. Products and other core data are readable by everyone for the public view
-- 3. Write operations require authentication
-- 4. Admin/Finance/Sales role checks are handled in the application layer
-- 5. Customize policies in Supabase Dashboard -> Authentication -> Policies as needed
-- 6. If you need more restrictive access, uncomment and modify the policies below:
--
-- Example: Restrict products updates to admin only
-- CREATE POLICY "Only admins can update products" ON public.products
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles 
--       WHERE id = auth.uid() AND role = 'admin'
--     )
--   );
