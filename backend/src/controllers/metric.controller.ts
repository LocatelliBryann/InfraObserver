import type { Request, Response } from "express";

import type { MetricService } from "../services/metric.service";

import { createMetricSchema } from "../utils/validation/metric.schema";

export class MetricController {
  constructor(
    private readonly service: Pick<
      MetricService,
      "create" | "findRecentByEndpointId"
    >,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const result = createMetricSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: result.error.issues,
      });

      return;
    }

    try {
      const metric = await this.service.create(result.data);

      res.status(201).json({
        ...metric,
        netBytesSent: metric.netBytesSent?.toString(),
        netBytesRecv: metric.netBytesRecv?.toString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Endpoint not found") {
        res.status(404).json({
          message: "Endpoint not found",
        });

        return;
      }

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }

  async findRecent(req: Request, res: Response): Promise<void> {
    const endpointId = Number(req.query.endpointId);
    const limit =
      req.query.limit === undefined ? 20 : Number(req.query.limit);

    if (
      !Number.isInteger(endpointId) ||
      endpointId <= 0 ||
      !Number.isInteger(limit) ||
      limit <= 0 ||
      limit > 100
    ) {
      res.status(400).json({
        message: "Invalid query parameters",
      });

      return;
    }

    try {
      const metrics = await this.service.findRecentByEndpointId(
        endpointId,
        limit,
      );

      res.status(200).json(
        metrics.map((metric) => ({
          ...metric,
          netBytesSent: metric.netBytesSent?.toString(),
          netBytesRecv: metric.netBytesRecv?.toString(),
        })),
      );
    } catch {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}