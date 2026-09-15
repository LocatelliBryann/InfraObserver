import type { Request, Response } from "express";

import type { FileEventService } from "../services/file-event.service";
import { createFileEventSchema } from "../utils/validation/file-event.schema";

export class FileEventController {
  constructor(
    private readonly service: Pick<FileEventService, "create">,
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    const result = createFileEventSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: result.error.issues,
      });

      return;
    }

    try {
      const fileEvent = await this.service.create(result.data);

      res.status(201).json(fileEvent);
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
}