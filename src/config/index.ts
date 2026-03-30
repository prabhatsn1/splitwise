// Supabase Configuration
// ─────────────────────────────────────────────────────────────────────────────
// 1. Create a Supabase project at https://supabase.com
// 2. Run the SQL schema (see SUPABASE_SETUP.sql) in the SQL Editor
// 3. Enable Email/Password auth in Authentication → Providers
// 4. Replace the values below with your project URL and anon key
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_CONFIG = {
  URL:
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    "https://hqnjgllutcdpjtltuqqq.supabase.co",
  ANON_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_pvrmR0aLdS-iUZkTjBFjPg_Uc6wXtrR",
};

// App Configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
};
