import type { Request, Response } from "express";

import { logger, type Logger } from "../config/logger";
import {
  ClientNameTakenError,
  ClientNotFoundError,
  EnrollmentTokenNotFoundError,
  EnrollmentTokenNotRevealableError,
  type ClientService,
} from "../services/client.service";
import {
  createClientSchema,
  createEnrollmentTokenSchema,
  idParamSchema,
} from "../utils/validation/client.schema";

function sendInvalidPayload(res: Response, issues: unknown): void {
  res.status(400).json({
    message: "Invalid request payload",
    errors: issues,
  });
}

export class ClientController {
  constructor(
    private readonly service: Pick<
      ClientService,
      | "findAll"
      | "create"
      | "findEnrollmentTokens"
      | "createEnrollmentToken"
      | "revokeEnrollmentToken"
      | "revealEnrollmentToken"
    >,
    private readonly log: Logger = logger,
  ) {}

  async findAll(_req: Request, res: Response): Promise<void> {
    try {
      res.status(200).json({ data: await this.service.findAll() });
    } catch (error) {
      this.fail(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = createClientSchema.safeParse(req.body);

    if (!body.success) {
      sendInvalidPayload(res, body.error.issues);
      return;
    }

    try {
      const client = await this.service.create(body.data.name);

      this.log.info({ clientId: client.id, userId: req.user?.id }, "Client created");
      res.status(201).json(client);
    } catch (error) {
      this.fail(res, error);
    }
  }

  async findEnrollmentTokens(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);

    if (!clientId.success) {
      res.status(400).json({ message: "Invalid client id" });
      return;
    }

    try {
      res.status(200).json({
        data: await this.service.findEnrollmentTokens(clientId.data),
      });
    } catch (error) {
      this.fail(res, error);
    }
  }

  async createEnrollmentToken(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);
    const body = createEnrollmentTokenSchema.safeParse(req.body ?? {});

    if (!clientId.success) {
      res.status(400).json({ message: "Invalid client id" });
      return;
    }

    if (!body.success) {
      sendInvalidPayload(res, body.error.issues);
      return;
    }

    try {
      const { token, enrollmentToken } =
        await this.service.createEnrollmentToken(clientId.data, body.data);

      // Nunca registrar o token no log: só o id e o começo.
      this.log.info(
        {
          clientId: clientId.data,
          enrollmentTokenId: enrollmentToken.id,
          prefix: enrollmentToken.prefix,
          userId: req.user?.id,
        },
        "Enrollment token created",
      );

      res.setHeader("Cache-Control", "no-store");
      res.status(201).json({ token, enrollmentToken });
    } catch (error) {
      this.fail(res, error);
    }
  }

  // POST /api/v1/clients/:clientId/enrollment-tokens/:tokenId/reveal
  // POST (e não GET) para passar pela checagem de origem e não ficar em cache.
  async revealEnrollmentToken(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);
    const tokenId = idParamSchema.safeParse(req.params.tokenId);

    if (!clientId.success || !tokenId.success) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    try {
      const token = await this.service.revealEnrollmentToken(
        clientId.data,
        tokenId.data,
      );

      // Registro de auditoria: quem copiou qual token (nunca o valor).
      this.log.info(
        { clientId: clientId.data, enrollmentTokenId: tokenId.data, userId: req.user?.id },
        "Enrollment token revealed",
      );

      res.setHeader("Cache-Control", "no-store");
      res.status(200).json({ token });
    } catch (error) {
      this.fail(res, error);
    }
  }

  async revokeEnrollmentToken(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);
    const tokenId = idParamSchema.safeParse(req.params.tokenId);

    if (!clientId.success || !tokenId.success) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }

    try {
      const enrollmentToken = await this.service.revokeEnrollmentToken(
        clientId.data,
        tokenId.data,
      );

      this.log.info(
        { clientId: clientId.data, enrollmentTokenId: tokenId.data, userId: req.user?.id },
        "Enrollment token revoked",
      );

      res.status(200).json(enrollmentToken);
    } catch (error) {
      this.fail(res, error);
    }
  }

  private fail(res: Response, error: unknown): void {
    if (
      error instanceof ClientNameTakenError ||
      error instanceof EnrollmentTokenNotRevealableError
    ) {
      res.status(409).json({ message: error.message });
      return;
    }

    if (
      error instanceof ClientNotFoundError ||
      error instanceof EnrollmentTokenNotFoundError
    ) {
      res.status(404).json({ message: error.message });
      return;
    }

    this.log.error({ err: error }, "Client request failed");
    res.status(500).json({ message: "Internal server error" });
  }
}
