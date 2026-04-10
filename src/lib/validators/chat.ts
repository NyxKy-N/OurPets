import { z } from "zod";

export const listChatMessagesQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(60).default(40),
});

export const createChatMessageSchema = z
  .object({
    content: z.string().trim().max(1200).optional(),
    replyToId: z.string().cuid().optional(),
    audioUrl: z.string().url().optional(),
    audioPublicId: z.string().max(200).optional(),
    audioDuration: z.coerce.number().int().min(0).max(15 * 60).optional(),
  })
  .superRefine((value, ctx) => {
    const hasContent = Boolean(value.content?.trim());
    const hasAudio = Boolean(value.audioUrl);
    if (!hasContent && !hasAudio) {
      ctx.addIssue({ code: "custom", message: "Message is empty", path: ["content"] });
    }
  });

export const toggleChatReactionSchema = z.object({
  messageId: z.string().cuid(),
  emoji: z.string().trim().min(1).max(12),
});

