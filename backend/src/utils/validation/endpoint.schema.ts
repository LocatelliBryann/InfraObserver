import { z } from "zod";

export const registerEndpointSchema = z.object({
  agentId: z.string().uuid(),
  hostname: z.string().trim().min(1),
  ipAddress: z.string().trim().min(1),
  osName: z.string().trim().min(1).optional(),
  osVersion: z.string().trim().min(1).optional(),
  // Ex.: 1.5.0 ou 0.0.0-dev.3. Agentes antigos não enviam.
  agentVersion: z
    .string()
    .trim()
    .max(64)
    .regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/)
    .optional(),
});

export type RegisterEndpointInput = z.infer<typeof registerEndpointSchema>;