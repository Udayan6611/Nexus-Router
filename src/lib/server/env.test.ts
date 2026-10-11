import { describe, expect, it } from "vitest";
import { AppError, serializeError } from "@/lib/errors";
import { getSupabaseConfig, isSupabaseConfigured, loadEnv } from "@/lib/server/env";

function capture(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("loadEnv", () => {
  it("works with nothing configured", () => {
    const env = loadEnv({});
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("treats empty and whitespace-only values as not set", () => {
    const env = loadEnv({ LOG_LEVEL: "  ", SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: " " });
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.SUPABASE_URL).toBeUndefined();
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("parses valid values and ignores unrelated variables", () => {
    const env = loadEnv({
      LOG_LEVEL: "debug",
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40),
      PATH: "/usr/bin",
    });
    expect(env.LOG_LEVEL).toBe("debug");
    expect(env.SUPABASE_URL).toBe("https://example.supabase.co");
    expect(Object.keys(env)).not.toContain("PATH");
  });

  it("throws configuration_error for an invalid log level, naming the variable only", () => {
    const error = capture(() => loadEnv({ LOG_LEVEL: "verbose-SECRET123" }));
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    expect(appError.code).toBe("configuration_error");
    expect(appError.details?.map((d) => d.path)).toContain("LOG_LEVEL");
    expect(JSON.stringify(appError.details)).not.toContain("SECRET123");
  });

  it("rejects non-http URLs and too-short keys without echoing values", () => {
    const error = capture(() =>
      loadEnv({ SUPABASE_URL: "ftp://secret-host-777", SUPABASE_SERVICE_ROLE_KEY: "short-secret-999" }),
    ) as AppError;
    const paths = error.details?.map((d) => d.path) ?? [];
    expect(paths).toContain("SUPABASE_URL");
    expect(paths).toContain("SUPABASE_SERVICE_ROLE_KEY");
    const json = JSON.stringify(error.details);
    expect(json).not.toContain("secret-host-777");
    expect(json).not.toContain("short-secret-999");
  });

  it("does not expose variable names to API clients", () => {
    const error = capture(() => loadEnv({ LOG_LEVEL: "nope" }));
    const { status, body } = serializeError(error);
    expect(status).toBe(503);
    expect(body.error.details).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("LOG_LEVEL");
  });
});

describe("isSupabaseConfigured", () => {
  it("returns false when neither variable is set", () => {
    const env = loadEnv({});
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("returns false when only SUPABASE_URL is set", () => {
    const env = loadEnv({ SUPABASE_URL: "https://example.supabase.co" });
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("returns false when only SUPABASE_SERVICE_ROLE_KEY is set", () => {
    const env = loadEnv({ SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40) });
    expect(isSupabaseConfigured(env)).toBe(false);
  });

  it("returns true when both variables are set", () => {
    const env = loadEnv({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40),
    });
    expect(isSupabaseConfigured(env)).toBe(true);
  });
});

describe("getSupabaseConfig", () => {
  it("returns parsed configuration when both variables are valid", () => {
    const env = loadEnv({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40),
    });
    const config = getSupabaseConfig(env);
    expect(config.url).toBe("https://example.supabase.co");
    expect(config.serviceRoleKey).toBe("x".repeat(40));
  });

  it("throws configuration_error when both variables are missing", () => {
    const env = loadEnv({});
    const error = capture(() => getSupabaseConfig(env)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("configuration_error");
    const paths = error.details?.map((d) => d.path) ?? [];
    expect(paths).toContain("SUPABASE_URL");
    expect(paths).toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("throws configuration_error when SUPABASE_URL is missing", () => {
    const env = loadEnv({ SUPABASE_SERVICE_ROLE_KEY: "x".repeat(40) });
    const error = capture(() => getSupabaseConfig(env)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("configuration_error");
    const paths = error.details?.map((d) => d.path) ?? [];
    expect(paths).toEqual(["SUPABASE_URL"]);
  });

  it("throws configuration_error when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    const env = loadEnv({ SUPABASE_URL: "https://example.supabase.co" });
    const error = capture(() => getSupabaseConfig(env)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("configuration_error");
    const paths = error.details?.map((d) => d.path) ?? [];
    expect(paths).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
  });

  it("never echoes secret values in error details", () => {
    // Custom env with invalid values that bypass loadEnv
    const invalidEnv = {
      LOG_LEVEL: "info" as const,
      SUPABASE_URL: "ftp://secret-supabase-host-888",
      SUPABASE_SERVICE_ROLE_KEY: "short-secret-key-11",
    };
    const error = capture(() => getSupabaseConfig(invalidEnv)) as AppError;
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("configuration_error");
    const json = JSON.stringify(error.details);
    expect(json).not.toContain("secret-supabase-host-888");
    expect(json).not.toContain("short-secret-key-11");
  });
});