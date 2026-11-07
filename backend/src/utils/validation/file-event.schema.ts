import { z } from "zod";

// CREATE, MODIFY e DELETE: arquivo criado, alterado ou excluído.
// RENAME: novo nome na mesma pasta. MOVE: levado para outra pasta.
export const FILE_EVENT_TYPES = [
  "CREATE",
  "MODIFY",
  "DELETE",
  "RENAME",
  "MOVE",
] as const;

export type FileEventType = (typeof FILE_EVENT_TYPES)[number];

const MAX_PATH_LENGTH = 2048;

export const createFileEventSchema = z.object({
  agentId: z.string().uuid(),

  username: z.string().trim().min(1).max(256),

  eventType: z.enum(FILE_EVENT_TYPES),

  filePath: z.string().trim().min(1).max(MAX_PATH_LENGTH),

  // Opcional para continuar aceitando agentes antigos, que não enviam a origem.
  previousPath: z.string().trim().min(1).max(MAX_PATH_LENGTH).optional(),

  isDirectory: z.boolean().default(false),

  sourceIp: z.union([z.ipv4(), z.ipv6()]).optional(),

  occurredAt: z.coerce.date(),
});

export type CreateFileEventInput = z.infer<typeof createFileEventSchema>;
