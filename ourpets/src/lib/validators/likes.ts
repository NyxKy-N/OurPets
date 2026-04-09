import { z } from "zod";

export const toggleLikeSchema = z.object({
  petId: z.string().cuid(),
});

