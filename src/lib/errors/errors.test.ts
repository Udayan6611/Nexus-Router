import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AppError,
  ERROR_CODES,
  ERROR_DEFINITIONS,
  apiErrorBodySchema,
  serializeError,
  toAppError,
  zodErrorToDetails,
} from "@/lib/errors";

describe("error definitions", () => {
  it("define a status and public message for every code", () => {
    for (const code of ERROR_CODES) {
      const definition = ERROR_DEFINITIONS[code];
      expect(definition.status).toBeGreaterThanOrEqual(400);
      expect(definition.publicMessage.length).toBeGreaterThan(0);
    }
  });
});

describe("AppError", () => {
  it("takes status and retryable defaults from the code", () => {
    const error = new AppError("rate_limited");
    expect(error.status).toBe(429);
    expect(error.retryable).toBe(true);
    expect(new AppError("provider_error").retryable).toBe(false);
  });

  it("allows retryable to be overridden", () => {
    expect(new AppError("provider_error", { retryable: true }).retryable).toBe(true);
  });
});

describe("serializeError", () => {
  it("produces a body that matches the API error schema", () => {
    const { status, body } = serializeError(new AppError("not_found"), "req_x");
    expect(status).toBe(404);
    expect(apiErrorBodySchema.safeParse(body).success).toBe(true);
    expect(body.requestId).toBe("req_x");
  });

  it("omits requestId when none is provided", () => {
    expect("requestId" in serializeError(new AppError("timeout")).body).toBe(false);
  });

  it("never leaks internal messages, causes, or stacks for unknown errors", () => {
    const { status, body } = serializeError(new Error("db password=hunter2hunter2 failed"));
    const json = JSON.stringify(body);
    expect(status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(json).not.toContain("hunter2");
    expect(json).not.toContain("stack");
  });

  it("never leaks the internal message or cause of an AppError", () => {
    const error = new AppError("provider_error", {
      message: "groq returned secret=abc123",
      cause: new Error("upstream detail"),
    });
    const json = JSON.stringify(serializeError(error).body);
    expect(json).not.toContain("abc123");
    expect(json).not.toContain("upstream detail");
  });

  it("includes details only for validation_failed", () => {
    const details = [{ path: "x", message: "bad" }];
    expect(serializeError(new AppError("validation_failed", { details })).body.error.details).toEqual(details);
    expect(serializeError(new AppError("provider_error", { details })).body.error.details).toBeUndefined();
    expect(serializeError(new AppError("configuration_error", { details })).body.error.details).toBeUndefined();
  });
});

describe("Zod integration", () => {
  const schema = z.object({ a: z.number(), nested: z.object({ b: z.string() }) });

  it("maps issues to field paths without echoing input values", () => {
    const result = schema.safeParse({ a: "SENSITIVE_VALUE_123", nested: { b: 1 } });
    expect(result.success).toBe(false);
    if (result.success) return;
    const details = zodErrorToDetails(result.error);
    expect(details.map((d) => d.path).sort()).toEqual(["a", "nested.b"]);
    expect(JSON.stringify(details)).not.toContain("SENSITIVE_VALUE_123");
  });

  it("converts a ZodError into a validation_failed AppError", () => {
    const result = schema.safeParse({});
    if (result.success) throw new Error("expected failure");
    const appError = toAppError(result.error);
    expect(appError.code).toBe("validation_failed");
    expect(serializeError(result.error).status).toBe(400);
  });
});