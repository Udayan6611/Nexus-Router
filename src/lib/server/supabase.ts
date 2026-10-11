import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import { AppError, zodErrorToDetails, type ErrorDetail } from "@/lib/errors";
import {
  getSupabaseConfig,
  isSupabaseConfigured,
  supabaseConfigSchema,
  type Env,
  type SupabaseConfig,
} from "@/lib/server/env";

export interface CreateSupabaseClientOptions {
  /** Explicit Supabase project URL. If omitted, resolved from `env` or `getSupabaseConfig()`. */
  readonly url?: string;
  /** Explicit Supabase service-role key. If omitted, resolved from `env` or `getSupabaseConfig()`. */
  readonly serviceRoleKey?: string;
  /** Optional parsed environment to read credentials from. Defaults to server environment. */
  readonly env?: Env;
  /** Optional Supabase SDK client options. */
  readonly clientOptions?: SupabaseClientOptions<"public">;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedSupabaseClient<Database = any> = SupabaseClient<Database>;

/**
 * Ensures that the client factory is only executed in a server environment.
 * Throws AppError("configuration_error") if run in a browser.
 */
export function assertServerEnvironment(): void {
  if (typeof window !== "undefined") {
    throw new AppError("configuration_error", {
      message: "Supabase client cannot be instantiated in a browser environment",
    });
  }
}

/**
 * Creates a typed server-only Supabase client authenticated with the service-role key.
 *
 * Explicit behavior when configuration is missing or invalid:
 * - If credentials are not provided via options or environment, throws AppError("configuration_error").
 * - If credentials fail validation (non-http URL or service-role key shorter than 20 chars), throws AppError("configuration_error").
 * - Secret values are NEVER echoed in error messages or error details.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSupabaseClient<Database = any>(
  options: CreateSupabaseClientOptions = {},
): SupabaseClient<Database> {
  assertServerEnvironment();

  let config: SupabaseConfig;

  if (options.url !== undefined || options.serviceRoleKey !== undefined) {
    const missing: ErrorDetail[] = [];
    if (!options.url) {
      missing.push({ path: "url", message: "url is required" });
    }
    if (!options.serviceRoleKey) {
      missing.push({ path: "serviceRoleKey", message: "serviceRoleKey is required" });
    }
    if (missing.length > 0) {
      throw new AppError("configuration_error", {
        message: "Supabase client configuration is incomplete",
        details: missing,
      });
    }

    const parsed = supabaseConfigSchema.safeParse({
      url: options.url,
      serviceRoleKey: options.serviceRoleKey,
    });
    if (!parsed.success) {
      throw new AppError("configuration_error", {
        message: "Invalid Supabase client configuration",
        details: zodErrorToDetails(parsed.error),
      });
    }
    config = parsed.data;
  } else {
    config = getSupabaseConfig(options.env);
  }

  const client = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...options.clientOptions,
  });

  return client as unknown as SupabaseClient<Database>;
}

// Internal cache for getSupabaseClient()
let cachedClient: SupabaseClient | undefined;

/**
 * Returns a shared cached server-only Supabase client initialized from the server environment.
 * Throws AppError("configuration_error") if Supabase environment variables are missing or invalid.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient<Database = any>(): SupabaseClient<Database> {
  if (!cachedClient) {
    cachedClient = createSupabaseClient();
  }
  return cachedClient as unknown as SupabaseClient<Database>;
}

/**
 * Resets the cached server Supabase client. Primarily used in tests.
 */
export function resetSupabaseClientCache(): void {
  cachedClient = undefined;
}

export { isSupabaseConfigured, getSupabaseConfig };
export type { SupabaseConfig };
