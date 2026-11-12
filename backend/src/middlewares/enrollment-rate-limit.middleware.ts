import { rateLimit } from "express-rate-limit";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 20;

// Contra tentativas de adivinhar um token de instalação: 20 erros por IP a
// cada 15 minutos. Instalações certas não contam (vários PCs atrás do mesmo
// IP do escritório podem se registrar juntos).
export function createEnrollmentRateLimit(maxAttempts = MAX_FAILED_ATTEMPTS) {
  return rateLimit({
    windowMs: WINDOW_MINUTES * 60 * 1000,
    limit: maxAttempts,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Too many enrollment attempts. Try again later.",
    },
  });
}
