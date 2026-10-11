import { toAppError } from "./app-error";
import { ERROR_DEFINITIONS } from "./codes";
import type { ApiErrorBody } from "./schemas";

export interface SerializedError {
  status: number;
  body: ApiErrorBody;
}

/**
 * Converts any thrown value into a client-safe HTTP status + body.
 * Uses the fixed public message for the code; never exposes message, cause, or stack.
 */
export function serializeError(error: unknown, requestId?: string): SerializedError {
  const appError = toAppError(error);
  const { publicMessage } = ERROR_DEFINITIONS[appError.code];
  const includeDetails =
    appError.code === "validation_failed" && (appError.details?.length ?? 0) > 0;

  const body: ApiErrorBody = {
    ok: false,
    ...(requestId ? { requestId } : {}),
    error: {
      code: appError.code,
      message: publicMessage,
      ...(includeDetails ? { details: [...(appError.details ?? [])] } : {}),
    },
  };
  return { status: appError.status, body };
}