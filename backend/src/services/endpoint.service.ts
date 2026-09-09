import type { EndpointRepository } from "../repositories/endpoint.repository";
import type { RegisterEndpointInput } from "../utils/validation/endpoint.schema";

export class EndpointService {
  constructor(private readonly repository: EndpointRepository) {}

  async register(input: RegisterEndpointInput) {
    const existingEndpoint = await this.repository.findByAgentId(input.agentId);

    if (existingEndpoint) {
      return this.repository.update(existingEndpoint.id, {
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        osName: input.osName,
        osVersion: input.osVersion,
        status: "ONLINE",
        lastSeenAt: new Date(),
      });
    }

    return this.repository.create({
      ...input,
      status: "ONLINE",
      lastSeenAt: new Date(),
    });
  }
}