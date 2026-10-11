export interface TaskUnderstandingConfig {
    maxInputChars: number;
    timeoutMs: number;
    model: string;
    apiKey?: string;
}

const posInt = (v: string | undefined, fallback: number): number => {
    const n = Number.parseInt(v ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Server-side task understanding configuration loader.
 * Reads environment variables from process.env; never imports dotenv or exposes secrets to the browser.
 */
export function loadTaskUnderstandingConfig(
    env: Record<string, string | undefined> = process.env,
): TaskUnderstandingConfig {
    return {
        maxInputChars: posInt(env.TASK_UNDERSTANDING_MAX_INPUT_CHARS, 20_000),
        timeoutMs: posInt(env.TASK_UNDERSTANDING_TIMEOUT_MS, 8_000),
        model: env.GROQ_TASK_MODEL?.trim() || "llama-3.1-8b-instant",
        apiKey: env.GROQ_API_KEY?.trim() || undefined,
    };
}
