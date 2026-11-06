import type { NextFunction, Request, Response } from "express";

import { SESSION_COOKIE_NAME } from "../config/auth";
import { logger, type Logger } from "../config/logger";
import type { AuthService, SessionUser } from "../services/auth.service";

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionUser;
  }
}

// Exige uma sessão válida (cookie httpOnly com o JWT) para acessar a rota.
export function createRequireAuth(
  authService: Pick<AuthService, "verifySession">,
  log: Logger = logger,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token: unknown = req.cookies?.[SESSION_COOKIE_NAME];

    if (typeof token !== "string" || token.length === 0) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    try {
      const user = await authService.verifySession(token);

      if (!user) {
        res.status(401).json({ message: "Session expired or invalid" });
        return;
      }

      req.user = user;
      next();
    } catch (error) {
      log.error({ err: error }, "Failed to verify session");
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
