import { fail, ok, type DocumentChunk, type DocumentOwner, type Result } from "./contracts";

/**
 * Pure scope checks for the repository / retrieval layer. `ctx` must come from
 * the trusted server-side auth context, never from client-supplied fields.
 * Access requires BOTH the user and the session to match.
 */
export function canAccess(owner: DocumentOwner, ctx: DocumentOwner): boolean {
  return (
    ctx.userId !== "" &&
    ctx.sessionId !== "" &&
    owner.userId === ctx.userId &&
    owner.sessionId === ctx.sessionId
  );
}

export function authorizeScope(owner: DocumentOwner, ctx: DocumentOwner): Result<true> {
  return canAccess(owner, ctx) ? ok(true) : fail("FORBIDDEN", "Access to this document is not permitted.");
}

/** Keeps only chunks owned by the caller's user and session. */
export function filterChunksForScope(chunks: DocumentChunk[], ctx: DocumentOwner): DocumentChunk[] {
  return chunks.filter((chunk) => canAccess(chunk, ctx));
}
