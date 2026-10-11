export type ProviderErrorKind =
    | "timeout"
    | "network"
    | "http"
    | "not_configured"
    | "empty_response";

/** Messages are deliberately generic: never echo API keys, body dumps, or prompt secrets. */
export class ProviderError extends Error {
    constructor(
        public readonly kind: ProviderErrorKind,
        message: string,
    ) {
        super(message);
        this.name = "ProviderError";
    }
}

export interface ProviderRequest {
    system: string;
    user: string;
    timeoutMs: number;
}

/** Returns the raw text content of the model's reply. */
export type TaskProvider = (req: ProviderRequest) => Promise<string>;

export interface GroqProviderOptions {
    apiKey?: string;
    model: string;
    baseUrl?: string;
    fetchImpl?: typeof fetch;
}

export function createGroqProvider(opts: GroqProviderOptions): TaskProvider {
    const baseUrl = opts.baseUrl ?? "https://api.groq.com/openai/v1";

    return async ({ system, user, timeoutMs }) => {
        if (!opts.apiKey) {
            throw new ProviderError("not_configured", "GROQ_API_KEY is not set.");
        }
        const doFetch = opts.fetchImpl ?? fetch;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        const body: Record<string, unknown> = {
            model: opts.model,
            temperature: 0,
            max_completion_tokens: 2000,
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
        };
        if (opts.model.startsWith("openai/gpt-oss")) {
            body.reasoning_effort = "low";
        }

        try {
            let res: Response;
            try {
                res = await doFetch(`${baseUrl}/chat/completions`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${opts.apiKey}`,
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal,
                });
            } catch {
                throw controller.signal.aborted
                    ? new ProviderError("timeout", "Provider request timed out.")
                    : new ProviderError("network", "Provider network request failed.");
            }

            if (!res.ok) {
                throw new ProviderError("http", `Provider returned HTTP ${res.status}.`);
            }

            let data: unknown;
            try {
                data = await res.json();
            } catch {
                throw controller.signal.aborted
                    ? new ProviderError("timeout", "Provider request timed out.")
                    : new ProviderError("empty_response", "Provider response was not valid JSON.");
            }

            const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
                ?.message?.content;
            if (typeof content !== "string" || content.trim() === "") {
                throw new ProviderError("empty_response", "Provider returned no content.");
            }
            return content;
        } finally {
            clearTimeout(timer);
        }
    };
}
