import type { Request, Response } from "express";

import { logger, type Logger } from "../config/logger";
import {
  ClientNotFoundError,
  EndpointNotFoundError,
  type MonitoredDirectoriesService,
} from "../services/monitored-directories.service";
import { idParamSchema } from "../utils/validation/client.schema";
import {
  agentIdParamSchema,
  clientDirectoriesSchema,
  directoriesReportSchema,
  endpointDirectoriesSchema,
} from "../utils/validation/monitored-directories.schema";

// RF10: pastas monitoradas de cada PC.
export class MonitoredDirectoriesController {
  constructor(
    private readonly service: Pick<
      MonitoredDirectoriesService,
      | "get"
      | "configure"
      | "getClient"
      | "configureClient"
      | "configForAgent"
      | "report"
    >,
    private readonly log: Logger = logger,
  ) {}

  private handleError(res: Response, error: unknown, message: string): void {
    if (error instanceof EndpointNotFoundError) {
      res.status(404).json({ message: "Endpoint not found" });
      return;
    }

    if (error instanceof ClientNotFoundError) {
      res.status(404).json({ message: "Client not found" });
      return;
    }

    this.log.error({ err: error }, message);
    res.status(500).json({ message: "Internal server error" });
  }

  // GET /api/v1/endpoints/:id/monitored-directories (dashboard)
  async get(req: Request, res: Response): Promise<void> {
    const endpointId = idParamSchema.safeParse(req.params.id);

    if (!endpointId.success) {
      res.status(400).json({ message: "Invalid endpoint id" });
      return;
    }

    try {
      res.status(200).json(await this.service.get(endpointId.data));
    } catch (error) {
      this.handleError(res, error, "Failed to load monitored directories");
    }
  }

  // PUT /api/v1/endpoints/:id/monitored-directories (dashboard)
  async configure(req: Request, res: Response): Promise<void> {
    const endpointId = idParamSchema.safeParse(req.params.id);

    if (!endpointId.success) {
      res.status(400).json({ message: "Invalid endpoint id" });
      return;
    }

    const body = endpointDirectoriesSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: body.error.issues,
      });
      return;
    }

    try {
      const view = await this.service.configure(
        endpointId.data,
        body.data.mode,
        body.data.directories,
      );

      this.log.info(
        {
          endpointId: endpointId.data,
          mode: body.data.mode,
          directories: body.data.directories.length,
        },
        "Endpoint monitored directories configured",
      );
      res.status(200).json(view);
    } catch (error) {
      this.handleError(res, error, "Failed to configure monitored directories");
    }
  }

  // GET /api/v1/clients/:clientId/monitored-directories (dashboard)
  async getClient(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);

    if (!clientId.success) {
      res.status(400).json({ message: "Invalid client id" });
      return;
    }

    try {
      res.status(200).json(await this.service.getClient(clientId.data));
    } catch (error) {
      this.handleError(res, error, "Failed to load client monitored directories");
    }
  }

  // PUT /api/v1/clients/:clientId/monitored-directories (dashboard)
  async configureClient(req: Request, res: Response): Promise<void> {
    const clientId = idParamSchema.safeParse(req.params.clientId);

    if (!clientId.success) {
      res.status(400).json({ message: "Invalid client id" });
      return;
    }

    const body = clientDirectoriesSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: body.error.issues,
      });
      return;
    }

    try {
      const view = await this.service.configureClient(
        clientId.data,
        body.data.mode,
        body.data.directories,
      );

      this.log.info(
        {
          clientId: clientId.data,
          mode: body.data.mode,
          directories: body.data.directories.length,
        },
        "Client monitored directories configured",
      );
      res.status(200).json(view);
    } catch (error) {
      this.handleError(res, error, "Failed to configure client monitored directories");
    }
  }

  // GET /api/v1/agents/:agentId/config (agente)
  async agentConfig(req: Request, res: Response): Promise<void> {
    const agentId = agentIdParamSchema.safeParse(req.params.agentId);

    if (!agentId.success) {
      res.status(400).json({ message: "Invalid agent id" });
      return;
    }

    try {
      res.status(200).json(await this.service.configForAgent(agentId.data));
    } catch (error) {
      this.handleError(res, error, "Failed to load agent configuration");
    }
  }

  // POST /api/v1/agents/:agentId/config/status (agente)
  async agentReport(req: Request, res: Response): Promise<void> {
    const agentId = agentIdParamSchema.safeParse(req.params.agentId);

    if (!agentId.success) {
      res.status(400).json({ message: "Invalid agent id" });
      return;
    }

    const body = directoriesReportSchema.safeParse(req.body);

    if (!body.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: body.error.issues,
      });
      return;
    }

    try {
      await this.service.report(
        agentId.data,
        body.data.monitoredDirectories,
        body.data.missingDirectories,
      );
      res.status(204).send();
    } catch (error) {
      this.handleError(res, error, "Failed to save agent directories report");
    }
  }
}
