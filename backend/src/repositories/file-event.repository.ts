import { prisma } from "../database/prisma";

export interface FileEventFilters {
  limit: number;
  endpointId?: number;
  from?: Date;
  to?: Date;
  eventTypes?: string[];
  search?: string;
}

export interface FileEventRecord {
  id: number;
  endpointId: number;
  username: string;
  eventType: string;
  filePath: string;
  previousPath: string | null;
  isDirectory: boolean;
  sourceIp: string | null;
  processName: string | null;
  audited: boolean;
  occurredAt: Date;
  receivedAt: Date;
}

export interface NewFileEvent {
  endpointId: number;
  username: string;
  eventType: string;
  filePath: string;
  previousPath?: string;
  isDirectory: boolean;
  sourceIp?: string;
  processName?: string;
  audited?: boolean;
  occurredAt: Date;
  receivedAt: Date;
}

export interface FileEventRepository {
  findEndpointByAgentId(agentId: string): Promise<{
    id: number;
    agentId: string;
  } | null>;

  create(data: NewFileEvent): Promise<FileEventRecord>;

  findRecent(filters: FileEventFilters): Promise<
    Array<
      FileEventRecord & {
        endpoint: {
          hostname: string;
        };
      }
    >
  >;
}

// No PostgreSQL, a barra invertida é o caractere de escape do LIKE. Caminhos do
// Windows (C:\Users\...) só são encontrados com a barra duplicada.
function escapeLikeBackslashes(text: string): string {
  return text.replaceAll("\\", "\\\\");
}

export class PrismaFileEventRepository
  implements FileEventRepository
{
  async findEndpointByAgentId(agentId: string) {
    return prisma.endpoint.findUnique({
      where: {
        agentId,
      },
      select: {
        id: true,
        agentId: true,
      },
    });
  }

  async create(data: NewFileEvent) {
    return prisma.fileEvent.create({
      data,
    });
  }

  async findRecent({
    limit,
    endpointId,
    from,
    to,
    eventTypes,
    search,
  }: FileEventFilters) {
    const pattern = search ? escapeLikeBackslashes(search) : undefined;

    return prisma.fileEvent.findMany({
      where: {
        ...(endpointId ? { endpointId } : {}),
        ...(eventTypes?.length ? { eventType: { in: eventTypes } } : {}),
        ...(search
          ? {
              // Mesmo texto buscado nos caminhos, no usuário, no programa e no IP.
              OR: [
                { filePath: { contains: pattern, mode: "insensitive" as const } },
                {
                  previousPath: {
                    contains: pattern,
                    mode: "insensitive" as const,
                  },
                },
                { username: { contains: pattern, mode: "insensitive" as const } },
                { processName: { contains: pattern, mode: "insensitive" as const } },
                { sourceIp: { contains: pattern } },
              ],
            }
          : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {}),
      },
      take: limit,
      orderBy: {
        occurredAt: "desc",
      },
      include: {
        endpoint: {
          select: {
            hostname: true,
          },
        },
      },
    });
  }
}