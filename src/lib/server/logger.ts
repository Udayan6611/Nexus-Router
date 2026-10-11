import { redact, scrubString } from "@/lib/server/redact";

export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type LogFields = Record<string, unknown>;
export type LogSink = (line: string, level: LogLevel) => void;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  child(bindings: LogFields): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  bindings?: LogFields;
  sink?: LogSink;
}

const defaultSink: LogSink = (line, level) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

/** One JSON object per line. All fields pass through redaction before output. */
export function createLogger(options: LoggerOptions = {}): Logger {
  const level = options.level ?? "info";
  const bindings = options.bindings ?? {};
  const sink = options.sink ?? defaultSink;
  const minRank = LEVEL_RANK[level];

  const write = (at: LogLevel, message: string, fields?: LogFields): void => {
    if (LEVEL_RANK[at] < minRank) return;
    const time = new Date().toISOString();
    let line: string;
    try {
      const safe = redact({ ...bindings, ...fields }) as Record<string, unknown>;
      // Base keys are assigned last so callers cannot spoof time/level/msg.
      line = JSON.stringify({ ...safe, time, level: at, msg: scrubString(message) });
    } catch {
      line = JSON.stringify({ time, level: at, msg: "log serialization failed" });
    }
    try {
      sink(line, at);
    } catch {
      // Logging must never throw into request handling.
    }
  };

  return {
    debug: (message, fields) => write("debug", message, fields),
    info: (message, fields) => write("info", message, fields),
    warn: (message, fields) => write("warn", message, fields),
    error: (message, fields) => write("error", message, fields),
    child: (extra) => createLogger({ level, sink, bindings: { ...bindings, ...extra } }),
  };
}