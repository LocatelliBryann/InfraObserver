import type { Request, Response } from "express";
import type { Registry } from "prom-client";

import { logger, type Logger } from "../config/logger";

// GET /metrics no formato de texto do Prometheus.
// Não passa pelo Caddy: só o Prometheus, na rede interna do Docker, acessa.
export class PrometheusController {
  constructor(
    private readonly registry: Pick<Registry, "metrics" | "contentType">,
    private readonly log: Logger = logger,
  ) {}

  async metrics(_req: Request, res: Response): Promise<void> {
    try {
      const body = await this.registry.metrics();

      res.status(200).type(this.registry.contentType).send(body);
    } catch (error) {
      this.log.error({ err: error }, "Failed to render Prometheus metrics");

      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}
