import type { FileEventRepository } from "../repositories/file-event.repository";

export interface CreateFileEventInput {
  agentId: string;
  username: string;
  eventType: string;
  filePath: string;
  occurredAt: Date;
}

export class FileEventService {
  constructor(private readonly repository: FileEventRepository) {}

  async create(input: CreateFileEventInput) {
    const endpoint = await this.repository.findEndpointByAgentId(
      input.agentId,
    );

    if (!endpoint) {
      throw new Error("Endpoint not found");
    }

    return this.repository.create({
      endpointId: endpoint.id,
      username: input.username,
      eventType: input.eventType,
      filePath: input.filePath,
      occurredAt: input.occurredAt,
      receivedAt: new Date(),
    });
  }
}