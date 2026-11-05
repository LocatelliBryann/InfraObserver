import type { Request, Response } from "express";

import type { AlertService } from "../services/alert.service";
import { alertQuerySchema } from "../utils/validation/query.schema";

export class AlertController {
  constructor(
    private readonly service: Pick<AlertService, "findMany">,
  ) {}

  /**
   * GET /api/v1/alerts?status=active|resolved|all&endpointId=1&limit=50
   * Sem parâmetros, mantém o comportamento anterior: só alertas ativos.
   */
  async findAll(req: Request, res: Response): Promise<void> {
    const query = alertQuerySchema.safeParse(req.query);

    if (!query.success) {
      res.status(400).json({
        message: "Invalid query parameters",
        errors: query.error.issues,
      });

      return;
    }

    try {
      const alerts = await this.service.findMany(query.data);

      res.status(200).json(alerts);
    } catch {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}
