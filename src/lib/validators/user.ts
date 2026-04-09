import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(60),
  image: z.string().url().optional(),
  bio: z.string().trim().max(160).optional(),
});
