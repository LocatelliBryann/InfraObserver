import type { NextFunction, Request, Response } from "express";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 20;
// Acima disso, entradas vencidas são descartadas para a memória não crescer.
const MAX_TRACKED_ADDRESSES = 10_000;

interface FailureWindow {
  count: number;
  resetAt: number;
}

// Contra tentativas de adivinhar um token de instalação: 20 erros por IP a
// cada 15 minutos. Instalações certas não contam (vários PCs atrás do mesmo
// IP do escritório podem se registrar juntos).
//
// Só conta depois que a resposta sai. O express-rate-limit, mesmo ignorando
// os acertos, conta cada requisição na chegada e só desconta o acerto no fim:
// o teste de carga mostrou que mais de 20 PCs se registrando ao mesmo tempo
// recebiam 429 sem nenhum erro de verdade.
export function createEnrollmentRateLimit(
  maxAttempts = MAX_FAILED_ATTEMPTS,
  windowMs = WINDOW_MINUTES * 60 * 1000,
  now: () => number = Date.now,
) {
  const failures = new Map<string, FailureWindow>();

  function activeWindow(key: string, time: number): FailureWindow | undefined {
    const entry = failures.get(key);

    if (entry && entry.resetAt <= time) {
      failures.delete(key);
      return undefined;
    }

    return entry;
  }

  function forgetExpired(time: number): void {
    if (failures.size < MAX_TRACKED_ADDRESSES) {
      return;
    }

    for (const [key, entry] of failures) {
      if (entry.resetAt <= time) {
        failures.delete(key);
      }
    }
  }

  function recordFailure(key: string): void {
    const time = now();
    const entry = activeWindow(key, time);

    if (entry) {
      entry.count += 1;
      return;
    }

    forgetExpired(time);
    failures.set(key, { count: 1, resetAt: time + windowMs });
  }

  return function enrollmentRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    const key = req.ip ?? "unknown";
    const time = now();
    const entry = activeWindow(key, time);

    if (entry && entry.count >= maxAttempts) {
      res.setHeader(
        "Retry-After",
        String(Math.max(1, Math.ceil((entry.resetAt - time) / 1000))),
      );
      res.status(429).json({
        message: "Too many enrollment attempts. Try again later.",
      });
      return;
    }

    res.on("finish", () => {
      if (res.statusCode >= 400) {
        recordFailure(key);
      }
    });

    next();
  };
}
