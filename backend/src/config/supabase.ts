import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// ------------------------------------------------------------------------------
// Robust .env Loading: Guarantees backend/.env is found regardless of launch cwd
// ------------------------------------------------------------------------------
const candidateEnvPaths = [
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../.env') : '',
  typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../.env') : '',
].filter(Boolean);

let loadedEnvPath: string | null = null;
for (const cand of candidateEnvPaths) {
  if (fs.existsSync(cand)) {
    dotenv.config({ path: cand });
    loadedEnvPath = cand;
    break;
  }
}

if (!loadedEnvPath) {
  dotenv.config(); // fallback
}

const rawUrl = process.env.SUPABASE_URL?.trim();
const rawAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const rawServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

// Check if credentials are unconfigured default placeholders
const isPlaceholder = (val?: string): boolean => {
  if (!val) return true;
  const v = val.toLowerCase();
  return (
    v.includes('your-project') ||
    v.includes('your-anon-key') ||
    v.includes('your-service-role-key') ||
    v === 'placeholder' ||
    v.length < 15
  );
};

export const isSupabaseConfigured = (): boolean => {
  return Boolean(rawUrl && rawAnonKey && !isPlaceholder(rawUrl) && !isPlaceholder(rawAnonKey));
};

export const isSupabaseAdminConfigured = (): boolean => {
  return Boolean(
    rawUrl &&
      rawServiceRoleKey &&
      !isPlaceholder(rawUrl) &&
      !isPlaceholder(rawServiceRoleKey)
  );
};

let _supabaseClient: SupabaseClient | null = null;
let _supabaseAdminClient: SupabaseClient | null = null;

if (isSupabaseConfigured() && rawUrl && rawAnonKey) {
  try {
    _supabaseClient = createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log('[Supabase] ✅ Initialized standard Supabase client (Anon / Public RLS mode)');
  } catch (err) {
    console.error('[Supabase] ❌ Failed to initialize Supabase client:', err);
  }
} else {
  console.log(
    '[Supabase] ℹ️ SUPABASE_URL or SUPABASE_ANON_KEY not configured. Running in demo mode.'
  );
}

if (isSupabaseAdminConfigured() && rawUrl && rawServiceRoleKey) {
  try {
    _supabaseAdminClient = createClient(rawUrl, rawServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    console.log(
      '[Supabase] 🔐 Initialized privileged Supabase Admin client (Service Role - Server Only)'
    );
  } catch (err) {
    console.error('[Supabase] ❌ Failed to initialize Supabase admin client:', err);
  }
}

/**
 * Returns the standard Supabase client authenticated via the anon / publishable key.
 * All queries executed with this client are protected by Postgres Row Level Security (RLS).
 */
export function getSupabaseClient(): SupabaseClient | null {
  return _supabaseClient;
}

/**
 * Returns the privileged Supabase client with service_role permissions.
 * WARNING: Bypasses all Row Level Security. Strictly for backend migrations,
 * administrative tasks, or server-to-server operations. NEVER expose to clients.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  return _supabaseAdminClient;
}

/**
 * Creates a user-scoped Supabase client that forwards an authenticated user's JWT.
 * This guarantees that Supabase Row Level Security policies (e.g. `auth.uid() = id`)
 * evaluate strictly in the context of the requesting user.
 */
export function createUserScopedClient(accessToken: string): SupabaseClient | null {
  if (!rawUrl || !rawAnonKey || !isSupabaseConfigured()) {
    return null;
  }

  return createClient(rawUrl, rawAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export interface AuthUser {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface AuthVerificationResult {
  user: AuthUser | null;
  error: Error | null;
  userClient: SupabaseClient | null;
}

export type AuthVerifier = (token: string) => Promise<AuthVerificationResult>;

let _testAuthVerifier: AuthVerifier | null = null;

/**
 * Test-only hook to supply controlled mock authentication verification.
 * Strictly blocked in production environments to prevent bypass.
 */
export function setAuthVerifierForTesting(verifier: AuthVerifier | null): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECURITY VIOLATION: Mock authentication verifier cannot be set in production mode.');
  }
  _testAuthVerifier = verifier;
}

/**
 * Authenticates a Bearer token.
 * In production: Strictly uses Supabase Auth via userClient.auth.getUser(token).
 * In local test harness: Uses controlled mock provider registered via setAuthVerifierForTesting.
 * Never decodes or trusts unverified JWT claims.
 */
export async function verifyAuthToken(token: string): Promise<AuthVerificationResult> {
  // If in non-production and a controlled test verifier is registered, use it
  if (process.env.NODE_ENV !== 'production' && _testAuthVerifier) {
    return _testAuthVerifier(token);
  }

  // Production authentication: strictly verify with Supabase Auth
  const userClient = createUserScopedClient(token);
  if (!userClient) {
    return {
      user: null,
      error: new Error('Supabase client unconfigured or unavailable'),
      userClient: null,
    };
  }

  try {
    const { data, error } = await userClient.auth.getUser(token);
    if (error || !data.user) {
      return {
        user: null,
        error: error || new Error('Invalid or expired authentication token'),
        userClient: null,
      };
    }

    return {
      user: data.user,
      error: null,
      userClient,
    };
  } catch (err: any) {
    return {
      user: null,
      error: err,
      userClient: null,
    };
  }
}

/**
 * Safely inspects environment variables without exposing secret values.
 * Returns only presence, placeholder status, and format validity booleans.
 */
export function getSafeEnvVerification() {
  const url = process.env.SUPABASE_URL?.trim() || '';
  const anon = process.env.SUPABASE_ANON_KEY?.trim() || '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  return {
    envFileLoaded: Boolean(loadedEnvPath),
    envFilePath: loadedEnvPath ? path.normalize(loadedEnvPath) : 'default .env',
    supabaseUrl: {
      present: Boolean(url),
      isPlaceholder: isPlaceholder(url),
      formatValid: url.startsWith('https://') && url.includes('.supabase.co'),
    },
    supabaseAnonKey: {
      present: Boolean(anon),
      isPlaceholder: isPlaceholder(anon),
      formatValid: anon.startsWith('ey') || anon.length > 20,
    },
    supabaseServiceRoleKey: {
      present: Boolean(serviceRole),
      isPlaceholder: isPlaceholder(serviceRole),
      formatValid: serviceRole.startsWith('ey') || serviceRole.length > 20,
    },
    isReadyForConnection: Boolean(
      url &&
        anon &&
        !isPlaceholder(url) &&
        !isPlaceholder(anon) &&
        url.startsWith('https://') &&
        url.includes('.supabase.co')
    ),
  };
}

export const supabaseConfig = {
  url: rawUrl || '',
  isConfigured: isSupabaseConfigured(),
  isAdminConfigured: isSupabaseAdminConfigured(),
  mode: isSupabaseConfigured() ? ('connected' as const) : ('demo_fallback' as const),
};
