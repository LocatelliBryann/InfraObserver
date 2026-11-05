import type { Request, Response } from "express";

import {
  registerEndpointSchema,
  type RegisterEndpointInput,
} from "../utils/validation/endpoint.schema";

import type { EndpointService } from "../services/endpoint.service";

export class EndpointController {
  constructor(
    private readonly service: Pick<
      EndpointService,
      "register" | "findAll"
    >,
  ) {}

  async findAll(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const endpoints = await this.service.findAll();

      res.status(200).json({
        data: endpoints,
      });
    } catch {
      res.status(500).json({
        message: "Internal server error",
      });
    }
  }

  async register(
    req: Request,
    res: Response,
  ): Promise<void> {
    const result = registerEndpointSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        message: "Invalid request payload",
        errors: result.error.issues,
      });

      return;
    }

    const input: RegisterEndpointInput = result.data;
    const endpoint = await this.service.register(input);

    res.status(200).json(endpoint);
  }
}