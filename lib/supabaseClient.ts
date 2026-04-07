import { createClient } from "@supabase/supabase-js";

/**
 * Browser-safe Supabase client. Uses only NEXT_PUBLIC_* env vars so this module
 * can load in Client Components without importing lib/env.ts (which validates
 * server secrets like OPENAI_API_KEY that are not available in the browser).
 */
function requirePublicSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}\n` +
        `Add them to .env.local (see project docs).`
    );
  }
  return { url, anonKey };
}

const { url, anonKey } = requirePublicSupabaseEnv();
export const supabase = createClient(url, anonKey);
