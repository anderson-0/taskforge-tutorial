import pino from "pino";

export function createLogger(nodeEnv: string | undefined) {
  return pino({
    level: nodeEnv === "production" ? "info" : "debug",
    browser: {
      asObject: true,
    },
    redact: ["password", "token", "authorization"],
  });
}

const currentNodeEnv = process.env.NODE_ENV;

export const logger = (() => createLogger(currentNodeEnv))();
