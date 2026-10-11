export const ERROR_CODES = [
  "validation_failed",
  "not_found",
  "rate_limited",
  "no_eligible_model",
  "timeout",
  "provider_error",
  "service_unavailable",
  "configuration_error",
  "internal_error",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorDefinition {
  readonly status: number;
  /** Fixed, client-safe message. Never built from runtime data. */
  readonly publicMessage: string;
  readonly retryable: boolean;
}

export const ERROR_DEFINITIONS: Readonly<Record<ErrorCode, ErrorDefinition>> = {
  validation_failed: { status: 400, publicMessage: "The request is invalid.", retryable: false },
  not_found: { status: 404, publicMessage: "The requested resource was not found.", retryable: false },
  rate_limited: { status: 429, publicMessage: "Too many requests. Please try again later.", retryable: true },
  no_eligible_model: { status: 422, publicMessage: "No model satisfies the requested constraints.", retryable: false },
  timeout: { status: 504, publicMessage: "The operation timed out.", retryable: true },
  provider_error: { status: 502, publicMessage: "The upstream model provider failed.", retryable: false },
  service_unavailable: { status: 503, publicMessage: "A required service is currently unavailable.", retryable: true },
  configuration_error: { status: 503, publicMessage: "The service is not configured for this operation.", retryable: false },
  internal_error: { status: 500, publicMessage: "An unexpected error occurred.", retryable: false },
};