import { createClient, SupabaseClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
const rawUrl = env?.VITE_SUPABASE_URL?.trim();
const rawAnonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Checks whether an environment variable holds an unconfigured default or placeholder string.
 */
function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const v = val.toLowerCase();
  return (
    v.includes('your-project') ||
    v.includes('your-publishable-anon-key') ||
    v.includes('your-anon-key') ||
    v.includes('placeholder') ||
    v.length < 15
  );
}

/**
 * Indicates whether Supabase Auth and database synchronization are configured with valid credentials.
 */
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawAnonKey &&
  !isPlaceholder(rawUrl) &&
  !isPlaceholder(rawAnonKey) &&
  rawUrl.startsWith('https://') &&
  rawUrl.includes('.supabase.co')
);

// Fallback values prevent createClient from throwing at module initialization time
// when running purely in offline/local guest mode.
const clientUrl = isSupabaseConfigured && rawUrl ? rawUrl : 'https://placeholder-foodwise.supabase.co';
const clientKey = isSupabaseConfigured && rawAnonKey ? rawAnonKey : 'placeholder-anon-key-foodwise-guest-mode';

/**
 * Canonical frontend Supabase client.
 * Uses public / publishable anon key only. Protected by Row-Level Security (RLS).
 * ⚠️ NEVER expose secret administrator keys to client code.
 */
export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
