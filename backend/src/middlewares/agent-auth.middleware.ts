import { timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";

const BEARER_PREFIX = "Bearer ";

function getConfiguredTokens(): string[] {
  return (process.env.AGENT_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();

  return token.length > 0 ? token : null;
}

function safeEquals(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export function authenticateAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const configuredTokens = getConfiguredTokens();

  if (configuredTokens.length === 0) {
    res.status(500).json({
      message: "Agent authentication is not configured",
    });
    return;
  }

  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({
      message: "Missing agent token",
    });
    return;
  }

  const isValid = configuredTokens.some((configuredToken) =>
    safeEquals(token, configuredToken),
  );

  if (!isValid) {
    res.status(401).json({
      message: "Invalid agent token",
    });
    return;
  }

  next();
}
