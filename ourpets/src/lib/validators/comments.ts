import { z } from "zod";

export const createCommentSchema = z.object({
  petId: z.string().cuid(),
  content: z.string().trim().min(1).max(500),
});

export const listCommentsQuerySchema = z.object({
  petId: z.string().cuid(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

