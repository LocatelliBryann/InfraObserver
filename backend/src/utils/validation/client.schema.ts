import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().trim().min(2).max(100),
});

// Sem expiresInDays, o token vale até ser revogado.
export const createEnrollmentTokenSchema = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// Ids nas rotas (/clients/:clientId, /endpoints/:id...).
export const idParamSchema = z.coerce.number().int().positive();

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type CreateEnrollmentTokenInput = z.infer<
  typeof createEnrollmentTokenSchema
>;
