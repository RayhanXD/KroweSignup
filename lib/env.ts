/**
 * Environment Variable Validation and Access
 * 
 * Centralized validation and type-safe access to environment variables.
 * Validates all required variables at module load time to catch configuration
 * errors early.
 */

type EnvConfig = {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string | undefined;
  };
  openai: {
    apiKey: string;
  };
};

/**
 * Validates that a required environment variable exists
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please check your .env file and ensure ${key} is set.`
    );
  }
  return value;
}

/**
 * Validates and returns all environment variables
 */
function validateEnv(): EnvConfig {
  return {
    supabase: {
      url: requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      anonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined,
    },
    openai: {
      apiKey: requireEnv("OPENAI_API_KEY"),
    },
  };
}

/**
 * Validated environment configuration
 * Throws an error at module load time if any required variables are missing
 */
export const env = validateEnv();

/**
 * Type-safe accessors for individual environment variables
 */
export const ENV = {
  SUPABASE_URL: env.supabase.url,
  SUPABASE_ANON_KEY: env.supabase.anonKey,
  SUPABASE_SERVICE_ROLE_KEY: env.supabase.serviceRoleKey,
  OPENAI_API_KEY: env.openai.apiKey,
} as const;

/**
 * Optional base URL for the platform app (dashboard / roadmap).
 * Used for “Continue to dashboard” on the report page.
 *
 * Set in Vercel: Project → Settings → Environment Variables (Production and Preview).
 * Tries `NEXT_PUBLIC_PLATFORM_URL` first, then `NEXT_PUBLIC_DASHBOARD_URL`.
 */
export function getOptionalPublicPlatformUrl(): string | undefined {
  const raw =
    process.env.NEXT_PUBLIC_PLATFORM_URL?.trim() ||
    process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();
  if (!raw) return undefined;
  const withoutTrailingSlash = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }
  return `https://${withoutTrailingSlash}`;
}
