import { createClient } from "@supabase/supabase-js";

const url = import.meta.env['VITE_SUPABASE_URL'] as string | undefined;
const anonKey = import.meta.env['VITE_SUPABASE_ANON_KEY'] as string | undefined;

if (!url || !anonKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.",
  );
}

/**
 * Browser Supabase client for the existing EMD Inventory project.
 * Publishable (anon) key only — never a service-role key.
 */
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export type AppRole = "admin" | "finance" | "sales";

export type Profile = {
  id: string;
  email: string | null;
  username: string | null;
  role: string | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};
