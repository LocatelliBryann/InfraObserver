import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 12;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  name: z.string().trim().min(1).max(100),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`,
    )
    .max(200),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
