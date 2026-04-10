import { z } from "zod";

export const createFeedbackSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  pageUrl: z.string().url().optional(),
});

