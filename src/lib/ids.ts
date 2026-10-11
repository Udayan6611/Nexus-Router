/**
 * Request and run ID conventions.
 * Isomorphic: uses Web Crypto (globalThis.crypto), no Node-only imports.
 */

const UUID_V4 =
  "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export const REQUEST_ID_HEADER = "x-request-id";
export const REQUEST_ID_PATTERN = new RegExp(`^req_${UUID_V4}$`);
export const RUN_ID_PATTERN = new RegExp(`^run_${UUID_V4}$`);

/** Strict allow-list for client-supplied correlation IDs. */
const CLIENT_REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{8,64}$/;

export function generateRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

export function generateRunId(): string {
  return `run_${crypto.randomUUID()}`;
}

export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function isRunId(value: unknown): value is string {
  return typeof value === "string" && RUN_ID_PATTERN.test(value);
}

export interface RequestIdentity {
  /** Server-generated. The only authoritative request ID. */
  requestId: string;
  /** Untrusted client hint. For log correlation only, never for keys or authorization. */
  clientRequestId?: string;
}

export function resolveRequestIdentity(headers: Headers): RequestIdentity {
  const requestId = generateRequestId();
  const raw = headers.get(REQUEST_ID_HEADER);
  if (raw !== null && CLIENT_REQUEST_ID_PATTERN.test(raw)) {
    return { requestId, clientRequestId: raw };
  }
  return { requestId };
}