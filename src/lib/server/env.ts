import { z } from "zod";
import { AppError, zodErrorToDetails } from "@/lib/errors";
import { LOG_LEVELS } from "@/lib/server/logger";

const httpUrl = z
  .string()
  .url()
  .refine((value) => /^https?:\/\//i.test(value), { message: "Must be an http(s) URL" });

/**
 * Server-side environment. Every variable is optional or defaulted, so importing
 * shared utilities or running the foundation tests never requires live credentials.
 * Variable names are deliberately NOT prefixed NEXT_PUBLIC_ (never exposed to browsers).
 */
const envSchema = z.object({
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  SUPABASE_URL: httpUrl.optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
});

export type Env = z.infer<typeof envSchema>;

export const supabaseConfigSchema = z.object({
  url: httpUrl,
  serviceRoleKey: z.string().min(20, { message: "Must be at least 20 characters" }),
});

export type SupabaseConfig = z.infer<typeof supabaseConfigSchema>;

/**
 * Returns true if both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are present in the environment.
 */
export function isSupabaseConfigured(env: Env = getEnv()): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Validates and returns the Supabase configuration from the environment.
 * Throws AppError("configuration_error") if either variable is missing or invalid.
 */
export function getSupabaseConfig(env: Env = getEnv()): SupabaseConfig {
  const missing: { path: string; message: string }[] = [];
  if (!env.SUPABASE_URL) {
    missing.push({ path: "SUPABASE_URL", message: "SUPABASE_URL is required" });
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push({ path: "SUPABASE_SERVICE_ROLE_KEY", message: "SUPABASE_SERVICE_ROLE_KEY is required" });
  }
  if (missing.length > 0) {
    throw new AppError("configuration_error", {
      message: "Supabase configuration is missing",
      details: missing,
    });
  }

  const parsed = supabaseConfigSchema.safeParse({
    url: env.SUPABASE_URL,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    throw new AppError("configuration_error", {
      message: "Invalid Supabase configuration",
      details: zodErrorToDetails(parsed.error),
    });
  }

  return parsed.data;
}

/**
 * Parses configuration from `source` (defaults to process.env).
 * Empty strings count as "not set". Throws AppError("configuration_error") on invalid
 * values; error details name the variable and rule, never the value.
 */
export function loadEnv(
  source: Readonly<Record<string, string | undefined>> = process.env,
): Env {
  const picked: Record<string, string | undefined> = {};
  for (const key of Object.keys(envSchema.shape)) {
    const value = source[key]?.trim();
    picked[key] = value === "" ? undefined : value;
  }

  const result = envSchema.safeParse(picked);
  if (!result.success) {
    throw new AppError("configuration_error", {
      message: "Invalid environment configuration",
      details: zodErrorToDetails(result.error),
    });
  }
  return result.data;
}

let cached: Env | undefined;

export function getEnv(): Env {
  cached ??= loadEnv();
  return cached;
}

/** For tests. */
export function resetEnvCache(): void {
  cached = undefined;
}