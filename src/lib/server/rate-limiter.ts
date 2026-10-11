import { AppError } from "@/lib/errors";

export interface RateLimitOptions {
    readonly windowMs: number;
    readonly maxRequests: number;
}

interface WindowBucket {
    count: number;
    resetAt: number;
}

const buckets = new Map<string, WindowBucket>();
const MAX_BUCKETS = 10_000;

export function checkRateLimit(
    key: string,
    options: RateLimitOptions = { windowMs: 60_000, maxRequests: 60 },
): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        if (buckets.size >= MAX_BUCKETS) {
            // Prune expired buckets
            for (const [k, b] of buckets.entries()) {
                if (now >= b.resetAt) buckets.delete(k);
            }
        }
        bucket = { count: 0, resetAt: now + options.windowMs };
        buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, options.maxRequests - bucket.count);
    const resetMs = Math.max(0, bucket.resetAt - now);
    const allowed = bucket.count <= options.maxRequests;

    return { allowed, remaining, resetMs };
}

export function assertRateLimit(
    key: string,
    options: RateLimitOptions = { windowMs: 60_000, maxRequests: 60 },
): void {
    const result = checkRateLimit(key, options);
    if (!result.allowed) {
        throw new AppError("rate_limited", {
            message: `Rate limit of ${options.maxRequests} requests per ${Math.round(options.windowMs / 1000)}s exceeded`,
            retryable: true,
        });
    }
}

export function resetRateLimiter(): void {
    buckets.clear();
}
