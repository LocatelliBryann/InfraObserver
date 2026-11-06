import type { CookieOptions, Request, Response } from "express";

import {
  getSessionDurationSeconds,
  isSecureCookie,
  SESSION_COOKIE_NAME,
} from "../config/auth";
import { logger, type Logger } from "../config/logger";
import {
  InvalidCredentialsError,
  type AuthService,
} from "../services/auth.service";
import { loginSchema } from "../utils/validation/auth.schema";

// httpOnly: o JavaScript da página não lê o cookie (protege contra roubo por XSS).
// sameSite strict: o navegador não envia o cookie em requisições de outros sites (CSRF).
function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/",
  };
}

export class AuthController {
  constructor(
    private readonly service: Pick<AuthService, "login">,
    private readonly log: Logger = logger,
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: result.error.issues,
      });
      return;
    }

    try {
      const { token, user } = await this.service.login(result.data);

      res.cookie(SESSION_COOKIE_NAME, token, {
        ...sessionCookieOptions(),
        maxAge: getSessionDurationSeconds() * 1000,
      });

      this.log.info({ userId: user.id }, "User logged in");

      res.status(200).json({ user });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        this.log.warn({ email: result.data.email }, "Failed login attempt");

        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      this.log.error({ err: error }, "Login failed");

      res.status(500).json({ message: "Internal server error" });
    }
  }

  logout(_req: Request, res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions());
    res.status(204).send();
  }

  me(req: Request, res: Response): void {
    res.status(200).json({ user: req.user });
  }
}
