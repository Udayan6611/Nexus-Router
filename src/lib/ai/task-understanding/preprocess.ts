import { err, ok, type Result, type TaskUnderstandingInput } from "@/lib/ai/contracts";
import { INPUT_SOURCES } from "./schemas";

/** Normalizes whitespace without changing meaning. Paragraph breaks are kept. */
export function normalizeWhitespace(s: string): string {
    return s
        .normalize("NFC")
        .replace(/\r\n?/g, "\n")
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .replace(/[ \t\u00A0]+/g, " ")
        .split("\n")
        .map((line) => line.trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export function preprocessInput(
    raw: unknown,
    config: { maxInputChars: number },
): Result<TaskUnderstandingInput> {
    if (!raw || typeof raw !== "object") {
        return err({ code: "INVALID_INPUT", message: "input must be an object." });
    }

    const { prompt, source, sessionId } = raw as Record<string, unknown>;

    if (typeof prompt !== "string") {
        return err({ code: "INVALID_INPUT", message: "prompt must be a string." });
    }

    const cleanPrompt = normalizeWhitespace(prompt);
    if (cleanPrompt === "") {
        return err({ code: "EMPTY_INPUT", message: "prompt is empty." });
    }

    if (cleanPrompt.length > config.maxInputChars) {
        return err({
            code: "INPUT_TOO_LONG",
            message: `prompt length (${cleanPrompt.length}) exceeds maximum of ${config.maxInputChars} characters.`,
        });
    }

    if (typeof source !== "string" || !(INPUT_SOURCES as readonly string[]).includes(source)) {
        return err({
            code: "INVALID_SOURCE",
            message: `source must be one of: ${INPUT_SOURCES.join(", ")}.`,
        });
    }

    return ok({
        prompt: cleanPrompt,
        source: source as TaskUnderstandingInput["source"],
        sessionId: typeof sessionId === "string" ? sessionId : undefined,
    });
}
