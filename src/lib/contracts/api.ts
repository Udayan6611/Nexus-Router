import { z } from "zod";
import { apiErrorBodySchema } from "@/lib/errors";

/**
 * Success envelope, compatible with the Batch 1 error envelope.
 * Both are discriminated on `ok` and share the same optional `requestId`.
 * The error envelope stays defined in "@/lib/errors" (not duplicated here).
 */
export function apiSuccessSchema<T extends z.ZodType>(data: T) {
    return z.strictObject({
        ok: z.literal(true),
        requestId: z.string().optional(),
        data,
    });
}

/** Any API response: success with `data` validated by `data`, or the standard error envelope. */
export function apiResponseSchema<T extends z.ZodType>(data: T) {
    return z.discriminatedUnion("ok", [apiSuccessSchema(data), apiErrorBodySchema]);
}

export interface ApiSuccess<T> {
    ok: true;
    requestId?: string;
    data: T;
}

export function successBody<T>(data: T, requestId?: string): ApiSuccess<T> {
    return { ok: true, ...(requestId ? { requestId } : {}), data };
}