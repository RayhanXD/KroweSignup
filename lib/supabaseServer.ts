import { createClient } from '@supabase/supabase-js'
import { ENV } from './env'

/**
 * Server-side Supabase client.
 * Uses the service role key (bypasses RLS) when available — required for
 * pipeline/background operations that run outside a user request context.
 * Falls back to the anon key if the service role key is not configured.
 */
export function createServerSupabaseClient() {
  const key = ENV.SUPABASE_SERVICE_ROLE_KEY ?? ENV.SUPABASE_ANON_KEY;
  return createClient(ENV.SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}

/**
 * Server-side Supabase client that always uses service role.
 * Use for privileged auth/admin operations (e.g. deleting auth users).
 */
export function createServiceRoleSupabaseClient() {
  if (!ENV.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing required environment variable for admin operation: SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(ENV.SUPABASE_URL, ENV.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
