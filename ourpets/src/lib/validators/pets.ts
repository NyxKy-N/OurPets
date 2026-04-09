import { z } from "zod";

export const petTypeSchema = z.enum(["DOG", "CAT", "OTHER"]);

export const petImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().min(1),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const createPetSchema = z.object({
  name: z.string().min(1).max(80),
  age: z.number().int().min(0).max(40),
  type: petTypeSchema,
  description: z.string().min(1).max(2000),
  images: z.array(petImageSchema).min(1).max(8),
});

export const updatePetSchema = createPetSchema.partial().refine(
  (val) => Object.keys(val).length > 0,
  { message: "At least one field must be updated" }
);

export const listPetsQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  q: z.string().trim().min(1).max(80).optional(),
  type: petTypeSchema.optional(),
  ownerId: z.string().cuid().optional(),
  ageMin: z.coerce.number().int().min(0).max(40).optional(),
  ageMax: z.coerce.number().int().min(0).max(40).optional(),
});
