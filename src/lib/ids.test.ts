import { describe, expect, it } from "vitest";
import {
  generateRequestId,
  generateRunId,
  isRequestId,
  isRunId,
  resolveRequestIdentity,
} from "@/lib/ids";

describe("ids", () => {
  it("generates unique, well-formed request IDs", () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(isRequestId(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("generates run IDs that are not valid request IDs", () => {
    const run = generateRunId();
    expect(isRunId(run)).toBe(true);
    expect(isRequestId(run)).toBe(false);
    expect(isRunId(generateRequestId())).toBe(false);
  });

  it("rejects malformed IDs", () => {
    for (const bad of ["", "req_123", "run_", "REQ_whatever", null, undefined, 42, {}]) {
      expect(isRequestId(bad)).toBe(false);
      expect(isRunId(bad)).toBe(false);
    }
  });

  it("always generates its own request ID, ignoring any client header value", () => {
    const identity = resolveRequestIdentity(new Headers({ "x-request-id": "client-id-12345" }));
    expect(isRequestId(identity.requestId)).toBe(true);
    expect(identity.requestId).not.toBe("client-id-12345");
    expect(identity.clientRequestId).toBe("client-id-12345");
  });

  it("omits clientRequestId when the header is absent", () => {
    const identity = resolveRequestIdentity(new Headers());
    expect(identity.clientRequestId).toBeUndefined();
  });

  it("drops client request IDs with unsafe format or length", () => {
    for (const bad of ["has spaces here", "<script>alert(1)</script>", "short", "a".repeat(200)]) {
      const identity = resolveRequestIdentity(new Headers({ "x-request-id": bad }));
      expect(identity.clientRequestId).toBeUndefined();
    }
  });
});