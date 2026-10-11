/**
 * Best-effort redaction for logs and diagnostics.
 * - Secret-looking keys are replaced with [REDACTED].
 * - Prompt/content-looking keys are replaced with [OMITTED] (no raw prompts in logs).
 * - Secret-looking substrings inside strings are scrubbed.
 * Defense in depth, not a guarantee: still avoid passing secrets to the logger.
 */

export const REDACTED = "[REDACTED]";
export const OMITTED = "[OMITTED]";

const MAX_DEPTH = 8;
const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 50;

const EXACT_SECRET_KEYS = new Set([
  "authorization",
  "proxyauthorization",
  "cookie",
  "setcookie",
  "token",
  "credentials",
  "credential",
]);

// Suffix match on the normalized key, so "GROQ_API_KEY" and "inputTokens" behave correctly:
// groqapikey -> matches "apikey"; inputtokens -> no match (token usage stays visible).
const SECRET_KEY_SUFFIXES = [
  "apikey",
  "secret",
  "password",
  "passwd",
  "privatekey",
  "servicerolekey",
  "authtoken",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "sessiontoken",
  "bearertoken",
];

const CONTENT_KEYS = new Set([
  "prompt",
  "systemprompt",
  "userprompt",
  "messages",
  "content",
  "completion",
  "output",
  "document",
  "documents",
  "filecontent",
  "attachments",
]);

const STRING_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [REDACTED]"],
  [/\bBasic\s+[A-Za-z0-9+/=]{8,}/gi, "Basic [REDACTED]"],
  [/\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, "[REDACTED_JWT]"],
  [/\b(?:gsk_|sk-|sb_secret_)[A-Za-z0-9_-]{16,}/g, "[REDACTED_KEY]"],

  // Query-string secrets: preserve later parameters after "&".
  [
    /([?&](?:api[_-]?key|key|token|access_token|secret|password|passwd|authorization)=)[^&\s]+/gi,
    "$1[REDACTED]",
  ],
  // Free-text secrets: keep the conservative whitespace boundary.
  [
    /(^|[^\w?&])((?:api[_-]?key|token|secret|password|authorization)\s*[=:]\s*)\S+/gi,
    "$1$2[REDACTED]",
  ],
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isSecretKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return (
    EXACT_SECRET_KEYS.has(normalized) ||
    SECRET_KEY_SUFFIXES.some((suffix) => normalized.endsWith(suffix))
  );
}

function isContentKey(key: string): boolean {
  return CONTENT_KEYS.has(normalizeKey(key));
}

export function scrubString(input: string): string {
  let result = input;
  for (const [pattern, replacement] of STRING_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  if (result.length > MAX_STRING_LENGTH) {
    result = `${result.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  }
  return result;
}

function redactError(error: Error, depth: number, ancestors: WeakSet<object>): Record<string, unknown> {
  // Deliberately no stack trace.
  const out: Record<string, unknown> = {
    name: error.name,
    message: scrubString(error.message),
  };
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string") out.code = code;
  if (error.cause !== undefined) out.cause = redactValue(error.cause, depth + 1, ancestors);
  return out;
}

function redactValue(value: unknown, depth: number, ancestors: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "function" || typeof value === "symbol") return "[Unserializable]";

  const obj = value as object;
  if (depth >= MAX_DEPTH) return "[Truncated]";
  if (obj instanceof Date) {
    return Number.isNaN(obj.getTime()) ? "[Invalid Date]" : obj.toISOString();
  }
  if (obj instanceof Error) return redactError(obj, depth, ancestors);
  if (typeof Headers !== "undefined" && obj instanceof Headers) {
    return redactValue(Object.fromEntries(obj.entries()), depth, ancestors);
  }
  if (ancestors.has(obj)) return "[Circular]";

  ancestors.add(obj);
  try {
    if (Array.isArray(obj)) {
      const items = obj
        .slice(0, MAX_ARRAY_ITEMS)
        .map((item) => redactValue(item, depth + 1, ancestors));
      if (obj.length > MAX_ARRAY_ITEMS) {
        items.push(`[+${obj.length - MAX_ARRAY_ITEMS} more items]`);
      }
      return items;
    }
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, entry]) => [
        key,
        isSecretKey(key)
          ? REDACTED
          : isContentKey(key)
            ? OMITTED
            : redactValue(entry, depth + 1, ancestors),
      ]),
    );
  } finally {
    ancestors.delete(obj);
  }
}

/** Returns a redacted, JSON-safe copy of `value`. Never mutates the input. */
export function redact(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet<object>());
}