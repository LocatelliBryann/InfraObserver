import type { Request, Response } from "express";

import type { AlertService } from "../services/alert.service";

export class AlertController {
  constructor(
    private readonly service: Pick<AlertService, "findActive">,
  ) {}

  async findActive(_req: Request, res: Response): Promise<void> {
    try {
      const alerts = await this.service.findActive();

      res.status(200).json(alerts);
    } catch {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }
}