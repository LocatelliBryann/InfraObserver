import { z } from "zod";

export const createFileEventSchema = z.object({
  agentId: z.string().uuid(),

  username: z.string().trim().min(1),

  eventType: z.enum(["CREATE", "MODIFY", "DELETE", "RENAME"]),

  filePath: z.string().trim().min(1),

  occurredAt: z.coerce.date(),
});

export type CreateFileEventInput = z.infer<typeof createFileEventSchema>;