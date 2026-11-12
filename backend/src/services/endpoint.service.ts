import type { EndpointRepository } from "../repositories/endpoint.repository";
import type { RegisterEndpointInput } from "../utils/validation/endpoint.schema";
import type { ClientFilter } from "../utils/validation/query.schema";

export class EndpointService {
  constructor(
    private readonly repository: EndpointRepository,
  ) {}

  async findAll(clientId?: ClientFilter) {
    return this.repository.findAll(clientId);
  }

  async register(input: RegisterEndpointInput) {
    const existingEndpoint =
      await this.repository.findByAgentId(input.agentId);

    if (existingEndpoint) {
      return this.repository.update(existingEndpoint.id, {
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        osName: input.osName,
        osVersion: input.osVersion,
        agentVersion: input.agentVersion,
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