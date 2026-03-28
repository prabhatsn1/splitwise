// Supabase Configuration
// ─────────────────────────────────────────────────────────────────────────────
// 1. Create a Supabase project at https://supabase.com
// 2. Run the SQL schema (see SUPABASE_SETUP.sql) in the SQL Editor
// 3. Enable Email/Password auth in Authentication → Providers
// 4. Replace the values below with your project URL and anon key
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_CONFIG = {
  URL: process.env.SUPABASE_URL || "https://your-project.supabase.co",
  ANON_KEY: process.env.SUPABASE_ANON_KEY || "your-anon-key",
};

// App Configuration
export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || "development",
  API_TIMEOUT: 10000,
  MAX_RETRY_ATTEMPTS: 3,
};
