import { timingSafeEqual } from "node:crypto";

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { logger, type Logger } from "../config/logger";
import { AGENT_CREDENTIAL_PREFIX } from "../security/agent-tokens";
import type {
  AgentCredentialService,
  AuthenticatedAgent,
} from "../services/agent-credential.service";

const BEARER_PREFIX = "Bearer ";

declare module "express-serve-static-core" {
  interface Locals {
    // Preenchido quando o agente usa a credencial própria.
    agent?: AuthenticatedAgent;
  }
}

function getConfiguredTokens(): string[] {
  return (process.env.AGENT_TOKENS ?? "")
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function extractBearerToken(header: string | undefined): string | null {
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

const agentIdSchema = z.object({ agentId: z.string().uuid() });

// agentId enviado no corpo (registro, métricas e eventos). O GET de
// atualização não tem corpo. Um agentId inválido fica para o controller,
// que responde 400.
function bodyAgentId(req: Request): string | undefined {
  const result = agentIdSchema.safeParse(req.body);

  return result.success ? result.data.agentId : undefined;
}

// Aceita dois tipos de token:
// - a credencial própria do PC (ioa_...), recebida na instalação. Ela só
//   vale para o agentId daquele PC;
// - um token da lista AGENT_TOKENS (agentes antigos e o agente demo), desde
//   que o PC não tenha credencial própria nem acesso revogado.
export function createAuthenticateAgent(
  credentials: Pick<
    AgentCredentialService,
    "checkCredential" | "canUseSharedToken"
  >,
  log: Logger = logger,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        message: "Missing agent token",
      });
      return;
    }

    const agentId = bodyAgentId(req);

    try {
      if (token.startsWith(AGENT_CREDENTIAL_PREFIX)) {
        const check = await credentials.checkCredential(token);

        if (check.status === "revoked") {
          log.warn({ agentId }, "Revoked agent credential used");
          res.status(401).json({ message: "Agent access revoked" });
          return;
        }

        if (check.status === "unknown") {
          res.status(401).json({ message: "Invalid agent token" });
          return;
        }

        if (agentId !== undefined && agentId !== check.agent.agentId) {
          log.warn(
            { agentId, credentialAgentId: check.agent.agentId },
            "Agent credential used for another agentId",
          );
          res.status(403).json({
            message: "Credential does not belong to this agent",
          });
          return;
        }

        res.locals.agent = check.agent;
        next();
        return;
      }

      const isSharedToken = getConfiguredTokens().some((configuredToken) =>
        safeEquals(token, configuredToken),
      );

      if (!isSharedToken) {
        res.status(401).json({ message: "Invalid agent token" });
        return;
      }

      if (
        agentId !== undefined &&
        !(await credentials.canUseSharedToken(agentId))
      ) {
        log.warn({ agentId }, "Shared agent token refused for this agent");
        res.status(403).json({
          message: "This agent must use its own credential",
        });
        return;
      }

      next();
    } catch (error) {
      log.error({ err: error }, "Failed to authenticate agent");
      res.status(500).json({ message: "Internal server error" });
    }
  };
}
