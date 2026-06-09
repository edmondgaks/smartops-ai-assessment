// ─── Logger — structured, timestamped, colour-coded console output ─────────────
//
// Usage:
//   import { log } from "./logger";
//   log.info("RAG", "chunk retrieved", { topScore: 0.23, chunks: 3 });
//   log.warn("Triage", "fallback triggered", { parseError: "..." });
//   log.error("Ollama", "timeout", err);

type Level = "info" | "warn" | "error" | "debug" | "success";

const COLORS: Record<Level, string> = {
  info:    "\x1b[36m",   // cyan
  warn:    "\x1b[33m",   // yellow
  error:   "\x1b[31m",   // red
  debug:   "\x1b[90m",   // grey
  success: "\x1b[32m",   // green
};

const ICONS: Record<Level, string> = {
  info:    "ℹ",
  warn:    "⚠",
  error:   "✖",
  debug:   "·",
  success: "✔",
};

const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";
const BOLD  = "\x1b[1m";

function format(level: Level, module: string, message: string, meta?: unknown): string {
  const ts    = new Date().toISOString().replace("T", " ").slice(0, 23);
  const color = COLORS[level];
  const icon  = ICONS[level];
  const tag   = `[${module.toUpperCase()}]`.padEnd(12);

  let line = `${DIM}${ts}${RESET} ${color}${icon} ${BOLD}${tag}${RESET} ${message}`;

  if (meta !== undefined && meta !== null) {
    if (meta instanceof Error) {
      line += `\n           ${COLORS.error}${meta.message}${RESET}`;
      if (meta.stack) {
        line += `\n${DIM}${meta.stack.split("\n").slice(1).join("\n")}${RESET}`;
      }
    } else if (typeof meta === "object") {
      line += `  ${DIM}${JSON.stringify(meta)}${RESET}`;
    } else {
      line += `  ${DIM}${String(meta)}${RESET}`;
    }
  }

  return line;
}

function createLogger() {
  return {
    info:    (mod: string, msg: string, meta?: unknown) => console.log(format("info",    mod, msg, meta)),
    warn:    (mod: string, msg: string, meta?: unknown) => console.warn(format("warn",   mod, msg, meta)),
    error:   (mod: string, msg: string, meta?: unknown) => console.error(format("error", mod, msg, meta)),
    debug:   (mod: string, msg: string, meta?: unknown) => console.log(format("debug",   mod, msg, meta)),
    success: (mod: string, msg: string, meta?: unknown) => console.log(format("success", mod, msg, meta)),

    /** Log HTTP request entry — call at the top of each route handler */
    req: (method: string, path: string, meta?: unknown) =>
      console.log(format("info", "HTTP", `${method.toUpperCase()} ${path}`, meta)),

    /** Log HTTP response with timing */
    res: (method: string, path: string, status: number, ms: number) =>
      console.log(format(
        status >= 400 ? "warn" : "success",
        "HTTP",
        `${method.toUpperCase()} ${path} → ${status}  (${ms}ms)`,
      )),
  };
}

export const log = createLogger();
