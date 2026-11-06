import { rateLimit } from "express-rate-limit";

const WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

// Contra força bruta: 5 tentativas erradas por IP a cada 15 minutos.
// Logins certos não contam.
export function createLoginRateLimit(maxAttempts = MAX_FAILED_ATTEMPTS) {
  return rateLimit({
    windowMs: WINDOW_MINUTES * 60 * 1000,
    limit: maxAttempts,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      message: "Too many login attempts. Try again later.",
    },
  });
}
