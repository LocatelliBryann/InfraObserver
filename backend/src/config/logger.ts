import pino from "pino";

// Logs em JSON (uma linha por evento) para serem lidos com `docker compose logs`
// ou por qualquer coletor de logs. Nos testes, ficam desligados por padrão.
function resolveLogLevel(): string {
  if (process.env.LOG_LEVEL) {
    return process.env.LOG_LEVEL;
  }

  return process.env.NODE_ENV === "test" ? "silent" : "info";
}

export const logger = pino({
  level: resolveLogLevel(),
  base: { service: "infraobserver-backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: ["req.headers.authorization"],
});

export type Logger = Pick<typeof logger, "info" | "warn" | "error">;
