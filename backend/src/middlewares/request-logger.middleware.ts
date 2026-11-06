import type { IncomingMessage, ServerResponse } from "node:http";

import { pinoHttp } from "pino-http";

import { logger } from "../config/logger";

// Rotas chamadas o tempo todo por healthchecks e pelo Prometheus: não geram log.
const IGNORED_PATHS = new Set(["/health", "/metrics"]);

export function resolveLogLevel(
  statusCode: number,
  error?: Error,
): "info" | "warn" | "error" {
  if (error || statusCode >= 500) {
    return "error";
  }

  return statusCode >= 400 ? "warn" : "info";
}

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req: IncomingMessage) =>
      IGNORED_PATHS.has((req.url ?? "").split("?")[0]),
  },
  customLogLevel: (
    _req: IncomingMessage,
    res: ServerResponse,
    error?: Error,
  ) => resolveLogLevel(res.statusCode, error),
  serializers: {
    req: (req: { method?: string; url?: string }) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
    // O pino-http cria um erro genérico para respostas 5xx; o stack dele não
    // ajuda. O erro real é registrado com stack por quem o capturou.
    err: (error: { message?: string }) => ({
      message: error.message,
    }),
  },
});
