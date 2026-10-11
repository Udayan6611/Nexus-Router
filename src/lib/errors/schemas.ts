import { z } from "zod";
import { ERROR_CODES } from "./codes";

export const errorDetailSchema = z.strictObject({
  path: z.string(),
  message: z.string(),
});
export type ErrorDetail = z.infer<typeof errorDetailSchema>;

/** Standard API error envelope. Success envelope arrives with the contracts (Batch 2). */
export const apiErrorBodySchema = z.strictObject({
  ok: z.literal(false),
  requestId: z.string().optional(),
  error: z.strictObject({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.array(errorDetailSchema).optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;