import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { loadEnv, resetEnvCache } from "@/lib/server/env";
import {
  assertServerEnvironment,
  createSupabaseClient,
  getSupabaseClient,
  isSupabaseConfigured,
  resetSupabaseClientCache,
} from "@/lib/server/supabase";

function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

interface SdkInternalClient {
  supabaseUrl: string;
  supabaseKey: string;
  headers: Record<string, string>;
  auth: {
    persistSession: boolean;
    autoRefreshToken: boolean;
    detectSessionInUrl: boolean;
  };
}

describe("supabase server client foundation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    resetEnvCache();
    resetSupabaseClientCache();
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    resetEnvCache();
    resetSupabaseClientCache();
  });

  describe("assertServerEnvironment", () => {
    it("passes when window is undefined", () => {
      expect(() => assertServerEnvironment()).not.toThrow();
    });

    it("throws configuration_error when executed in a simulated browser environment", () => {
      const originalWindow = globalThis.window;
      try {
        (globalThis as unknown as { window: unknown }).window = {};
        const error = capture(() => assertServerEnvironment()) as AppError;
        expect(error).toBeInstanceOf(AppError);
        expect(error.code).toBe("configuration_error");
        expect(error.message).toContain("browser environment");
      } finally {
        (globalThis as unknown as { window: unknown }).window = originalWindow;
      }
    });
  });

  describe("createSupabaseClient", () => {
    it("throws configuration_error when no environment or options are configured", () => {
      const error = capture(() => createSupabaseClient()) as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("configuration_error");
      const paths = error.details?.map((d) => d.path) ?? [];
      expect(paths).toContain("SUPABASE_URL");
      expect(paths).toContain("SUPABASE_SERVICE_ROLE_KEY");
    });

    it("throws configuration_error when options are incomplete", () => {
      const missingKey = capture(() =>
        createSupabaseClient({ url: "https://example.supabase.co" }),
      ) as AppError;
      expect(missingKey).toBeInstanceOf(AppError);
      expect(missingKey.code).toBe("configuration_error");
      expect(missingKey.details?.map((d) => d.path)).toEqual(["serviceRoleKey"]);

      const missingUrl = capture(() =>
        createSupabaseClient({ serviceRoleKey: "x".repeat(40) }),
      ) as AppError;
      expect(missingUrl).toBeInstanceOf(AppError);
      expect(missingUrl.code).toBe("configuration_error");
      expect(missingUrl.details?.map((d) => d.path)).toEqual(["url"]);
    });

    it("throws configuration_error when options fail validation without leaking values", () => {
      const error = capture(() =>
        createSupabaseClient({
          url: "ftp://secret-server-host",
          serviceRoleKey: "too-short-secret-key",
        }),
      ) as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("configuration_error");

      const json = JSON.stringify(error.details);
      expect(json).not.toContain("secret-server-host");
      expect(json).not.toContain("too-short-secret-key");
    });

    it("creates a client instance when valid explicit options are provided", () => {
      const client = createSupabaseClient({
        url: "https://example.supabase.co",
        serviceRoleKey: "x".repeat(40),
      });
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
      expect(typeof client.auth).toBe("object");
    });

    it("creates a client instance when reading from custom env", () => {
      const customEnv = loadEnv({
        SUPABASE_URL: "https://custom.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "k".repeat(40),
      });
      const client = createSupabaseClient({ env: customEnv });
      expect(client).toBeDefined();
      expect(typeof client.from).toBe("function");
    });

    it("configures server-safe auth defaults (persistSession: false, autoRefreshToken: false)", () => {
      const client = createSupabaseClient({
        url: "https://example.supabase.co",
        serviceRoleKey: "x".repeat(40),
      });

      const internalClient = client as unknown as SdkInternalClient;
      expect(internalClient.supabaseUrl).toBe("https://example.supabase.co");
      expect(internalClient.supabaseKey).toBe("x".repeat(40));
      expect(internalClient.auth.persistSession).toBe(false);
      expect(internalClient.auth.autoRefreshToken).toBe(false);
      expect(internalClient.auth.detectSessionInUrl).toBe(false);
    });

    it("allows passing custom clientOptions while retaining safe defaults", () => {
      const client = createSupabaseClient({
        url: "https://example.supabase.co",
        serviceRoleKey: "x".repeat(40),
        clientOptions: {
          global: {
            headers: { "x-custom-header": "test-val" },
          },
        },
      });

      const internalClient = client as unknown as SdkInternalClient;
      expect(internalClient.auth.persistSession).toBe(false);
      expect(internalClient.headers["x-custom-header"]).toBe("test-val");
    });
  });

  describe("getSupabaseClient and cache management", () => {
    it("throws configuration_error when called without environment configuration", () => {
      const error = capture(() => getSupabaseClient()) as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe("configuration_error");
    });

    it("returns a cached singleton client when environment is configured", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "x".repeat(40);
      resetEnvCache();

      expect(isSupabaseConfigured()).toBe(true);

      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();
      expect(client1).toBe(client2);
    });

    it("creates a new client after resetSupabaseClientCache is called", () => {
      process.env.SUPABASE_URL = "https://example.supabase.co";
      process.env.SUPABASE_SERVICE_ROLE_KEY = "x".repeat(40);
      resetEnvCache();

      const client1 = getSupabaseClient();
      resetSupabaseClientCache();
      const client2 = getSupabaseClient();
      expect(client1).not.toBe(client2);
    });
  });
});
