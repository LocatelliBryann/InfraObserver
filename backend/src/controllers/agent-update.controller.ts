import type { Request, Response } from "express";

import type { AgentUpdateService } from "../services/agent-update.service";

export class AgentUpdateController {
  constructor(
    private readonly service: Pick<AgentUpdateService, "getAvailableRelease">,
  ) {}

  // O agente compara com a própria versão e decide se instala.
  async available(_req: Request, res: Response): Promise<void> {
    const release = await this.service.getAvailableRelease();

    if (!release) {
      res.status(204).end();
      return;
    }

    res.status(200).json(release);
  }
}
