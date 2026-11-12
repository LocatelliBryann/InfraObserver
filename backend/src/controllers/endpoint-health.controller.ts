
import type { Request, Response } from "express";

import { logger } from "../config/logger";
import type { EndpointHealthService } from "../services/endpoint-health.service";
import { endpointListQuerySchema } from "../utils/validation/query.schema";

export class EndpointHealthController {
  constructor(
    private readonly service: Pick<
      EndpointHealthService,
      "findAll"
    >,
  ) {}

  // GET /api/v1/endpoints/health?clientId=3 (ou clientId=none)
  async findAll(
    req: Request,
    res: Response,
  ): Promise<void> {
    const query = endpointListQuerySchema.safeParse(req.query ?? {});

    if (!query.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: query.error.issues,
      });

      return;
    }

    try {
      const health = await this.service.findAll(query.data.clientId);

      res.status(200).json({
        data: health.map(({ latestMetric, ...endpoint }) => ({
          ...endpoint,
          latestMetric: latestMetric
            ? {
                ...latestMetric,
                netBytesSent:
                  latestMetric.netBytesSent?.toString() ?? null,
                netBytesRecv:
                  latestMetric.netBytesRecv?.toString() ?? null,
              }
            : null,
        })),
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to load endpoint health");

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}
