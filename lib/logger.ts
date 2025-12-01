/**
 * Environment-aware logger
 * Only logs in development mode to avoid console pollution in production
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

const isDevelopment = process.env.NODE_ENV === "development";

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : "";
    this.enabled = options.enabled ?? isDevelopment;
  }

  private formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.enabled) return;

    const timestamp = new Date().toISOString();
    const formattedMessage = this.prefix
      ? `${timestamp} ${this.prefix} ${message}`
      : `${timestamp} ${message}`;

    switch (level) {
      case "debug":
        console.debug(formattedMessage, ...args);
        break;
      case "info":
        console.info(formattedMessage, ...args);
        break;
      case "warn":
        console.warn(formattedMessage, ...args);
        break;
      case "error":
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: unknown[]): void {
    this.formatMessage("debug", message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.formatMessage("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.formatMessage("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    // Errors are always logged regardless of environment
    const timestamp = new Date().toISOString();
    const formattedMessage = this.prefix
      ? `${timestamp} ${this.prefix} ${message}`
      : `${timestamp} ${message}`;
    console.error(formattedMessage, ...args);
  }
}

// Pre-configured loggers for different modules
export const logger = new Logger();
export const veoLogger = new Logger({ prefix: "Veo" });
export const geminiLogger = new Logger({ prefix: "Gemini" });
export const videoGenLogger = new Logger({ prefix: "VideoGen" });

// Factory function to create custom loggers
export function createLogger(prefix: string, enabled?: boolean): Logger {
  return new Logger({ prefix, enabled });
}

export default logger;
