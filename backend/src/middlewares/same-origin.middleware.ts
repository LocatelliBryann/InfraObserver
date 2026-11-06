import type { NextFunction, Request, Response } from "express";

import { getAllowedOrigins } from "../config/auth";

// Proteção contra CSRF nas rotas de login e logout: se o navegador informar a
// origem, ela precisa ser o próprio site ou uma origem liberada em CORS_ORIGINS.
// Junto com o cookie SameSite=Strict, impede que outro site use a sessão.
export function requireSameOrigin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const origin = req.get("origin");

  if (!origin) {
    next();
    return;
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    res.status(403).json({ message: "Origin not allowed" });
    return;
  }

  const isSameHost = originHost === req.get("host");
  const isAllowed = getAllowedOrigins().includes(origin);

  if (!isSameHost && !isAllowed) {
    res.status(403).json({ message: "Origin not allowed" });
    return;
  }

  next();
}
