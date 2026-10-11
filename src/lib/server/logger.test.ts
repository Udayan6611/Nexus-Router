import { describe, expect, it } from "vitest";
import { createLogger, type LogLevel } from "@/lib/server/logger";

function capture() {
  const lines: Array<{ line: string; level: LogLevel }> = [];
  return {
    lines,
    sink: (line: string, level: LogLevel) => {
      lines.push({ line, level });
    },
  };
}

describe("logger", () => {
  it("writes one structured JSON line with time, level, msg and fields", () => {
    const { lines, sink } = capture();
    createLogger({ sink }).info("hello", { requestId: "req_1" });
    const parsed = JSON.parse(lines[0].line) as Record<string, unknown>;
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(parsed.requestId).toBe("req_1");
    expect(typeof parsed.time).toBe("string");
  });

  it("redacts secrets and omits prompts", () => {
    const { lines, sink } = capture();
    createLogger({ sink }).info("call Bearer abcdefghij1234", {
      apiKey: "super-secret-key-1",
      prompt: "my private prompt",
      model: "m1",
    });
    const line = lines[0].line;
    expect(line).not.toContain("abcdefghij1234");
    expect(line).not.toContain("super-secret-key-1");
    expect(line).not.toContain("my private prompt");
    expect(line).toContain('"model":"m1"');
  });

  it("filters messages below the configured level", () => {
    const { lines, sink } = capture();
    const log = createLogger({ level: "warn", sink });
    log.debug("d");
    log.info("i");
    log.warn("w");
    log.error("e");
    expect(lines.map((l) => l.level)).toEqual(["warn", "error"]);
  });

  it("merges child bindings and prevents spoofing of base fields", () => {
    const { lines, sink } = capture();
    const log = createLogger({ sink, bindings: { service: "nexus" } }).child({ runId: "run_1" });
    log.info("x", { level: "fake", msg: "fake", time: "fake" });
    const parsed = JSON.parse(lines[0].line) as Record<string, unknown>;
    expect(parsed.service).toBe("nexus");
    expect(parsed.runId).toBe("run_1");
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("x");
    expect(parsed.time).not.toBe("fake");
  });

  it("never throws when the sink throws", () => {
    const log = createLogger({
      sink: () => {
        throw new Error("sink down");
      },
    });
    expect(() => log.error("boom")).not.toThrow();
  });
});