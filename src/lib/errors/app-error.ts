import { z } from "zod";
import { ERROR_DEFINITIONS, type ErrorCode } from "./codes";
import type { ErrorDetail } from "./schemas";

const MAX_DETAILS = 20;
const MAX_DETAIL_MESSAGE_LENGTH = 200;

export interface AppErrorOptions {
  /** Internal message for logs. Never sent to clients. */
  message?: string;
  /** Only serialized to clients for `validation_failed`. */
  details?: readonly ErrorDetail[];
  cause?: unknown;
  retryable?: boolean;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly retryable: boolean;
  readonly details: readonly ErrorDetail[] | undefined;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    const definition = ERROR_DEFINITIONS[code];
    super(
      options.message ?? definition.publicMessage,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "AppError";
    this.code = code;
    this.status = definition.status;
    this.retryable = options.retryable ?? definition.retryable;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/** Maps Zod issues to safe details: field path + rule message, never the input value. */
export function zodErrorToDetails(error: z.ZodError): ErrorDetail[] {
  return error.issues.slice(0, MAX_DETAILS).map((issue) => ({
    path: issue.path.length > 0 ? issue.path.map(String).join(".") : "(root)",
    message: issue.message.slice(0, MAX_DETAIL_MESSAGE_LENGTH),
  }));
}

/** Normalizes anything thrown into an AppError. Unknown errors become `internal_error`. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof z.ZodError) {
    return new AppError("validation_failed", {
      details: zodErrorToDetails(error),
      cause: error,
    });
  }
  return new AppError("internal_error", { cause: error });
}