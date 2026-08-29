# Database Setup Guide

This document explains how to set up your Supabase database for the EMD Inventory Management System. All dummy/demo data has been removed from the application, and the app now fetches all data from Supabase.

## Quick Setup

### 1. Run the SQL Script

1. **Open your Supabase Dashboard**: Go to [supabase.com](https://supabase.com) and open your project
2. **Go to SQL Editor**: Navigate to the **SQL Editor** section
3. **Create New Query**: Click "New Query" or "+" button
4. **Copy and paste** the entire contents of `DATABASE_SETUP.sql` from the project root
5. **Execute**: Click "Run" to execute the SQL script

This will:
- Create all necessary tables (products, customers, orders, activity_logs, reports, tracks, profiles, etc.)
- Set up Row-Level Security (RLS) policies
- Create indexes for performance
- Seed the EMD product catalog (40+ products)
- Insert sample customers and tracks

### 2. Verify Tables Were Created

In your Supabase dashboard:
1. Go to **Table Editor**
2. Verify these tables exist:
   - `products` (with 40+ EMD items)
   - `customers`
   - `orders`
   - `order_items`
   - `activity_logs`
   - `reports`
   - `tracks`
   - `profiles`
   - `login_events`
   - `profile_permissions`
   - `restock_access`
   - `app_settings`

### 3. Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider (should be enabled by default)
3. Go to **URL Configuration** and verify your site URL and redirect URLs

### 4. Create Initial Profiles

After users sign up, you need to create their profiles. You can:

**Option A: Via SQL Editor** (Quick)
```sql
-- Create profile for a new user after they sign up
INSERT INTO public.profiles (id, username, email, full_name, role, status)
VALUES (
  'USER_UUID_FROM_AUTH', -- Replace with actual user UUID from auth.users
  'boison',
  'boison@emd.com',
  'Boison Admin',
  'admin',
  'Active'
);
```

**Option B: Via Application** (Better)
- Create a trigger in Supabase to auto-create profiles when users sign up
- The app can have an "admin setup" page to create initial profiles

### 5. Update Role-Based Permissions (Optional)

If you want to restrict certain users to specific features:

```sql
-- Grant restock approval access to a user
INSERT INTO public.restock_access (profile_id, can_approve, can_request)
VALUES ('USER_UUID', true, true);

-- Add specific permissions
INSERT INTO public.profile_permissions (profile_id, permission)
VALUES 
  ('USER_UUID', 'view_analytics'),
  ('USER_UUID', 'export_reports'),
  ('USER_UUID', 'manage_customers');
```

## Data Schema Overview

### Products Table
- `name`: Product name (unique)
- `stock`: Current inventory count
- `price`: Base price
- `retail_price`: Price for retail customers
- `distributor_price`: Price for distributors
- `package_size`: Size/package type (e.g., "60 caps")
- `is_active`: Whether product is available

### Customers Table
- `name`: Customer name
- `phone`: Contact phone
- `email`: Email address
- `status`: "Active", "Pending", "VIP"

### Orders Table
- `order_number`: Unique order ID
- `customer_id`: Reference to customer
- `customer_name`: Denormalized for quick access
- `created_by`: User who created the order (references auth.users)
- `status`: "Pending", "Processing", "Shipped", "Paid"
- `total_amount`: Order subtotal
- `grand_total`: Total with fees
- `channel`: "Retail", "Repurchase", "New registration"

### Activity Logs Table
- `user_id`: User who performed the action
- `action`: What was done
- `category`: "Ops", "Sales", "Inventory", "Marketing", "Admin"
- `details`: Additional info (JSON)

### Reports Table
- `report_id`: Unique report identifier
- `sent_by`: Username of report sender
- `sent_to`: Recipient
- `total_orders`: Number of orders in report
- `total_revenue`: Total revenue
- `status`: "Queued", "Sent", "Failed"

## Troubleshooting

### Products not showing in app
- Check that products table has data: Go to Table Editor → products
- Verify RLS policies allow reading: SELECT policy should have `USING (true)`

### Orders not saving
- Check Row-Level Security policies on `orders` table
- Verify authenticated user is creating the order (has valid `auth.uid()`)
- Check console for error messages

### Activity logs not appearing
- Ensure the route/page is actually creating activity log entries
- Currently, activity logs must be created programmatically in the app
- You can add them manually via SQL: 
  ```sql
  INSERT INTO public.activity_logs (user_name, action, category, title, details)
  VALUES ('Admin', 'System started', 'Admin', 'Application initialized', '{}');
  ```

### Profiles/Users not visible in User Management
- Create profiles via the SQL setup above
- Ensure profiles exist in `profiles` table for each auth user

## Backup and Restore

### Backup Your Database
```bash
pg_dump postgresql://user:password@db.supabase.co:5432/postgres > backup.sql
```

### Restore from Backup
```bash
psql postgresql://user:password@db.supabase.co:5432/postgres < backup.sql
```

## Customization

### Adding New Products
```sql
INSERT INTO public.products (name, stock, price, retail_price, distributor_price)
VALUES ('New Product', 100, 500, 500, 400);
```

### Adding New Customers
```sql
INSERT INTO public.customers (name, phone, email, status)
VALUES ('New Customer', '024 123 4567', 'customer@email.com', 'Active');
```

### Changing User Roles
```sql
UPDATE public.profiles
SET role = 'finance'
WHERE username = 'boison';
```

## Security Notes

- All tables have Row-Level Security (RLS) enabled
- Public SELECT access is configured for products, customers, orders
- Write operations require authentication
- Admin/Finance role checks are enforced in the app layer
- Customize policies in Supabase Dashboard → Authentication → Policies as needed

## Production Deployment

Before deploying to production:

1. **Review RLS Policies**: Make them more restrictive if needed
2. **Disable Public Write Access**: Remove INSERT/UPDATE/DELETE policies for non-authenticated users
3. **Backup Regularly**: Set up automated backups in Supabase
4. **Monitor Performance**: Check indexes and query performance
5. **SSL/HTTPS**: Ensure your app uses HTTPS
6. **Environment Variables**: Use secure, randomized `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_URL`

---

For questions or issues, check the main [README.md](./README.md) or review the Supabase documentation at [supabase.com/docs](https://supabase.com/docs).
