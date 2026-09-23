import type { Request, Response } from "express";

import type { EndpointHealthService } from "../services/endpoint-health.service";

export class EndpointHealthController {
  constructor(
    private readonly service: Pick<
      EndpointHealthService,
      "findAll"
    >,
  ) {}

  async findAll(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const health = await this.service.findAll();

      res.status(200).json({
        data: health,
      });
    } catch {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}