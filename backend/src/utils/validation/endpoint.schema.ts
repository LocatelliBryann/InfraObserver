import { z } from "zod";

export const registerEndpointSchema = z.object({
  agentId: z.string().uuid(),
  hostname: z.string().trim().min(1),
  ipAddress: z.string().trim().min(1),
  osName: z.string().trim().min(1).optional(),
  osVersion: z.string().trim().min(1).optional(),
});

export type RegisterEndpointInput = z.infer<typeof registerEndpointSchema>;