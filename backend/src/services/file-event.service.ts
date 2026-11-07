import type {
  FileEventFilters,
  FileEventRepository,
} from "../repositories/file-event.repository";

export interface CreateFileEventInput {
  agentId: string;
  username: string;
  eventType: string;
  filePath: string;
  previousPath?: string;
  isDirectory?: boolean;
  sourceIp?: string;
  occurredAt: Date;
}

export class FileEventService {
  constructor(
    private readonly repository: FileEventRepository,
  ) {}

  async create(input: CreateFileEventInput) {
    const endpoint =
      await this.repository.findEndpointByAgentId(
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
      previousPath: input.previousPath,
      isDirectory: input.isDirectory ?? false,
      sourceIp: input.sourceIp,
      occurredAt: input.occurredAt,
      receivedAt: new Date(),
    });
  }

  async findRecent(filters: Partial<FileEventFilters> = {}) {
    return this.repository.findRecent({
      limit: 20,
      ...filters,
    });
  }
}