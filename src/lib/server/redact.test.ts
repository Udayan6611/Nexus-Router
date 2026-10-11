import { describe, expect, it } from "vitest";
import { OMITTED, REDACTED, redact, scrubString } from "@/lib/server/redact";

const asRecord = (value: unknown) => value as Record<string, unknown>;
const GROQ_LIKE = `gsk_${"a1b2c3d4e5".repeat(3)}`;

describe("redact: keys", () => {
  it("redacts secret-looking keys at any depth, case-insensitively", () => {
    const out = asRecord(
      redact({
        headers: { Authorization: "Bearer abcdefghij123", "x-api-key": "k-123456", accept: "json" },
        GROQ_API_KEY: "value-1",
        SUPABASE_SERVICE_ROLE_KEY: "value-2",
        nested: { password: "p", clientSecret: "s" },
      }),
    );
    const headers = asRecord(out.headers);
    expect(headers.Authorization).toBe(REDACTED);
    expect(headers["x-api-key"]).toBe(REDACTED);
    expect(headers.accept).toBe("json");
    expect(out.GROQ_API_KEY).toBe(REDACTED);
    expect(out.SUPABASE_SERVICE_ROLE_KEY).toBe(REDACTED);
    expect(asRecord(out.nested).password).toBe(REDACTED);
    expect(asRecord(out.nested).clientSecret).toBe(REDACTED);
  });

  it("keeps token-usage numbers visible", () => {
    const out = asRecord(redact({ usage: { inputTokens: 5, outputTokens: 7, maxTokens: 10 } }));
    expect(asRecord(out.usage)).toEqual({ inputTokens: 5, outputTokens: 7, maxTokens: 10 });
  });

  it("omits prompt and content fields", () => {
    const out = asRecord(redact({ prompt: "tell me", messages: [{ role: "user" }], model: "m1" }));
    expect(out.prompt).toBe(OMITTED);
    expect(out.messages).toBe(OMITTED);
    expect(out.model).toBe("m1");
  });
});

describe("scrubString", () => {
  it("scrubs bearer tokens, key prefixes, JWTs and query-string secrets", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijk";
    const text = scrubString(
      `Authorization: Bearer abc123def456 key=${GROQ_LIKE} jwt=${jwt} https://x.test/v1?apikey=zzz999&q=1`,
    );
    expect(text).not.toContain("abc123def456");
    expect(text).not.toContain(GROQ_LIKE);
    expect(text).not.toContain(jwt);
    expect(text).not.toContain("zzz999");
    expect(text).toContain("&q=1");
  });

  it("truncates very long strings", () => {
    const out = scrubString("x".repeat(5000));
    expect(out.length).toBeLessThan(2100);
    expect(out.endsWith("[truncated]")).toBe(true);
  });

  it("redacts query-string secrets without consuming later parameters", () => {
    expect(
      scrubString("https://x.test/cb?apikey=abc111&q=1&token=xyz222&page=2"),
    ).toBe(
      "https://x.test/cb?apikey=[REDACTED]&q=1&token=[REDACTED]&page=2",
    );
  });

  it("redacts password query parameters while keeping the rest", () => {
    expect(
      scrubString("https://x.test/login?password=hunter2&next=%2Fhome"),
    ).toBe(
      "https://x.test/login?password=[REDACTED]&next=%2Fhome",
    );
  });

  it("stays conservative for free-text name=value secrets", () => {
    expect(
      scrubString("login failed: password=ab&cd for user"),
    ).toBe("login failed: password=[REDACTED] for user");

    expect(
      scrubString("retry with token=abc123xyz failed"),
    ).toBe("retry with token=[REDACTED] failed");
  });
});

describe("redact: structure handling", () => {
  it("handles circular references", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    expect(asRecord(redact(a)).self).toBe("[Circular]");
  });

  it("limits depth", () => {
    let deep: Record<string, unknown> = { leaf: true };
    for (let i = 0; i < 12; i++) deep = { child: deep };
    expect(JSON.stringify(redact(deep))).toContain("[Truncated]");
  });

  it("serializes Errors without stack traces and scrubs their messages", () => {
    const out = asRecord(redact(new Error("boom Bearer abcdefghij1234")));
    expect(out.name).toBe("Error");
    expect(out.stack).toBeUndefined();
    expect(String(out.message)).not.toContain("abcdefghij1234");
  });

  it("redacts Headers instances", () => {
    const out = asRecord(
      redact(new Headers({ authorization: "Bearer abcdefghijkl", accept: "application/json" })),
    );
    expect(out.authorization).toBe(REDACTED);
    expect(out.accept).toBe("application/json");
  });

  it("does not mutate its input", () => {
    const input = { apiKey: "secret-value-123456" };
    redact(input);
    expect(input.apiKey).toBe("secret-value-123456");
  });
});