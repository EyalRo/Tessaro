import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown> | undefined;

const DEFAULT_LOG_PATH = "logs/server.log";
const cwd = typeof Bun.cwd === "function" ? Bun.cwd() : (Bun.cwd ?? process.cwd());
const configuredPath = Bun.env.LOG_FILE?.trim();
const targetPath = configuredPath && configuredPath.length > 0 ? configuredPath : DEFAULT_LOG_PATH;
const logFilePath = isAbsolute(targetPath) ? targetPath : join(cwd, targetPath);

try {
  mkdirSync(dirname(logFilePath), { recursive: true });
} catch (error) {
  console.error("Failed to ensure log directory exists", error);
}

function formatMessage(level: LogLevel, message: string, payload?: LogPayload): string {
  const timestamp = new Date().toISOString();
  const serializedPayload = payload ? ` ${JSON.stringify(payload)}` : "";
  return `${timestamp} [${level.toUpperCase()}] ${message}${serializedPayload}`;
}

function writeToFile(formatted: string) {
  try {
    appendFileSync(logFilePath, `${formatted}\n`, { encoding: "utf-8" });
  } catch (error) {
    console.error("Failed to append log entry", error);
  }
}

function log(level: LogLevel, message: string, payload?: LogPayload) {
  const formatted = formatMessage(level, message, payload);
  writeToFile(formatted);

  switch (level) {
    case "trace":
    case "debug":
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  trace(message: string, payload?: LogPayload) {
    log("trace", message, payload);
  },
  debug(message: string, payload?: LogPayload) {
    log("debug", message, payload);
  },
  info(message: string, payload?: LogPayload) {
    log("info", message, payload);
  },
  warn(message: string, payload?: LogPayload) {
    log("warn", message, payload);
  },
  error(message: string, payload?: LogPayload) {
    log("error", message, payload);
  },
  child(extra: Record<string, unknown>) {
    return {
      trace(message: string, payload?: LogPayload) {
        log("trace", message, { ...extra, ...payload });
      },
      debug(message: string, payload?: LogPayload) {
        log("debug", message, { ...extra, ...payload });
      },
      info(message: string, payload?: LogPayload) {
        log("info", message, { ...extra, ...payload });
      },
      warn(message: string, payload?: LogPayload) {
        log("warn", message, { ...extra, ...payload });
      },
      error(message: string, payload?: LogPayload) {
        log("error", message, { ...extra, ...payload });
      },
    };
  },
};

export type Logger = typeof logger;
