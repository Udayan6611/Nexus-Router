import { describe, expect, it } from "vitest";
import { z } from "zod";
import { apiResponseSchema, apiSuccessSchema, successBody } from "@/lib/contracts";
import { AppError, apiErrorBodySchema, serializeError } from "@/lib/errors";
import { accepts } from "@/lib/contracts/__fixtures__/synthetic";

describe("success envelope", () => {
    const schema = apiSuccessSchema(z.object({ value: z.number() }));

    it("accepts ok:true with validated data", () => {
        expect(accepts(schema, { ok: true, data: { value: 1 } })).toBe(true);
        expect(accepts(schema, { ok: true, requestId: "req_x", data: { value: 1 } })).toBe(true);
    });

    it("rejects ok:false, missing or invalid data, and extra keys", () => {
        expect(accepts(schema, { ok: false, data: { value: 1 } })).toBe(false);
        expect(accepts(schema, { ok: true })).toBe(false);
        expect(accepts(schema, { ok: true, data: { value: "x" } })).toBe(false);
        expect(accepts(schema, { ok: true, data: { value: 1 }, stack: "trace" })).toBe(false);
    });
});

describe("compatibility with the Batch 1 error envelope", () => {
    const response = apiResponseSchema(z.string());

    it("accepts a success body and a serialized Batch 1 error body", () => {
        expect(accepts(response, successBody("hello", "req_x"))).toBe(true);
        expect(accepts(response, serializeError(new AppError("not_found"), "req_x").body)).toBe(true);
    });

    it("accepts a validation error carrying details", () => {
        const error = new AppError("validation_failed", { details: [{ path: "a", message: "bad" }] });
        expect(accepts(response, serializeError(error, "req_x").body)).toBe(true);
    });

    it("distinguishes the two envelopes by ok", () => {
        expect(accepts(apiErrorBodySchema, successBody("hello"))).toBe(false);
        expect(accepts(response, { ok: true })).toBe(false);
        expect(accepts(response, { requestId: "req_x", data: "hello" })).toBe(false);
    });

    it("validates data using the provided schema", () => {
        expect(accepts(response, successBody(123))).toBe(false);
    });
});

describe("successBody", () => {
    it("omits requestId when absent and includes it when given", () => {
        expect("requestId" in successBody("x")).toBe(false);
        expect(successBody("x", "req_1").requestId).toBe("req_1");
    });
});