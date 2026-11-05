import { z } from "zod";

export const createMetricSchema = z.object({
  agentId: z.string().uuid(),

  cpuPercent: z.number().min(0).max(100).optional(),

  memoryUsed: z.number().min(0).optional(),
  memoryTotal: z.number().positive().optional(),

  diskUsed: z.number().min(0).optional(),
  diskTotal: z.number().positive().optional(),

  netBytesSent: z
    .number()
    .int()
    .nonnegative()
    .transform((value) => BigInt(value))
    .optional(),

  netBytesRecv: z
    .number()
    .int()
    .nonnegative()
    .transform((value) => BigInt(value))
    .optional(),

  collectedAt: z.coerce.date(),
});

export type CreateMetricInput = z.infer<typeof createMetricSchema>;