import type { Request, Response } from "express";

import { logger, type Logger } from "../config/logger";
import { extractBearerToken } from "../middlewares/agent-auth.middleware";
import { ENROLLMENT_TOKEN_PREFIX } from "../security/agent-tokens";
import {
  EndpointNotFoundError,
  EndpointOwnedByAnotherClientError,
  InvalidEnrollmentTokenError,
  type AgentCredentialService,
} from "../services/agent-credential.service";
import { idParamSchema } from "../utils/validation/client.schema";
import { registerEndpointSchema } from "../utils/validation/endpoint.schema";

export class AgentEnrollmentController {
  constructor(
    private readonly service: Pick<
      AgentCredentialService,
      "enroll" | "revokeEndpoint"
    >,
    private readonly log: Logger = logger,
  ) {}

  // POST /api/v1/agents/enroll com "Authorization: Bearer ioe_..." e o mesmo
  // corpo do registro. Responde com a credencial própria do agente.
  async enroll(req: Request, res: Response): Promise<void> {
    const token = extractBearerToken(req.headers.authorization);

    if (!token?.startsWith(ENROLLMENT_TOKEN_PREFIX)) {
      res.status(401).json({ message: "Missing enrollment token" });
      return;
    }

    const body = registerEndpointSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: body.error.issues,
      });
      return;
    }

    try {
      const { credential, endpoint } = await this.service.enroll(
        token,
        body.data,
      );

      this.log.info(
        {
          endpointId: endpoint.id,
          agentId: endpoint.agentId,
          clientId: endpoint.clientId,
        },
        "Agent enrolled",
      );

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ credential, endpoint });
    } catch (error) {
      if (error instanceof InvalidEnrollmentTokenError) {
        this.log.warn({ agentId: body.data.agentId }, "Invalid enrollment token");
        res.status(401).json({ message: error.message });
        return;
      }

      if (error instanceof EndpointOwnedByAnotherClientError) {
        this.log.warn(
          { agentId: body.data.agentId },
          "Enrollment refused: endpoint belongs to another client",
        );
        res.status(409).json({ message: error.message });
        return;
      }

      this.log.error({ err: error }, "Agent enrollment failed");
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // POST /api/v1/endpoints/:id/revoke (dashboard).
  async revokeEndpoint(req: Request, res: Response): Promise<void> {
    const endpointId = idParamSchema.safeParse(req.params.id);

    if (!endpointId.success) {
      res.status(400).json({ message: "Invalid endpoint id" });
      return;
    }

    try {
      const endpoint = await this.service.revokeEndpoint(endpointId.data);

      this.log.info(
        { endpointId: endpoint.id, userId: req.user?.id },
        "Endpoint access revoked",
      );

      res.status(200).json(endpoint);
    } catch (error) {
      if (error instanceof EndpointNotFoundError) {
        res.status(404).json({ message: error.message });
        return;
      }

      this.log.error({ err: error }, "Failed to revoke endpoint");
      res.status(500).json({ message: "Internal server error" });
    }
  }
}
